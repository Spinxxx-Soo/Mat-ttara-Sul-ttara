from __future__ import annotations

from typing import Any, Optional

from apps.schemas.chat import ParsedState, SessionState


class ParsedStateManager:
    """
    parsedState 관련 책임 분리:
    - sessionState 병합
    - parsedState normalize
    - missing slot 탐지
    - target slot 선택
    """

    def __init__(self, priority_order: list[str]):
        self.priority_order = priority_order

    def merge_session_state(
        self,
        previous_parsed_state: dict[str, Any],
        session_state: Optional[SessionState],
    ) -> dict[str, Any]:
        """
        BE가 보내주는 SessionState를 AI의 내부 parsed_state(ParsedState 스키마)로 병합합니다.

        규칙:
        - None 값은 병합하지 않습니다.
        - lat/lng/time은 그대로 매핑합니다.
        - session_state.extraData에 들어있는 cuisine/vibe/seat/outdoor/occasion_* 값을 ParsedState로 병합합니다.
        - session_state.finalPlaceIds는 selectedPlaceIds로 매핑합니다.
        """
        if not session_state:
            return previous_parsed_state

        # 1) lat/lng/time
        if session_state.lat is not None:
            previous_parsed_state["lat"] = session_state.lat
        if session_state.lng is not None:
            previous_parsed_state["lng"] = session_state.lng
        if session_state.time is not None:
            previous_parsed_state["time"] = session_state.time

        # 2) extraData -> parsedState의 cuisine/vibe/seat/outdoor/occasion 키들
        extra = session_state.extraData or {}
        parsed_keys = ParsedState.model_fields.keys()
        for key, value in extra.items():
            if key not in parsed_keys:
                continue
            if value is None:
                continue
            previous_parsed_state[key] = value

        # 3) finalPlaceIds -> selectedPlaceIds
        if session_state.finalPlaceIds is not None:
            previous_parsed_state["selectedPlaceIds"] = session_state.finalPlaceIds
        return previous_parsed_state

    def normalize_parsed_state(self, parsed_state: dict[str, Any]) -> dict[str, Any]:
        """
        `ParsedState` 스키마에 정의된 키만 채워 응답·슬롯 탐지에 쓰입니다 (단일 소스).
        """
        keys = ParsedState.model_fields.keys()
        return {k: parsed_state.get(k) for k in keys}

    def detect_missing_slots(self, normalized_parsed_state: dict[str, Any]) -> list[str]:
        """
        parsedState에서 None 값을 "missing slot"으로 간주합니다.
        """
        missing: list[str] = []
        for slot in self.priority_order:
            if normalized_parsed_state.get(slot) is None:
                missing.append(slot)
        return missing

    def select_target_slot(self, missing_slots: list[str]) -> str:
        """
        missing_slots는 priority 순서대로 생성되므로 첫 원소가 이번 턴에 질문할 슬롯입니다.
        """
        return missing_slots[0]
