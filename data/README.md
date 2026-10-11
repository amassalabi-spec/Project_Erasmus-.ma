# 🧠 Data (La matière grise)

Ce dossier contient toutes les **connaissances brutes** qui alimentent le modèle (Lumina).

* **Sous-dossiers par profils** (`01_Global`, `02_Profils`...) : Ils permettent de classer les informations de façon logique.
* **Fichiers `.jsonl`** (ex : `etudiants_emjm_rag.jsonl`) : Ils regroupent des paires de textes, de questions/réponses ou des guides pratiques. Lors de l'exécution, le Notebook `Lumina.ipynb` va lire tous ces fichiers pour construire la base de recherche vectorielle de Lumina.
