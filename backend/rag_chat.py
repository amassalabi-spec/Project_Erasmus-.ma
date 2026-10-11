import time
import os
import pickle
import numpy as np
from typing import Optional
import json
from pathlib import Path
from langchain_community.vectorstores import Chroma
from langchain_core.language_models import LLM
from langchain_core.documents import Document

from backend.config import LOGGER, SYSTEM_PROMPTS, FALLBACK_BY_LANGUAGE
from backend.utils import detect_language, clean_llm_output, is_small_talk, get_small_talk_response
from backend.data_manager import format_docs_for_prompt_llm
from backend.analytics import track_request

# Ce module gère la logique de chat RAG, y compris la gestion d'un cache sémantique persistant pour accélérer les réponses aux questions 
# fréquemment posées ou similaires,
# ainsi que la gestion de l'historique de session pour permettre un contexte conversationnel sur plusieurs échanges.

class SemanticCache:
    """Cache sémantique basé sur une collection Chroma.
    Stocke les requêtes comme documents et l'answer dans les métadonnées.
    """

    def __init__(self, embeddings_model, threshold: float = 0.88, persist_dir: str = "./db_rag"):
        self.embeddings = embeddings_model
        self.threshold = threshold
        # Utilise une sous-collection dédiée au cache
        self.vectorstore = Chroma(
            persist_directory=persist_dir,
            embedding_function=self.embeddings,
            collection_name="semantic_cache",
        )
        # S'assure que la collection existe
        try:
            # Force le chargement de la collection; si vide, on continue.
            self.vectorstore._collection.count()
        except Exception as e:
            LOGGER.warning(f"Erreur lors du chargement du cache sémantique Chroma: {e}")

    def _embed(self, text: str):
        return self.embeddings.embed_query(text)

    def get(self, query: str) -> Optional[str]:
        try:
            # On utilise les scores pour pouvoir vérifier le seuil (threshold)
            results = self.vectorstore.similarity_search_with_relevance_scores(query, k=1)
            if not results:
                return None
                
            doc, score = results[0]
            # Chroma renvoie souvent une distance L2 (plus petite = plus proche) 
            # ou un score de cosinus. Langchain normalise parfois.
            # En général pour les embeddings, un score > threshold signifie très similaire.
            if score < self.threshold:
                return None
                
            answer = doc.metadata.get("answer")
            if answer:
                LOGGER.info(f"Cache sémantique Chroma touché (score: {score:.3f}).")
                return answer
        except Exception as e:
            LOGGER.warning(f"Erreur lors de la récupération du cache sémantique: {e}")
        return None

    def put(self, query: str, answer: str):
        try:
            doc = Document(page_content=query, metadata={"answer": answer})
            self.vectorstore.add_documents([doc])
            if hasattr(self.vectorstore, 'persist'):
                self.vectorstore.persist()
            LOGGER.info("Entrée ajoutée au cache sémantique Chroma et persistée sur disque.")
        except Exception as e:
            LOGGER.warning(f"Erreur lors de l'ajout au cache sémantique: {e}")

    def clear(self):
        try:
            self.vectorstore._collection.delete(ids=self.vectorstore._collection.get()['ids'])
            LOGGER.info("Cache sémantique Chroma vidé.")
        except Exception as e:
            LOGGER.warning(f"Erreur lors du vidage du cache sémantique: {e}")


SESSION_HISTORY_FILE = Path("./db_rag/session_histories.json")
SESSION_HISTORIES = {}

def load_session_histories():
    global SESSION_HISTORIES
    if SESSION_HISTORY_FILE.exists():
        try:
            with open(SESSION_HISTORY_FILE, "r", encoding="utf-8") as f:
                SESSION_HISTORIES = json.load(f)
            LOGGER.info(f"Historique de sessions chargé ({len(SESSION_HISTORIES)} sessions).")
        except Exception as e:
            LOGGER.error(f"Erreur lors du chargement de l'historique des sessions: {e}")
            SESSION_HISTORIES = {}

