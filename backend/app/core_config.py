from pydantic import BaseModel, Field
import os

class Settings(BaseModel):
    app_name: str = "AtlasBuilder"
    api_prefix: str = "/api"
    db_url: str = Field(default_factory=lambda: os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@db:5432/atlas"))
    jwt_secret: str = Field(default_factory=lambda: os.getenv("JWT_SECRET", "dev-secret"))
    jwt_algorithm: str = "HS256"
    access_token_expires_minutes: int = 60 * 24
    free_record_limit: int = int(os.getenv("FREE_RECORD_LIMIT", "500"))
    cors_origins: list[str] = Field(default_factory=lambda: os.getenv("CORS_ORIGINS", "http://localhost:3001,http://localhost:3000").split(","))

settings = Settings()
