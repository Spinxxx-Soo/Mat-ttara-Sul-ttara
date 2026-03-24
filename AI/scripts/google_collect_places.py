import json
import os
import sys

from apps.services.google_collect_place_service import CollectPlaceService


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
    api_key = os.getenv("GOOGLE_API_KEY", "").strip()
    if not api_key:
        print("ERROR: GOOGLE_API_KEY가 없습니다.")
        sys.exit(1)

    service = CollectPlaceService(api_key)
    service.run()


if __name__ == "__main__":
    main()
