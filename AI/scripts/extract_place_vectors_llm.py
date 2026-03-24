"""
식당 메타정보(카테고리, 소개글 등) + 리뷰 기반 24차원 취향 벡터 추출 스크립트 (LLM 기반)
"""
import sys
import os
import json
import asyncio
import mysql.connector
from typing import List, Dict, Any, Optional

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from apps.config import settings
from apps.domain.chat.client import OpenAIClient
from apps.domain.recommend.memory_keys import ORDERED_KEY_NAMES

DB_CONFIG = {
    "host": settings.db_host,
    "user": settings.db_user,
    "password": settings.db_password,
    "database": settings.db_name
}

def get_db_connection():
    return mysql.connector.connect(**DB_CONFIG)

def fetch_pending_places(conn) -> List[Dict[str, Any]]:
    """벡터 변환이 필요한 메타데이터 목록 조회 (아직 place_memory_vector에 없는 식당만)"""
    cursor = conn.cursor(dictionary=True)
    query = """
        SELECT 
            p.place_id, p.name, p.category, p.description, p.address, p.opening_hours
        FROM PLACES p
        JOIN CRWL_REVIEWS r ON p.place_id = r.place_id
        LEFT JOIN PLACE_MEMORY_VECTOR v ON p.place_id = v.place_id
        WHERE v.vector_data IS NULL
        GROUP BY p.place_id, p.name, p.category, p.description, p.address, p.opening_hours
        HAVING COUNT(r.review_text) >= 5
    """
    cursor.execute(query)
    results = cursor.fetchall()
    cursor.close()
    return results

def fetch_reviews_for_place(conn, place_id: int, limit: int = 15) -> List[str]:
    """특정 식당의 최근 리뷰 텍스트와 별점 가져오기"""
    cursor = conn.cursor(dictionary=True)
    query = """
        SELECT rating, review_text 
        FROM CRWL_REVIEWS 
        WHERE place_id = %s AND review_text IS NOT NULL AND review_text != ''
        ORDER BY crawled_at DESC
        LIMIT %s
    """
    cursor.execute(query, (place_id, limit))
    
    reviews = []
    for row in cursor.fetchall():
        rating = row.get("rating")
        rating_str = f"[별점 {rating}점]" if rating else "[별점 없음]"
        reviews.append(f"{rating_str} {row['review_text']}")
        
    cursor.close()
    return reviews

def normalize_vector_dict(raw: Dict[str, Any]) -> Dict[str, Optional[float]]:
    """
    LLM 응답을 정규화:
    - 범위 초과 숫자 클램프 (0.0~1.0)
    - 누락 및 'null' 문자열 등을 고려하여 None 반환
    """
    normalized: Dict[str, Optional[float]] = {}
    for key in ORDERED_KEY_NAMES:
        value = raw.get(key, None)
        
        if value is None:
            normalized[key] = None
            continue
            
        if isinstance(value, str):
            s = value.strip().lower()
            if s in ("null", "none", ""):
                normalized[key] = None
                continue
            try:
                value = float(value)
            except ValueError:
                normalized[key] = None
                continue
                
        if isinstance(value, (int, float)):
            value = max(0.0, min(1.0, float(value)))
            normalized[key] = round(value, 4)
        else:
            normalized[key] = None
            
    return normalized

def save_vector_to_db(conn, place_id: int, vector_dict: Dict[str, Optional[float]]):
    """추출된 24차원 벡터를 DB에 저장 (None/null 허용)"""
    cursor = conn.cursor()
    vector_array = [vector_dict.get(key, None) for key in ORDERED_KEY_NAMES]
    vector_json = json.dumps(vector_array, ensure_ascii=False)
    query = """
        INSERT INTO PLACE_MEMORY_VECTOR (place_id, vector_data, created_at)
        VALUES (%s, %s, NOW())
        ON DUPLICATE KEY UPDATE 
            vector_data = VALUES(vector_data),
            updated_at = NOW()
    """
    try:
        cursor.execute(query, (place_id, vector_json))
        conn.commit()
    except Exception as e:
        print(f"[-] DB 저장 에러 (place_id={place_id}): {type(e).__name__}: {e}")
        import traceback; traceback.print_exc()
    finally:
        cursor.close()

