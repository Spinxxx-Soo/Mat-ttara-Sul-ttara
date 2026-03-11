"""
DB 초기화 스크립트
- CRWL_REVIEWS 테이블과 STORE_PROFILES 테이블을 생성합니다.
- 실행: python3 scripts/init_db.py
"""

import os
import sys


def load_env(path: str = ".env") -> None:
    if not os.path.exists(path):
        print(f"[ENV] .env not found at: {os.path.abspath(path)}", flush=True)
        return
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def run_sql_file(cursor, sql_path: str) -> None:
    with open(sql_path, "r", encoding="utf-8") as f:
        sql = f.read()

    # 세미콜론으로 구분된 각 문장 실행
    statements = [s.strip() for s in sql.split(";") if s.strip()]
    for stmt in statements:
        try:
            cursor.execute(stmt)
            print(f"  ✅ OK: {stmt[:60].replace(chr(10), ' ')}...")
        except Exception as e:
            print(f"  ⚠️  SKIP: {e}")


def main():
    load_env(".env")

    try:
        import mysql.connector
    except ImportError:
        print("ERROR: mysql-connector-python이 설치되어 있지 않습니다.")
        print("       pip install mysql-connector-python")
        sys.exit(1)

    try:
        conn = mysql.connector.connect(
            host=os.getenv("DB_HOST", "localhost"),
            user=os.getenv("DB_USER", "meal_user"),
            password=os.getenv("DB_PASSWORD", ""),
            database=os.getenv("DB_NAME", "meal_reco"),
        )
        print(f"✅ MySQL 연결 성공 ({os.getenv('DB_HOST')} / {os.getenv('DB_NAME')})\n")
    except Exception as e:
        print(f"❌ DB 연결 실패: {e}")
        print("   .env 파일의 DB_HOST, DB_USER, DB_PASSWORD, DB_NAME을 확인해주세요.")
        sys.exit(1)

    cursor = conn.cursor()

    sql_files = [
        ("sql/crawl_reviews.sql",        "CRWL_REVIEWS 테이블"),
        ("sql/create_store_profiles.sql", "STORE_PROFILES 테이블"),
    ]

    for sql_path, description in sql_files:
        if not os.path.exists(sql_path):
            print(f"⚠️  {sql_path} 파일을 찾을 수 없습니다. 건너뜁니다.")
            continue
        print(f"[{description}] 생성 중...")
        run_sql_file(cursor, sql_path)
        print()

    conn.commit()
    cursor.close()
    conn.close()

    print("🎉 DB 초기화 완료!")
    print()
    print("다음 단계:")
    print("  1. python3 scripts/collect_places.py  ← 대전 맛집 Place ID 수집")
    print("  2. python3 scripts/save_reviews.py    ← 리뷰 수집 및 DB 저장")


if __name__ == "__main__":
    main()
