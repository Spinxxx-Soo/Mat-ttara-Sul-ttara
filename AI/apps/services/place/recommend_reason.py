"""
추천 장소별 recommendReason 문구 생성.

- 유저 결합 벡터와 장소 벡터의 차원별 곱(기여도) 상위 항목 → 자연어
- 벡터가 빈약하면 단기(extraData)의 cuisine_/vibe_/occasion_ 그룹별 최댓값만 사용 (전역 최댓값 버그 방지)
"""
from __future__ import annotations

from typing import Any, Mapping, Optional, Sequence

from apps.services.place.memory_keys import ORDERED_KEY_NAMES

_MEMORY_KEY_TO_LABEL: dict[str, str] = {
    "cuisine_korean": "한식",
    "cuisine_japanese": "일식",
    "cuisine_chinese": "중식",
    "cuisine_western": "양식",
    "cuisine_bunsik": "분식/간단식",
    "cuisine_asian_other": "기타 아시안",
    "price_range": "가격대",
    "vibe_quiet": "조용한 분위기",
    "vibe_lively": "활기찬 분위기",
    "vibe_modern": "모던·깔끔한 인테리어",
    "vibe_traditional": "전통·고풍스러운 분위기",
    "seat_private": "룸·프라이빗",
    "outdoor_ok": "야외석",
    "crowd_tolerance": "혼잡 허용",
    "wait_tolerance": "웨이팅 허용",
    "parking_available": "주차",
    "occasion_solo": "혼밥·혼술",
    "occasion_date": "데이트",
    "occasion_friends": "친구 모임",
    "occasion_family": "가족 모임",
    "occasion_business": "비즈니스·회식",
    "taste_spicy": "자극적인 맛",
    "taste_light": "담백한 맛",
    "taste_rich": "진한 맛",
}


def _pick_best_in_key_prefix(
    value_map: Mapping[str, Any],
    prefix: str,
) -> Optional[str]:
    """같은 접두어만 보고 최댓값 키의 한글 라벨 반환."""
    best_key: Optional[str] = None
    best_val: Optional[float] = None
    for key, val in value_map.items():
        if not isinstance(key, str) or not key.startswith(prefix):
            continue
        if val is None:
            continue
        try:
            f = float(val)
        except (TypeError, ValueError):
            continue
        if best_val is None or f > best_val:
            best_val = f
            best_key = key
    if best_key is None:
        return None
    return _MEMORY_KEY_TO_LABEL.get(best_key)


def _top_contribution_labels(
    user_vector: Sequence[Optional[float]],
    place_vector: Sequence[float],
    *,
    max_labels: int = 3,
) -> list[str]:
    """두 벡터 모두 값이 있는 차원에서 u*p가 큰 순으로 라벨 추출."""
    scored: list[tuple[float, str]] = []
    for i, mem_key in enumerate(ORDERED_KEY_NAMES):
        u = user_vector[i] if i < len(user_vector) else None
        p = place_vector[i] if i < len(place_vector) else None
        if u is None or p is None:
            continue
        try:
            uf, pf = float(u), float(p)
        except (TypeError, ValueError):
            continue
        prod = uf * pf
        if prod <= 0:
            continue
        lab = _MEMORY_KEY_TO_LABEL.get(mem_key)
        if not lab:
            continue
        scored.append((prod, lab))
    scored.sort(key=lambda x: -x[0])
    out: list[str] = []
    seen: set[str] = set()
    for _, lab in scored:
        if lab in seen:
            continue
        seen.add(lab)
        out.append(lab)
        if len(out) >= max_labels:
            break
    return out


def _particle(name: str) -> str:
    """간단한 은/는."""
    if not name or not name.strip():
        return "이 곳은"
    # 마지막 글자 받침 없으면 는, 있으면 은
    last = name.strip()[-1]
    if ord("가") <= ord(last) <= ord("힣"):
        code = (ord(last) - ord("가")) % 28
        jo = "는" if code == 0 else "은"
        return f"{name.strip()}{jo}"
    return f"{name.strip()}은(는)"


def _clean_category(cat: str | None) -> str | None:
    if not cat or not str(cat).strip():
        return None
    c = str(cat).strip()
    if len(c) > 40:
        c = c[:37] + "…"
    return c


def build_recommend_reason(
    *,
    place_name: str,
    category: str | None,
    similarity: float,
    user_vector: Sequence[Optional[float]],
    place_vector: Sequence[float] | None,
    short_term: Mapping[str, Any],
) -> str:
    """
    장소 하나에 대한 한국어 추천 이유 (채팅·FE 카드용).
    """
    name = place_name.strip() or "이 장소"
    cat = _clean_category(category)
    pvec = place_vector if place_vector is not None else []

    labels = _top_contribution_labels(user_vector, pvec, max_labels=3)

    cuisine_st = _pick_best_in_key_prefix(short_term, "cuisine_")
    vibe_st = _pick_best_in_key_prefix(short_term, "vibe_")
    occ_st = _pick_best_in_key_prefix(short_term, "occasion_")

    # 문장 조합
    head = _particle(name)
    cat_bit = f" {cat} 업종이고," if cat else ""

    if len(labels) >= 2:
        if len(labels) == 2:
            mid = f" 대화에서 정리된 취향과 겹치는 '{labels[0]}'·'{labels[1]}' 면에서 잘 맞습니다."
        else:
            mid = f" 취향 프로필과 '{labels[0]}'·'{labels[1]}' 등에서 특히 잘 맞습니다."
        tail = f" (유사도 점수 {similarity:.3f})"
        return f"{head}{cat_bit}{mid}{tail}"

    if len(labels) == 1:
        extra_parts = [x for x in (cuisine_st, vibe_st, occ_st) if x and x not in labels]
        if extra_parts:
            mid = f" '{labels[0]}'에 가깝고, 요청하신 {extra_parts[0]} 맥락과도 어울립니다."
        else:
            mid = f" '{labels[0]}' 측면에서 상대적으로 잘 맞습니다."
        return f"{head}{cat_bit}{mid} (유사도 {similarity:.3f})"

    # 벡터 기여가 거의 없을 때: 그룹별 단기 슬롯만으로 구분 문구
    bits = [x for x in (cuisine_st, vibe_st, occ_st) if x]
    if len(bits) >= 2:
        return (
            f"{head}{cat_bit} {bits[0]}·{bits[1]} 조건을 반영한 후보 중 "
            f"유사도가 {similarity:.3f}로 상위에 들었습니다."
        )
    if len(bits) == 1:
        return (
            f"{head}{cat_bit} {bits[0]} 맥락을 반영한 추천이며, 유사도는 {similarity:.3f}입니다."
        )

    return f"{head}{cat_bit} 조건에 맞는 후보 중 유사도 {similarity:.3f}로 상위에 포함되었습니다."
