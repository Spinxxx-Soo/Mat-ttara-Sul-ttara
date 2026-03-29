from __future__ import annotations

from typing import Any, Optional

from langchain_core.messages import HumanMessage, AIMessage


class ConversationStateStore:
    """
    LangGraph state access 분리:
    - thread state 조회
    - user/ai message 저장
    - parsed_state 저장
    - summary 저장
    """

    def __init__(self, graph: Any, *, as_node: str = "chatbot"):
        self.graph = graph
        self.as_node = as_node

    def get_thread_state(self, thread_id: str) -> Optional[dict[str, Any]]:
        snapshot = self.graph.get_state(
            config={"configurable": {"thread_id": thread_id}},
        )
        if snapshot and snapshot.values:
            return snapshot.values
        return None

    async def save_user_message(self, thread_id: str, user_message: str) -> None:
        # RedisSaver 등은 sync get_tuple만 구현되는 경우가 많아 aupdate_state(aget_tuple)가
        # NotImplementedError 난다. update_state → bulk_update_state → get_tuple 경로 사용.
        self.graph.update_state(
            config={"configurable": {"thread_id": thread_id}},
            values={"messages": [HumanMessage(content=user_message)]},
            as_node=self.as_node,
        )

    async def save_ai_message(self, thread_id: str, ai_message: str) -> None:
        self.graph.update_state(
            config={"configurable": {"thread_id": thread_id}},
            values={"messages": [AIMessage(content=ai_message)]},
            as_node=self.as_node,
        )

    async def save_parsed_state(
        self,
        thread_id: str,
        parsed_state: dict[str, Any],
        preference_state: dict[str, Any] | None = None,
    ) -> None:
        values: dict[str, Any] = {"parsed_state": parsed_state}
        if preference_state is not None:
            values["preference_state"] = preference_state
        self.graph.update_state(
            config={"configurable": {"thread_id": thread_id}},
            values=values,
            as_node=self.as_node,
        )

    async def save_summary(self, thread_id: str, summary: str) -> None:
        self.graph.update_state(
            config={"configurable": {"thread_id": thread_id}},
            values={"summary": summary},
            as_node=self.as_node,
        )
