"""
다음 질문은 missing_slot 목록이 아니라 next_facet 기준으로 고른다.

우선순위 (요약):
1) 음식·분위기 둘 다 비어 있으면 먼저 AXIS_CHOICE (시간보다 앞 — 첫 질문이 “언제 방문”이 되지 않게)
2) 그다음 시간(time)
3) 한쪽만 비면 남은 cuisine / vibe
4) 모임 목적(party)
"""
from __future__ import annotations

from typing import Any, Optional

from apps.services.chat.parsing.conversation_parser import DialogueTurnResult
from apps.services.chat.planning.facets import (
    Facet,
    facet_cuisine_satisfied,
    facet_party_satisfied,
    facet_time_satisfied,
    facet_vibe_satisfied,
)


def pick_next_facet(
    normalized_parsed_state: dict[str, Any],
    dialogue: Optional[DialogueTurnResult] = None,
) -> Optional[Facet]:
    """
    다음에 물어볼 facet. None이면 primary 탐색 축은 충족된 것으로 본다.

    dialogue는 이후 '직전 발화와 자연스럽게 이어지는 facet' 규칙 확장용.
    """
    del dialogue  # reserved

    s = normalized_parsed_state

    cuisine_ok = facet_cuisine_satisfied(s)
    vibe_ok = facet_vibe_satisfied(s)

    # 1) 첫 탐색: 시간 단독 질문보다 음식·분위기 축을 먼저
    if not cuisine_ok and not vibe_ok:
        return Facet.AXIS_CHOICE

    # 2) 축 중 하나라도 잡힌 뒤에 시간
    if not facet_time_satisfied(s):
        return Facet.TIME

    if not cuisine_ok:
        return Facet.CUISINE
    if not vibe_ok:
        return Facet.VIBE

    if not facet_party_satisfied(s):
        return Facet.PARTY

    return None
