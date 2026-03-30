from typing import Any

from apps.repositories.place_repository import PlaceRepository
from apps.services.place.place_sync_service import PlaceSyncService

TARGET_QUERIES = [
	"강남 술집",
	"강남 고기집",
	"역삼 술집",
	"선릉 맛집",
]


def run() -> None:
	sync_service = PlaceSyncService()
	repo = PlaceRepository()

	# DB/Model 로딩 (프로젝트마다 경로가 다를 수 있어 가드)
	db: Any = None
	PlaceModel: Any = None
	try:
		# 예: from AI.apps.core.database import SessionLocal
		# 예: from AI.apps.models.place import Place
		from AI.apps.core.database import SessionLocal  # type: ignore
		from AI.apps.models.place import Place as _Place  # type: ignore

		db = SessionLocal()
		PlaceModel = _Place
	except Exception:
		pass

	total_inserted = 0
	total_updated = 0

	try:
		for query in TARGET_QUERIES:
			places = sync_service.search_and_transform(query=query, display=5)

			if db is not None and PlaceModel is not None:
				result = repo.upsert_places(db, PlaceModel, places)
				total_inserted += result["inserted"]
				total_updated += result["updated"]
				print(f"[{query}] inserted={result['inserted']} updated={result['updated']}")
			else:
				print(f"[{query}] preview_count={len(places)} (DB 연결이 없어 미적재)")

		if db is not None:
			print(f"done inserted={total_inserted}, updated={total_updated}")
		else:
			print("done (미적재, 출력만 수행)")
	finally:
		if db is not None:
			db.close()


if __name__ == "__main__":
	run()

