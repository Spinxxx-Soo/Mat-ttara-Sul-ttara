import hashlib
import html
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from AI.apps.services.naver_local_service import NaverLocalService

_TAG_RE = re.compile(r"<[^>]+>")


def _strip_html(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    return html.unescape(_TAG_RE.sub("", value)).strip()


def _normalize_coord(raw: Any) -> float:
    if raw is None:
        raise ValueError("좌표값이 없습니다.")
    return float(raw) / 10_000_000


def _build_external_place_id(name: str, address: Optional[str], lat: float, lng: float) -> str:
    source = f"NAVER|{name}|{address or ''}|{lat:.7f}|{lng:.7f}"
    digest = hashlib.sha256(source.encode("utf-8")).hexdigest()[:32]
    return f"naver_{digest}"


class PlaceSyncService:
    def __init__(self, local_service: Optional[NaverLocalService] = None) -> None:
        self.local_service = local_service or NaverLocalService()

    def search_and_transform(self, query: str, display: int = 5) -> List[Dict[str, Any]]:
        items = self.local_service.search_local(query=query, display=display)
        now = datetime.now(timezone.utc)

        results: List[Dict[str, Any]] = []
        for item in items:
            name = _strip_html(item.get("title"))
            if not name:
                continue

            address = _strip_html(item.get("roadAddress")) or _strip_html(item.get("address"))
            category = _strip_html(item.get("category"))
            description = _strip_html(item.get("description"))
            url = item.get("link") or None

            lng = _normalize_coord(item.get("mapx"))
            lat = _normalize_coord(item.get("mapy"))

            external_place_id = _build_external_place_id(name, address, lat, lng)

            results.append(
                {
                    "name": name,
                    "address": address,
                    "provider": "NAVER",
                    "external_place_id": external_place_id,
                    "image_url": None,
                    "category": category,
                    "is_open": True,
                    "last_status_checked_at": None,
                    "lat": lat,
                    "lng": lng,
                    "url": url,
                    "phone": None,
                    "opening_hours": None,
                    "description": description,
                    "created_at": now,
                    "last_updated_at": now,
                }
            )

        return results

