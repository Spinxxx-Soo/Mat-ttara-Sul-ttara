# API 명세 참조

> `src/types/api.ts` 및 `src/api/` 모듈에서 추출한 API 엔드포인트 정리입니다.
> 정확한 엔드포인트는 백엔드 명세서를 확인해주세요.

---

## 인증 (Auth)

| Method | Endpoint | 설명 | Request | Response |
|---|---|---|---|---|
| POST | `/auth/login` | 소셜 로그인 | `SocialLoginRequest` | `LoginResponse` |
| POST | `/auth/onboarding` | 온보딩 정보 저장 | `OnboardingRequest` | - |

## 사용자 (User)

| Method | Endpoint | 설명 | Request | Response |
|---|---|---|---|---|
| GET | `/users/me` | 내 정보 조회 | - | `UserInfo` |
| PUT | `/users/me` | 내 정보 수정 | `UpdateUserRequest` | `UserInfo` |

## 플랜 (Plan)

| Method | Endpoint | 설명 | Request | Response |
|---|---|---|---|---|
| GET | `/plans` | 내 플랜 목록 | `page, size` | `ApiPaginationResponse<Plan>` |
| POST | `/plans` | 플랜 생성 | `CreatePlanRequest` | `Plan` |
| GET | `/plans/:planId` | 플랜 상세 | - | `Plan + PlanPlace[]` |
| PUT | `/plans/:planId` | 플랜 수정 | `UpdatePlanRequest` | `Plan` |
| DELETE | `/plans/:planId` | 플랜 삭제 | - | - |

## 장소 (Place)

| Method | Endpoint | 설명 | Request | Response |
|---|---|---|---|---|
| GET | `/places/search` | 장소 검색 | `PlaceSearchRequest` | `PlaceSearchResponse` |
| GET | `/places/:placeId` | 장소 상세 | - | `Place` |

## 리뷰 (Review)

| Method | Endpoint | 설명 | Request | Response |
|---|---|---|---|---|
| GET | `/places/:placeId/reviews` | 리뷰 목록 | `page, size` | `ApiPaginationResponse<Review>` |
| POST | `/places/:placeId/reviews` | 리뷰 작성 | `CreateReviewRequest` | `Review` |
| PUT | `/reviews/:reviewId` | 리뷰 수정 | `UpdateReviewRequest` | `Review` |
| DELETE | `/reviews/:reviewId` | 리뷰 삭제 | - | - |

## AI 채팅 (Chat)

| Method | Endpoint | 설명 | Request | Response |
|---|---|---|---|---|
| GET | `/chat/sessions` | 세션 목록 | - | `ChatSession[]` |
| POST | `/chat/sessions` | 세션 생성 | - | `ChatSession` |
| GET | `/chat/sessions/:sessionId/messages` | 메시지 목록 | - | `ChatMessage[]` |
| POST | `/chat/sessions/:sessionId/messages` | 메시지 전송 | `{ content }` | `ChatMessage` |

---

> **참조**: 상세 타입 정의는 `src/types/api.ts`, API 컨벤션은 `docs/API_GUIDE.md`를 확인하세요.
