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
    db_name: str           # meal_reco (AI 전용 테이블)
    matsul_db_name: str    # matsul (백엔드 공유 테이블)

    kakao_rest_api_key: str | None = None
    redis_url: str

settings = Settings()
