# Backend Project

이 프로젝트는 Spring Boot 기반의 백엔드 서버로, **사용자 인증, 장소 정보 관리, 추천 계획 생성 및 AI 서버와의 연동**을 담당합니다.

## 🛠 기술 스택 (Tech Stack)

- **Language**: Java 21
- **Framework**: Spring Boot 3.4.1
- **Database**: 
  - MySQL (RDB)
  - Redis (Caching / Session)
  - Elasticsearch (Search / Recommendation)
- **Security**: Spring Security, OAuth2 Client, JWT (jjwt)
- **Storage**: AWS S3
- **Communication**: WebFlux (AI 서버 비동기 통신), SSE (Server-Sent Events)
- **Build Tool**: Gradle

---

## 📂 디렉토리 구조 (Directory Structure)

코드는 **com.sulddara.server** 패키지를 기준으로 기술적/도메인별로 레이어를 분리하여 관리합니다.

```
BE/
├── src/main/java/com/sulddara/server/
│   ├── auth/          ← JWT, OAuth2, 인증/인가 비즈니스 로직
│   ├── chat/          ← AI 서버 연동 및 챗봇 대화 처리
│   ├── config/        ← 인프라 설정 (Security, S3, JPA, Redis, ES 등)
│   ├── global/        ← 공통 예외 처리(Advice), 유틸리티, 공통 응답(BaseResponse)
│   ├── place/         ← 장소(식당) 정보 및 위치 기반 로직
│   ├── plan/          ← 추천 계획(Schedule) 생성 및 관리
│   ├── s3/            ← AWS S3 파일 업로드 및 관리 서비스
│   ├── sse/           ← 실시간 데이터 전송 (Server-Sent Events)
│   ├── user/          ← 사용자(User/Member) 도메인 및 프로필 관리
│   └── web/           ← API 레이어 (Controller, DTO)
├── build.gradle       ← 프로젝트 의존성 및 빌드 설정
├── Dockerfile         ← 서버 애플리케이션 컨테이너화 설정
├── docker-compose.yml ← DB, Redis, ES 등 인프라 컨테이너 통합 설정
└── .env.example       ← 환경 변수 설정 샘플
```

---

## 🚀 시작하기 (Getting Started)

### 1. 환경 변수 설정

`.env.example` 파일을 복사하여 `.env` 파일을 생성하고, 필요한 API 키와 DB 정보를 입력하세요.

```bash
cp .env.example .env
```

주요 설정 항목:
- `JWT_SECRET`: JWT 서명을 위한 보안 키 (32자 이상 권장)
- `GOOGLE/NAVER_ID & SECRET`: 소셜 로그인을 위한 OAuth2 클라이언트 정보
- `AI_BASE_URL`: 연동할 AI 서버의 주소 (기본값: `http://localhost:5000`)
- `AWS_KEY & SECRET`: S3 이미지 업로드를 위한 액세스 키

### 2. 인프라 실행 (Docker)

MySQL, Redis, Elasticsearch 등의 외부 서비스를 Docker로 실행합니다.

```bash
docker-compose up -d
```

### 3. 애플리케이션 실행

내장된 Gradle Wrapper를 사용하여 서버를 실행합니다.

```bash
./gradlew bootRun
```

---

## 📌 컨벤션 (Convention)

### 네이밍 컨벤션

- **클래스 (Classes)**:
  - PascalCase 사용.
  - 역할에 따른 접미사 사용: `Controller`, `Service`, `Repository`, `Entity`, `Config`.
- **패키지 (Packages)**:
  - 도메인별 패키지 구조를 지향하며, 하위 패키지에 `controller`, `service`, `domain`을 두는 대신 핵심 기능별로 분리합니다.
- **DTO (Data Transfer Object)**:
  - 요청: `[Action][Domain]Request` (예: `CreatePlanRequest`)
  - 응답: `[Action][Domain]Response` (예: `GetPlaceResponse`)

### 아키텍처 흐름

백엔드 서버는 다음과 같은 흐름으로 요청을 처리합니다.

```
Web (Controller) → Service (Business Logic) → Domain (Entity/Repository) → Database/External API
```

- **Web (Controller)**: 클라이언트의 요청을 받고 응답 형식을 정의합니다.
- **Service**: 비즈니스 로직을 수행하며 다른 도메인과의 협업을 조율합니다.
- **Domain (Entity/Repository)**: 데이터 모델링 및 직접적인 데이터 접근을 담당합니다.

---

## 🏗 설계 목적

- **확장성**: 도메인 기반 패키지 분리를 통해 기능 확장이 용이한 구조를 지향합니다.
- **보안성**: Spring Security와 JWT를 활용한 검증된 인증 시스템을 구축합니다.
- **성능**: Redis와 Elasticsearch를 활용하여 대규모 데이터 검색 및 캐싱 성능을 확보합니다.
- **유지보수성**: 공통 응답 포맷과 예외 처리기를 통해 일관된 API 스펙을 유지합니다.