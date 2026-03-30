from apps.schemas.review_schema import ReviewRecord

CHECK_QUERY = """
    SELECT 1
    FROM CRWL_REVIEWS
    WHERE source = %s AND external_review_id = %s
    LIMIT 1
"""

INSERT_QUERY = """
    INSERT INTO CRWL_REVIEWS (
        crawl_place_id, store_name, source, external_review_id,
        rating, review_text, lat, lng, created_at
    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
"""


class ReviewRepository:
    """CRWL_REVIEWS 테이블 데이터 접근 담당"""

    def __init__(self, db_conn):
        self.db_conn = db_conn

    def exists(self, source: str, external_review_id: str) -> bool:
        """중복 리뷰 여부 확인"""
        cursor = self.db_conn.cursor()
        cursor.execute(CHECK_QUERY, (source, external_review_id))
        result = cursor.fetchone()
        cursor.close()
        return result is not None

    def insert(self, record: ReviewRecord) -> bool:
        """리뷰 단건 삽입. 성공 시 True 반환"""
        cursor = self.db_conn.cursor()
        try:
            cursor.execute(
                INSERT_QUERY,
                (
                    record.crawl_place_id,
                    record.store_name,
                    record.source,
                    record.external_review_id,
                    record.rating,
                    record.review_text,
                    record.lat,
                    record.lng,
                    record.created_at,
                ),
            )
            self.db_conn.commit()
            return True
        except Exception as e:
            print(f"Failed to insert review {record.external_review_id}: {e}")
            return False
        finally:
            cursor.close()
