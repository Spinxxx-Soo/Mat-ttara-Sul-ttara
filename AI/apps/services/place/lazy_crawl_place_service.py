import httpx
from typing import Dict, Any

class KakaoLazyCrawlService:
    """
    유저가 저희 서비스 화면에서 특정 식당 카드를 클릭했을 때,
    실시간(On-Demand)으로 카카오맵의 숨겨진 내부 API를 찔러
    DB(4번 테이블)에 부족한 상세 정보(메뉴 리스트, 가게 소개글 등)를 가져와
    채워 넣는 지연 로직(Lazy Loading) 담당 클래스입니다.
    """
    
    @staticmethod
    def fetch_place_details(kakao_place_id: str) -> Dict[str, Any]:
        # 무거운 셀레니움 크롤링 대신, 카카오맵 상세페이지가 몰래 쓰는 엄청나게 빠른 내부 JSON API (크롤링 꿀팁)
        url = f"https://place.map.kakao.com/main/v/{kakao_place_id}"
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": f"https://place.map.kakao.com/{kakao_place_id}"
        }
        
        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(url, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    
                    # 1. 가게 소개글 (description)
                    basic_info = data.get("basicInfo", {})
                    description = basic_info.get("introduction", "")
                    
                    # 2. 메뉴 리스트 (menu)
                    menu_info = data.get("menuInfo", {})
                    menu_list = menu_info.get("menuList", [])
                    extracted_menus = [
                        {"name": m.get("menu"), "price": m.get("price")} 
                        for m in menu_list if m.get("menu")
                    ]
                    
                    # 3. 추가 분위기 태그들 (tags)
                    tags = basic_info.get("tags", [])
                    
                    return {
                        "status": "success",
                        "description": description,
                        "menus": extracted_menus,
                        "tags": tags
                    }
                else:
                    return {"status": "error", "reason": f"HTTP {resp.status_code}"}
        except Exception as e:
            return {"status": "error", "reason": str(e)}

if __name__ == "__main__":
    # Test (예시: 성심당 본점의 카카오 고유 ID)
    test_id = "8056808"
    print(f"Testing Lazy Crawl for Kakao ID: {test_id} ...\n")
    result = KakaoLazyCrawlService.fetch_place_details(test_id)
    
    import json
    print(json.dumps(result, indent=2, ensure_ascii=False))
