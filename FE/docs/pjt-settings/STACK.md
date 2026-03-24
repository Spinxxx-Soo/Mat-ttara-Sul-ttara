# 기술 스택 정의 (STACK)

## Frontend

| 카테고리 | 기술 | 버전 | 용도 |
|---|---|---|---|
| 프레임워크 | React | 18.2.0 | UI 렌더링 |
| 언어 | TypeScript | 5.2.2 | 정적 타입 |
| 빌드 도구 | Vite | 5.0.8 | 번들링/HMR |
| 스타일링 | TailwindCSS | 3.3.6 | 유틸리티 CSS |
| 서버 상태 | @tanstack/react-query | 5.90.21 | API 캐시/동기화 |
| 클라이언트 상태 | Zustand | 5.0.11 | 전역 상태 |
| HTTP 클라이언트 | Axios | 1.13.6 | API 통신 |
| 라우팅 | react-router-dom | 6.20.0 | 클라이언트 라우팅 |
| 알림 | react-hot-toast | 2.6.0 | 토스트 알림 |
| OAuth | @react-oauth/google | 0.13.4 | 구글 소셜 로그인 |

## 코드 품질

| 도구 | 버전 | 용도 |
|---|---|---|
| ESLint | 8.55.0 | 린팅 |
| Prettier | (설정 존재) | 코드 포매팅 |
| TypeScript strict mode | - | 타입 안정성 |

## 외부 서비스

| 서비스 | 용도 |
|---|---|
| Naver Map SDK | 지도 렌더링/상호작용 |
| Google OAuth 2.0 | 소셜 로그인 |
| Naver OAuth | 소셜 로그인 |
| Backend API (Spring Boot) | REST API 서버 |
| WebSocket | 실시간 채팅 |

## 배포

| 항목 | 설정 |
|---|---|
| 호스팅 | Vercel (`vercel.json` 존재) |
| 환경변수 | `.env` + `src/config/env.ts` |
