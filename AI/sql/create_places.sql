-- Table 4: 통일된 식당 기본 정보 테이블
CREATE TABLE IF NOT EXISTS PLACES (
    place_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL COMMENT '가게 이름',
    address VARCHAR(255) NULL COMMENT '가게 주소',
    provider VARCHAR(20) NOT NULL COMMENT '네이버/카카오 등 API 제공자',
    external_place_id VARCHAR(255) NOT NULL COMMENT 'API가 제공하는 고유 ID',
    image_url TEXT NULL COMMENT '가게 이미지 (구글 URL이 매우 길 수 있음)',
    category VARCHAR(100) NULL COMMENT '업종 카테고리',
    is_open BOOLEAN NOT NULL DEFAULT TRUE COMMENT '현재 영업 중 여부',
    last_status_checked_at TIMESTAMP NULL COMMENT '마지막 상태 확인 시간',
    lat DOUBLE NOT NULL COMMENT '위도',
    lng DOUBLE NOT NULL COMMENT '경도',
    url VARCHAR(500) NULL COMMENT '상세 페이지 URL',
    phone VARCHAR(50) NULL COMMENT '번호',
    opening_hours TEXT NULL COMMENT '요일별 영업시간 정보 (JSON)',
    description TEXT NULL COMMENT '설명',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_provider_external (provider, external_place_id),
    KEY idx_lat_lng (lat, lng)
);
