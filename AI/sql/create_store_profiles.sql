-- 가게 프로필 테이블 (리뷰 분석 결과 저장)
CREATE TABLE IF NOT EXISTS STORE_PROFILES (
  profile_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  crawl_place_id VARCHAR(255) NOT NULL UNIQUE,
  store_name VARCHAR(100),
  review_count INT DEFAULT 0,
  avg_rating FLOAT DEFAULT 0,
  -- 관점별 점수 (0.0 ~ 1.0)
  taste_score FLOAT DEFAULT 0,
  atmosphere_score FLOAT DEFAULT 0,
  value_score FLOAT DEFAULT 0,
  service_score FLOAT DEFAULT 0,
  cleanliness_score FLOAT DEFAULT 0,
  -- 임베딩 벡터 (JSON 배열)
  embedding_vector JSON,
  -- 리뷰 요약 (챗봇 참고용)
  review_summary TEXT,
  lat DOUBLE,
  lng DOUBLE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_store_lat_lng (lat, lng)
);
