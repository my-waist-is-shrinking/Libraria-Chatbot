from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    ollama_url: str = "http://localhost:11434"
    embed_model: str = "nomic-embed-text"
    chat_model: str = "llama3.2:3b"
    gemini_api_key: str | None = None   # <--- ADD THIS LINE HERE

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="forbid",   # (Or change this to extra="ignore" so extra vars never crash)
    )

settings = Settings()