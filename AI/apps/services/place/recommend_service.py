"""
추천 서비스 (Recommendation Service)

Redis로부터 수신한 추천 요청을 처리하는 메인 비즈니스 로직.
입력: user_id, place_ids, short_term (0~1 값)
출력: Top 3 추천 식당 (place_id, score)
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

from apps.config import settings
from apps.repositories.recommend_repository import RecommendRepository
from apps.services.place.memory_keys import ORDERED_KEY_NAMES, VECTOR_DIM
from apps.services.place.vector_pipeline_reporter import log_vector_pipeline_report
from apps.services.place.vector_utils import merge_vectors, rank_places

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class RecommendationRun:
    """추천 1회 실행 결과 (순위 + 벡터 — 장소별 이유 문구 생성용)."""

    ranked: List[Tuple[int, float]]
    user_vector: List[Optional[float]]
    place_vectors: Dict[int, List[float]]
    vector_parse_errors: Dict[int, Optional[str]]


class RecommendService:
    """
    추천 파이프라인 오케스트레이터.

    DB(RecommendRepository)에서 유저/식당 벡터를 로드하고
    단기/장기 벡터 결합 및 코사인 유사도 연산을 수행합니다.
    """

    def __init__(self):
        self.repository = RecommendRepository()

    # ──────────────────────────────────────
    # 메인 추천 파이프라인
    # ──────────────────────────────────────
    def run_recommendation(
        self,
        user_id: int,
        place_ids: List[int],
        short_term: Dict[str, float],
        top_k: int = 3,
        alpha: float = 0.7,
        beta: float = 0.3,
    ) -> RecommendationRun:
        long_term = self._load_user_memory(user_id)
        user_vector = merge_vectors(
            short_term=short_term,
            long_term=long_term,
            alpha=alpha,
            beta=beta,
        )
        place_vectors, vector_parse_errors = self._load_place_vectors(place_ids)
        results = rank_places(user_vector, place_vectors, top_k=top_k)

        if settings.debug_vector_pipeline:
            try:
                log_vector_pipeline_report(
                    user_id=user_id,
                    requested_place_ids=list(place_ids),
                    short_term_raw=dict(short_term),
                    long_term=dict(long_term),
                    user_vector=user_vector,
                    place_vectors=place_vectors,
                    vector_parse_errors=vector_parse_errors,
                    ranked_results=results,
                )
            except Exception as e:
                logger.warning("[recommend] vector pipeline report failed: %s", e)

        return RecommendationRun(
            ranked=results,
            user_vector=user_vector,
            place_vectors=place_vectors,
            vector_parse_errors=vector_parse_errors,
        )

    def recommend(
        self,
        user_id: int,
        place_ids: List[int],
        short_term: Dict[str, float],
        top_k: int = 3,
        alpha: float = 0.7,
        beta: float = 0.3,
    ) -> List[Tuple[int, float]]:
        """
        추천 실행 메인 메서드.

        Args:
            user_id: 추천 대상 유저 ID
            place_ids: 후보 식당 ID 리스트 (백엔드에서 필터링 완료된 목록)
            short_term: 단기기억 (챗봇 추론 결과, 예: {"cuisine_western": 0.8, ...})
            top_k: 상위 몇 개를 반환할지 (기본 3)
            alpha: 단기기억 가중치
            beta: 장기기억 가중치

        Returns:
            [(place_id, similarity_score), ...] 유사도 내림차순 Top K
        """
        return self.run_recommendation(
            user_id, place_ids, short_term, top_k, alpha, beta
        ).ranked

    # ──────────────────────────────────────
    # 데이터 로드 및 Cold Start
    # ──────────────────────────────────────
    def _load_user_memory(self, user_id: int) -> Dict[str, float]:
        """
        DB USER_MEMORY 테이블에서 유저의 장기기억 벡터를 로드합니다.
        기록이 전혀 없는 신규 회원의 경우 USER_PREFERENCE 기반으로 생성합니다.
        """
        long_term = self.repository.get_user_memory(user_id)
        if not long_term:
            # Cold Start 로직: 장기 기억이 없으면 선호도 프로필 로드
            pref = self.repository.get_user_preference(user_id)
            return self._build_cold_start_memory(pref)
        return long_term

    def _build_cold_start_memory(self, pref: dict = None) -> Dict[str, float]:
        """
        USER_PREFERENCE를 바탕으로 초기 가중치 벡터(Cold Start)를 생성합니다.
        """
        initial = {key: 0.5 for key in ORDERED_KEY_NAMES}
        if not pref:
            return initial

        usage_type = pref.get("usage_type")
        
        # 하드코딩된 규칙 기반 초기 벡터 세팅 (예시 기획)
        if usage_type == "데이트":
            initial["occasion_date"] = 0.9
            initial["vibe_modern"] = 0.8
            initial["vibe_quiet"] = 0.7
        elif usage_type == "회식":
            initial["occasion_business"] = 0.9
            initial["vibe_lively"] = 0.8
            initial["seat_private"] = 0.8
        elif usage_type == "동네친구":
            initial["occasion_friends"] = 0.9
            initial["price_range"] = 0.3
            initial["vibe_quiet"] = 0.7
            
        return initial

    def _load_place_vectors(
        self, place_ids: List[int]
    ) -> Tuple[Dict[int, List[float]], Dict[int, str | None]]:
        """
        DB PLACE_MEMORY_VECTOR 테이블에서 식당 벡터를 로드합니다.
        """
        return self.repository.get_place_vectors(place_ids)
