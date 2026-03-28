"""
추천 로직에 필요한 DB조회 레포지토리
"""
import json
import mysql.connector
from typing import Dict, List, Optional

from apps.config import settings
from apps.services.place.memory_keys import ORDERED_KEY_NAMES


class RecommendRepository:
    def __init__(self):
        self.db_config = {
            "host": settings.db_host,
            "user": settings.db_user,
            "password": settings.db_password,
            "database": settings.db_name           # meal_reco
        }
        matsul_db = settings.matsul_db_name or settings.db_name
        self.matsul_db_config = {
            "host": settings.db_host,
            "user": settings.db_user,
            "password": settings.db_password,
            "database": matsul_db,
        }

    def get_connection(self):
        return mysql.connector.connect(**self.db_config)

    def get_matsul_connection(self):
        return mysql.connector.connect(**self.matsul_db_config)

    def get_user_memory(self, user_id: int) -> Dict[str, float]:
        """
        USER_MEMORY 테이블에서 사용자의 장기 기억(24차원)을 딕셔너리로 로드합니다.
        가중치(weight)를 반영한 값을 반환합니다.
        """
        query = """
            SELECT memory_key, memory_value, weight
            FROM user_memory
            WHERE user_id = %s
        """
        long_term_mem = {}
        try:
            with self.get_connection() as conn:
                with conn.cursor(dictionary=True) as cursor:
                    cursor.execute(query, (user_id,))
                    rows = cursor.fetchall()
                    for row in rows:
                        key = row["memory_key"]
                        if key in ORDERED_KEY_NAMES:
                            # 값을 [memory_value * weight] 등의 방식으로 사용 가능
                            # 현재는 memory_value를 직접 사용한다고 가정
                            long_term_mem[key] = float(row["memory_value"])
        except Exception as e:
            print(f"[-] get_user_memory Error (user_id={user_id}): {e}")
            
        return long_term_mem

    def get_user_preference(self, user_id: int) -> Optional[Dict[str, str]]:
        """
        USER_PREFERENCE 테이블에서 사용자의 기본 정보를 조회합니다.
        """
        query = """
            SELECT usage_type, age_group, gender
            FROM user_preferences
            WHERE user_id = %s
            ORDER BY created_at DESC LIMIT 1
        """
        try:
            with self.get_matsul_connection() as conn:
                with conn.cursor(dictionary=True) as cursor:
                    cursor.execute(query, (user_id,))
                    row = cursor.fetchone()
                    return row
        except Exception as e:
            print(f"[-] get_user_preference Error (user_id={user_id}): {e}")
            return None

    def get_place_vectors(self, place_ids: List[int]) -> Dict[int, List[float]]:
        """
        PLACE_MEMORY_VECTOR 테이블에서 후보 식당들의 24차원 벡터를 조회합니다.
        """
        if not place_ids:
            return {}

        # place_ids 개수만큼 %s 플레이스홀더 동적 생성
        format_strings = ','.join(['%s'] * len(place_ids))
        query = f"""
            SELECT place_id, vector_data
            FROM place_memory_vector
            WHERE place_id IN ({format_strings})
        """
        vectors = {}
        try:
            with self.get_connection() as conn:
                with conn.cursor(dictionary=True) as cursor:
                    cursor.execute(query, tuple(place_ids))
                    rows = cursor.fetchall()
                    for row in rows:
                        pid = row["place_id"]
                        data_str = row["vector_data"]
                        try:
                            # DB에 저장된 json문자열을 파싱
                            # extract_place_vectors_llm.py에서 JSON string으로 넣었으므로 json 파싱 필요
                            if isinstance(data_str, str):
                                vectors[pid] = json.loads(data_str)
                            else:
                                vectors[pid] = data_str
                        except Exception:
                            vectors[pid] = [0.0] * 24
        except Exception as e:
            print(f"[-] get_place_vectors Error: {e}")

        return vectors

    def get_places_details(self, place_ids: List[int]) -> Dict[int, Dict[str, object]]:
        """
        PLACES 테이블에서 추천 대상 장소 상세정보를 조회합니다.

        Returns:
            {place_id: {"name":..., "address":..., "lat":..., "lng":..., "category":...}}
        """
        if not place_ids:
            return {}

        format_strings = ",".join(["%s"] * len(place_ids))
        query = f"""
            SELECT place_id, name, address, lat, lng, category
            FROM places
            WHERE place_id IN ({format_strings})
        """

        try:
            with self.get_matsul_connection() as conn:
                with conn.cursor(dictionary=True) as cursor:
                    cursor.execute(query, tuple(place_ids))
                    rows = cursor.fetchall()

                    return {
                        int(row["place_id"]): {
                            "name": row.get("name"),
                            "address": row.get("address"),
                            "lat": row.get("lat"),
                            "lng": row.get("lng"),
                            "category": row.get("category"),
                        }
                        for row in rows
                        if row and row.get("place_id") is not None
                    }
        except Exception as e:
            print(f"[-] get_places_details Error: {e}")
            return {}
