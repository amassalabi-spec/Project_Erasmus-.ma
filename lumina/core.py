import os
import re
from pathlib import Path
from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings
from langdetect import detect
from .llm import LLMInvoker

DATA_DIR = Path('./data')
CHROMA_DIR = './db_rag'
EMBED_MODEL_NAME = 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2'
K = 3


def infer_metadata_from_path(path: Path):
    parts = [p.lower() for p in Path(path).parts]
    meta = {}
    if '01_global' in parts or '01_global'.lower() in parts:
        meta['scope'] = 'global'
        meta['profile'] = 'all'
    elif '02_maroc' in parts or '02_maroc'.lower() in parts:
        meta['scope'] = 'maroc'
        meta['profile'] = 'all'
    elif '03_profils' in parts or '03_profils'.lower() in parts:
        meta['scope'] = 'local'
        if 'etudiants' in parts or 'etudiants'.lower() in parts:
            meta['profile'] = 'etudiant'
        elif 'etablissements' in parts or 'etablissements'.lower() in parts:
            meta['profile'] = 'etablissement'
        elif 'associations' in parts or 'associations'.lower() in parts:
            meta['profile'] = 'association'
        else:
            meta['profile'] = 'all'
    else:
        meta['scope'] = 'global'
        meta['profile'] = 'all'
    return meta


def extract_urls(text):
    return re.findall(r'https?://\S+', text)


def load_documents(data_dir: Path = DATA_DIR):
    docs = []
    if not data_dir.exists():
        return docs
    for root, _, files in os.walk(data_dir):
        for f in files:
            if f.lower().endswith(('.txt', '.md', '.html', '.htm')):
                p = Path(root) / f
                try:
                    text = p.read_text(encoding='utf-8')
                except Exception:
                    try:
                        text = p.read_text(encoding='latin-1')
                    except Exception:
                        continue
                meta = infer_metadata_from_path(p.relative_to(data_dir))
                meta['source'] = str(p.as_posix())
                meta['urls'] = extract_urls(text)
                docs.append({'id': str(len(docs)), 'text': text, 'meta': meta})
    return docs


def get_chroma_collection(collection_name='lumina', persist_directory=CHROMA_DIR):
    try:
        client = chromadb.Client(Settings(chroma_db_impl="duckdb+parquet", persist_directory=persist_directory))
        collection = client.get_or_create_collection(name=collection_name)
        return client, collection
    except Exception:
        # Fallback to default client (in-memory) if the installed chromadb config differs
        client = chromadb.Client()
        collection = client.get_or_create_collection(name=collection_name)
        return client, collection


def get_embed_model(name=EMBED_MODEL_NAME):
    return SentenceTransformer(name)


def get_llm_invoker(model_path: str = 'models/Phi-3-mini-4k-instruct-q4.gguf', n_threads: int = 8, temperature: float = 0.0):
    try:
        inv = LLMInvoker(model_path=model_path, n_threads=n_threads, temperature=temperature)
        return inv
    except Exception:
        return None


def index_documents(docs, collection, embed_model):
    if not docs:
        return 0
    ids = [d['id'] for d in docs]
    texts = [d['text'] for d in docs]
    metadatas = [d['meta'] for d in docs]
    embeddings = embed_model.encode(texts, show_progress_bar=False, convert_to_numpy=True)
    collection.add(ids=ids, documents=texts, metadatas=metadatas, embeddings=embeddings.tolist())
    collection.client.persist()
    return len(docs)


def detect_language(text):
    try:
        lang = detect(text)
        if lang.startswith('fr'):
            return 'fr'
        if lang.startswith('ar'):
            return 'ar'
        return 'en'
    except Exception:
        return 'fr'


def retrieve(query, selected_profile, collection, embed_model, k=K):
    lang = detect_language(query)
    scope = 'maroc' if 'maroc' in query.lower() else None
    if scope:
        where = {"$and": [ {"$or": [{"profile": 'all'}, {"profile": selected_profile.lower()}]}, {"scope": scope} ] }
    else:
        where = {"$or": [{"profile": 'all'}, {"profile": selected_profile.lower()}]}
    q_emb = embed_model.encode([query], convert_to_numpy=True)[0].tolist()
    res = collection.query(query_embeddings=[q_emb], n_results=k, where=where, include=['documents','metadatas','distances'])
    docs = res.get('documents', [])[0] if res.get('documents') else []
    metas = res.get('metadatas', [])[0] if res.get('metadatas') else []
    return docs, metas
