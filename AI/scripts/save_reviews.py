import json
import os
import sys

import mysql.connector

from apps.services.save_review_service import SaveReviewService

PLACES_INPUT_PATH = "places_data.json"


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


def load_places_data() -> dict:
    if not os.path.exists(PLACES_INPUT_PATH):
        print(f"ERROR: {PLACES_INPUT_PATH} 파일이 없습니다.")
        sys.exit(1)
    with open(PLACES_INPUT_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def main():
    load_env(".env")
    api_key = os.getenv("GOOGLE_API_KEY", "").strip()
    if not api_key:
        print("ERROR: GOOGLE_API_KEY가 없습니다.")
        sys.exit(1)

    places_data = load_places_data()

    try:
        conn = mysql.connector.connect(
            host=os.getenv("DB_HOST", "localhost"),
            user=os.getenv("DB_USER", "meal_user"),
            password=os.getenv("DB_PASSWORD", "1234"),
            database=os.getenv("DB_NAME", "meal_reco"),
        )
        print("Connected to MySQL.")
    except Exception as e:
        print(f"Database connection error: {e}")
        sys.exit(1)

    try:
        service = SaveReviewService(api_key, conn)
        service.run(places_data)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
