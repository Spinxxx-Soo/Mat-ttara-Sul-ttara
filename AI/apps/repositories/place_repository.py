from typing import Any, Dict, List, Protocol


class _SessionLike(Protocol):
    def add(self, instance: Any) -> None: ...
    def commit(self) -> None: ...
    def query(self, model: Any) -> Any: ...


class PlaceRepository:
    def upsert_places(self, db: _SessionLike, PlaceModel: Any, places: List[Dict[str, Any]]) -> Dict[str, int]:
        inserted = 0
        updated = 0

        for payload in places:
            existing = (
                db.query(PlaceModel)
                .filter(PlaceModel.external_place_id == payload["external_place_id"])
                .one_or_none()
            )

            if existing is None:
                db.add(PlaceModel(**payload))
                inserted += 1
                continue

            existing.name = payload["name"]
            existing.address = payload["address"]
            existing.category = payload["category"]
            existing.lat = payload["lat"]
            existing.lng = payload["lng"]
            existing.url = payload["url"]
            existing.description = payload["description"]
            existing.last_updated_at = payload["last_updated_at"]
            updated += 1

        db.commit()
        return {"inserted": inserted, "updated": updated}

import requests

BASE = "https://places.googleapis.com/v1"


class PlaceRepository:
    """Google Places API 호출 담당"""

    def __init__(self, api_key: str):
        self.api_key = api_key

    def search_nearby(self, lat: float, lng: float, radius: float):
        """
        주변 식당 검색 (Places API Nearby Search)
        Returns: (status_code, response_data)
        """
        url = f"{BASE}/places:searchNearby"
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": self.api_key,
            "X-Goog-FieldMask": "places.id,places.displayName,places.location",
        }
        payload = {
            "includedTypes": ["restaurant"],
            "maxResultCount": 20,
            "rankPreference": "DISTANCE",
            "locationRestriction": {
                "circle": {
                    "center": {
                        "latitude": lat,
                        "longitude": lng,
                    },
                    "radius": radius,
                }
            },
        }

        r = requests.post(url, headers=headers, json=payload, timeout=(5, 20))
        return r.status_code, r.json()

    def get_place_details(self, place_id: str, language_code: str = "ko") -> dict:
        """
        장소 상세 정보 조회 (리뷰, 평점 포함)
        Returns: {"type": "success"|"http_error"|"no_response", ...}
        """
        url = f"{BASE}/places/{place_id}"
        headers = {
            "X-Goog-Api-Key": self.api_key,
            "X-Goog-FieldMask": "id,displayName,rating,reviews,location",
        }
        params = {"languageCode": language_code}

        try:
            r = requests.get(url, headers=headers, params=params, timeout=(5, 20))

            try:
                data = r.json()
            except Exception:
                data = None

            if r.status_code == 200:
                return {"type": "success", "status_code": 200, "data": data}

            return {"type": "http_error", "status_code": r.status_code, "data": data}

        except requests.exceptions.Timeout:
            return {"type": "no_response", "reason": "timeout", "data": None}
        except requests.exceptions.ConnectionError:
            return {"type": "no_response", "reason": "connection_error", "data": None}
        except requests.exceptions.RequestException as e:
            return {"type": "no_response", "reason": f"request_exception: {e}", "data": None}
