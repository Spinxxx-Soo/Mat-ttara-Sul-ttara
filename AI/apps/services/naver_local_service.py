import os
from typing import Any, Dict, List

import requests


class NaverLocalService:
    BASE_URL = "https://openapi.naver.com/v1/search/local.json"

    def __init__(
        self,
        client_id: str | None = None,
        client_secret: str | None = None,
        timeout_seconds: int = 10,
    ) -> None:
        self.client_id = client_id or os.getenv("NAVER_SEARCH_CLIENT_ID", "")
        self.client_secret = client_secret or os.getenv("NAVER_SEARCH_CLIENT_SECRET", "")
        self.timeout_seconds = timeout_seconds
        if not self.client_id or not self.client_secret:
            raise RuntimeError(
                "NAVER_SEARCH_CLIENT_ID / NAVER_SEARCH_CLIENT_SECRET 환경변수가 설정되지 않았습니다."
            )

    def search_local(
        self,
        query: str,
        display: int = 5,
        start: int = 1,
        sort: str = "random",
    ) -> List[Dict[str, Any]]:
        headers = {
            "X-Naver-Client-Id": self.client_id,
            "X-Naver-Client-Secret": self.client_secret,
        }
        params = {
            "query": query,
            "display": display,
            "start": start,
            "sort": sort,
        }

        response = requests.get(
            self.BASE_URL, headers=headers, params=params, timeout=self.timeout_seconds
        )
        response.raise_for_status()
        data = response.json()
        items = data.get("items", [])
        if not isinstance(items, list):
            return []
        return items

