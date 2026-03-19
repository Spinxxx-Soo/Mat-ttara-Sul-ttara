from __future__ import annotations

from typing import Optional, Tuple

from apps.services.memory_types import PreferenceEvent, PreferenceProfile
from apps.services.preference_extractor import PreferenceExtractor
from apps.services.preference_updater import PreferenceUpdater


class MemoryService:
    """
    장기 메모리용 Orchestrator:
    1) extractor로 이벤트 추출
    2) updater로 profile 갱신
    3) updated_profile + events 반환
    """

    def __init__(self, *, extractor: Optional[PreferenceExtractor] = None, updater: Optional[PreferenceUpdater] = None):
        self.extractor = extractor or PreferenceExtractor()
        self.updater = updater or PreferenceUpdater()

    def process_user_message_for_long_term_memory(
        self,
        *,
        user_message: str,
        summary: Optional[str] = None,
        previous_profile: Optional[PreferenceProfile] = None,
    ) -> Tuple[PreferenceProfile, list[PreferenceEvent]]:
        previous_profile = previous_profile or {}

        events = self.extractor.extract_events(
            user_message=user_message,
            summary=summary,
            previous_profile=previous_profile,
        )
        updated_profile = self.updater.update(previous_profile=previous_profile, events=events)
        return updated_profile, events

