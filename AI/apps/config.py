"""
환경변수 설정
"""
from pathlib import Path

from pydantic import model_validator
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
    matsul_db_name: str | None = None  # matsul (BE 공유). 미설정 시 db_name과 동일 DB 사용

    kakao_rest_api_key: str | None = None

    # True면 /place_candidates 추천 시 단기·장기·장소 벡터 파싱·유사도 요약을 INFO 로그로 남김
    debug_vector_pipeline: bool = False

    # True면 recommendReason을 LLM으로 짧고 부드럽게 재작성 (실패 시 원문 유지)
    rewrite_recommend_reason_llm: bool = True

    # Redis (역할 분리)
    # - redis_checkpoint_url: LangGraph RedisSaver (RediSearch). 인덱스 생성은 Redis 논리 DB 0만 허용됨.
    #   BE와 키를 나누려면 /1 이 아니라 별도 Redis 인스턴스(예: 포트 6380)의 .../0 을 쓰거나, 동일 /0 에서 키 네임스페이스가 겹치지 않게 운영.
    # - redis_be_bridge_url: BE와 통신 (Pub/Sub ai:reply, BE와 동일 인스턴스·DB 권장, 예: /0)
    # - redis_url: 선택. 단일 URL만 쓸 때(레거시). 미설정 시 위 둘 필수.
    redis_url: str | None = None
    redis_checkpoint_url: str | None = None
    redis_be_bridge_url: str | None = None

    @model_validator(mode="after")
    def _validate_redis_urls(self) -> "Settings":
        cp = self.redis_checkpoint_url or self.redis_url
        br = self.redis_be_bridge_url or self.redis_url
        if not cp:
            raise ValueError(
                "REDIS_CHECKPOINT_URL 또는 REDIS_URL 중 하나는 필수입니다."
            )
        if not br:
            raise ValueError(
                "REDIS_BE_BRIDGE_URL 또는 REDIS_URL 중 하나는 필수입니다."
            )
        return self


settings = Settings()


def redis_checkpoint_connection_url() -> str:
    u = settings.redis_checkpoint_url or settings.redis_url
    if not u:
        raise RuntimeError("Redis checkpoint URL not configured")
    return u


def redis_be_bridge_connection_url() -> str:
    u = settings.redis_be_bridge_url or settings.redis_url
    if not u:
        raise RuntimeError("Redis BE bridge URL not configured")
    return u
