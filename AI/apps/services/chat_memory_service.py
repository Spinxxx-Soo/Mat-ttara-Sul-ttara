from __future__ import annotations

from typing import Any, Optional


class MemoryService:
    """
    장기 메모리(선호 프로필 누적) — MVP에서 비활성화.
    실제 동작(extractor → updater)은 이후 도입 시 아래 주석을 참고해 복구.
    """

    def process_user_message_for_long_term_memory(
        self,
        *,
        user_message: str,
        summary: Optional[str] = None,
        previous_profile: Optional[dict[str, float]] = None,
    ) -> tuple[dict[str, float], list[dict[str, Any]]]:
        # 이전 구현 (비활성화됨):
        # events = self.extractor.extract_events(
        #     user_message=user_message,
        #     summary=summary,
        #     previous_profile=previous_profile or {},
        # )
        # updated_profile = self.updater.update(previous_profile=previous_profile or {}, events=events)
        # return updated_profile, events
        del user_message, summary
        return dict(previous_profile or {}), []
