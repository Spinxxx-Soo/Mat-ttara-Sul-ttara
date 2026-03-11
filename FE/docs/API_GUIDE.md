# FE API & React Query Convention Guide

본 문서는 `matsul-front` 프로젝트의 프론트엔드 API 호출 및 서버 상태 관리(React Query) 컨벤션 가이드입니다.

## 1. 디렉토리 구조 및 역할 분리

API 관련 로직은 순수 API 호출 계층과 React Query 상태 관리 계층으로 완벽히 분리합니다.

```
src/
├── api/                  # 순수 API 호출 계층 (axios fetch 함수들)
│   ├── axios.ts          # axios 인스턴스 및 인터셉터 설정
│   ├── authApi.ts        # 도메인별 API 함수 (userApi.ts, planApi.ts 등)
│   └── ...
├── hooks/
│   └── queries/          # React Query 커스텀 훅 계층
│       ├── auth/         # 도메인별 폴더 분리
│       │   ├── useLogin.ts
│       │   └── useUserInfo.ts
│       ├── plan/
│       └── place/
└── types/
    └── api.ts            # 공통 API 인터페이스 및 DTO 타입
```

---

## 2. API 타입 정의 가이드 (`src/types/api.ts`)

- **응답 래퍼 사용 금지**: 백엔드에서 공통 봉투 패턴(Envelope Pattern) 없이 데이터를 평면으로 반환하므로 제네릭 래퍼 사용 시 주의합니다. 
- **페이지네이션 응답**: 리스트 조회의 경우 `ApiPaginationResponse<T>` 제네릭을 사용하여 통일합니다.
- **DTO 네이밍**: Request 객체는 `~Request`, Response 객체는 도메인명 단독(e.g., `Place`, `Review`) 또는 `~Response`로 통일합니다.
- **Nullable 처리**: API 명세에 필드가 없을 수도 있는 경우만 `?`를 붙이고, `null`이 내려올 수 있는 명확한 필드는 `| null`을 명시합니다.

---

## 3. Axios 에러 핸들링 정책 (`src/api/axios.ts`)

모든 HTTP 요청 에러는 `axios.interceptors.response`에서 1차적으로 중앙 제어됩니다.

| HTTP Status | 의미 | 처리 정책 |
| :--- | :--- | :--- |
| **401** | Unauthorized | 리프레시 토큰 만료 등. 로컬 authStore 초기화 후 `/login`으로 강제 리다이렉트 수행 |
| **403** | Forbidden | 권한 없음 예외. 전역 Toast 발생 권장 |
| **404** | Not Found | 데이터 없음. 필요 시 해당 컴포넌트에 에러 위임 |
| **500** | Server Error | 서버 런타임 에러. 전역 에러 Toast 알림 및 로깅 처리 |

---

## 4. Query Key 네이밍 컨벤션

React Query 캐시 키는 도메인 중심으로 배열(Array) 형태를 준수합니다.

```typescript
// ✅ 올바른 예시
useQuery({
  queryKey: ['places', 'search', keyword, page, size],
  queryFn: () => ...
})

useMutation({
  mutationKey: ['plan', 'create'],
  mutationFn: () => ...
})
```

- 첫 번째 원소: 주요 도메인 명사 (단/복수 통일, 예: `'places'`, `'user'`, `'plan'`)
- 두 번째 원소: 세부 액션 또는 상태 식별자 (예: `'detail'`, `'search'`, `'reviews'`)
- 세 번째 이후: API의 실제 파라미터들 (예: `placeId`, `keyword`)
