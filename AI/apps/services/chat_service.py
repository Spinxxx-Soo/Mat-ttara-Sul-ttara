"""
챗봇 서비스 레이어
"""
from __future__ import annotations

import json
from typing import Optional, Any
from typing_extensions import TypedDict, Annotated

from langgraph.graph import StateGraph, add_messages
from langgraph.checkpoint.memory import InMemorySaver
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage

from apps.schemas.chat import (
    ChatMessageRequest,
    ChatMessageResponse,
    ChatResponseType,
    MemoryStatus,
    PreferenceSummary,
    ParsedState as ParsedStateSchema,
)
from apps.domain.chat.client import OpenAIClient
from apps.services.paser import ChatParser


SUMMARY_TRIGGER_MESSAGE_COUNT = 12
RECENT_MESSAGE_WINDOW = 6


class ParsedState(TypedDict, total=False):
    lat: Optional[float]
    lng: Optional[float]
    people: Optional[int]
    time: Optional[str]
    purpose: Optional[str]
    mood: Optional[str]


# 백엔드에서 제어하는 follow-up 질문 우선순위
# 요구사항의 area > purpose > time > people > mood 중, 현재 프로젝트 `parsedState` source-of-truth에는 `area`가 포함되어 있지 않아 제외했습니다.
QUESTION_SLOT_PRIORITY: list[str] = ["purpose", "time", "people", "mood"]


class ChatState(TypedDict):
    """LangGraph 상태"""
    messages: Annotated[list[BaseMessage], add_messages]
    summary: str
    parsed_state: ParsedState


