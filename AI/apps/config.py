"""
환경변수 설정
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """애플리케이션 설정"""
    openai_api_key: str
    openai_model: str
    gms_api_url: str
    
    redis_url: str | None = None

    class Config:
        env_file = ".env"


settings = Settings()
