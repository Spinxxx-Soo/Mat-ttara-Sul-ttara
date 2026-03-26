"""
환경변수 설정
"""
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    """애플리케이션 설정"""

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        case_sensitive=False,
        extra="ignore",
    )

    openai_api_key: str
    openai_model: str
    gms_api_url: str

    db_host: str
    db_user: str
    db_password: str
    db_name: str

    kakao_rest_api_key: str | None = None
    redis_url: str

settings = Settings()
