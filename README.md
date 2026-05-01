<div align="center">

<!-- logo -->
<img src="./assets/맛따라술따라-readme.png" width="320"/>

### 맛따라 술따라 - AI 챗봇 프로젝트

[<img src="https://img.shields.io/badge/-readme.md-important?style=flat&logo=google-chrome&logoColor=white" />](./README.md)
[<img src="https://img.shields.io/badge/-project-blue?style=flat&logo=google-chrome&logoColor=white" />]()
[<img src="https://img.shields.io/badge/release-v0.1.0-yellow?style=flat&logo=google-chrome&logoColor=white" />]()
<br/>
[<img src="https://img.shields.io/badge/프로젝트 기간-2026.02~2026.03-green?style=flat&logo=&logoColor=white" />]()

</div>

## 📝 전체 서비스 설명

맛따라 술따라는 약속 장소를 정하는 과정에서 생기는 탐색 피로를 줄이기 위해 만든 **AI 기반 대화형 맛집·장소 추천 서비스**입니다.  

<br />

## 🏗️ 프로젝트 아키텍처

![프로젝트 아키텍처](https://user-images.githubusercontent.com/80824750/208294567-738dd273-e137-4bbf-8307-aff64258fe03.png)

<br />

## 🤖 AI 기능 상세

AI 레이어는 **FastAPI**로 노출되고, 대화 흐름은 **LangGraph**(`StateGraph`)로 구성됩니다. 멀티턴 맥락은 **Redis 기반 체크포인터**(`RedisSaver` 등)로 유지하며, 사용자 발화에서 필요한 정보를 모으는 **슬롯필링**과 추천·후속 질문 생성에는 **LangChain / OpenAI API**를 사용합니다.

- **대화 오케스트레이션**: LangGraph 상태·노드로 턴별 처리
- **상태 저장**: 스레드별 체크포인트(Redis / `langgraph-checkpoint-redis`)
- **추천·NLG**: 조건 수집 후 장소 추천 및 응답 생성

### AI 아키텍처

![AI 아키텍처](./assets/맛따라술따라_ai아키텍처.png)

<br />

### 화면 구성

| 화면 구성 | 화면 구성 |
|:---:|:---:|
| 로그인 (소셜 로그인) | 선호 온보딩 |
| <img src="./assets/맛따라술따라_로그인.gif" alt="로그인" width="320"/> | <img src="./assets/맛따라술따라_온보딩.gif" alt="선호 온보딩" width="320"/> |
| 챗봇 화면 | 장소 추천 · 지도 마커 |
| <img src="./assets/맛따라술따라_챗봇.gif" alt="챗봇 구현 화면" width="320"/> | <img src="./assets/맛따라술따라_장소추천.gif" alt="장소 추천 지도 마커" width="320"/> |
| 홈 · 장소 리뷰 | 맛집 검색 |
| GIF 준비중 | GIF 준비중 |
| 마이플랜 관리·공유 | — |
| <img src="./assets/맛따라술따라_플랜생성_공유.gif" alt="마이플랜 관리·공유" width="320"/> | — |

<br />

## 🗂️ APIs

작성한 API는 아래에서 확인할 수 있습니다.

👉🏻 [API 바로보기](./backend/APIs.md)

<br />

## ⚙ 기술 스택

### Frontend
<div>
<img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
<img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
<img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
<img src="https://img.shields.io/badge/TanStack_Query-FF4154?style=for-the-badge&logo=reactquery&logoColor=white" />
<img src="https://img.shields.io/badge/Zustand-443C55?style=for-the-badge" />
</div>

### Backend
<div>
<img src="https://img.shields.io/badge/Java_21-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white" />
<img src="https://img.shields.io/badge/Spring_Boot_3-6DB33F?style=for-the-badge&logo=springboot&logoColor=white" />
<img src="https://img.shields.io/badge/Spring_Security-6DB33F?style=for-the-badge&logo=springsecurity&logoColor=white" />
<img src="https://img.shields.io/badge/Spring_Data_JPA-6DB33F?style=for-the-badge&logo=spring&logoColor=white" />
<img src="https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white" />
<img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" />
<img src="https://img.shields.io/badge/Elasticsearch-005571?style=for-the-badge&logo=elasticsearch&logoColor=white" />
</div>

### AI
<div>
<img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" />
<img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
<img src="https://img.shields.io/badge/LangChain-1C3C3C?style=for-the-badge&logo=chainlink&logoColor=white" />
<img src="https://img.shields.io/badge/LangGraph-111111?style=for-the-badge&logo=graphql&logoColor=white" />
<img src="https://img.shields.io/badge/OpenAI_API-412991?style=for-the-badge&logo=openai&logoColor=white" />
</div>

### Infra
<div>
<img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
<img src="https://img.shields.io/badge/Docker_Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
<img src="https://img.shields.io/badge/AWS_EC2-FF9900?style=for-the-badge&logo=amazonec2&logoColor=white" />
<img src="https://img.shields.io/badge/AWS_S3-569A31?style=for-the-badge&logo=amazons3&logoColor=white" />
</div>

### Tools
<div>
<img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" />
<img src="https://img.shields.io/badge/Notion-000000?style=for-the-badge&logo=notion&logoColor=white" />
<img src="https://img.shields.io/badge/Figma-F24E1E?style=for-the-badge&logo=figma&logoColor=white" />
</div>

<br />

## 👤 맡은 역할

저는 이 프로젝트에서 **AI 챗봇 파트**를 맡아, 슬롯필링 기반 조건 수집·추천 흐름과 **LangGraph** 상태·체크포인터를 활용한 멀티턴 대화를 구현했습니다.

<br />

## 🤔 기술적 이슈와 해결 과정
- 슬롯 정보가 부족한 사용자 입력 처리
    - 필수 슬롯 우선순위 기반 재질문 전략으로 누락 정보 보완
- 멀티턴 대화에서 문맥 유실 문제
    - LangGraph 상태 노드 분리와 체크포인터로 대화 맥락 유지
- LLM 호출 비용/지연 이슈
    - Rule-based 전처리 + 필요 시 LLM 호출하는 하이브리드 구조 적용

<br />