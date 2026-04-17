<div align="center">

<!-- logo -->
<img src="https://user-images.githubusercontent.com/80824750/208554611-f8277015-12e8-48d2-b2cc-d09d67f03c02.png" width="320"/>

### 맛따라 술따라 - AI 챗봇 프로젝트 ✅

[<img src="https://img.shields.io/badge/-readme.md-important?style=flat&logo=google-chrome&logoColor=white" />](./README.md)
[<img src="https://img.shields.io/badge/-project-blue?style=flat&logo=google-chrome&logoColor=white" />]()
[<img src="https://img.shields.io/badge/release-v0.1.0-yellow?style=flat&logo=google-chrome&logoColor=white" />]()
<br/>
[<img src="https://img.shields.io/badge/프로젝트 기간-2026.02~2026.03-green?style=flat&logo=&logoColor=white" />]()

</div>

## 📝 소개
맛따라 술따라는 약속 장소를 정하는 과정에서 생기는 탐색 피로를 줄이기 위해 만든 AI 기반 대화형 추천 서비스입니다.

다음과 같은 내용을 담고 있습니다.
- 프로젝트 소개
- 프로젝트 화면 구성
- 프로젝트 API 설계
- 사용한 기술 스택
- 프로젝트 아키텍처
- 기술적 이슈와 해결 과정
- 프로젝트 팀원

저는 이 프로젝트에서 **AI 챗봇 파트**를 맡아 슬롯필링 기반 대화 흐름과 LangGraph 상태 관리를 담당했습니다.

<br />

### 화면 구성
|Screen #1|Screen #2|
|:---:|:---:|
|<img src="https://user-images.githubusercontent.com/80824750/208456048-acbf44a8-cd71-4132-b35a-500047adbe1c.gif" width="400"/>|<img src="https://user-images.githubusercontent.com/80824750/208456234-fb5fe434-aa65-4d7a-b955-89098d5bbe0b.gif" width="400"/>|

### 프로토타입
<img src="https://user-images.githubusercontent.com/80824750/208454673-0449e49c-57c6-4a6b-86cf-66c5b1e623dc.png">

<br />

## 🗂️ APIs
작성한 API는 아래에서 확인할 수 있습니다.

👉🏻 [API 바로보기](./backend/APIs.md)

<br />

## ⚙ 기술 스택
### AI / Back-end
<div>
<img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" />
<img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
<img src="https://img.shields.io/badge/OpenAI_API-412991?style=for-the-badge&logo=openai&logoColor=white" />
<img src="https://img.shields.io/badge/LangChain-1C3C3C?style=for-the-badge&logo=chainlink&logoColor=white" />
<img src="https://img.shields.io/badge/LangGraph-111111?style=for-the-badge&logo=graphql&logoColor=white" />
</div>

### Infra
<div>
<img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" />
<img src="https://img.shields.io/badge/AWS_EC2-FF9900?style=for-the-badge&logo=amazonec2&logoColor=white" />
<img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
</div>

### Tools
<div>
<img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" />
<img src="https://img.shields.io/badge/Notion-000000?style=for-the-badge&logo=notion&logoColor=white" />
<img src="https://img.shields.io/badge/Figma-F24E1E?style=for-the-badge&logo=figma&logoColor=white" />
</div>

<br />

## 🛠️ 프로젝트 아키텍쳐
![architecture](https://user-images.githubusercontent.com/80824750/208294567-738dd273-e137-4bbf-8307-aff64258fe03.png)

<br />

## 🤔 기술적 이슈와 해결 과정
- 슬롯 정보가 부족한 사용자 입력 처리
    - 필수 슬롯 우선순위 기반 재질문 전략으로 누락 정보 보완
- 멀티턴 대화에서 문맥 유실 문제
    - LangGraph 상태 노드 분리와 체크포인터로 대화 맥락 유지
- LLM 호출 비용/지연 이슈
    - Rule-based 전처리 + 필요 시 LLM 호출하는 하이브리드 구조 적용

<br />

## 💁‍♂️ 프로젝트 팀원
|Backend|Frontend|AI|
|:---:|:---:|:---:|
| ![](https://github.com/octocat.png?size=120) | ![](https://github.com/octocat.png?size=120) | ![](https://github.com/octocat.png?size=120) |
|[Backend 팀원](https://github.com/)|[Frontend 팀원](https://github.com/)|[Soomin](https://github.com/)|
