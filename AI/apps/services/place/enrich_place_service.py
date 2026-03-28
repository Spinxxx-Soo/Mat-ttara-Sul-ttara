import json
import os
import sys

from apps.repositories.place_repository import PlaceRepository

KAKAO_INPUT_PATH = "kakao_places_data.json"
UNIFIED_OUTPUT_PATH = "unified_places_data.json"
CHECKPOINT_PATH = "checkpoint_enrich_places.json"

class EnrichPlaceService:
    def __init__(self, google_api_key: str):
        self.repo = PlaceRepository(google_api_key)

    def run(self):
        if not os.path.exists(KAKAO_INPUT_PATH):
            print(f"Error: {KAKAO_INPUT_PATH} not found. Please run Kakao crawler first (`python -m scripts.collect_kakao_places`).")
            return
            
        with open(KAKAO_INPUT_PATH, "r", encoding="utf-8") as f:
            kakao_places = json.load(f)
            
        # load checkpoint
        processed_ids = set()
        unified_places = {}
        if os.path.exists(CHECKPOINT_PATH):
            with open(CHECKPOINT_PATH, "r", encoding="utf-8") as f:
                checkpoint = json.load(f)
                processed_ids = set(checkpoint.get("processed_ids", []))
                unified_places = checkpoint.get("unified_places", {})
        
        total = len(kakao_places)
        print(f"Total Kakao places to enrich: {total}")
        
        count = 0
        try:
            for place_id, p in kakao_places.items():
                if place_id in processed_ids:
                    count += 1
                    continue
                    
                print(f"[{count+1}/{total}] Enriching {p.get('place_name', 'Unknown')}...")
                
                # Search Google using name and coordinates
                res = self.repo.find_place_enrichment(p.get('place_name', ''), p.get('lat', 0.0), p.get('lng', 0.0))
                
                unified_place = p.copy()
                unified_place["kakao_place_id"] = place_id
                
                if res.get("type") == "success":
                    unified_place["google_place_id"] = res.get("google_place_id")
                    unified_place["rating"] = res.get("rating")
                    unified_place["opening_hours"] = res.get("current_opening_hours")
                    unified_place["image_url"] = res.get("image_url")
                    print("  -> Success!")
                else:
                    print(f"  -> Failed to find in Google: {res.get('type')} ({res.get('status_code', '')})")
                    unified_place["google_place_id"] = None
                    unified_place["rating"] = None
                    unified_place["opening_hours"] = None
                    unified_place["image_url"] = None
                
                unified_places[place_id] = unified_place
                processed_ids.add(place_id)
                count += 1
                
                if count % 20 == 0:
                    self._save_checkpoint(processed_ids, unified_places)
                    
        except KeyboardInterrupt:
            print("\nInterrupted. Saving checkpoint...")
            self._save_checkpoint(processed_ids, unified_places)
            sys.exit(0)
            
        self._save_checkpoint(processed_ids, unified_places)
        with open(UNIFIED_OUTPUT_PATH, "w", encoding="utf-8") as f:
            json.dump(unified_places, f, ensure_ascii=False)
        print("Enrichment completed successfully! The unified data is in unified_places_data.json.")

    def _save_checkpoint(self, processed_ids, unified_places):
        with open(CHECKPOINT_PATH, "w", encoding="utf-8") as f:
            json.dump({
                "processed_ids": list(processed_ids),
                "unified_places": unified_places
            }, f, ensure_ascii=False)
