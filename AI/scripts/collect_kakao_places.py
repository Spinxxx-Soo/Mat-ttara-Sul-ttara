import json
import os
import sys

from apps.services.place.collect_kakao_place_service import CollectKakaoPlaceService

def load_env(path: str = ".env") -> None:
    if not os.path.exists(path):
        print(f"[ENV] .env not found at: {os.path.abspath(path)}", flush=True)
        return
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

def main():
    load_env(".env")
    api_key = os.getenv("KAKAO_REST_API_KEY", "").strip()
    if not api_key:
        print("ERROR: KAKAO_REST_API_KEY 환경변수가 설정되어 있지 않습니다.")
        sys.exit(1)

    print("Kakao Grid Place Collector를 시작합니다...")
    service = CollectKakaoPlaceService(api_key)
    service.run()

if __name__ == "__main__":
    main()
