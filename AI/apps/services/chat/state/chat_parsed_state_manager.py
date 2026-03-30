from __future__ import annotations

from typing import Any, Optional

from apps.schemas.chat_schemas import ParsedState, SessionState


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
        self._category_prefixes = ("cuisine_", "vibe_", "occasion_")
        self._core_slots = ("time", "lat", "lng")

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

    def select_target_slot(
        self,
        missing_slots: list[str],
        normalized_parsed_state: dict[str, Any],
    ) -> str:
        """
        missing_slots는 priority 순서대로 생성되므로 첫 원소가 이번 턴에 질문할 슬롯입니다.
        """
        # 안전장치: caller에서 빈 배열을 넘기지 않지만, 방어적으로 기본 슬롯을 반환합니다.
        if not missing_slots:
            return "lat"

        # 1) "한 번 답한 feature는 locked"
        #    - 값이 None이 아니면(0.0 포함) 이미 답한 것으로 간주합니다.
        #    - detect_missing_slots에서 None만 missing이므로, answered feature는 재질문 대상에서 자동 제외됩니다.
        # 2) "음식/분위기 여러 개가 채워졌으면 지역/시간으로 전환"
        #    - cuisine/vibe에서 답한 슬롯이 2개 이상이면 core slot(time/lat/lng)을 우선합니다.
        answered_cuisine_vibe_count = self._count_answered_features(
            normalized_parsed_state,
            prefixes=("cuisine_", "vibe_"),
        )
        if answered_cuisine_vibe_count >= 2:
            core_missing = [slot for slot in missing_slots if slot in self._core_slots]
            if core_missing:
                return core_missing[0]

        # 3) 카테고리 포커싱: 현재 턴에서 활성화된 카테고리(cuisine/vibe/occasion)가 있으면
        #    같은 카테고리의 missing을 우선 질문합니다.
        for prefix in self._category_prefixes:
            if not self._has_any_answered_feature(normalized_parsed_state, prefix):
                continue

            category_missing = [slot for slot in missing_slots if slot.startswith(prefix)]
            if category_missing:
                return category_missing[0]

        return missing_slots[0]

    def _has_any_answered_feature(
        self,
        normalized_parsed_state: dict[str, Any],
        prefix: str,
    ) -> bool:
        return any(
            normalized_parsed_state.get(key) is not None
            for key in normalized_parsed_state
            if key.startswith(prefix)
        )

    def _count_answered_features(
        self,
        normalized_parsed_state: dict[str, Any],
        prefixes: tuple[str, ...],
    ) -> int:
        return sum(
            1
            for key, value in normalized_parsed_state.items()
            if any(key.startswith(prefix) for prefix in prefixes) and value is not None
        )
