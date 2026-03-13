from dataclasses import dataclass


@dataclass
class PlaceInfo:
    place_id: str
    lat: float
    lng: float


@dataclass
class CellInfo:
    min_lat: float
    max_lat: float
    min_lng: float
    max_lng: float
