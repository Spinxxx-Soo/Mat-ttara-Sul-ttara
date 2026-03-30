import httpx
from typing import Dict, Any, Tuple, Union

class KakaoPlaceRepository:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://dapi.kakao.com/v2/local/search/category.json"

    def search_category(self, category_group_code: str, lng: float, lat: float, radius: int, page: int = 1) -> Tuple[int, Union[Dict[str, Any], str]]:
        """
        카카오 로컬 카테고리 검색 API 호출
        카테고리 코드 예시: FD6 (음식점), CE7 (카페)
        """
        headers = {
            "Authorization": f"KakaoAK {self.api_key}"
        }
        params = {
            "category_group_code": category_group_code,
            "x": lng,
            "y": lat,
            "radius": radius,
            "page": page,
            "size": 15
        }
        
        try:
            # 타임아웃 명시적 제어 (연결 5초, 읽기 15초)
            timeout = httpx.Timeout(15.0, connect=5.0)
            with httpx.Client(timeout=timeout) as client:
                response = client.get(self.base_url, headers=headers, params=params)
                if response.status_code == 200:
                    return 200, response.json()
                else:
                    return response.status_code, response.text
        except httpx.TimeoutException:
            return 408, "Request Timeout"
        except httpx.RequestError as e:
            return 500, f"Request Error: {str(e)}"
        except Exception as e:
            return 500, str(e)
