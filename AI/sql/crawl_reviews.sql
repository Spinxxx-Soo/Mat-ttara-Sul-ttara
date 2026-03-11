-- 생성 전 삭제 로직
DROP TABLE IF EXISTS CRWL_REVIEWS;

-- 크롤링 리뷰 테이블
CREATE TABLE CRWL_REVIEWS (
  ext_review_id BIGINT NOT NULL AUTO_INCREMENT,
  crawl_place_id VARCHAR(255) NOT NULL,
  place_id BIGINT NULL,
  store_name VARCHAR(100) NOT NULL,
  source VARCHAR(20) NOT NULL,
  external_review_id VARCHAR(255) NOT NULL,
  rating INT NULL,
  review_text TEXT NULL,
  lat DOUBLE NOT NULL,
  lng DOUBLE NOT NULL,
  created_at TIMESTAMP NULL,
  crawled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (ext_review_id),
  UNIQUE KEY uq_review_source_external (source, external_review_id),
  KEY idx_crawl_place_id (crawl_place_id),
  KEY idx_place_id (place_id)
);
