import os
from google import genai
from ollama import Client
from app.core.config import settings

# 1. Ollama client (for embeddings and offline local chat)
client = Client(host=settings.ollama_url)

# 2. Check for Gemini API key
gemini_api_key = settings.gemini_api_key
gemini_client = genai.Client(api_key=gemini_api_key) if gemini_api_key else None

def embed(texts: list[str]) -> list[list[float]]:
    """Keep using nomic-embed-text for local pgvector embeddings."""
    response = client.embed(model=settings.embed_model, input=texts)
    return response.embeddings

def chat(messages: list[dict]) -> str:
    """Use Gemini Cloud API if configured for blazing speed; fallback to Ollama."""
    # If Gemini key is provided, use Gemini 1.5/2.0 Flash
    if gemini_client:
        try:
            # Extract system prompt and user conversation
            system_instruction = next((m["content"] for m in messages if m["role"] == "system"), "")
            conversation_history = "\n".join([f"{m['role'].upper()}: {m['content']}" for m in messages if m["role"] != "system"])

            response = gemini_client.models.generate_content(
                model="gemini-1.5-flash",
                contents=conversation_history,
                config={"system_instruction": system_instruction, "temperature": 0.4}
            )
            return response.text
        except Exception as e:
            print(f"Gemini API error, falling back to Ollama: {e}")

    # Fallback to local Ollama if offline or no key
    CHAT_OPTIONS = {
        "temperature": 0.4,
        "num_ctx": 2048,
        "num_predict": 1024,
    }
    response = client.chat(model=settings.chat_model, messages=messages, options=CHAT_OPTIONS)
    return response.message.content