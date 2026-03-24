# USER_MEMORIES - Memory Key 설계 문서

## 배경

`USER_MEMORIES` 테이블의 `memory_key` / `memory_value` / `weight` 컬럼을 활용해
**유저 선호도 벡터 ↔ 식당 프로필 벡터**의 코사인 유사도를 계산하여 음식점을 추천하는 시스템.

- **위치(좌표 반경)** 및 **영업시간** 필터링은 전처리 단계에서 완료된 후 입력됨
- 이 key들은 오직 **선호도 유사도 계산**에만 사용됨

---

## 전제 조건

| 항목 | 내용 |
|---|---|
| 값 범위 | 모든 `memory_value` → **0.0 ~ 1.0** 실수로 정규화 |
| 벡터 차원 순서 | key 목록 순서를 항상 고정해야 함 (Enum 또는 설정 테이블로 관리 권장) |
| 유저 벡터 | `user_id`로 `USER_MEMORIES` 조회 → 배열 변환 |
| 식당 벡터 | 식당 프로필 테이블에서 동일 key 기준 조회 → 배열 변환 |

---

## Memory Key 목록

### 🍽️ 음식 종류 (Cuisine)

| memory_key | 설명 |
|---|---|
| `cuisine_korean` | 한식 선호도 |
| `cuisine_japanese` | 일식 선호도 |
| `cuisine_chinese` | 중식 선호도 |
| `cuisine_western` | 양식 선호도 |
| `cuisine_bunsik` | 분식/카페 선호도 |
| `cuisine_asian_other` | 기타 아시아 음식 선호도 |

### 💰 가격대

| memory_key | 설명 |
|---|---|
| `price_range` | 가격대 선호 (1=저가 ~ 5=고가 → 정규화) |

### 🏠 분위기/공간

| memory_key | 설명 |
|---|---|
| `vibe_quiet` | 조용한 분위기 선호 |
| `vibe_lively` | 활기찬/왁자지껄한 분위기 선호 |
| `vibe_modern` | 트렌디/모던 인테리어 선호 |
| `vibe_traditional` | 전통적/레트로 분위기 선호 |
| `seat_private` | 독립룸/프라이빗석 선호 |
| `outdoor_ok` | 야외석 허용 여부 |

### 👥 혼잡도/편의

| memory_key | 설명 |
|---|---|
| `crowd_tolerance` | 혼잡도 허용 수준 (0=싫음, 1=상관없음) |
| `wait_tolerance` | 웨이팅 허용 수준 (0=싫음, 1=즐김) |
| `parking_available` | 주차 가능 여부 |

### 🎯 방문 목적/동반자

| memory_key | 설명 |
|---|---|
| `occasion_solo` | 혼밥 빈도 |
| `occasion_date` | 데이트 목적 빈도 |
| `occasion_friends` | 친구 모임 빈도 |
| `occasion_family` | 가족 모임 빈도 |
| `occasion_business` | 비즈니스/접대 빈도 |

### 😋 맛 성향

| memory_key | 설명 |
|---|---|
| `taste_spicy` | 매운 음식 선호 |
| `taste_light` | 담백/건강식 선호 |
| `taste_rich` | 진하고 자극적인 맛 선호 |

---

## 벡터 유사도 계산 흐름

```
[전처리]
 위치 반경 필터 → 영업시간 필터 → 후보 식당 목록

[유사도 계산]
 유저 벡터 = [cuisine_korean, cuisine_japanese, ..., taste_rich]  (N차원)
 식당 벡터 = [cuisine_korean, cuisine_japanese, ..., taste_rich]  (동일 N차원)

 score = cosine_similarity(유저 벡터, 식당 벡터)

[결과]
 score 내림차순 정렬 → 상위 N개 반환
```

---

## 구현 팁

- **key 순서 고정**: `memory_key` 목록의 순서가 달라지면 벡터 차원이 틀어짐. Enum이나 DB 설정 테이블로 인덱스 순서를 관리할 것.
- **weight 활용**: `memory_value`를 그대로 쓰거나, `memory_value * weight`를 벡터 값으로 사용하면 신뢰도 반영 가능.
- **source 구분**: `chat`(대화 추출) / `feedback`(별점·리뷰 기반) / `system`(기본값) 에 따라 weight 업데이트 전략을 다르게 적용.
- **cold start**: 신규 유저는 기본값(0.5 등)으로 벡터를 채운 뒤, 피드백이 쌓이면서 업데이트.
