"""
식당 리뷰 기반 24차원 취향 벡터 추출 스크립트 (LLM 기반)
"""
import sys
import os
import json
import time
import asyncio
import mysql.connector
from typing import List, Dict

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from apps.config import settings
from apps.domain.chat.client import OpenAIClient
from apps.domain.recommend.memory_keys import ORDERED_KEY_NAMES

# DB 연결 정보 (.env 등에서 가져와도 됨)
DB_CONFIG = {
    "host": "127.0.0.1",
    "user": "meal_user",
    "password": "1234",
    "database": "meal_reco"
}

def get_db_connection():
    return mysql.connector.connect(**DB_CONFIG)

def fetch_pending_places(conn) -> List[str]:
    """벡터 변환이 필요한 crawl_place_id 목록 조회 (이미 변환된 것은 제외)"""
    cursor = conn.cursor()
    # PLACE_MEMORY_VECTOR에 없는 place_id만 가져옴
    query = """
        SELECT c.crawl_place_id 
        FROM CRWL_REVIEWS c
        LEFT JOIN PLACE_MEMORY_VECTOR p ON c.crawl_place_id = p.crawl_place_id
        WHERE c.crawl_place_id IS NOT NULL AND p.crawl_place_id IS NULL
        GROUP BY c.crawl_place_id
        HAVING COUNT(c.review_text) >= 5
    """
    cursor.execute(query)
    results = [row[0] for row in cursor.fetchall()]
    cursor.close()
    return results

def fetch_reviews_for_place(conn, crawl_place_id: str, limit: int = 15) -> List[str]:
    """특정 식당의 최근 리뷰 텍스트 가져오기"""
    cursor = conn.cursor()
    query = """
        SELECT review_text 
        FROM CRWL_REVIEWS 
        WHERE crawl_place_id = %s AND review_text IS NOT NULL AND review_text != ''
        ORDER BY crawled_at DESC
        LIMIT %s
    """
    cursor.execute(query, (crawl_place_id, limit))
    reviews = [row[0] for row in cursor.fetchall()]
    cursor.close()
    return reviews

def save_vector_to_db(conn, crawl_place_id: str, vector_dict: Dict[str, float]):
    """추출된 24차원 벡터를 DB에 저장"""
    cursor = conn.cursor()
    
    # 24차원 순서에 맞춘 리스트 생성 (기본값 0.0)
    # LLM이 누락한 키가 있으면 0.0으로 처리
    vector_array = [vector_dict.get(key, 0.0) for key in ORDERED_KEY_NAMES]
    vector_json = json.dumps(vector_array)
    
    query = """
        INSERT INTO PLACE_MEMORY_VECTOR (crawl_place_id, vector_data, created_at)
        VALUES (%s, %s, NOW())
        ON DUPLICATE KEY UPDATE 
            vector_data = VALUES(vector_data),
            updated_at = NOW()
    """
    cursor.execute(query, (crawl_place_id, vector_json))
    conn.commit()
    cursor.close()

