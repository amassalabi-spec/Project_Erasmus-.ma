import hashlib
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document

class SemanticCache:
    """Cache sémantique basé sur une collection Chroma.
    Stocke les requêtes comme documents et la réponse dans les métadonnées.
    """

    def __init__(self, embeddings_model, threshold: float = 0.88, persist_dir: str = "./db_rag"):
        self.embeddings = embeddings_model
        self.threshold = threshold
        self.vectorstore = Chroma(
            persist_directory=persist_dir,
            embedding_function=self.embeddings,
            collection_name="semantic_cache",
        )
        try:
            self.vectorstore._collection.count()
        except Exception as e:
            from backend.config import LOGGER
            LOGGER.warning(f"Erreur lors du chargement du cache sémantique Chroma: {e}")

    def get(self, query: str) -> Optional[str]:
        try:
            docs = self.vectorstore.similarity_search(query, k=1)
            if not docs:
                return None
            answer = docs[0].metadata.get("answer")
            if answer:
                from backend.config import LOGGER
                LOGGER.info("Cache sémantique Chroma touché pour la requête.")
                return answer
        except Exception as e:
            from backend.config import LOGGER
            LOGGER.warning(f"Erreur lors de la récupération du cache sémantique: {e}")
        return None

    def put(self, query: str, answer: str):
        try:
            doc = Document(page_content=query, metadata={"answer": answer})
            self.vectorstore.add_documents([doc])
            from backend.config import LOGGER
            LOGGER.info("Entrée ajoutée au cache sémantique Chroma.")
        except Exception as e:
            from backend.config import LOGGER
            LOGGER.warning(f"Erreur lors de l'ajout au cache sémantique: {e}")

    def clear(self):
        try:
            self.vectorstore._collection.delete(ids=self.vectorstore._collection.get()['ids'])
            from backend.config import LOGGER
            LOGGER.info("Cache sémantique Chroma vidé.")
        except Exception as e:
            from backend.config import LOGGER
            LOGGER.warning(f"Erreur lors du vidage du cache sémantique: {e}")
