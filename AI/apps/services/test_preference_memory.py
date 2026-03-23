import os
import sys
import unittest

# `apps` 패키지를 찾기 위해 `AI/`를 sys.path에 추가
_AI_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
if _AI_ROOT not in sys.path:
    sys.path.insert(0, _AI_ROOT)

from apps.services.memory_service import MemoryService


class TestPreferenceMemory(unittest.TestCase):
    def setUp(self) -> None:
        self.memory_service = MemoryService()

    def test_quiet_like_explicit(self):
        updated_profile, events = self.memory_service.process_user_message_for_long_term_memory(
            user_message="저 원래 조용한 곳 좋아해요",
            summary=None,
            previous_profile={},
        )

        # recommendation key 이벤트는 추출될 수 있지만,
        # long-term-memory-only profile에는 반영되지 않아야 함
        self.assertTrue(any(e["key"] == "vibe_quiet" for e in events))
        self.assertEqual(updated_profile, {})

    def test_wait_dislike_explicit(self):
        updated_profile, events = self.memory_service.process_user_message_for_long_term_memory(
            user_message="웨이팅 긴 곳은 싫어요",
            summary=None,
            previous_profile={},
        )

        self.assertTrue(any(e["key"] == "wait_tolerance" and e["value"] == 0.0 for e in events))
        self.assertAlmostEqual(updated_profile["wait_tolerance"], 0.425, places=3)

    def test_japanese_like_explicit(self):
        updated_profile, events = self.memory_service.process_user_message_for_long_term_memory(
            user_message="일식 좋아해요",
            summary=None,
            previous_profile={},
        )

        self.assertTrue(any(e["key"] == "cuisine_japanese" and e["value"] == 1.0 for e in events))
        self.assertEqual(updated_profile, {})

    def test_spicy_like_explicit(self):
        updated_profile, events = self.memory_service.process_user_message_for_long_term_memory(
            user_message="매운 거 좋아해요",
            summary=None,
            previous_profile={},
        )

        self.assertTrue(any(e["key"] == "taste_spicy" and e["value"] == 1.0 for e in events))
        self.assertAlmostEqual(updated_profile["taste_spicy"], 0.575, places=3)

    def test_unclear_no_update(self):
        previous_profile = {"taste_spicy": 0.6}
        updated_profile, events = self.memory_service.process_user_message_for_long_term_memory(
            user_message="오늘 맛있는 거 먹고 싶어요",
            summary=None,
            previous_profile=previous_profile,
        )

        self.assertEqual(events, [])
        self.assertEqual(updated_profile, previous_profile)

    def test_repeated_key_progressive_update(self):
        profile0 = {}
        profile1, _ = self.memory_service.process_user_message_for_long_term_memory(
            user_message="매운 거 좋아해요",
            summary=None,
            previous_profile=profile0,
        )
        profile2, _ = self.memory_service.process_user_message_for_long_term_memory(
            user_message="매운 거 좋아해요",
            summary=None,
            previous_profile=profile1,
        )

        self.assertGreater(profile2["taste_spicy"], profile1["taste_spicy"])
        self.assertLess(profile2["taste_spicy"], 1.0)


if __name__ == "__main__":
    unittest.main()

