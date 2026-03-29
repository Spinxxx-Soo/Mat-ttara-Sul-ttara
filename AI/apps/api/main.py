"""
FastAPI 메인 애플리케이션
"""
from fastapi import FastAPI

from apps.api.chat.router import router as chat_router
from apps.api.place.router import router as place_router

app = FastAPI(
    title="AI Server API",
    description="챗봇 대화 처리 및 추천 로직을 담당하는 AI 서버",
    version="1.0.0"
)

app.include_router(chat_router)
app.include_router(place_router)


@app.get("/")
async def root():
    """헬스 체크 엔드포인트"""
    return {"status": "ok", "message": "AI Server is running"}


@app.get("/health")
async def health():
    """헬스 체크 엔드포인트"""
    return {"status": "healthy"}
