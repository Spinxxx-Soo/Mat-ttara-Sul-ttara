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
        sessionState가 있으면 previous_parsed_state에 필요한 필드만 병합합니다.
        - None 값은 병합하지 않습니다.
        - 기존 동작(인원/시간/목적/분위기/위치)은 유지합니다.
        """
        if not session_state:
            return previous_parsed_state

        session_state_dict = session_state.model_dump(
            exclude={"excludedPlaceIds"},
            include={
                "lat",
                "lng",
                "people",
                "time",
                "purpose",
                "mood",
                "selectedPlaceIds",
            },
        )
        for key, value in session_state_dict.items():
            if value is not None:
                previous_parsed_state[key] = value
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

