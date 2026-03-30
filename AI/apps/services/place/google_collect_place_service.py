import json
import math
import os
import sys
from collections import deque

from apps.repositories.place_repository import PlaceRepository
from apps.schemas.place_schema import PlaceInfo

DAEJEON_POLYGON = [
    (36.4760, 127.3040), (36.4700, 127.3450), (36.4620, 127.3900),
    (36.4520, 127.4450), (36.4320, 127.5000), (36.3920, 127.5250),
    (36.3500, 127.5280), (36.3070, 127.5150), (36.2720, 127.4920),
    (36.2480, 127.4550), (36.2350, 127.4080), (36.2360, 127.3600),
    (36.2480, 127.3200), (36.2720, 127.2880), (36.3150, 127.2700),
    (36.3600, 127.2720), (36.4100, 127.2820), (36.4480, 127.2920),
]

BOUND_MIN_LAT = 36.2350
BOUND_MAX_LAT = 36.4760
BOUND_MIN_LNG = 127.2700
BOUND_MAX_LNG = 127.5280

INITIAL_LAT_STEP = 0.01
INITIAL_LNG_STEP = 0.01
MIN_LAT_STEP = 0.01 / 64
MIN_LNG_STEP = 0.01 / 64

PLACES_OUTPUT_PATH = "places_data.json"
CHECKPOINT_PATH = "checkpoint_places.json"
SAVE_EVERY_N_CELLS = 50


def _is_point_in_polygon(lat, lng, polygon):
    inside = False
    n = len(polygon)
    for i in range(n):
        lat1, lng1 = polygon[i]
        lat2, lng2 = polygon[(i + 1) % n]
        if (lng1 > lng) != (lng2 > lng):
            cross_lat = (lat2 - lat1) * (lng - lng1) / (lng2 - lng1 + 1e-15) + lat1
            if lat <= cross_lat:
                inside = not inside
    return inside


def _point_to_segment_distance_m(lat, lng, lat1, lng1, lat2, lng2):
    mean_lat_rad = math.radians((lat1 + lat2 + lat) / 3.0)

    def to_xy(a_lat, a_lng):
        x = a_lng * 111320.0 * math.cos(mean_lat_rad)
        y = a_lat * 111320.0
        return x, y

    px, py = to_xy(lat, lng)
    x1, y1 = to_xy(lat1, lng1)
    x2, y2 = to_xy(lat2, lng2)
    dx, dy = x2 - x1, y2 - y1

    if dx == 0 and dy == 0:
        return math.hypot(px - x1, py - y1)

    t = max(0.0, min(1.0, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))


def _point_to_polygon_distance_m(lat, lng, polygon):
    if _is_point_in_polygon(lat, lng, polygon):
        return 0.0
    n = len(polygon)
    return min(
        _point_to_segment_distance_m(lat, lng, polygon[i][0], polygon[i][1],
                                     polygon[(i + 1) % n][0], polygon[(i + 1) % n][1])
        for i in range(n)
    )


def _calc_radius(min_lat, max_lat, min_lng, max_lng):
    center_lat = (min_lat + max_lat) / 2.0
    lat_m = (max_lat - min_lat) * 111320.0
    lng_m = (max_lng - min_lng) * 111320.0 * math.cos(math.radians(center_lat))
    return math.sqrt((lat_m / 2.0) ** 2 + (lng_m / 2.0) ** 2)


def _should_search_cell(min_lat, max_lat, min_lng, max_lng, polygon):
    center_lat = (min_lat + max_lat) / 2.0
    center_lng = (min_lng + max_lng) / 2.0
    radius = _calc_radius(min_lat, max_lat, min_lng, max_lng)

    if _is_point_in_polygon(center_lat, center_lng, polygon):
        return True
    corners = [(min_lat, min_lng), (min_lat, max_lng), (max_lat, min_lng), (max_lat, max_lng)]
    if any(_is_point_in_polygon(la, ln, polygon) for la, ln in corners):
        return True
    return _point_to_polygon_distance_m(center_lat, center_lng, polygon) <= radius


def _split_cell(min_lat, max_lat, min_lng, max_lng):
    mid_lat = (min_lat + max_lat) / 2.0
    mid_lng = (min_lng + max_lng) / 2.0
    return [
        (min_lat, mid_lat, min_lng, mid_lng),
        (min_lat, mid_lat, mid_lng, max_lng),
        (mid_lat, max_lat, min_lng, mid_lng),
        (mid_lat, max_lat, mid_lng, max_lng),
    ]


def _build_initial_cells():
    cells = []
    lat = BOUND_MIN_LAT
    while lat < BOUND_MAX_LAT:
        next_lat = min(lat + INITIAL_LAT_STEP, BOUND_MAX_LAT)
        lng = BOUND_MIN_LNG
        while lng < BOUND_MAX_LNG:
            next_lng = min(lng + INITIAL_LNG_STEP, BOUND_MAX_LNG)
            cells.append((lat, next_lat, lng, next_lng))
            lng = next_lng
        lat = next_lat
    return cells


