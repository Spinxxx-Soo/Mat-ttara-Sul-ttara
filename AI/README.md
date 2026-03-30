# AI 서버 디렉토리 구조

AI 서버는 **챗봇 대화 처리, 리뷰 데이터 처리, 추천 로직 실행**을 담당하는 Python 기반 서비스로 구성되어 있습니다.
코드는 **API → Service → Domain → Repository** 구조로 레이어를 분리하여 관리합니다.

```
AI/
├── apps/
│   ├── api/
│   ├── domain/
│   │   ├── chat/
│   │   └── review/
│   ├── repositories/
│   ├── schemas/
│   └── services/
├── scripts/
│   ├── init_db.py          ← DB 초기화 (테이블 생성)
│   ├── collect_places.py   ← 장소 수집
│   └── save_reviews.py     ← 리뷰 수집 및 저장
├── sql/
│   ├── crawl_reviews.sql
│   └── create_store_profiles.sql
├── .env.example
├── requirements.txt
└── README.md
```

---

## 🚀 시작하기

### 1. 패키지 설치

```bash
pip install -r requirements.txt
python -m pip install mysql-connector-python
```

### 2. 환경 변수 설정

`.env.example`을 복사하여 `.env`를 생성하고 값을 채워주세요.

```bash
cp .env.example .env
```

```env
GOOGLE_API_KEY=your_api_key_here
DB_HOST=localhost
DB_USER=meal_user
DB_PASSWORD=your_password
DB_NAME=meal_reco
```

> Google Places API 키는 [Google Cloud Console](https://console.cloud.google.com/)에서 발급받을 수 있습니다.

### 3. DB 초기화 (테이블 생성)

```bash
python3 scripts/init_db.py
```

`CRWL_REVIEWS`와 `STORE_PROFILES` 테이블이 자동으로 생성됩니다.

### 4. 대전 맛집 장소 수집

```bash
python3 scripts/collect_places.py
```

- Google Places API로 대전 전역의 식당 Place ID를 수집합니다.
- 결과는 `places_data.json`에 저장됩니다.
- 중간에 중단되어도 체크포인트(`checkpoint_places.json`)에서 이어서 실행됩니다.

### 5. 리뷰 수집 및 DB 저장

```bash
python3 scripts/save_reviews.py
```

- 수집된 Place ID 별로 리뷰를 가져와 `CRWL_REVIEWS` 테이블에 저장합니다.
- 중간에 중단되어도 체크포인트(`checkpoint_reviews.json`)에서 이어서 실행됩니다.

---

## apps/api

외부 요청을 처리하는 **API 레이어**입니다.
백엔드 서버가 AI 서버를 호출할 때 사용하는 엔드포인트를 정의합니다.

예시

* 챗봇 메시지 처리 API
* 추천 요청 API

---

## apps/services

AI 기능의 **전체 실행 흐름을 담당하는 레이어**입니다.

API 요청을 받아 다음 로직을 순서대로 실행합니다.

* 사용자 입력 처리
* 도메인 로직 호출
* 데이터 조회
* LLM 호출
* 결과 반환

즉 **비즈니스 로직의 orchestration 역할**을 담당합니다.

---

## apps/domain

AI 서비스의 **핵심 로직(비즈니스 규칙 / 알고리즘)**을 담당합니다.

외부 API나 DB와 직접 연결하지 않고
순수한 로직만 구현하는 계층입니다.

현재 구성

### chat

챗봇 대화 처리 로직

예

* 사용자 입력 파싱
* 슬롯 추출
* 질문 생성 정책
* 프롬프트 생성

### review

리뷰 데이터 처리 로직

예

* 리뷰 텍스트 정제
* 키워드 추출
* 리뷰 데이터 가공

---

## apps/repositories

**데이터 접근 레이어**

DB 또는 외부 데이터 저장소와의 통신을 담당합니다.

예

* 장소 정보 조회
* 리뷰 데이터 저장
* 사용자 행동 데이터 조회

---

## apps/schemas

API 요청 및 응답에 사용되는 **데이터 모델 정의**

FastAPI / Pydantic 기반으로
Request / Response 데이터 구조를 정의합니다.

예

* ChatRequest
* ChatResponse
* RecommendRequest
* RecommendResponse

---

## 레이어 구조

AI 서버는 다음과 같은 구조로 동작합니다.

```
API → Service → Domain → Repository → Database
```

* **API** : HTTP 요청 처리
* **Service** : 전체 로직 흐름 관리
* **Domain** : 핵심 비즈니스 로직
* **Repository** : 데이터 접근

---

## 설계 목적

이 구조는 다음을 목표로 합니다.

* 챗봇 로직과 데이터 접근 로직 분리
* 추천 알고리즘과 API 코드 분리
* 테스트 및 확장 용이성 확보
* 유지보수 가능한 AI 서비스 구조 유지
