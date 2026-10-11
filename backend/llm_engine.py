from pathlib import Path
from typing import Optional, List
from langchain_core.language_models import LLM
from langchain_core.callbacks import CallbackManagerForLLMRun
from langchain_community.llms import LlamaCpp

from backend.config import RAGConfig, LOGGER

# note: ce module est isolé pour éviter que les erreurs de chargement du LLM ne cassent tout le backend, notamment le chargement 
# de la VDB qui est critique pour les réponses RAG
# Le LLM est utilisé uniquement pour formuler les réponses à partir du contexte, mais si le chargement échoue,
#  on peut toujours fournir des réponses basées sur la VDB sans génération de texte avancée.
def build_llama_cpp_llm(config: RAGConfig):
    from llama_cpp import Llama

    model_path = Path(config.llm_model_path)
    if not model_path.exists():
        raise FileNotFoundError(f"Fichier GGUF introuvable: {model_path}")

    LOGGER.info("Chargement du modèle GGUF via llama-cpp-python: %s", model_path)

    class LlamaCppWrapper(LLM):
        model_path: str
        temperature: float = 0.0
        max_tokens: int = 512
        n_threads: int = 8
        n_gpu_layers: int = 0
        context_size: int = 2048
        verbose: bool = False
        _llm: Optional[Llama] = None

        def __init__(self, **kwargs):
            super().__init__(**kwargs)
            self._llm = None

        def _init_llm(self):
            if self._llm is None:
                LOGGER.info("Initialisation de llama-cpp-python...")
                self._llm = Llama(
                    model_path=self.model_path,
                    n_gpu_layers=self.n_gpu_layers,
                    n_threads=self.n_threads,
                    n_ctx=self.context_size,
                    verbose=self.verbose,
                )
                LOGGER.info("Modèle GGUF chargé avec succès")

        @property
        def _llm_type(self) -> str:
            return "llama-cpp"

        def _call(
            self,
            prompt: str,
            stop: Optional[List[str]] = None,
            run_manager: Optional[CallbackManagerForLLMRun] = None,
            **kwargs,
        ) -> str:
            self._init_llm()
            
            effective_stop = stop or []
            for tag in ["<|end|>", "<|user|>", "User:"]:
                if tag not in effective_stop: effective_stop.append(tag)

            response = self._llm(
                prompt,
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                stop=effective_stop,
            )
            return response["choices"][0]["text"].strip()
            
        def stream_response(self, prompt: str, stop: Optional[List[str]] = None):
            self._init_llm()
            effective_stop = stop or []
            for tag in ["<|end|>", "<|user|>", "User:"]:
                if tag not in effective_stop: effective_stop.append(tag)

            for chunk in self._llm(
                prompt,
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                stop=effective_stop,
                stream=True
            ):
                yield chunk["choices"][0]["text"]

    llm = LlamaCpp(
        model_path=str(model_path),
        temperature=config.temperature,
        max_output_tokens=config.max_new_tokens,
        n_gpu_layers=getattr(config, "n_gpu_layers", 0),
        n_ctx=getattr(config, "context_length", 2048),
        n_threads=config.threads,
        verbose=False,
    )
    LOGGER.info("LLM LlamaCpp ready via LangChain")
    return llm
