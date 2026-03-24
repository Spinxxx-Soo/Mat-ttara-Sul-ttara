# 2026-03-18 작업 요약 (Walkthrough)

## 오늘 한 일

### 1. ERD 리뷰 및 보완
- 기존 AI ERD(`erd.dbml`)를 memory_key_design 기반으로 검토
- `USER_MEMORY.memory_value` 타입을 `TEXT → DOUBLE`로 변경 확인
- `PLACE_MEMORY_VECTOR` 테이블 신규 추가 (식당별 24차원 벡터 저장소)
- `PLACE_REVIEW_TAGS`는 리뷰 태그 집계 전용으로 역할 확정
- 추천 파트가 참조해야 할 테이블(3, 5, 12, 16, 17, 20번)과 건드리지 않을 테이블(10, 11, 13, 14, 18, 19번) 구분 완료

### 2. 추천 파이프라인 아키텍처 설계
- 장단기 유저 벡터 결합 방식 확정 (`α=0.7, β=0.3` 가중 합산)
- 단기기억 3종(cuisine, vibe, occasion) + 장기기억 24차원 fallback 전략
- 역할 분담: 챗봇(0~1 추론) → 추천(벡터 연산) → 백엔드(필터링+Redis)
- Redis 통신 방식 합의 (백엔드 Spring → Redis → AI Python)

### 3. 핵심 모듈 구현 및 테스트
- `apps/domain/recommend/memory_keys.py`: 24차원 Key Enum 정의
- `apps/domain/recommend/vector_utils.py`: 벡터 변환, 합산, 코사인 유사도, Top K
- `apps/services/recommend_service.py`: 추천 파이프라인 오케스트레이터
- `scripts/test_recommend.py`: 5개 단위 테스트 전체 PASS ✅

### 4. Git 브랜치 관리
- `feat/S14P21B205-106-recommend-engine` 브랜치 생성
- 초기 커밋 및 원격 push 완료
- `.gitignore`에 대용량 데이터 파일 제외 규칙 추가

---

## 생성된 파일 목록

### 코드
| 파일 | 설명 |
|---|---|
| `apps/domain/recommend/__init__.py` | 패키지 초기화 |
| `apps/domain/recommend/memory_keys.py` | 24차원 Memory Key Enum |
| `apps/domain/recommend/vector_utils.py` | 벡터 연산 유틸리티 |
| `apps/services/recommend_service.py` | 추천 서비스 (Mock) |
| `scripts/test_recommend.py` | 검증 테스트 |

### 문서
| 파일 | 설명 |
|---|---|
| `docs/memory_key_design.md` | 24개 키 정의 원본 문서 |
| `docs/recommend_pipeline.md` | 추천 파이프라인 설계 |
| `docs/erd_reference_guide.md` | ERD 테이블 참조 가이드 |
| `erd.dbml` | 전체 ERD (DBML 형식) |

---

## 남은 작업

- [ ] DB 연동 (MySQL: `USER_MEMORY`, `PLACE_MEMORY_VECTOR` 실제 연결)
- [ ] Redis Consumer 구현 (백엔드 메시지 수신/응답)
- [ ] Cold Start 로직 (`USER_PREFERENCE` → 초기 벡터 생성)
- [ ] Pydantic DTO (입출력 검증 스키마)
- [ ] 실제 데이터 기반 정확도 검증
