from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """App settings, loaded from the .env file."""

    database_url: str

    # Ollama (local AI). Defaults are used if missing from .env
    ollama_url: str = "http://localhost:11434"
    embed_model: str = "nomic-embed-text"   # turns text into 768 numbers
    chat_model: str = "llama3.2:3b"         # writes the replies

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()