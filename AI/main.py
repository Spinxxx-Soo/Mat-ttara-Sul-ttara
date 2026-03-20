"""
AI 서버 메인 진입점
"""
import uvicorn
from apps.api.main import app

if __name__ == "__main__":
    uvicorn.run(
        "apps.api.main:app",
        host="0.0.0.0",
        port=5000,
        reload=True
    )