def save_session_histories():
    try:
        SESSION_HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(SESSION_HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(SESSION_HISTORIES, f, ensure_ascii=False, indent=2)
    except Exception as e:
        LOGGER.error(f"Erreur lors de la sauvegarde de l'historique des sessions: {e}")

load_session_histories()

def get_session_history(session_id: str):
    if session_id not in SESSION_HISTORIES:
        SESSION_HISTORIES[session_id] = []
    return SESSION_HISTORIES[session_id]

def clear_session_memory(session_id: str = None):
    global SESSION_HISTORIES
    if session_id:
        if session_id in SESSION_HISTORIES: SESSION_HISTORIES[session_id] = []
        LOGGER.info(f"Mémoire de la session {session_id} effacée.")
    else:
        SESSION_HISTORIES = {}
        LOGGER.info("Mémoire de TOUTES les sessions effacée.")
    save_session_histories()

def normalize_profile(profile: Optional[str]) -> str:
    if profile is None: return "all"
    value = str(profile).strip().lower()
    value = value.replace("é", "e").replace("è", "e").replace("à", "a").replace("î", "i").replace("ï", "i")
    aliases = {
        "etudiant": "etudiant", "etudiants": "etudiant", "student": "etudiant", "students": "etudiant",
        "etablissement": "etablissement", "etablissements": "etablissement", "school": "etablissement", "university": "etablissement",
        "association": "association", "associations": "association", "ngo": "association",
        "all": "all", "global": "all", "any": "all",
    }
    return aliases.get(value, value or "all")

def infer_profile_from_question(question: str) -> str:
    text = (question or "").lower()
    keyword_map = {
        "etudiant": ["student", "studant", "etudiant", "étudiant", "learner", "bourse", "scholarship", "scolarship", "scolarchip", "master", "licence", "candidater", "candidature", "etudier"],
        "etablissement": ["etablissement", "établissement", "school", "university", "college", "institution", "professeur", "staff"],
        "association": ["association", "ngo", "club", "organization", "organisme", "jeunesse"],
    }
    for profile, keywords in keyword_map.items():
        if any(keyword in text for keyword in keywords): return profile
    return "all"

def build_profile_metadata_filter(profile: Optional[str]) -> dict:
    normalized_profile = normalize_profile(profile)
    if normalized_profile in {"all", ""}: return {}
    return {
        "$or": [
            {"scope": "global"},
            {"scope": "maroc"},
            {"$and": [{"scope": "local"}, {"profile": normalized_profile}]}
        ]
    }

def get_relevant_context(question: str, vectorstore: Chroma, top_k: int = 5, selected_profile: Optional[str] = None):
    profile = normalize_profile(selected_profile) if selected_profile is not None else infer_profile_from_question(question)
    metadata_filter = build_profile_metadata_filter(profile)
    
    search_kwargs = {"k": top_k * 4} # On récupère plus de résultats pour filtrer manuellement ensuite
    if metadata_filter: search_kwargs["filter"] = metadata_filter

    try:
        retriever = vectorstore.as_retriever(search_type="similarity", search_kwargs=search_kwargs)
        all_docs = retriever.invoke(question)
    except Exception as exc:
        LOGGER.warning("Recherche par similarité échouée: %s", repr(exc))
        return []
        
    # Séparation par type de fichier
    jsonl_docs = [d for d in all_docs if d.metadata.get("file_type") in [".jsonl", ".json"]]
    txt_docs = [d for d in all_docs if d.metadata.get("file_type") == ".txt"]
    
    # Mélange garanti : on prend par exemple max(3 JSONL) et max(2 TXT) si top_k=5
    target_jsonl = max(1, int(top_k * 0.6))
    target_txt = top_k - target_jsonl
    
    mixed_docs = jsonl_docs[:target_jsonl] + txt_docs[:target_txt]
    
    # S'il nous manque des documents (par exemple s'il n'y a pas assez de TXT), on complète avec ce qu'il reste
    if len(mixed_docs) < top_k:
        remaining = [d for d in all_docs if d not in mixed_docs]
        mixed_docs.extend(remaining[:top_k - len(mixed_docs)])
        
    return mixed_docs


def agent_route_query(question: str, llm: LLM) -> str:
    """Agentic Routing : Version ultra-rapide (sans LLM) pour gagner ~30s sur CPU."""
    if is_small_talk(question):
        return "[GREETING]"
    
    # On retourne simplement la question brute pour le retriever. 
    # Le moteur d'embedding est déjà robuste aux fautes d'orthographe.
    return question

def chat(question: str, vectorstore: Chroma, llm: LLM, semantic_cache: Optional[SemanticCache], top_k: int = 5, force_french: bool = False, selected_profile: Optional[str] = None, show_urls: bool = False, use_memory: bool = True, session_id: str = "default", stream: bool = False):
    history = get_session_history(session_id)

    # Agentic Routing : Compréhension de l'intention et Reformulation
    t_route = time.perf_counter()
    routed_query = agent_route_query(question, llm)
    LOGGER.info(f"Agentic Routing ({time.perf_counter() - t_route:.2f}s) : '{question}' -> '{routed_query}'")
    
    # Fast-path pour les salutations et remerciements
    if routed_query == "[GREETING]" or is_small_talk(question):
        response = get_small_talk_response(question)
        if use_memory: 
            history.append((question, response))
            save_session_histories()
            
        latency = time.perf_counter() - t_route
        track_request(session_id, latency, cache_hit=True, profile="all", is_db_latency=False)
        
        if stream:
            def fast_stream(): yield response
            return fast_stream()
        return response

    search_query = routed_query if routed_query else question

    detected_lang = detect_language(question)
    final_lang = "Français" if force_french else detected_lang
    system_prompt_template = SYSTEM_PROMPTS.get(final_lang, SYSTEM_PROMPTS["Français"])
    fallback_message = FALLBACK_BY_LANGUAGE.get(final_lang, "Information introuvable dans le contexte.")
    actual_profile = normalize_profile(selected_profile) if selected_profile is not None else infer_profile_from_question(question)

    if semantic_cache is not None and not stream:
        t_cache = time.perf_counter()
        cached = semantic_cache.get(search_query)
        if cached:
            if use_memory: 
                history.append((question, cached))
                save_session_histories()
            
            latency = time.perf_counter() - t_cache
            track_request(session_id, latency, cache_hit=True, profile=actual_profile, is_db_latency=True)
            
            return cached + f"\n\n*(⚡ Rapide : Réponse extraite du cache sémantique persistant en {latency:.2f}s)*"

    docs = get_relevant_context(search_query, vectorstore, top_k=top_k, selected_profile=actual_profile)
    context_text, urls = format_docs_for_prompt_llm(docs)
    
    if not context_text.strip():
        if stream:
            def empty_stream(): yield fallback_message
            return empty_stream()
        return fallback_message

    profile_hint = ""
    if actual_profile and actual_profile != "all":
         profile_hint = f"\n[RAPPEL AU LLM: L'utilisateur a le profil : {actual_profile.upper()}. Filtre le contexte pour ne donner QUE les informations pertinentes a ce type de profil.]"
    
    enriched_question = search_query + profile_hint

    hist_str = ""
    if use_memory and history:
        for q, a in history[-2:]:
            hist_str += f"<|user|>\n{q}<|end|>\n<|assistant|>\n{a}<|end|>\n"

    prompt = system_prompt_template.format(context=context_text, question=enriched_question, history=hist_str)
    LOGGER.info("Interrogation LLM [%s] (Profil: %s)...", session_id, actual_profile)
    
    # On ajoute des stop tokens pour éviter que le LLM ne répète la question (hallucination)
    stop_tokens = ["Question:", "Question :", "<|user|>", "User:", "<|end|>"]
    
    t_start_llm = time.perf_counter()

    if stream:
        def response_generator():
            if semantic_cache is not None:
                t_cache_stream = time.perf_counter()
                cached = semantic_cache.get(search_query)
                if cached:
                    latency = time.perf_counter() - t_start_llm
                    track_request(session_id, latency, cache_hit=True, profile=actual_profile, is_db_latency=True)
                    yield cached + "\n\n*(⚡ Rapide : Réponse extraite du cache)*"
                    return

            full_answer_raw = ""
            # On passe les stop tokens au stream_response pour bloquer l'écho
            for token in llm.stream(prompt, stop=stop_tokens):
                full_answer_raw += token
                yield token

            final_answer = clean_llm_output(full_answer_raw)
            
            url_text = ""
            if show_urls and urls:
                url_text = "\n\n**Liens et Ressources Utiles :**\n"
                for url in urls: 
                    url_text += f"- {url}\n"
            
            final_answer_to_save = final_answer + url_text

            if use_memory and fallback_message not in final_answer:
                history.append((question, final_answer_to_save))
                save_session_histories()
            if semantic_cache is not None and fallback_message not in final_answer:
                semantic_cache.put(search_query, final_answer_to_save)

            if url_text:
                yield url_text

            latency = time.perf_counter() - t_start_llm
            track_request(session_id, latency, cache_hit=False, profile=actual_profile)

        return response_generator()

    else:
        try:
            # On passe les stop tokens à invoke
            raw_answer = llm.invoke(prompt, stop=stop_tokens) if hasattr(llm, "invoke") and "stop" in llm.invoke.__code__.co_varnames else llm(prompt, stop=stop_tokens)
            # En fait LLM invoke accepte généralement les kwargs. On utilise la méthode `_call` wrapper si c'est llama-cpp
            raw_answer = llm(prompt, stop=stop_tokens)
            
            final_answer = clean_llm_output(raw_answer)
            
            if not final_answer.strip(): return fallback_message
            
            if show_urls and urls:
                final_answer += "\n\n**Liens et Ressources Utiles :**\n"
                for url in urls: final_answer += f"- {url}\n"
                
            if use_memory and fallback_message not in final_answer: 
                history.append((question, final_answer))
                save_session_histories()
            if semantic_cache is not None and fallback_message not in final_answer: 
                semantic_cache.put(search_query, final_answer)
                
            latency = time.perf_counter() - t_start_llm
            track_request(session_id, latency, cache_hit=False, profile=actual_profile)
            return final_answer
        except Exception as exc:
            LOGGER.error("Erreur gération LLM : %s", exc)
            return "Une erreur technique s'est produite lors de la génération."
