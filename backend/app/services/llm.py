from ollama import Client

from app.core.config import settings

# Connection to the Ollama app running on your laptop
client = Client(host=settings.ollama_url)

# Settings for the chat model (keeps answers factual)
CHAT_OPTIONS = {
    "temperature": 0.1,   # 0 = always the safest words, 1 = creative (creative = makes things up)
    "num_ctx": 8192,      # memory size in tokens; too small = Ollama cuts off the rules at the start
}


def embed(texts: list[str]) -> list[list[float]]:
    """Turn a list of texts into a list of 768-number "meanings"."""
    response = client.embed(model=settings.embed_model, input=texts)
    return response.embeddings


def chat(messages: list[dict]) -> str:
    """Send messages to the chat model and return its reply text."""
    response = client.chat(model=settings.chat_model, messages=messages, options=CHAT_OPTIONS)
    return response.message.content