class CollectPlaceService:
    """대전 맛집 Place ID 수집 orchestration"""

    def __init__(self, api_key: str):
        self.repo = PlaceRepository(api_key)

    def _save_checkpoint(self, queue, visited_cells, unique_places, processed_cells, searched_cells):
        data = {
            "queue": [list(c) for c in queue],
            "visited_cells": [list(c) for c in visited_cells],
            "unique_places": unique_places,
            "processed_cells": processed_cells,
            "searched_cells": searched_cells,
        }
        with open(CHECKPOINT_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False)

    def _load_checkpoint(self):
        if not os.path.exists(CHECKPOINT_PATH):
            return None
        with open(CHECKPOINT_PATH, "r", encoding="utf-8") as f:
            return json.load(f)

    def _save_output(self, unique_places):
        with open(PLACES_OUTPUT_PATH, "w", encoding="utf-8") as f:
            json.dump(unique_places, f, ensure_ascii=False)

    def run(self) -> dict:
        checkpoint = self._load_checkpoint()

        if checkpoint:
            print(f"Checkpoint loaded from {CHECKPOINT_PATH}")
            queue = deque(tuple(c) for c in checkpoint["queue"])
            visited_cells = set(tuple(c) for c in checkpoint["visited_cells"])
            unique_places = checkpoint["unique_places"]
            processed_cells = checkpoint["processed_cells"]
            searched_cells = checkpoint["searched_cells"]
        else:
            queue = deque(_build_initial_cells())
            visited_cells = set()
            unique_places = {}
            processed_cells = 0
            searched_cells = 0

        try:
            while queue:
                min_lat, max_lat, min_lng, max_lng = queue.popleft()
                processed_cells += 1

                cell_key = (round(min_lat, 10), round(max_lat, 10), round(min_lng, 10), round(max_lng, 10))
                if cell_key in visited_cells:
                    continue
                visited_cells.add(cell_key)

                if not _should_search_cell(min_lat, max_lat, min_lng, max_lng, DAEJEON_POLYGON):
                    continue

                center_lat = (min_lat + max_lat) / 2.0
                center_lng = (min_lng + max_lng) / 2.0
                radius = _calc_radius(min_lat, max_lat, min_lng, max_lng)

                print(
                    f"[CELL {processed_cells}] "
                    f"lat=({min_lat:.6f},{max_lat:.6f}) "
                    f"lng=({min_lng:.6f},{max_lng:.6f}) "
                    f"radius={radius:.1f}m "
                    f"queue_left={len(queue)} "
                    f"unique_places={len(unique_places)}"
                )

                try:
                    status, data = self.repo.search_nearby(center_lat, center_lng, radius)
                    searched_cells += 1

                    if status != 200:
                        print(f"  -> search failed: status={status}")
                        continue

                    places = data.get("places", [])
                    place_count = len(places)
                    print(f"  -> found {place_count} places")

                    for p in places:
                        place_id = p.get("id")
                        if place_id and place_id not in unique_places:
                            unique_places[place_id] = {
                                "lat": p.get("location", {}).get("latitude", 0.0),
                                "lng": p.get("location", {}).get("longitude", 0.0),
                            }

                    cell_lat_size = max_lat - min_lat
                    cell_lng_size = max_lng - min_lng
                    can_split = (cell_lat_size > MIN_LAT_STEP) or (cell_lng_size > MIN_LNG_STEP)

                    if place_count == 20 and can_split:
                        for sub_cell in _split_cell(min_lat, max_lat, min_lng, max_lng):
                            queue.append(sub_cell)

                    if processed_cells % SAVE_EVERY_N_CELLS == 0:
                        self._save_checkpoint(queue, visited_cells, unique_places, processed_cells, searched_cells)
                        self._save_output(unique_places)
                        print(f"Checkpoint saved. queue={len(queue)}, unique_places={len(unique_places)}")

                except Exception as e:
                    print(f"  -> error: {e}")

            self._save_checkpoint(queue, visited_cells, unique_places, processed_cells, searched_cells)
            self._save_output(unique_places)
            print("Place collection completed.")

        except KeyboardInterrupt:
            print("\nInterrupted by user. Saving checkpoint...")
            self._save_checkpoint(queue, visited_cells, unique_places, processed_cells, searched_cells)
            self._save_output(unique_places)
            print("Checkpoint saved before exit.")
            sys.exit(0)

        print(f"Processed cells: {processed_cells}")
        print(f"Searched cells: {searched_cells}")
        print(f"Unique places collected: {len(unique_places)}")
        return unique_places
