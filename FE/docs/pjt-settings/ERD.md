# 데이터 모델 참조 (ERD)

> `src/types/api.ts`의 도메인 타입에서 추출한 데이터 모델 관계도입니다.
> 정확한 ERD는 백엔드 팀의 DB 설계를 확인해주세요.

---

## 엔티티 관계도

```
┌──────────┐     1:N      ┌──────────┐     N:1      ┌──────────┐
│   User   │─────────────▶│   Plan   │◀─────────────│PlanPlace │
│          │              │          │              │          │
│ userId   │              │ planId   │              │ detailId │
│ email    │              │ title    │              │ placeId  │
│ name     │              │ meetingAt│              │ seqNo    │
│ bio      │              │ partici~ │              └────┬─────┘
│ createdAt│              │ totalBu~ │                   │
│ lastLogi~│              │ planType │                   │ N:1
│ updatedAt│              │ memo     │                   ▼
└──────────┘              │ createdAt│              ┌──────────┐
      │                   │ updatedAt│              │  Place   │
      │ 1:N               └──────────┘              │          │
      ▼                                             │ placeId  │
┌──────────┐                                        │ name     │
│  Review  │                                        │ address  │
│          │ N:1                                     │ phone    │
│ reviewId │───────────────────────────────────────▶│ lat      │
│ placeId  │                                        │ lng      │
│ userId   │                                        │ rating   │
│ rating   │                                        │ openin~  │
│ content  │                                        │ imageUrl │
│ createdAt│                                        │ category │
│ updatedAt│                                        └──────────┘
└──────────┘

┌──────────────┐     1:N      ┌──────────────┐
│ ChatSession  │─────────────▶│ ChatMessage  │
│              │              │              │
│ sessionId    │              │ messageId    │
│ title        │              │ sessionId    │
│ createdAt    │              │ role         │
│ lastMessag~  │              │ content      │
└──────────────┘              │ createdAt    │
                              │ updatedAt    │
                              └──────────────┘
```

## 주요 관계

| 관계 | 설명 |
|---|---|
| User → Plan | 1:N - 사용자는 여러 플랜 생성 가능 |
| Plan → PlanPlace | 1:N - 플랜은 여러 장소 포함 |
| PlanPlace → Place | N:1 - 장소는 여러 플랜에 포함 가능 |
| User → Review | 1:N - 사용자는 여러 리뷰 작성 가능 |
| Place → Review | 1:N - 장소는 여러 리뷰 보유 |
| ChatSession → ChatMessage | 1:N - 세션은 여러 메시지 포함 |

---

> **TODO**: 백엔드 팀의 실제 ERD와 대조하여 보완 필요