class ChatService:
    """챗봇 서비스"""

    def __init__(self):
        self.client = OpenAIClient()
        self.parser = ChatParser(client=self.client)

        # 개발용 checkpointer
        # 운영에서는 Redis 기반으로 교체
        self.checkpointer = InMemorySaver()

        # 임시 장기 메모리 저장소
        self._long_term_memories: dict[str, PreferenceSummary] = {}

        self.graph = self._build_graph()

    def _build_graph(self):
        workflow = StateGraph(ChatState)
        workflow.add_node("chatbot", self._chatbot_node)
        workflow.set_entry_point("chatbot")
        workflow.set_finish_point("chatbot")
        return workflow.compile(checkpointer=self.checkpointer)

    async def process_message(self, request: ChatMessageRequest) -> ChatMessageResponse:
        """
        사용자 메시지 처리
        """
        thread_id = request.threadId
        user_message = request.message

        state = self._get_thread_state(thread_id)
        has_history = bool(state and state.get("messages"))
        is_session_start = not has_history

        if request.preferenceSummary:
            self._long_term_memories[thread_id] = request.preferenceSummary

        memory_status = MemoryStatus.OK
        if is_session_start and request.contextInjection:
            if request.contextInjection.reason == "MISSING_MEMORY":
                memory_status = MemoryStatus.MISSING

        # 1) 유저 메시지 저장
        await self.graph.aupdate_state(
            config={"configurable": {"thread_id": thread_id}},
            values={"messages": [HumanMessage(content=user_message)]},
            as_node="chatbot",
        )

        # 2) 최신 state 다시 조회
        state = self._get_thread_state(thread_id)
        full_messages = state.get("messages", []) if state else []
        current_summary = state.get("summary", "") if state else ""
        previous_parsed_state = state.get("parsed_state", {}) if state else {}

        # 2-1) sessionState가 있으면 parsedState에 병합 (초기값으로 사용)
        if request.sessionState:
            # sessionState에서 필요한 필드만 추출 (lat, lng, people, time, purpose, mood)
            session_state_dict = request.sessionState.model_dump(
                exclude={"excludedPlaceIds"},
                include={"lat", "lng", "people", "time", "purpose", "mood"}
            )
            # None이 아닌 값만 병합
            for key, value in session_state_dict.items():
                if value is not None:
                    previous_parsed_state[key] = value

        # 3) 유저 발화 파싱 (파서에 위임)
        merged_parsed_state = await self.parser.parse(
            user_message=user_message,
            summary=current_summary,
            previous_parsed_state=previous_parsed_state,
        )

        await self.graph.aupdate_state(
            config={"configurable": {"thread_id": thread_id}},
            values={"parsed_state": merged_parsed_state},
            as_node="chatbot",
        )

        normalized_parsed_state: ParsedState = self._normalize_parsed_state(merged_parsed_state)

        # 4) 필요 시 summary 갱신
        updated_summary = current_summary
        if self._should_refresh_summary(full_messages):
            updated_summary = await self._summarize_messages(
                messages=full_messages[:-RECENT_MESSAGE_WINDOW],
                existing_summary=current_summary,
                thread_id=thread_id,
            )
            await self.graph.aupdate_state(
                config={"configurable": {"thread_id": thread_id}},
                values={"summary": updated_summary},
                as_node="chatbot",
            )

        # 5) missing slot 탐지 -> targetSlot 선택 -> follow-up 질문 생성 (백엔드가 분기 제어)
        missing_slots = self._detect_missing_slots(
            parsed_state=normalized_parsed_state,
            priority_order=QUESTION_SLOT_PRIORITY,
        )

        if not missing_slots:
            response_type = ChatResponseType.RECOMMENDATION
            target_slot: Optional[str] = None
            chat_response_text = "좋아요! 말씀해주신 조건으로 장소를 추천해드릴게요."
        else:
            response_type = ChatResponseType.FOLLOW_UP
            target_slot = self._select_target_slot(missing_slots)

            messages = self._build_followup_messages(
                user_message=user_message,
                parsed_state=normalized_parsed_state,
                target_slot=target_slot,
                thread_id=thread_id,
            )
            llm_response = await self.client.chat_completion(
                messages=messages,
                max_tokens=220,
                temperature=0.3,
            )

            llm_content = (
                llm_response.get("choices", [{}])[0]
                .get("message", {})
                .get("content", "")
                .strip()
            )
            chat_response_text = self._extract_question_from_llm_json(
                llm_content,
                fallback_target_slot=target_slot,
            )

        # 6) AI 응답 저장
        await self.graph.aupdate_state(
            config={"configurable": {"thread_id": thread_id}},
            values={"messages": [AIMessage(content=chat_response_text)]},
            as_node="chatbot",
        )

        # 7) parsedState를 스키마 형식으로 변환
        parsed_state_schema = ParsedStateSchema(**normalized_parsed_state)

        return ChatMessageResponse(
            threadId=thread_id,
            userId=request.userId,
            chatResponse=chat_response_text,
            type=response_type,
            memoryStatus=memory_status,
            targetSlot=target_slot,
            parsedState=parsed_state_schema,
        )

    async def _chatbot_node(self, state: ChatState) -> ChatState:
        """
        현재 구조에서는 직접 graph node 로직을 쓰지 않으므로 최소 형태 유지
        """
        return state

    def _get_thread_state(self, thread_id: str) -> Optional[dict]:
        snapshot = self.graph.get_state(
            config={"configurable": {"thread_id": thread_id}}
        )
        if snapshot and snapshot.values:
            return snapshot.values
        return None

    def _should_refresh_summary(self, messages: list[BaseMessage]) -> bool:
        """
        메시지가 일정 수 이상 쌓이면 summary 갱신
        """
        if len(messages) < SUMMARY_TRIGGER_MESSAGE_COUNT:
            return False
        return len(messages) % 4 == 0

    def _get_recent_messages(
        self,
        messages: list[BaseMessage],
        window_size: int,
    ) -> list[BaseMessage]:
        if len(messages) <= window_size:
            return messages
        return messages[-window_size:]

    def _normalize_parsed_state(self, parsed_state: dict[str, Any]) -> ParsedState:
        """
        parsedState는 "없으면 None" 형태로 맞춰서 missing slot 탐지와
        LLM 프롬프트 구성이 안정적으로 동작하도록 정규화합니다.
        """
        return {
            "lat": parsed_state.get("lat"),
            "lng": parsed_state.get("lng"),
            "people": parsed_state.get("people"),
            "time": parsed_state.get("time"),
            "purpose": parsed_state.get("purpose"),
            "mood": parsed_state.get("mood"),
        }

    def _detect_missing_slots(self, parsed_state: ParsedState, priority_order: list[str]) -> list[str]:
        """
        parsedState에서 None 값을 "missing slot"으로 간주합니다.
        """
        return [slot for slot in priority_order if parsed_state.get(slot) is None]

    def _select_target_slot(self, missing_slots: list[str]) -> str:
        # priority 순서대로 missing_slots가 생성되므로 첫 원소가 targetSlot
        return missing_slots[0]

    def _build_followup_messages(
        self,
        user_message: str,
        parsed_state: ParsedState,
        target_slot: str,
        thread_id: str,
    ) -> list[dict[str, str]]:
        system_prompt = (
            "당신은 장소 추천 챗봇의 '후속 질문 생성기'입니다.\n"
            "역할: 백엔드가 이미 선택한 targetSlot에 대해, 자연스러운 한국어 follow-up 질문 1개를 생성하세요.\n"
            "중요 규칙:\n"
            "- LLM은 parsedState를 생성/수정하지 않습니다. (질문만 생성)\n"
            "- 이번 턴에는 targetSlot 1개에 대해서만 질문합니다.\n"
            "- 이미 parsedState에 들어있는 값들은 맥락으로만 활용하세요.\n"
            "- 추론을 사실처럼 단정하지 마세요. 확실하지 않으면 확인/질문형으로 표현하세요.\n"
            "- 출력은 반드시 JSON만 출력합니다.\n"
            "- JSON 형태는 아래와 같이 'question' 하나만 포함합니다.\n"
            '{"question": "..."}\n\n'
            "few-shot 예시(모두 targetSlot 1개만 질문합니다):\n\n"
            "사용자 발화: \"친구들이랑 저녁에 술자리 찾고 있어요\"\n"
            "parsedState: {\"people\": 2, \"time\": null, \"purpose\": \"술자리\", \"mood\": \"조용함\", \"lat\": null, \"lng\": null}\n"
            "targetSlot: \"time\"\n"
            "assistant: {\"question\": \"두 분이 조용한 분위기에서 술자리라면 시간대는 언제가 편하세요?\"}\n\n"
            "사용자 발화: \"점심쯤 가볍게 먹으려는데 인원은 아직 몰라요\"\n"
            "parsedState: {\"people\": null, \"time\": \"12:00\", \"purpose\": \"식사\", \"mood\": \"활기참\", \"lat\": null, \"lng\": null}\n"
            "targetSlot: \"people\"\n"
            "assistant: {\"question\": \"12:00에 가볍게 식사하신다면 인원은 몇 분이세요?\"}\n\n"
            "사용자 발화: \"강남 근처에서 데이트 장소 알아보고 있어요\"\n"
            "parsedState: {\"people\": 2, \"time\": \"18:00\", \"purpose\": \"데이트\", \"mood\": null, \"lat\": null, \"lng\": null}\n"
            "targetSlot: \"mood\"\n"
            "assistant: {\"question\": \"데이트라면 분위기는 어떤 쪽이 좋으세요? 조용한 편 vs 좀 더 활기 있는 편 중에서요.\"}\n\n"
            "사용자 발화: \"이따 만날 건데 뭐 먹을지 아직 정하진 않았어요\"\n"
            "parsedState: {\"people\": 3, \"time\": \"18:00\", \"purpose\": null, \"mood\": \"감성적\", \"lat\": null, \"lng\": null}\n"
            "targetSlot: \"purpose\"\n"
            "assistant: {\"question\": \"18:00에 3분이면 어떤 목적이세요? 식사, 술자리, 카페, 데이트, 모임 중에 편하신 쪽으로요.\"}\n\n"
            "마지막으로, 이번 입력에 대해 targetSlot 1개만 질문하세요."
        )

        user_prompt = (
            f"threadId: {thread_id}\n"
            f"사용자 발화: {user_message}\n"
            f"parsedState: {json.dumps(parsed_state, ensure_ascii=False)}\n"
            f"targetSlot: {target_slot}\n"
        )

        return [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

    def _safe_json_loads(self, text: str) -> dict[str, Any]:
        cleaned = text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.replace("```json", "").replace("```", "").strip()

        # JSON만 남기기 위한 방어(앞뒤로 텍스트가 섞이는 경우를 대비)
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            cleaned = cleaned[start : end + 1]

        try:
            data = json.loads(cleaned)
            return data if isinstance(data, dict) else {}
        except json.JSONDecodeError:
            return {}

    def _extract_question_from_llm_json(self, llm_content: str, fallback_target_slot: str) -> str:
        parsed = self._safe_json_loads(llm_content)
        question = parsed.get("question") if isinstance(parsed, dict) else None
        if isinstance(question, str) and question.strip():
            return question.strip()
        return self._fallback_question_for_slot(fallback_target_slot)

    def _fallback_question_for_slot(self, slot: str) -> str:
        # 방어적 fallback(정상 동작 시에는 LLM 생성 질문을 사용합니다)
        mapping = {
            "purpose": "원하시는 목적이 무엇인지 한 번만 더 알려주실 수 있을까요?",
            "time": "시간대는 언제가 편하세요?",
            "people": "인원은 몇 분이세요?",
            "mood": "어떤 분위기를 원하세요?",
        }
        return mapping.get(slot, "어떤 조건이 더 필요할까요?")

    async def _summarize_messages(
        self,
        messages: list[BaseMessage],
        existing_summary: str,
        thread_id: str,
    ) -> str:
        """
        오래된 대화 내용을 요약해서 summary 갱신
        """
        if not messages:
            return existing_summary

        conversation_text = self._messages_to_text(messages)

        prompt = (
            "아래는 사용자와 챗봇의 이전 대화 기록입니다.\n"
            "기존 요약이 있다면 그것을 갱신하는 형태로 핵심 정보만 정리하세요.\n"
            "반드시 아래 항목을 우선 보존하세요:\n"
            "1. 사용자의 목적\n"
            "2. 인원, 시간, 지역, 예산\n"
            "3. 선호/비선호 분위기\n"
            "4. 이미 추천했거나 제외한 조건\n"
            "5. 다음 응답에 필요한 맥락\n\n"
            f"[기존 요약]\n{existing_summary or '없음'}\n\n"
            f"[대화 기록]\n{conversation_text}\n\n"
            "업무용 요약처럼 간결하게 한국어로 작성하세요."
        )

        response = await self.client.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            max_tokens=600,
            temperature=0.1,
        )

        return (
            response.get("choices", [{}])[0]
            .get("message", {})
            .get("content", existing_summary or "")
            .strip()
        )

    def _build_messages_for_model(
        self,
        thread_id: str,
        summary: str,
        parsed_state: ParsedState,
        recent_messages: list[BaseMessage],
    ) -> list[dict[str, str]]:
        """
        실제 모델에 전달할 메시지 구성
        """
        messages: list[dict[str, str]] = []

        system_prompt = self._build_system_prompt(thread_id)
        messages.append({"role": "system", "content": system_prompt})

        if summary:
            messages.append(
                {
                    "role": "system",
                    "content": f"[이전 대화 요약]\n{summary}",
                }
            )

        parsed_state_text = self._format_parsed_state(parsed_state)
        if parsed_state_text:
            messages.append(
                {
                    "role": "system",
                    "content": f"[현재 추출된 사용자 요청 정보]\n{parsed_state_text}",
                }
            )

        messages.extend(self._to_openai_messages(recent_messages))
        return messages

    def _build_system_prompt(self, thread_id: str) -> str:
        base_prompt = (
            "당신은 친절한 장소 추천 챗봇입니다." \
            "장소를 추천 하기 전에 "
            "사용자의 요청에 대해 한국어로 답변해주세요."
        )

        preference = self._long_term_memories.get(thread_id)
        if not preference:
            return base_prompt

        preference_text = self._format_preference_summary(preference)
        if not preference_text:
            return base_prompt

        return (
            f"{base_prompt}\n\n"
            f"[사용자 선호도 정보]\n"
            f"{preference_text}\n\n"
            f"위 선호도 정보를 참고하여 사용자에게 맞는 장소를 추천해주세요."
        )

    def _format_preference_summary(self, preference: PreferenceSummary) -> str:
        parts = []

        if preference.preferredVibes:
            parts.append(f"선호하는 분위기: {', '.join(preference.preferredVibes)}")

        if preference.avoidedVibes:
            parts.append(f"피하고 싶은 분위기: {', '.join(preference.avoidedVibes)}")

        if preference.preferredCategories:
            parts.append(f"선호하는 카테고리: {', '.join(preference.preferredCategories)}")

        if preference.preferredPriceLevel:
            parts.append(f"선호하는 가격대: {preference.preferredPriceLevel}단계")

        return "\n".join(parts)

    def _format_parsed_state(self, parsed_state: ParsedState) -> str:
        parts = []

        if parsed_state.get("people") is not None:
            parts.append(f"인원: {parsed_state['people']}명")
        if parsed_state.get("time"):
            parts.append(f"시간대: {parsed_state['time']}")
        if parsed_state.get("purpose"):
            parts.append(f"목적: {parsed_state['purpose']}")
        if parsed_state.get("mood"):
            parts.append(f"분위기: {parsed_state['mood']}")
        if parsed_state.get("lat") is not None and parsed_state.get("lng") is not None:
            parts.append(f"위치: ({parsed_state['lat']}, {parsed_state['lng']})")

        return "\n".join(parts)


    def _to_openai_messages(self, messages: list[BaseMessage]) -> list[dict[str, str]]:
        result: list[dict[str, str]] = []

        for msg in messages:
            if isinstance(msg, HumanMessage):
                result.append({"role": "user", "content": msg.content})
            elif isinstance(msg, AIMessage):
                result.append({"role": "assistant", "content": msg.content})

        return result

    def _messages_to_text(self, messages: list[BaseMessage]) -> str:
        lines: list[str] = []

        for msg in messages:
            if isinstance(msg, HumanMessage):
                lines.append(f"사용자: {msg.content}")
            elif isinstance(msg, AIMessage):
                lines.append(f"챗봇: {msg.content}")

        return "\n".join(lines)