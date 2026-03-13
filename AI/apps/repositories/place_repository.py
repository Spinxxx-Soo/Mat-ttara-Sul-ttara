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
