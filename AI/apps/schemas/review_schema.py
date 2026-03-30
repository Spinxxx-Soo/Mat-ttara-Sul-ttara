from dataclasses import dataclass
from typing import Optional


@dataclass
class ReviewRecord:
    crawl_place_id: str
    store_name: str
    source: str
    external_review_id: str
    rating: Optional[int]
    review_text: str
    lat: float
    lng: float
    created_at: Optional[str]