async def extract_vector_for_place(client: OpenAIClient, place_meta: Dict[str, Any], reviews: List[str]) -> Dict[str, float]:
    """LLM을 호출하여 24차원 벡터 수치 추출"""
    
    name = place_meta.get("name", "이름 없음")
    category = place_meta.get("category", "") or "분류 안됨"
    description = place_meta.get("description", "") or "소개 없음"
    address = place_meta.get("address", "") or "주소 정보 없음"
    opening_hours = place_meta.get("opening_hours")
    
    # 시간 데이터가 비어있으면 프롬프트에서 생략, 있으면 압축 요약
    hours_info = ""
    if opening_hours:
        hours_info = f"- 영업시간 참고: {opening_hours} (야간 영업, 브레이크타임 등에서 occasion/vibe 힌트 도출. 비어있거나 무관하면 무시할 것)"
    
    reviews_text = "\n".join([f"- {r}" for r in reviews])
    
    system_prompt = """식당 정보와 리뷰를 보고, 아래 24개 키에 대해 0.0~1.0 또는 null(정보부족)로만 평가하라.
- 0.0=없음, 1.0=매우강함, null=판단불가. 극단값은 명확한 근거가 있을 때만.
- cuisine_*: 카테고리 기준 최우선 판단(해당=1.0, 아니면=0.0)
- price_range: 주소 상권+카테고리 기반
- taste_*: 좋다/나쁘다 아닌 맛의 특성
- JSON만 반환. 마크다운/설명 금지.
Keys: cuisine_korean,cuisine_japanese,cuisine_chinese,cuisine_western,cuisine_bunsik,cuisine_asian_other,price_range,vibe_quiet,vibe_lively,vibe_modern,vibe_traditional,seat_private,outdoor_ok,crowd_tolerance,wait_tolerance,parking_available,occasion_solo,occasion_date,occasion_friends,occasion_family,occasion_business,taste_spicy,taste_light,taste_rich"""

    hours_str = f"영업시간:{opening_hours} " if opening_hours else ""
    user_prompt = f"""{name} | {category} | {address}
{hours_str}{description}

리뷰({len(reviews)}건):\n{reviews_text}"""

    messages = client.create_messages(system_prompt, user_prompt)
    
    try:
        # 추론 모델은 내부 추론(reasoning_tokens)으로 많은 토큰을 소모하므로 제한을 크게 늘려줍니다.
        response = await client.chat_completion(messages, max_tokens=4096)
        content = response["choices"][0]["message"]["content"]
        
        if content.startswith("```"):
            content = content.strip("`").removeprefix("json").strip()
            
        try:
            raw_vector = json.loads(content)
        except Exception as e:
            print(f"\n[!] JSON 파싱 에러! LLM 원본 응답 내용:\n{repr(content)}\n전체 API 응답:\n{response}\n")
            raise e
        vector_dict = normalize_vector_dict(raw_vector)
        return vector_dict
    except Exception as e:
        print(f"[-] Place ID {place_meta.get('place_id')} LLM 호출 중 에러 발생: {e}")
        return None

async def process_place_task(client: OpenAIClient, place_meta: Dict[str, Any], semaphore: asyncio.Semaphore, current_idx: int, total_count: int):
    """개별 식당 처리 태스크 (세마포어로 동시성 제어)"""
    async with semaphore:
        place_id = place_meta["place_id"]
        place_name = place_meta["name"]
        
        # 각 태스크마다 별도의 DB 연결 (동시성 안전을 위해)
        try:
            conn = get_db_connection()
            reviews = fetch_reviews_for_place(conn, place_id)
            if not reviews:
                conn.close()
                return
            
            print(f"[{current_idx}/{total_count}] 식당: {place_name} (ID: {place_id}) - 분석 시작...")
            vector_dict = await extract_vector_for_place(client, place_meta, reviews)
            
            if vector_dict:
                save_vector_to_db(conn, place_id, vector_dict)
                print(f"  └── [OK] {place_name} 저장 완료")
            
            conn.close()
        except Exception as e:
            print(f"  └── [!] {place_name} 처리 중 에러: {e}")

async def main():
    print("[*] DB 연결 중 (최초 조회)...")
    try:
        conn = get_db_connection()
        places = fetch_pending_places(conn)
        conn.close()
    except Exception as e:
        print(f"[-] DB 조회 실패: {e}")
        return

    print(f"[*] 벡터 변환 대상 식당 수: {len(places)} 개")
    if not places:
        print("[*] 조건을 만족하는 식당이 없습니다.")
        return

    client = OpenAIClient()
    semaphore = asyncio.Semaphore(100)  # 동시 요청 수 100개로 대폭 상향
    
    print(f"[*] 병렬 처리 시작 (동시성: 100)...")
    
    tasks = []
    for i, meta in enumerate(places, 1):
        tasks.append(process_place_task(client, meta, semaphore, i, len(places)))
        
    await asyncio.gather(*tasks)
    print("\n[*] 모든 작업이 완료되었습니다.")

if __name__ == "__main__":
    asyncio.run(main())