async def extract_vector_for_place(client: OpenAIClient, crawl_place_id: str, reviews: List[str]) -> Dict[str, float]:
    """LLM을 호출하여 24차원 벡터 수치 추출"""
    reviews_text = "\n".join([f"- {r}" for r in reviews])
    
    system_prompt = f"""너는 식당 리뷰를 분석하여 24차원 취향 벡터를 추출하는 AI야.
주어진 리뷰들을 읽고, 다음 24개의 구체적인 평가 기준(Memory Key)에 대해 0.0에서 1.0 사이의 점수를 매겨줘.
리뷰 내용에서 추론할 수 없는 항목은 0.0 으로 줘.
반드시 아래 제시된 JSON 형식으로만 응답해야 해 (결과 외의 마크다운이나 부연설명 금지).

[Memory Keys: 0.0~1.0 배점 기준]
- 음식 종류 (해당하면 1.0, 아니면 0.0): cuisine_korean, cuisine_japanese, cuisine_chinese, cuisine_western, cuisine_bunsik, cuisine_asian_other
- 가격대 (0.0=저렴, 1.0=비쌈): price_range
- 분위기 (0.0~1.0 매핑): vibe_quiet (조용함), vibe_lively (활기참), vibe_modern (모던함), vibe_traditional (전통적), seat_private (룸/프라이빗), outdoor_ok (야외석)
- 혼잡/편의 (0.0=안좋음, 1.0=좋음): crowd_tolerance (덜 혼잡함), wait_tolerance (웨이팅 적음), parking_required (주차 가능)
- 목적 (0.0~1.0): occasion_solo(혼밥), occasion_date(데이트), occasion_friends(친구), occasion_family(가족), occasion_business(비즈니스)
- 맛 (0.0~1.0): taste_spicy(매움), taste_light(담백/건강식), taste_rich(자극적/진함)

[출력 JSON 예시]
{{
  "cuisine_korean": 1.0, "cuisine_japanese": 0.0, "cuisine_chinese": 0.0, "cuisine_western": 0.0, "cuisine_bunsik": 0.0, "cuisine_asian_other": 0.0,
  "price_range": 0.3, "vibe_quiet": 0.0, "vibe_lively": 0.8, "vibe_modern": 0.0, "vibe_traditional": 0.9, "seat_private": 0.0, "outdoor_ok": 0.0,
  "crowd_tolerance": 0.2, "wait_tolerance": 0.1, "parking_required": 0.0,
  "occasion_solo": 0.1, "occasion_date": 0.2, "occasion_friends": 0.9, "occasion_family": 0.3, "occasion_business": 0.0,
  "taste_spicy": 0.8, "taste_light": 0.0, "taste_rich": 0.9
}}
"""

    user_prompt = f"[식당 ID: {crawl_place_id}]\n다음 리뷰들을 분석해 JSON을 출력해:\n{reviews_text}"
    
    messages = client.create_messages(system_prompt, user_prompt)
    
    try:
        response = await client.chat_completion(messages, max_tokens=1024, temperature=0.1)
        # GMS 응답 파싱
        content = response["choices"][0]["message"]["content"]
        # 마크다운 블록 제거 처리 (가끔 프롬프트 지시를 무시하고 ```json 을 붙이는 경우 대응)
        if content.startswith("```"):
            content = content.strip("`").removeprefix("json").strip()
            
        vector_dict = json.loads(content)
        return vector_dict
    except Exception as e:
        print(f"[-] Place {crawl_place_id} LLM 호출 중 에러 발생: {e}")
        return None

async def main():
    print("[*] DB 연결 중...")
    try:
        conn = get_db_connection()
    except Exception as e:
        print(f"[-] DB 연결 실패: {e}")
        return

    places = fetch_pending_places(conn)
    print(f"[*] 벡터 변환 대상 식당 수: {len(places)} 개")
    
    if not places:
        print("[*] 모든 식당이 이미 변환되었습니다.")
        conn.close()
        return

    client = OpenAIClient()
    
    # 전체 6180여 개 진행
    test_limit = 10000
    process_places = places[:test_limit]
    
    print(f"[*] 시작! (최대 {len(process_places)}개 진행합니다)")
    for i, crawl_place_id in enumerate(process_places, 1):
        reviews = fetch_reviews_for_place(conn, crawl_place_id)
        if not reviews:
            print(f"[{i}/{len(process_places)}] 식당 ID: {crawl_place_id} - 리뷰 없음 (스킵)")
            continue
            
        print(f"[{i}/{len(process_places)}] 식당 ID: {crawl_place_id} - 리뷰 {len(reviews)}건 분석 중...")
        vector_dict = await extract_vector_for_place(client, crawl_place_id, reviews)
        
        if vector_dict:
            save_vector_to_db(conn, crawl_place_id, vector_dict)
            print(f"  └── 분석 완료 및 저장됨")
        
        # Rate limit 우회용 대기시간
        await asyncio.sleep(0.5)

    print("[*] 작업 종료 완료. (추가 진행 시 스크립트를 재실행하거나 제한을 늘리세요)")
    conn.close()

if __name__ == "__main__":
    asyncio.run(main())
