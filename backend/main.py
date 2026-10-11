import time
import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from langchain_community.embeddings import HuggingFaceEmbeddings



from backend.config import RAGConfig, LOGGER
from backend.data_manager import build_or_load_vectorstore
from backend.llm_engine import build_llama_cpp_llm
from backend.rag_chat import SemanticCache, chat, clear_session_memory
from backend.analytics import get_stats

app = FastAPI(title="Lumina API Backend (Containerized)")

# Note importante sur la structure du code :
# - Le backend est organisé en modules pour isoler les responsabilités : config, utils, data_manager, llm_engine, rag_chat.
# - Le module llm_engine est isolé pour éviter que les erreurs de chargement du LLM ne cassent tout le backend, 
# notamment le chargement de la VDB qui est critique pour les réponses RAG. Le LLM est utilisé uniquement pour formuler les réponses
#  à partir du contexte, mais si le chargement échoue, on peut toujours fournir des réponses basées sur la VDB sans génération 
# de texte avancée.


# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    session_id: str = "default_session"
    stream: bool = True

# Variables globales stateful
cfg = RAGConfig()
vectorstore = None
llm = None
semantic_cache = None

@app.on_event("startup")
def startup_event():
    global vectorstore, llm, semantic_cache
    LOGGER.info("Démarrage du moteur RAG Lumina...")
    
    # Construction / chargement VDB
    try:
        vectorstore = build_or_load_vectorstore(cfg, force_reindex=False, filter_noisy_chunks=True)
    except Exception as e:
        LOGGER.error(f"Erreur au chargement Chromadb: {e}")
        
    try:
        llm = build_llama_cpp_llm(cfg)
    except Exception as e:
        LOGGER.warning(f"Erreur au chargement LLM. Les reponses RAG seront limitees ou casseront: {e}")

    # Cache Sémantique
    try:
        embeddings_model = HuggingFaceEmbeddings(model_name=cfg.embedding_model_name)
        semantic_cache = SemanticCache(embeddings_model=embeddings_model, threshold=0.88, persist_dir=cfg.persist_dir)
    except Exception as e:
        LOGGER.warning(f"Impossible d'initialiser le cache sémantique: {e}")

@app.get("/")
def read_root():
    return {"status": "Lumina API is running in Docker!"}

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    start_t = time.perf_counter()
    
    if req.stream:
        def generate():
            try:
                generator = chat(
                    question=req.message,
                    vectorstore=vectorstore,
                    llm=llm,
                    semantic_cache=semantic_cache,
                    top_k=cfg.top_k,
                    selected_profile=None,
                    use_memory=True,
                    show_urls=True,
                    session_id=req.session_id,
                    stream=True
                )
                
                if isinstance(generator, str):
                    yield f"data: {generator}\n\n"
                else:
                    for chunk in generator:
                        clean_chunk = chunk.replace('\n', '<br>') 
                        yield f"data: {clean_chunk}\n\n"
                        
            except Exception as e:
                yield f"data: ❌ **Erreur technique** : {str(e)}\n\n"
            
            yield "data: [DONE]\n\n"

        return StreamingResponse(generate(), media_type="text/event-stream")
        
    else:
        try:
            response = chat(
                question=req.message,
                vectorstore=vectorstore,
                llm=llm,
                semantic_cache=semantic_cache,
                top_k=cfg.top_k,
                selected_profile=None,
                use_memory=True,
                show_urls=True,
                session_id=req.session_id,
                stream=False
            )
            dt = time.perf_counter() - start_t
            
            if "Cache sémantique" not in response:
                response += f"\n\n*(⏱️ Généré en {dt:.1f}s)*"
                
            return {"response": response, "session_id": req.session_id}
        except Exception as e:
            return {"response": f"❌ **Erreur technique** : {str(e)}", "session_id": req.session_id}

@app.post("/api/clear_history")
def clear_history_endpoint(req: ChatRequest):
    clear_session_memory(req.session_id)
    return {"status": f"Mémoire effacée pour la session {req.session_id}"}

@app.get("/api/stats")
def stats_endpoint():
    try:
        stats = get_stats()
        # Add doc count
        if vectorstore:
            stats["kpi"]["doc_count"] = vectorstore._collection.count()
        else:
            stats["kpi"]["doc_count"] = 0
        return stats
    except Exception as e:
        LOGGER.error(f"Erreur API stats: {e}")
        return {"error": str(e)}

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=3000, reload=True)
