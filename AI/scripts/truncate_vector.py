import sys
import os
import mysql.connector

# 상위 폴더의 apps.config 내용 가져오기
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from apps.config import settings

def main():
    print("[*] DB 연결 중...")
    try:
        conn = mysql.connector.connect(
            host=settings.db_host,
            user=settings.db_user,
            password=settings.db_password,
            database=settings.db_name
        )
        cursor = conn.cursor()
        
        # 테이블 내 모든 데이터 삭제 (TRUNCATE)
        # FOREIGN KEY 제약 조건이 걸려있는 경우 DELETE FROM 을 권장합니다.
        # place_memory_vector는 참조하는 자식 테이블이 없으므로 TRUNCATE 사용.
        cursor.execute("TRUNCATE TABLE PLACE_MEMORY_VECTOR")
        conn.commit()
        
        print("[+] 20번 테이블 (PLACE_MEMORY_VECTOR) 데이터가 모두 초기화 되었습니다!")
    except Exception as e:
        print(f"[-] 초기화 중 에러 발생: {e}")
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'conn' in locals() and conn.is_connected():
            conn.close()

if __name__ == "__main__":
    main()
