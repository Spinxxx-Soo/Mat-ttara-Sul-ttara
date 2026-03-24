-- AI 추천 파이프라인에서 사용하는 코어 DB 테이블 생성 쿼리
-- (erd.dbml 기반)
-- 3. USER_PREFERENCE (사용자 초기 취향 정보 / Cold Start용)
CREATE TABLE IF NOT EXISTS user_preference (
  pref_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  usage_type VARCHAR(50),
  age_group VARCHAR(20),
  gender VARCHAR(10),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 12. USER_MEMORY (사용자 24차원 단기간/장기간 누적 메모리)
CREATE TABLE IF NOT EXISTS user_memory (
  memory_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  memory_key VARCHAR(100) NOT NULL,
  memory_value DOUBLE NOT NULL,
  weight DOUBLE NOT NULL,
  source VARCHAR(20) NOT NULL,
  last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_memory_key (user_id, memory_key),
  INDEX idx_user_weight (user_id, weight),
  INDEX idx_last_seen (last_seen_at)
);

-- 20. PLACE_MEMORY_VECTOR (식당별 추천용 24차원 프로필 벡터)
CREATE TABLE IF NOT EXISTS place_memory_vector (
  vector_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  place_id BIGINT NOT NULL UNIQUE,
  vector_data JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);