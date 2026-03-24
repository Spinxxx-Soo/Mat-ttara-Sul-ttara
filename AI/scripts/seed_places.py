import json
import os
import sys
import mysql.connector
from dotenv import load_dotenv

UNIFIED_PLACES_PATH = "unified_places_data.json"

def load_unified_data() -> dict:
    if not os.path.exists(UNIFIED_PLACES_PATH):
        print(f"ERROR: {UNIFIED_PLACES_PATH} 파일이 없습니다.")
        sys.exit(1)
    with open(UNIFIED_PLACES_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def main():
    load_dotenv()

    try:
        conn = mysql.connector.connect(
            host=os.getenv("DB_HOST", "127.0.0.1"),
            user=os.getenv("DB_USER", "meal_user"),
            password=os.getenv("DB_PASSWORD", ""),
            database=os.getenv("DB_NAME", "meal_reco"),
            autocommit=False
        )
        cursor = conn.cursor()
        print("Connected to MySQL for seeding.")
    except Exception as e:
        print(f"Database connection error: {e}")
        sys.exit(1)

    places_data = load_unified_data()
    
    # 4번 테이블 삽입 쿼리
    insert_place_query = """
        INSERT INTO PLACES (
            name, address, provider, external_place_id,
            image_url, category, is_open, lat, lng,
            url, phone, opening_hours
        )
        VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
        ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            address = VALUES(address),
            image_url = VALUES(image_url),
            category = VALUES(category),
            is_open = VALUES(is_open),
            lat = VALUES(lat),
            lng = VALUES(lng),
            url = VALUES(url),
            phone = VALUES(phone),
            opening_hours = VALUES(opening_hours),
            last_updated_at = CURRENT_TIMESTAMP;
    """

    print(f"Total items to seed: {len(places_data)}")
    count = 0
    
    for kakao_id, data in places_data.items():
        # Kakao Base Data mapped from unified_places_data.json
        name = data.get("place_name")
        address = data.get("road_address_name") or data.get("address_name")
        provider = "KAKAO"
        external_place_id = kakao_id
        category = data.get("category_name")
        lat = float(data.get("lat", 0))
        lng = float(data.get("lng", 0))
        url = data.get("place_url")
        phone = data.get("phone")
        
        # Google Enrichment Data
        google_place_id = data.get("google_place_id")
        image_url = data.get("image_url")
        opening_hours_raw = data.get("opening_hours")
        opening_hours_json = json.dumps(opening_hours_raw, ensure_ascii=False) if opening_hours_raw else None
        
        # Parse is_open from Google's currentOpeningHours
        is_open = True
        if opening_hours_raw and isinstance(opening_hours_raw, dict):
            is_open = opening_hours_raw.get("openNow", True)
            
        try:
            cursor.execute(insert_place_query, (
                name, address, provider, external_place_id,
                image_url, category, is_open, lat, lng,
                url, phone, opening_hours_json
            ))
            
            # 방금 삽입/업데이트된 4번 테이블의 진짜 PK(place_id)를 확실히 조회
            cursor.execute("SELECT place_id FROM PLACES WHERE provider = %s AND external_place_id = %s", (provider, external_place_id))
            result = cursor.fetchone()
            
            if result and google_place_id:
                place_id = result[0]
                # 16번 테이블(CRWL_REVIEWS)에 이미 적재되어 있는 구글 리뷰들의 place_id(빈칸)를 깔끔하게 업데이트(연결)해 줍니다.
                update_reviews_query = """
                    UPDATE CRWL_REVIEWS 
                    SET place_id = %s 
                    WHERE crawl_place_id = %s
                """
                cursor.execute(update_reviews_query, (place_id, google_place_id))
            
            count += 1
            if count % 1000 == 0:
                conn.commit()
                print(f"Seeded {count} records...")
        except Exception as e:
            print(f"Error inserting {name} ({external_place_id}): {e}")
            
    conn.commit()
    cursor.close()
    conn.close()
    print(f"\nSuccessfully seeded {count} records into PLACES table.")

if __name__ == "__main__":
    main()
