import json
import os
import sys

from apps.services.review.review_processor import is_quota_error, parse_publish_time
from apps.repositories.place_repository import PlaceRepository
from apps.repositories.review_repository import ReviewRepository
from apps.schemas.review_schema import ReviewRecord

REVIEW_CHECKPOINT_PATH = "checkpoint_reviews.json"
SAVE_EVERY_N_PLACES = 50


class SaveReviewService:
    """리뷰 수집 및 DB 저장 orchestration"""

    def __init__(self, api_key: str, db_conn):
        self.place_repo = PlaceRepository(api_key)
        self.review_repo = ReviewRepository(db_conn)

    def _save_checkpoint(self, current_index: int, total_saved: int):
        with open(REVIEW_CHECKPOINT_PATH, "w", encoding="utf-8") as f:
            json.dump({"current_index": current_index, "total_saved": total_saved}, f, ensure_ascii=False)

    def _load_checkpoint(self):
        if not os.path.exists(REVIEW_CHECKPOINT_PATH):
            return None
        with open(REVIEW_CHECKPOINT_PATH, "r", encoding="utf-8") as f:
            return json.load(f)

    def _save_reviews_for_place(self, place_id: str, store_name: str, lat: float, lng: float, reviews: list) -> int:
        if not store_name:
            print(f"Skipped place with no store_name (id={place_id})")
            return 0

        saved_count = 0
        for rv in reviews[:5]:
            review_id = rv.get("name", "").split("/")[-1]
            if not review_id:
                print("Skipped review with empty review_id")
                continue

            if self.review_repo.exists("google", review_id):
                print(f"Skipped duplicate review {review_id}")
                continue

            record = ReviewRecord(
                crawl_place_id=place_id,
                store_name=store_name,
                source="google",
                external_review_id=review_id,
                rating=rv.get("rating"),
                review_text=rv.get("text", {}).get("text", ""),
                lat=lat,
                lng=lng,
                created_at=parse_publish_time(rv.get("publishTime")),
            )
            if self.review_repo.insert(record):
                saved_count += 1

        return saved_count

    def run(self, places_data: dict):
        place_ids = list(places_data.keys())
        total_places = len(place_ids)

        checkpoint = self._load_checkpoint()
        if checkpoint:
            print(f"Checkpoint loaded from {REVIEW_CHECKPOINT_PATH}")
            current_index = checkpoint.get("current_index", 0)
            total_saved = checkpoint.get("total_saved", 0)
        else:
            current_index = 0
            total_saved = 0

        try:
            while current_index < total_places:
                place_id = place_ids[current_index]
                loc = places_data.get(place_id, {})
                lat = loc.get("lat", 0.0)
                lng = loc.get("lng", 0.0)

                print(f"[DETAIL {current_index + 1}/{total_places}] Place ID: {place_id}")

                try:
                    result = self.place_repo.get_place_details(place_id)

                    if result["type"] == "success":
                        detail = result.get("data") or {}
                        store_name = detail.get("displayName", {}).get("text", "")
                        reviews = detail.get("reviews", [])
                        print(f"  -> found {len(reviews)} reviews")

                        if reviews:
                            saved = self._save_reviews_for_place(place_id, store_name, lat, lng, reviews)
                            total_saved += saved

                        current_index += 1

                    elif result["type"] == "no_response":
                        reason = result.get("reason", "unknown")
                        print(f"  -> no response from API ({reason}). Exiting...")
                        self._save_checkpoint(current_index, total_saved)
                        sys.exit(1)

                    elif is_quota_error(result):
                        print(f"  -> quota/billing issue detected (status={result.get('status_code')}). Exiting...")
                        self._save_checkpoint(current_index, total_saved)
                        sys.exit(1)

                    elif result["type"] == "http_error":
                        print(f"  -> detail failed: status={result.get('status_code')}")
                        if result.get("data"):
                            print(f"  -> response body: {json.dumps(result['data'], ensure_ascii=False)}")
                        current_index += 1

                    else:
                        print(f"  -> unexpected result type: {result}")
                        current_index += 1

                    if current_index % SAVE_EVERY_N_PLACES == 0:
                        self._save_checkpoint(current_index, total_saved)
                        print(f"Checkpoint saved. current_index={current_index}, total_saved={total_saved}")

                except Exception as e:
                    print(f"  -> error while processing place {place_id}: {e}")
                    current_index += 1

            self._save_checkpoint(current_index, total_saved)
            print(f"Finished. Total saved reviews: {total_saved}")

        except KeyboardInterrupt:
            print("\nInterrupted by user. Saving review checkpoint...")
            self._save_checkpoint(current_index, total_saved)
            print("Review checkpoint saved before exit.")
            sys.exit(0)
