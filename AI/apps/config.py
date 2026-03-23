"""
환경변수 설정
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """애플리케이션 설정"""
    openai_api_key: str
    openai_model: str
    gms_api_url: str

    # Redis (단기 메모리 + parsed_state 저장, 선택적)
    # 설정 시: RedisSaver 사용, 미설정 시: InMemorySaver (개발용)
    # 예: redis://localhost:6379
    redis_url: str | None = None

    class Config:
        env_file = ".env"


settings = Settings()
