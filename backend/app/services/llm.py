from ollama import Client

from app.core.config import settings

# Connection to the Ollama app running on your laptop
client = Client(host=settings.ollama_url)


def embed(texts: list[str]) -> list[list[float]]:
    """Turn a list of texts into a list of 768-number "meanings"."""
    response = client.embed(model=settings.embed_model, input=texts)
    return response.embeddings


def chat(messages: list[dict]) -> str:
    """Send messages to the chat model and return its reply text."""
    response = client.chat(model=settings.chat_model, messages=messages)
    return response.message.content