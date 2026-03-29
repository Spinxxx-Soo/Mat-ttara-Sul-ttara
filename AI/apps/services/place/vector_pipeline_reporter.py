"""
추천 벡터 파이프라인 점검용 로그.

- BE→AI extraData(단기 벡터) 키가 memory_keys(24차원)와 맞는지
- 장소 벡터 JSON 파싱 성공 여부(place_memory_vector)
- 유저 결합 벡터·후보별 코사인 유사도(전 후보)

환경변수 DEBUG_VECTOR_PIPELINE=true 일 때 place/router에서 호출됩니다.
"""
from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, Mapping, Optional, Sequence, Tuple

from apps.services.place.memory_keys import ORDERED_KEY_NAMES, VECTOR_DIM
from apps.services.place.vector_utils import masked_cosine_similarity

logger = logging.getLogger(__name__)

# 세션 상태 등 비벡터 키 (단기 슬롯에 섞여 들어올 수 있음)
_NON_VECTOR_SHORT_TERM_KEYS = frozenset(
    {"lat", "lng", "time", "selectedplaceids", "selectedPlaceIds"}
)


def _norm_key(k: str) -> str:
    return k.strip().lower().replace("-", "_")


def analyze_short_term_vector_keys(
    short_term: Mapping[str, Any],
) -> Tuple[Dict[str, float], List[str], List[str]]:
    """
    Returns:
        numeric_vector_slice: ORDERED_KEY_NAMES 에 속하는 키만 float 로 정규화
        unknown_keys: 24차원 스키마에 없는 키 (LLM/파서 오타 점검용)
        non_numeric_keys: 값이 숫자로 바꿀 수 없는 키
    """
    numeric: Dict[str, float] = {}
    unknown: List[str] = []
    non_numeric: List[str] = []

    allowed = set(ORDERED_KEY_NAMES)

    for raw_k, v in short_term.items():
        k = raw_k if isinstance(raw_k, str) else str(raw_k)
        lk = _norm_key(k)
        if lk in {x.lower() for x in _NON_VECTOR_SHORT_TERM_KEYS}:
            continue
        if lk not in allowed:
            unknown.append(k)
            continue
        # canonical 키 이름으로 통일
        canon = next(x for x in ORDERED_KEY_NAMES if x.lower() == lk)
        try:
            if v is None:
                non_numeric.append(canon)
                continue
            numeric[canon] = float(v)
        except (TypeError, ValueError):
            non_numeric.append(canon)

    return numeric, unknown, non_numeric


def summarize_vector(vec: Sequence[Optional[float]], *, max_entries: int = 8) -> Dict[str, Any]:
    if vec is None:
        return {"dim": 0, "non_null": 0, "sample": {}}
    non_null = [(ORDERED_KEY_NAMES[i], vec[i]) for i in range(min(len(vec), VECTOR_DIM)) if vec[i] is not None]
    sample = {k: round(float(v), 4) for k, v in non_null[:max_entries]}
    return {
        "dim": len(vec),
        "non_null_count": len(non_null),
        "sample": sample,
    }


def score_all_candidates(
    user_vector: Sequence[Optional[float]],
    place_vectors: Mapping[int, Sequence[Optional[float]]],
) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    for pid, pvec in place_vectors.items():
        known = sum(1 for x in pvec if x is not None) if pvec else 0
        sim = masked_cosine_similarity(list(user_vector), list(pvec))
        rows.append(
            {
                "place_id": pid,
                "place_known_dims": known,
                "similarity": round(float(sim), 6),
            }
        )
    rows.sort(key=lambda r: r["similarity"], reverse=True)
    return rows


def log_vector_pipeline_report(
    *,
    user_id: int,
    requested_place_ids: List[int],
    short_term_raw: Mapping[str, Any],
    long_term: Mapping[str, float],
    user_vector: Sequence[Optional[float]],
    place_vectors: Mapping[int, Sequence[Optional[float]]],
    vector_parse_errors: Mapping[int, Optional[str]],
    ranked_results: Sequence[Tuple[int, float]],
) -> None:
    coerced, unknown_keys, non_numeric_keys = analyze_short_term_vector_keys(short_term_raw)

    ranked_set = {pid for pid, _ in ranked_results}
    per_place: List[Dict[str, Any]] = []
    for pid in requested_place_ids:
        err = vector_parse_errors.get(pid)
        pvec = place_vectors.get(pid)
        known = sum(1 for x in pvec if x is not None) if pvec else 0
        sim = None
        if pvec is not None:
            sim = round(
                float(masked_cosine_similarity(list(user_vector), list(pvec))),
                6,
            )
        per_place.append(
            {
                "place_id": pid,
                "vector_in_db": pvec is not None,
                "parse_error": err,
                "known_dims": known,
                "similarity": sim,
                "in_top_k": pid in ranked_set,
            }
        )

    all_ranked = score_all_candidates(user_vector, place_vectors)

    payload = {
        "tag": "vector_pipeline_verify",
        "user_id": user_id,
        "short_term_raw_keys": sorted(short_term_raw.keys()),
        "short_term_coerced_keys": sorted(coerced.keys()),
        "short_term_unknown_keys": sorted(set(unknown_keys)),
        "short_term_non_numeric_keys": sorted(set(non_numeric_keys)),
        "long_term_key_count": len(long_term),
        "user_vector_summary": summarize_vector(list(user_vector)),
        "requested_place_count": len(requested_place_ids),
        "place_vectors_loaded": len(place_vectors),
        "ranked_top_k": [{"place_id": pid, "score": round(float(s), 6)} for pid, s in ranked_results],
        "per_requested_place": per_place,
        "all_candidates_by_similarity": all_ranked[:20],
    }

    logger.info("[vector-pipeline] %s", json.dumps(payload, ensure_ascii=False))

    if unknown_keys:
        logger.warning(
            "[vector-pipeline] 단기 벡터에 스키마 외 키가 있습니다(파서/LLM 출력 점검): %s",
            sorted(set(unknown_keys)),
        )
    if non_numeric_keys:
        logger.warning(
            "[vector-pipeline] 단기 벡터에서 숫자로 쓸 수 없는 값이 있습니다: %s",
            sorted(set(non_numeric_keys)),
        )
    for row in per_place:
        if row["parse_error"]:
            logger.warning(
                "[vector-pipeline] place_id=%s 장소 벡터 파싱/로드 이슈: %s",
                row["place_id"],
                row["parse_error"],
            )
