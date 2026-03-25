"""
환경변수 설정
"""
from pydantic_settings import BaseSettings


import os
from pathlib import Path
from pydantic import Field, AliasChoices
from pydantic_settings import SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    """애플리케이션 설정"""
    openai_api_key: str = Field(validation_alias=AliasChoices("GMS_API_KEY", "OPENAI_API_KEY"))
    openai_model: str = Field(default="gpt-5-nano", validation_alias="OPENAI_MODEL")
    gms_api_url: str = Field(default="https://gms.ssafy.io/gmsapi/api.openai.com/v1/chat/completions")
    
    # DB Settings
    db_host: str = Field(default="localhost", validation_alias="DB_HOST")
    db_user: str = Field(default="meal_user", validation_alias="DB_USER")
    db_password: str = Field(default="1234", validation_alias="DB_PASSWORD")
    db_name: str = Field(default="meal_reco", validation_alias="DB_NAME")
    
    kakao_rest_api_key: str = Field(default="", validation_alias="KAKAO_REST_API_KEY")

    model_config = SettingsConfigDict(env_file=os.path.join(BASE_DIR, ".env"), extra="ignore")


settings = Settings()
