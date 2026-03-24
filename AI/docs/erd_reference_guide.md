# 추천 시스템 ERD 참조 테이블 가이드

> 추천 파이프라인 개발 시 참조해야 하는 ERD 테이블 정리 (전체 ERD: `AI/erd.dbml`)

---

## 내가 직접 읽고 쓰는 테이블 (핵심)

| # | 테이블 | 역할 | 사용 시점 |
|---|---|---|---|
| 12 | `USER_MEMORY` | 유저의 24차원 장기 취향 벡터 | 추천 요청마다 로드 |
| 20 | `PLACE_MEMORY_VECTOR` | 식당의 24차원 특징 벡터 (JSON) | 추천 요청마다 로드 |

---

## 벡터 데이터를 만들기 위해 참조하는 테이블

| # | 테이블 | 역할 | 사용 시점 |
|---|---|---|---|
| 3 | `USER_PREFERENCE` | 연령/성별/목적 → Cold Start 초기 벡터 생성 | 신규 유저 가입 시 |
| 5 | `REVIEWS` | 내부 리뷰 텍스트 → 태그 추출 파이프라인 입력 | 배치 처리 (주기적) |
| 16 | `CRWL_REVIEWS` | 외부 크롤링 리뷰 → 태그 추출 파이프라인 입력 | 배치 처리 (주기적) |
| 17 | `PLACE_REVIEW_TAGS` | 리뷰 태그 빈도수 집계 → 식당 벡터 점수 산출용 | 배치 처리 (주기적) |

---

## 건드리지 않는 테이블 (챗봇/UI 파트 담당)

| # | 테이블 | 이유 |
|---|---|---|
| 10 | `CHAT_MESSAGES` | 챗봇 대화 기록 |
| 11 | `CHAT_SESSIONS` | 챗봇 세션 관리 |
| 13 | `CHAT_RECOMMENDATIONS` | 챗봇 추천 실행 로그 |
| 14 | `CHAT_RECOMMENDATION_ITEMS` | 챗봇 추천 후보 리스트 |
| 18 | `PLACE_SUMMARY_CACHE` | LLM 요약 캐시 (화면 표시용) |
| 19 | `EMBEDDING_DOCUMENTS` | Vector DB 매핑 (자연어 검색용) |

---

## 데이터 흐름도

```
[외부 리뷰]                 [내부 리뷰]
CRWL_REVIEWS(16)            REVIEWS(5)
      ↓                          ↓
      └────── NLP/태그 추출 ──────┘
                    ↓
          PLACE_REVIEW_TAGS(17)
            (태그 빈도수 집계)
                    ↓
         PLACE_MEMORY_VECTOR(20)
            (정규화된 식당 벡터)
                    ↓
           ┌────────────────┐
           │ 코사인 유사도   │ ← USER_MEMORY(12) + 단기기억
           │   Top 3 추출   │
           └────────────────┘
```
