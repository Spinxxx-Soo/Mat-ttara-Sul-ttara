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
        await self.graph.aupdate_state(
            config={"configurable": {"thread_id": thread_id}},
            values={"messages": [HumanMessage(content=user_message)]},
            as_node=self.as_node,
        )

    async def save_ai_message(self, thread_id: str, ai_message: str) -> None:
        await self.graph.aupdate_state(
            config={"configurable": {"thread_id": thread_id}},
            values={"messages": [AIMessage(content=ai_message)]},
            as_node=self.as_node,
        )

    async def save_parsed_state(self, thread_id: str, parsed_state: dict[str, Any]) -> None:
        await self.graph.aupdate_state(
            config={"configurable": {"thread_id": thread_id}},
            values={"parsed_state": parsed_state},
            as_node=self.as_node,
        )

    async def save_summary(self, thread_id: str, summary: str) -> None:
        await self.graph.aupdate_state(
            config={"configurable": {"thread_id": thread_id}},
            values={"summary": summary},
            as_node=self.as_node,
        )
