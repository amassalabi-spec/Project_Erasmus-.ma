from backend.config import RAGConfig
from backend.data_manager import build_or_load_vectorstore

print("Démarrage du re-indexage manuel...")
cfg = RAGConfig()
# On force le re-indexage pour lire les nouveaux fichiers dans data/
build_or_load_vectorstore(cfg, force_reindex=True, filter_noisy_chunks=True)
print("Re-indexage terminé avec succès !")
