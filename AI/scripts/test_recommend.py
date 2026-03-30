"""
추천 파이프라인 동작 검증 테스트 스크립트
"""
import sys
import os

# 프로젝트 루트를 path에 추가
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from apps.services.place.memory_keys import VECTOR_DIM, ORDERED_KEY_NAMES
from apps.services.place.vector_utils import (
    dict_to_vector,
    masked_cosine_similarity,
    merge_vectors,
    rank_places,
)
from apps.services.place.recommend_service import RecommendService


def test_memory_keys():
    """24차원 키 맵 검증"""
    print("=" * 60)
    print("1. Memory Key 검증")
    print(f"   총 차원 수: {VECTOR_DIM}")
    print(f"   키 목록: {ORDERED_KEY_NAMES[:5]}... (처음 5개)")
    assert VECTOR_DIM == 24, f"차원 수가 24가 아닙니다: {VECTOR_DIM}"
    print("   ✅ PASS")


def test_dict_to_vector():
    """딕셔너리 → 벡터 변환 검증"""
    print("\n" + "=" * 60)
    print("2. dict → vector 변환 검증")
    data = {"cuisine_korean": 0.8, "vibe_quiet": 0.6}
    vec = dict_to_vector(data)
    print(f"   입력: {data}")
    print(f"   출력 길이: {len(vec)}")
    print(f"   cuisine_korean(idx 0): {vec[0]}")
    print(f"   vibe_quiet(idx 7):     {vec[7]}")
    print(f"   나머지(idx 1):         {vec[1]}")
    assert len(vec) == 24
    assert vec[0] == 0.8   # cuisine_korean
    assert vec[7] == 0.6   # vibe_quiet
    assert vec[1] == 0.0   # cuisine_japanese (없으면 0.0)
    print("   ✅ PASS")


def test_merge_vectors():
    """단기 + 장기 벡터 결합 검증"""
    print("\n" + "=" * 60)
    print("3. 단기 + 장기 벡터 결합 검증")
    short = {"cuisine_western": 1.0, "vibe_quiet": 0.8}
    long = {key: 0.5 for key in ORDERED_KEY_NAMES}

    merged = merge_vectors(short, long, alpha=0.7, beta=0.3)
    print(f"   단기: {short}")
    print(f"   장기: 모든 키 0.5")
    print(f"   cuisine_western: {merged[3]:.2f}  (1.0*0.7 + 0.5*0.3 = 0.85)")
    print(f"   vibe_quiet:      {merged[7]:.2f}  (0.8*0.7 + 0.5*0.3 = 0.71)")
    print(f"   cuisine_korean:  {merged[0]:.2f}  (단기 없음 → 장기 0.5 그대로)")
    assert abs(merged[3] - 0.85) < 0.001
    assert abs(merged[7] - 0.71) < 0.001
    assert abs(merged[0] - 0.5) < 0.001
    print("   ✅ PASS")


def test_cosine_similarity():
    """코사인 유사도 계산 검증"""
    print("\n" + "=" * 60)
    print("4. 코사인 유사도 계산 검증")
    vec_a = [1.0, 0.0, 0.0]
    vec_b = [1.0, 0.0, 0.0]
    vec_c = [0.0, 1.0, 0.0]

    sim_same = masked_cosine_similarity(vec_a, vec_b, min_overlap=1)
    sim_diff = masked_cosine_similarity(vec_a, vec_c, min_overlap=1)
    print(f"   같은 방향:    {sim_same:.4f}  (기대: 1.0)")
    print(f"   직교(90도):   {sim_diff:.4f}  (기대: 0.0)")
    assert abs(sim_same - 1.0) < 0.001
    assert abs(sim_diff - 0.0) < 0.001
    print("   ✅ PASS")


def test_full_pipeline():
    """전체 추천 파이프라인 (Mock 데이터) 검증"""
    print("\n" + "=" * 60)
    print("5. 전체 추천 파이프라인 테스트")

    service = RecommendService()

    # 시뮬레이션: "소개팅, 조용한 양식집" 요청
    short_term = {
        "cuisine_western": 0.9,
        "vibe_quiet": 0.8,
        "occasion_date": 1.0,
    }
    place_ids = [10, 20, 30, 42, 55, 78, 100]

    results = service.recommend(
        user_id=1,
        place_ids=place_ids,
        short_term=short_term,
        top_k=3,
    )

    print(f"   입력 단기기억: {short_term}")
    print(f"   후보 식당 수:  {len(place_ids)}개")
    print(f"   ── Top 3 결과 ──")
    for rank, (pid, score) in enumerate(results, 1):
        print(f"   #{rank}  place_id={pid:>4}  유사도={score:.4f}")

    assert len(results) == 3
    assert results[0][1] >= results[1][1] >= results[2][1]  # 내림차순 확인
    print("   ✅ PASS")


if __name__ == "__main__":
    test_memory_keys()
    test_dict_to_vector()
    test_merge_vectors()
    test_cosine_similarity()
    test_full_pipeline()
    print("\n" + "=" * 60)
    print("🎉 모든 테스트 통과!")
