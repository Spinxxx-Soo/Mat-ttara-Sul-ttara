import json


def parse_publish_time(publish_time_str: str) -> str | None:
    """ISO 시간 문자열을 MySQL TIMESTAMP 형식으로 변환"""
    if not publish_time_str:
        return None
    return publish_time_str.replace("T", " ").replace("Z", "")


def is_quota_error(result: dict) -> bool:
    """Google API 쿼터/과금 오류 여부 판단"""
    if result.get("type") != "http_error":
        return False

    status_code = result.get("status_code")
    data = result.get("data") or {}

    if status_code == 429:
        return True

    if status_code == 403:
        msg = json.dumps(data, ensure_ascii=False).lower()
        keywords = [
            "quota",
            "billing",
            "rate limit",
            "resource exhausted",
            "daily limit",
            "quota exceeded",
            "billing account",
            "usage limit",
        ]
        for keyword in keywords:
            if keyword in msg:
                return True

    return False
