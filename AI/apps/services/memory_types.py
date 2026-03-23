from __future__ import annotations

from typing import TypedDict, Literal


SignalType: type = Literal["explicit", "weak"]


class PreferenceEvent(TypedDict):
    key: str
    value: float  # 0.0 ~ 1.0
    weight: float
    signal_type: SignalType
    confidence: float  # 0.0 ~ 1.0
    reason: str


PreferenceProfile = dict[str, float]

