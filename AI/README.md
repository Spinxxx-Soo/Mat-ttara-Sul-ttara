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
└── README.md
```

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

