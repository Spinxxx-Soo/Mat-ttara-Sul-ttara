from __future__ import annotations

import re
from typing import Any, Optional

from apps.services.memory_types import PreferenceEvent, PreferenceProfile
from apps.services.preference_registry import get_key_meta


class PreferenceExtractor:
    """
    장기 메모리용 PreferenceEvent 추출 책임 분리:
    - user_message(+summary)를 기반으로
      "명시적 선호/비선호(explicit)" 신호만 이벤트로 변환
    - recommendation용 키도 이벤트로 생성할 수 있으나,
      long-term-memory-only 키는 "장기 선호로 확정 가능한지"를 간단히 필터링
    """

    EXPLICIT_WEIGHT = 0.15

    _LONG_TERM_CUES = [
        "원래",
        "평소",
        "자주",
        "항상",
        "늘",
        "보통",
        "즐겨",
        "선호",
        "좋아하는",
    ]

    _PRESENT_CUES = [
        "오늘",
        "지금",
        "이번",
        "당장",
        "이번에",
        "그때",
    ]

    def extract_events(
        self,
        *,
        user_message: str,
        summary: Optional[str] = None,
        previous_profile: Optional[PreferenceProfile] = None,
    ) -> list[PreferenceEvent]:
        del summary, previous_profile  # 현재 MVP에서는 summary/previous_profile을 후처리용으로만 사용

        text = self._normalize(user_message)
        if not self._has_explicit_preference(text):
            return []

        long_term_cue_present = any(cue in text for cue in self._LONG_TERM_CUES)
        present_cue_present = any(cue in text for cue in self._PRESENT_CUES)
        long_term_key_allowed = long_term_cue_present or not present_cue_present

        positive = self._is_positive(text)
        negative = self._is_negative(text)

        events: list[PreferenceEvent] = []

        # ============================================================
        # Long-term-memory-only keys
        # ============================================================
        events.extend(self._extract_long_term_only_events(
            text=text,
            positive=positive,
            negative=negative,
            long_term_key_allowed=long_term_key_allowed,
        ))

        # ============================================================
        # Active recommendation keys (현재 추천 점수에 바로 사용)
        # ============================================================
        events.extend(self._extract_active_recommendation_events(
            text=text,
            positive=positive,
            negative=negative,
        ))

        return events

    def _normalize(self, text: str) -> str:
        # 단순 정규화: 공백 제거 + 소문자
        return re.sub(r"\s+", "", text.lower())

    def _has_explicit_preference(self, text: str) -> bool:
        # "좋아/싫어/선호/원래/자주/평소/즐겨" 같은 명시적 표현이 있어야 함
        return any(
            token in text
            for token in [
                "좋아",
                "싫어",
                "싫",
                "별로",
                "선호",
                "원래",
                "평소",
                "자주",
                "항상",
                "늘",
                "즐겨",
                "편이야",
                "편한",
                "원해",
                "필요",
            ]
        )

    def _is_positive(self, text: str) -> bool:
        return any(token in text for token in ["좋아", "원해", "선호", "즐겨", "편해", "좋은", "괜찮", "필수", "필요"])

    def _is_negative(self, text: str) -> bool:
        return any(token in text for token in ["싫", "별로", "불편", "못", "어렵", "필요없", "필요없어", "불가", "피하고"])

    def _confidence(self, *, long_term_cue_present: bool) -> float:
        return 0.9 if long_term_cue_present else 0.75

    def _should_emit_key(self, key: str, *, long_term_key_allowed: bool) -> bool:
        meta = get_key_meta(key)
        if not meta:
            return False
        if meta.used_for_long_term_memory and not long_term_key_allowed:
            return False
        return True

    def _extract_long_term_only_events(
        self,
        *,
        text: str,
        positive: bool,
        negative: bool,
        long_term_key_allowed: bool,
    ) -> list[PreferenceEvent]:
        events: list[PreferenceEvent] = []

        long_term_cue_present = any(cue in text for cue in self._LONG_TERM_CUES)
        conf = self._confidence(long_term_cue_present=long_term_cue_present)

        def add_event(key: str, value: float, reason: str) -> None:
            if not self._should_emit_key(key, long_term_key_allowed=long_term_key_allowed):
                return
            events.append(
                PreferenceEvent(
                    key=key,
                    value=float(value),
                    weight=self.EXPLICIT_WEIGHT,
                    signal_type="explicit",
                    confidence=conf,
                    reason=reason,
                )
            )

        # taste_spicy
        if any(k in text for k in ["매운", "얼큰", "핫"]) and (positive or negative):
            if positive and not negative:
                add_event("taste_spicy", 1.0, "매운 음식을 좋아한다고 표현")
            elif negative and not positive:
                add_event("taste_spicy", 0.0, "매운 음식이 싫다고 표현")
            else:
                # 둘 다 있으면 모호하므로 스킵
                pass

        # taste_light
        if any(k in text for k in ["담백", "라이트", "가벼운", "느끼"]) and (positive or negative):
            # "느끼한 건 싫다" 같은 케이스도 있으니 키워드 조합을 단순화
            if positive and not negative:
                add_event("taste_light", 1.0, "담백/라이트한 맛을 선호한다고 표현")
            elif negative and not positive:
                # 느끼한 것을 싫어하면 라이트 선호로 해석
                add_event("taste_light", 1.0, "느끼한 맛이 싫어 라이트한 맛을 선호")
            else:
                pass

        # taste_rich
        if any(k in text for k in ["진한", "고소", "풍부", "리치", "크리미"]) and (positive or negative):
            if positive and not negative:
                add_event("taste_rich", 1.0, "진하고 풍부한 맛을 선호한다고 표현")
            elif negative and not positive:
                add_event("taste_rich", 0.0, "진한/리치한 맛이 싫다고 표현")
            else:
                pass

        # wait_tolerance
        if any(k in text for k in ["웨이팅", "대기", "줄서"]) and (positive or negative):
            if negative and not positive:
                add_event("wait_tolerance", 0.0, "웨이팅/대기가 싫다고 표현")
            elif positive and not negative:
                add_event("wait_tolerance", 1.0, "웨이팅이 괜찮다고 표현")
            else:
                pass

        # crowd_tolerance
        if any(k in text for k in ["붐비", "사람많", "복잡", "북적"]) and (positive or negative):
            if negative and not positive:
                add_event("crowd_tolerance", 0.0, "붐비는 환경이 싫다고 표현")
            elif positive and not negative:
                add_event("crowd_tolerance", 1.0, "사람 있는 환경도 괜찮다고 표현")
            else:
                pass

        # parking_required
        if "주차" in text and (positive or negative):
            if any(k in text for k in ["꼭", "필수", "필요"]) and positive:
                add_event("parking_required", 1.0, "주차가 필수라고 표현")
            elif negative:
                # 예: "주차 필요없어"
                if "필요없" in text or "불필요" in text or "필요없어" in text:
                    add_event("parking_required", 0.0, "주차가 필요 없다고 표현")
                else:
                    # 주차 싫다/어렵다 → 필요 낮음
                    add_event("parking_required", 0.0, "주차가 불편/어렵다고 표현")

        # seat_private
        if any(k in text for k in ["룸", "프라이빗", "단독", "프라이빗석"]) and positive:
            add_event("seat_private", 1.0, "룸/프라이빗 좌석을 원한다고 표현")
        if any(k in text for k in ["오픈", "오픈형", "바석", "바 테이블"]) and negative:
            add_event("seat_private", 0.0, "오픈/바석이 싫다고 표현")

        # outdoor_ok
        if any(k in text for k in ["야외", "테라스", "밖", "오픈에어"]) and positive:
            add_event("outdoor_ok", 1.0, "야외/테라스를 선호한다고 표현")
        if any(k in text for k in ["실내만", "밖 싫", "야외 싫", "비 싫"]) and negative:
            add_event("outdoor_ok", 0.0, "야외가 싫다고 표현")

        # price_range
        if any(k in text for k in ["가성비", "저렴", "싼", "부담", "싸"]) and positive and not negative:
            add_event("price_range", 0.0, "저렴/가성비를 선호한다고 표현")
        if any(k in text for k in ["비싸", "고급", "가격 상관", "가격상관", "상관없"]) and positive and not negative:
            add_event("price_range", 1.0, "고급/비용을 감수한다고 표현")

        # 적당(중간)
        if any(k in text for k in ["무난", "적당", "중간"]) and (positive and not negative):
            add_event("price_range", 0.5, "가격이 무난/적당하다고 표현")

        return events

    def _extract_active_recommendation_events(
        self,
        *,
        text: str,
        positive: bool,
        negative: bool,
    ) -> list[PreferenceEvent]:
        events: list[PreferenceEvent] = []

        long_term_cue_present = any(cue in text for cue in self._LONG_TERM_CUES)
        conf = self._confidence(long_term_cue_present=long_term_cue_present)

        def add_event(key: str, value: float, reason: str) -> None:
            meta = get_key_meta(key)
            if not meta:
                return
            events.append(
                PreferenceEvent(
                    key=key,
                    value=float(value),
                    weight=self.EXPLICIT_WEIGHT,
                    signal_type="explicit",
                    confidence=conf,
                    reason=reason,
                )
            )

        # cuisine
        if any(k in text for k in ["일식", "스시", "사시미", "라멘", "우동"]):
            if positive and not negative:
                add_event("cuisine_japanese", 1.0, "일식(스시/라멘 등)을 좋아한다고 표현")
            elif negative and not positive:
                add_event("cuisine_japanese", 0.0, "일식을 싫어한다고 표현")

        if any(k in text for k in ["한식", "국밥", "김치찌개", "고기"]):
            if positive and not negative:
                add_event("cuisine_korean", 1.0, "한식을 선호한다고 표현")
            elif negative and not positive:
                add_event("cuisine_korean", 0.0, "한식을 싫어한다고 표현")

        if any(k in text for k in ["중식", "짜장", "짬뽐", "마라", "탕수육"]):
            if positive and not negative:
                add_event("cuisine_chinese", 1.0, "중식을 좋아한다고 표현")
            elif negative and not positive:
                add_event("cuisine_chinese", 0.0, "중식을 싫어한다고 표현")

        if any(k in text for k in ["양식", "파스타", "스테이크", "브런치", "피자"]):
            if positive and not negative:
                add_event("cuisine_western", 1.0, "양식을 선호한다고 표현")
            elif negative and not positive:
                add_event("cuisine_western", 0.0, "양식을 싫어한다고 표현")

        if any(k in text for k in ["분식", "떡볶이", "순대", "라면", "튀김"]):
            if positive and not negative:
                add_event("cuisine_bunsik", 1.0, "분식을 좋아한다고 표현")
            elif negative and not positive:
                add_event("cuisine_bunsik", 0.0, "분식을 싫어한다고 표현")

        if any(k in text for k in ["태국", "베트남", "베트남음식", "타이", "팟타이"]):
            if positive and not negative:
                add_event("cuisine_asian_other", 1.0, "동남아/기타 아시안 음식을 선호한다고 표현")
            elif negative and not positive:
                add_event("cuisine_asian_other", 0.0, "동남아/기타 아시안 음식을 싫어한다고 표현")

        # vibe
        if any(k in text for k in ["조용", "한적", "차분"]):
            if positive and not negative:
                add_event("vibe_quiet", 1.0, "조용한 곳을 좋아한다고 표현")
            elif negative and not positive:
                add_event("vibe_quiet", 0.0, "조용한 분위기를 싫어한다고 표현")

        if any(k in text for k in ["시끄", "활기", "북적", "쾌활", "떠들"]):
            if positive and not negative:
                add_event("vibe_lively", 1.0, "활기 있는 분위기를 선호한다고 표현")
            elif negative and not positive:
                add_event("vibe_lively", 0.0, "시끄러운 분위기를 싫어한다고 표현")

        if any(k in text for k in ["모던", "깔끔", "현대"]):
            if positive and not negative:
                add_event("vibe_modern", 1.0, "모던/깔끔한 분위기를 선호한다고 표현")
            elif negative and not positive:
                add_event("vibe_modern", 0.0, "모던/깔끔한 분위기를 싫어한다고 표현")

        if any(k in text for k in ["전통", "고풍", "한옥", "전통적인"]):
            if positive and not negative:
                add_event("vibe_traditional", 1.0, "전통/고풍 분위기를 선호한다고 표현")
            elif negative and not positive:
                add_event("vibe_traditional", 0.0, "전통/고풍 분위기를 싫어한다고 표현")

        # occasion
        if any(k in text for k in ["데이트", "소개팅"]):
            if positive and not negative:
                add_event("occasion_date", 1.0, "데이트/소개팅 목적 선호를 표현")
            elif negative and not positive:
                add_event("occasion_date", 0.0, "데이트/소개팅 목적을 싫어한다고 표현")

        if any(k in text for k in ["회식", "미팅", "미팅", "거래처", "비즈니스"]):
            if positive and not negative:
                add_event("occasion_business", 1.0, "비즈니스/회식 용도를 표현")
            elif negative and not positive:
                add_event("occasion_business", 0.0, "비즈니스/회식 용도를 싫어한다고 표현")

        if any(k in text for k in ["가족", "부모", "아이", "애기"]):
            if positive and not negative:
                add_event("occasion_family", 1.0, "가족 모임 선호를 표현")
            elif negative and not positive:
                add_event("occasion_family", 0.0, "가족 모임 목적을 싫어한다고 표현")

        if any(k in text for k in ["혼자", "나혼자", "혼밥", "혼밥"]):
            if positive and not negative:
                add_event("occasion_solo", 1.0, "혼자 식사를 선호한다고 표현")
            elif negative and not positive:
                add_event("occasion_solo", 0.0, "혼자 식사를 싫어한다고 표현")

        if any(k in text for k in ["친구", "모임", "단체", "동료"]):
            if positive and not negative:
                add_event("occasion_friends", 1.0, "친구/모임 목적을 표현")
            elif negative and not positive:
                add_event("occasion_friends", 0.0, "친구/모임 목적을 싫어한다고 표현")

        return events

