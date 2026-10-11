try:
    from ctransformers import AutoModel
except Exception:
    AutoModel = None


class LLMInvoker:
    def __init__(self, model_path: str, n_threads: int = 8, temperature: float = 0.0):
        self.model = None
        self.model_path = model_path
        self.n_threads = n_threads
        self.temperature = temperature
        if AutoModel is not None:
            try:
                # Use AutoModel if available; API may vary across versions
                # Common usage: AutoModel(model="path", n_ctx=..., n_threads=...)
                self.model = AutoModel(model=model_path, n_threads=n_threads, temp=temperature)
            except Exception:
                try:
                    self.model = AutoModel(model=model_path, n_threads=n_threads)
                except Exception:
                    self.model = None

    def invoke(self, prompt: str, max_tokens: int = 512) -> str:
        if self.model is None:
            raise RuntimeError('LLM model not available. Install and configure ctransformers with a GGUF model.')
        # Try common generate API variants
        try:
            out = self.model.generate(prompt, max_new_tokens=max_tokens)
            if isinstance(out, (list, tuple)):
                return out[0]
            return out
        except Exception:
            try:
                # some builds return a dict with 'generated_text'
                resp = self.model.generate(prompt, max_new_tokens=max_tokens)
                if isinstance(resp, dict) and 'generated_text' in resp:
                    return resp['generated_text']
            except Exception:
                pass
        raise RuntimeError('Failed to generate from model with current ctransformers API.')
