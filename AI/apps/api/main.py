"""
FastAPI 메인 애플리케이션
"""
from fastapi import FastAPI
from apps.api.chat import router as chat_router

app = FastAPI(
    title="AI Server API",
    description="챗봇 대화 처리 및 추천 로직을 담당하는 AI 서버",
    version="1.0.0"
)

# 라우터 등록
app.include_router(chat_router)


@app.get("/")
async def root():
    """헬스 체크 엔드포인트"""
    return {"status": "ok", "message": "AI Server is running"}


@app.get("/health")
async def health():
    """헬스 체크 엔드포인트"""
    return {"status": "healthy"}
