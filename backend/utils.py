import time
import re
from pathlib import Path
from backend.config import LOGGER, URL_PATTERN
from langdetect import detect

# Ce module contient des fonctions utilitaires pour le projet, notamment pour la gestion des logs, la manipulation de fichiers
#  et de dossiers, l'extraction d'URLs, la détection de langue, et le nettoyage de la sortie du LLM pour éviter les hallucinations 
# et les scories.
# Les fonctions sont conçues pour être simples et robustes, avec une gestion d'erreurs pour éviter que des problèmes mineurs ne cassent 
# tout le backend.

def set_log_level(level):
    LOGGER.setLevel(level)

def step(name, fn, *args, **kwargs):
    start = time.perf_counter()
    LOGGER.info("Start: %s", name)
    result = fn(*args, **kwargs)
    LOGGER.info("Done: %s in %.2fs", name, time.perf_counter() - start)
    return result

def ensure_directory(path, create=True):
    directory = Path(path)
    if directory.exists():
        return directory
    if not create:
        raise FileNotFoundError(f"Le dossier n'existe pas: {directory}")
    directory.mkdir(parents=True, exist_ok=True)
    return directory

def extract_urls_from_text(text):
    return list(dict.fromkeys(URL_PATTERN.findall(text or "")))

def detect_language(text):
    try:
        code = detect(text or "")
        code = (code or "").lower()
        if code.startswith("fr"):
            return "Français"
        if code.startswith("ar"):
            return "Arabe"
        return "Anglais"
    except Exception:
        return "Français"

def clean_llm_output(text: str) -> str:
    """Nettoyage strict pour s'assurer que le LLM ne laisse pas de scories ni d'hallucinations."""
    if not text:
        return ""
        
    text = re.sub(r"^\s*(Réponse|Answer|الإجابة)\s*:\s*", "", text, flags=re.IGNORECASE)
    
    hallucination_markers = [
        "Written by", "Written by:", "Instrucción", "Instruction", 
        "Question:", "Question :", "Contexte:", "Context:",
        "<|user|>", "<|system|>", "<|end|>", "User:", "Assistant:"
    ]
    
    for marker in hallucination_markers:
        if marker in text:
            text = text.split(marker)[0]
            
    fallback_messages = [
        "Information introuvable dans le contexte.",
        "لم يتم العثور على المعلومة في السياق.",
        "Information not found in the context."
    ]
    for fb in fallback_messages:
        if fb in text:
            if len(text.replace(fb, "").strip()) > 30:
                text = text.replace(fb, "").strip()
            
    text = re.sub(r"(?<!\n)(\d\.\s)", r"\n\1", text)
    return text.strip()

def is_small_talk(text: str) -> bool:
    """Détecte si l'utilisateur dit juste bonjour, merci, etc."""
    if not text:
        return False
    text = text.lower().strip()
    small_talk_patterns = [
        "bonjour", "salut", "hello", "hi", "coucou", "yo",
        "merci", "thank", "thanks", "au revoir", "bye"
    ]
    # Si c'est très court (moins de 6 mots) et contient un mot clé
    words = text.split()
    if len(words) <= 6:
        for pattern in small_talk_patterns:
            if pattern in text:
                return True
    return False

def get_small_talk_response(text: str) -> str:
    """Fournit une réponse adaptée au small talk."""
    text = text.lower()
    if "merci" in text or "thank" in text:
        return "Je vous en prie ! C'est un plaisir de vous aider. N'hésitez pas si vous avez d'autres questions sur le programme Erasmus+."
    if "au revoir" in text or "bye" in text or "a+" in text:
        return "Au revoir ! Bonne continuation dans vos projets de mobilité. À bientôt !"
    return "Bonjour ! Je suis Lumina, votre assistante IA experte en mobilité Erasmus+. Comment puis-je vous aider aujourd'hui ?"

