"""
환경변수 설정
"""
from pydantic_settings import BaseSettings


from pydantic import Field, AliasChoices

class Settings(BaseSettings):
    """애플리케이션 설정"""
    openai_api_key: str = Field(validation_alias=AliasChoices("GMS_API_KEY", "OPENAI_API_KEY"))
    openai_model: str = Field(default="gpt-4.1-mini", validation_alias="OPENAI_MODEL")
    gms_api_url: str = Field(default="https://gms.ssafy.io/gmsapi/api.openai.com/v1/chat/completions")

    class Config:
        env_file = ".env"


settings = Settings()
