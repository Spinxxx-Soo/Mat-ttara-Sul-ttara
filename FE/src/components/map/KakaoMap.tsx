import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMap } from '@/hooks/useMap';
import { useGeolocation } from '@/hooks/useGeolocation';
import type { Coordinates } from '@/types/map';
import type { Place } from '@/types/api';
import type { KakaoMapInstance } from '@/types/kakao.d';
import PlaceMapDetailCard from '@/components/map/PlaceMapDetailCard';

/**
 * 핀 마커 하단(위경도) 기준으로 화면에서 위로 올린 지점 = 말풍선 꼬리(카드 하단 중앙)가 닿을 위치
 * CustomOverlay 대신 Portal+fixed로 두어 카카오 오버레이 레이어와 투영 불일치를 피함
 */
const BUBBLE_TAIL_TO_PIN_TOP_OFFSET_PX = 44;

// ==========================================
// S14P21B205-189: 지도 인스턴스 lifecycle 처리 (Kakao Maps 버전)
// S14P21B205-192: 현재 위치 마커 및 초기 중심 좌표 반영
// S14P21B205-196: 마커 클릭 시 선택 상태 관리 구현
// S14P21B205-198, 199: 지도 이동 시 재조회 여부 및 최적화
// ==========================================

interface KakaoMapProps {
  className?: string;
  lat?: number;
  lng?: number;
  places?: Place[];
  selectedPlaceId?: string | number | null;
  /** 선택 핀 위 말풍선 상세 — body Portal + fixed (투영과 핀 정합) */
  detailPlace?: Place | null;
  onDetailClose?: () => void;
  onDetailReviewClick?: () => void;
  onMapReady?: (mapInstance: KakaoMapInstance) => void;
  onIdle?: (center: Coordinates, zoom: number) => void;
  onPlaceClick?: (place: Place) => void;
  onClick?: (coord: Coordinates) => void;
}

export default function KakaoMap({
  className = 'w-full h-[400px]',
  lat = 37.3595704,
  lng = 127.105399,
  places = [],
  selectedPlaceId,
  detailPlace = null,
  onDetailClose,
  onDetailReviewClick,
  onMapReady,
  onIdle,
  onPlaceClick,
  onClick,
}: KakaoMapProps) {
  const defaultCenter: Coordinates = { lat, lng };

  const { mapRef, mapInstance, sdkLoaded, sdkError, setCenter } = useMap({
    defaultCenter,
  });
  const { coordinates, errorType } = useGeolocation(false);

  const locationMarkerRef = useRef<any>(null);
  const placesMarkersRef = useRef<Map<number, any>>(new Map());
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDetailCloseRef = useRef(onDetailClose);
  const onDetailReviewClickRef = useRef(onDetailReviewClick);
  const onPlaceClickRef = useRef(onPlaceClick);
  onDetailCloseRef.current = onDetailClose;
  onDetailReviewClickRef.current = onDetailReviewClick;
  onPlaceClickRef.current = onPlaceClick;
  const detailPlaceRef = useRef<Place | null>(null);
  detailPlaceRef.current = detailPlace;

  const [detailBubblePos, setDetailBubblePos] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const posRafRef = useRef<number | null>(null);

  const updateDetailBubblePos = useCallback(() => {
    const dp = detailPlaceRef.current;
    const map = mapInstance.current;
    const el = mapRef.current;
    const kakao = window.kakao;
    if (!dp || !map || !el) {
      setDetailBubblePos(null);
      return;
    }
    if (
      !Number.isFinite(dp.lat) ||
      !Number.isFinite(dp.lng) ||
      (dp.lat === 0 && dp.lng === 0)
    ) {
      setDetailBubblePos(null);
      return;
    }
    if (typeof map.relayout === 'function') map.relayout();
    const projection = map.getProjection();
    const pt = projection.containerPointFromCoords(new kakao.maps.LatLng(dp.lat, dp.lng));
    const rect = el.getBoundingClientRect();
    setDetailBubblePos({
      left: rect.left + pt.x,
      top: rect.top + pt.y - BUBBLE_TAIL_TO_PIN_TOP_OFFSET_PX,
    });
  }, [mapInstance, mapRef]);

  const scheduleDetailBubblePos = useCallback(() => {
    if (posRafRef.current != null) return;
    posRafRef.current = requestAnimationFrame(() => {
      posRafRef.current = null;
      updateDetailBubblePos();
    });
  }, [updateDetailBubblePos]);

  useLayoutEffect(() => {
    if (!detailPlace || !sdkLoaded || !mapInstance.current) {
      setDetailBubblePos(null);
      return;
    }
    if (
      !Number.isFinite(detailPlace.lat) ||
      !Number.isFinite(detailPlace.lng) ||
      (detailPlace.lat === 0 && detailPlace.lng === 0)
    ) {
      setDetailBubblePos(null);
      return;
    }
    updateDetailBubblePos();
  }, [
    detailPlace?.placeId,
    detailPlace?.lat,
    detailPlace?.lng,
    sdkLoaded,
    mapInstance,
    updateDetailBubblePos,
  ]);

  // 지도 이동·줌·리사이즈·스크롤 시 말풍선 화면 좌표 갱신 (CustomOverlay 미사용)
  useEffect(() => {
    if (!sdkLoaded || !mapInstance.current || !detailPlace) return;

    const map = mapInstance.current;
    const kakao = window.kakao;

    const sync = () => scheduleDetailBubblePos();

    kakao.maps.event.addListener(map, 'idle', sync);
    kakao.maps.event.addListener(map, 'bounds_changed', sync);
    kakao.maps.event.addListener(map, 'center_changed', sync);

    const onWin = () => scheduleDetailBubblePos();
    window.addEventListener('resize', onWin);
    window.addEventListener('scroll', onWin, true);

    const el = mapRef.current;
    const ro =
      el &&
      new ResizeObserver(() => {
        scheduleDetailBubblePos();
      });
    if (el && ro) ro.observe(el);

    return () => {
      kakao.maps.event.removeListener(map, 'idle', sync);
      kakao.maps.event.removeListener(map, 'bounds_changed', sync);
      kakao.maps.event.removeListener(map, 'center_changed', sync);
      window.removeEventListener('resize', onWin);
      window.removeEventListener('scroll', onWin, true);
      ro?.disconnect();
    };
  }, [sdkLoaded, mapInstance, mapRef, detailPlace, scheduleDetailBubblePos]);

  // 지도 인스턴스가 준비되면 외부로 전달 및 이벤트 등록
  useEffect(() => {
    if (!sdkLoaded || !mapInstance.current) return;

    const currentMap = mapInstance.current;
    const kakao = window.kakao;

    if (onMapReady) {
      onMapReady(currentMap);
    }

    // idle 이벤트 디바운스 처리
    const onMapIdle = () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }

      idleTimerRef.current = setTimeout(() => {
        const center = currentMap.getCenter();
        const level = currentMap.getLevel();
        onIdle?.({ lat: center.getLat(), lng: center.getLng() }, level);
      }, 500);
    };
    kakao.maps.event.addListener(currentMap, 'idle', onMapIdle);

    const onMapClick = (mouseEvent: any) => {
      const latlng = mouseEvent.latLng;
      onClick?.({ lat: latlng.getLat(), lng: latlng.getLng() });
    };
    kakao.maps.event.addListener(currentMap, 'click', onMapClick);

    return () => {
      kakao.maps.event.removeListener(currentMap, 'idle', onMapIdle);
      kakao.maps.event.removeListener(currentMap, 'click', onMapClick);
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [sdkLoaded, mapInstance, onMapReady, onIdle, onClick]);

  // 현재 위치 좌표가 나오면 지도를 중심동하고 마커를 표시
  useEffect(() => {
    if (coordinates && sdkLoaded && mapInstance.current) {
      setCenter(coordinates);
      const kakao = window.kakao;

      if (!locationMarkerRef.current) {
        const content = `
          <div class="relative flex items-center justify-center">
            <div class="w-4 h-4 bg-primary rounded-full border-2 border-white shadow-lg"></div>
            <div class="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
          </div>
        `;

        locationMarkerRef.current = new kakao.maps.CustomOverlay({
          position: new kakao.maps.LatLng(coordinates.lat, coordinates.lng),
          content: content,
          map: mapInstance.current,
        });
      } else {
        locationMarkerRef.current.setPosition(
          new kakao.maps.LatLng(coordinates.lat, coordinates.lng)
        );
      }
    }
  }, [coordinates, sdkLoaded, mapInstance, setCenter]);

  // 외부에서 lat/lng(검색 결과 중심 등)를 바꿔줄 때 지도를 함께 recenter
  useEffect(() => {
    if (!sdkLoaded || !mapInstance.current) return;
    setCenter({ lat, lng });
  }, [lat, lng, sdkLoaded, mapInstance, setCenter]);

  // 마커 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (locationMarkerRef.current) {
        locationMarkerRef.current.setMap(null);
        locationMarkerRef.current = null;
      }
    };
  }, []);

  // 장소 마커 표시 및 업데이트
  useEffect(() => {
    if (!sdkLoaded || !mapInstance.current) return;

    const currentMap = mapInstance.current;
    const kakao = window.kakao;

    // 이전 마커들 중 현재 리스트에 없는 것 삭제
    const currentPlaceIds = new Set(places.map((p) => p.placeId));
    placesMarkersRef.current.forEach((markerObj, id) => {
      if (!currentPlaceIds.has(id)) {
        if (markerObj.onOverlayClickCleanup) {
          markerObj.onOverlayClickCleanup();
        }
        if (markerObj.onKakaoClick) {
          kakao.maps.event.removeListener(markerObj.marker, 'click', markerObj.onKakaoClick);
          kakao.maps.event.removeListener(markerObj.overlay, 'click', markerObj.onKakaoClick);
        }
        markerObj.overlay.setMap(null);
        placesMarkersRef.current.delete(id);
      }
    });

    const bindOverlayClick = (place: Place) => {
      // CustomOverlay DOM은 map 내부에서 비동기로 붙어서, 즉시 못 찾는 경우가 있어 재시도한다.
      let disposed = false;
      let cleanup: (() => void) | null = null;

      const handler = () => onPlaceClickRef.current?.(place);

      const tryBind = (attemptLeft: number) => {
        if (disposed) return;
        const el = document.getElementById(`marker-${place.placeId}`);
        if (!el) {
          if (attemptLeft > 0) {
            setTimeout(() => tryBind(attemptLeft - 1), 50);
          }
          return;
        }

        el.addEventListener('click', handler);
        el.addEventListener('touchend', handler);
        cleanup = () => {
          el.removeEventListener('click', handler);
          el.removeEventListener('touchend', handler);
        };
      };

      // 최대 ~500ms 동안 재시도
      tryBind(10);

      return () => {
        disposed = true;
        cleanup?.();
      };
    };

    // 새 마커 추가 또는 업데이트
    places.forEach((place) => {
      const isSelected = selectedPlaceId?.toString() === place.placeId.toString();
      const existing = placesMarkersRef.current.get(place.placeId);

      const content = `
        <div class="relative flex flex-col items-center group cursor-pointer" id="marker-${place.placeId}">
          <div class="w-8 h-8 rounded-full flex items-center justify-center shadow-md border-2 border-white transition-all ${
            isSelected ? 'bg-primary scale-110 z-20 shadow-xl border-primary' : 'bg-slate-500 hover:bg-primary z-10'
          }">
            <span class="material-symbols-outlined text-sm text-white">restaurant</span>
          </div>
          <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-r-2 border-b-2 border-white ${
            isSelected ? 'bg-primary border-primary' : 'bg-slate-500'
          }"></div>
        </div>
      `;

      if (!existing) {
        const overlay = new kakao.maps.CustomOverlay({
          position: new kakao.maps.LatLng(place.lat, place.lng),
          content: content,
          map: currentMap,
          yAnchor: 1,
          clickable: true,
        });

        const marker = new kakao.maps.Marker({
          position: new kakao.maps.LatLng(place.lat, place.lng),
          map: currentMap,
          opacity: 0,
        });

        const onKakaoClick = () => onPlaceClickRef.current?.(place);
        kakao.maps.event.addListener(marker, 'click', onKakaoClick);
        // 보이는 오버레이 자체에도 클릭 리스너를 건다(가장 확실)
        kakao.maps.event.addListener(overlay, 'click', onKakaoClick);

        // CustomOverlay(보이는 핀)에도 클릭을 바인딩한다.
        // setContent로 DOM이 교체될 수 있어, 등록 직후 RAF로 한 번 바인딩한다.
        let cleanup = () => {};
        requestAnimationFrame(() => {
          cleanup = bindOverlayClick(place);
        });

        placesMarkersRef.current.set(place.placeId, {
          overlay,
          marker,
          onOverlayClickCleanup: () => cleanup(),
          onKakaoClick,
        });
      } else {
        existing.overlay.setContent(content);
        existing.overlay.setZIndex(isSelected ? 100 : 10);

        // content 교체 시 기존 DOM 핸들러가 사라질 수 있으므로 재바인딩
        if (existing.onOverlayClickCleanup) existing.onOverlayClickCleanup();
        requestAnimationFrame(() => {
          existing.onOverlayClickCleanup = bindOverlayClick(place);
        });
      }
    });
  }, [places, selectedPlaceId, sdkLoaded, mapInstance, onPlaceClick]);

  if (sdkError) {
    return (
      <div className="p-4 text-red-500 bg-red-50 border border-red-200 rounded-md">
        지도를 불러올 수 없습니다: {sdkError}
      </div>
    );
  }

  const detailPortal =
    detailPlace &&
    detailBubblePos &&
    Number.isFinite(detailPlace.lat) &&
    Number.isFinite(detailPlace.lng) &&
    !(detailPlace.lat === 0 && detailPlace.lng === 0)
      ? createPortal(
          <div
            className="pointer-events-auto"
            style={{
              position: 'fixed',
              left: detailBubblePos.left,
              top: detailBubblePos.top,
              transform: 'translate(-50%, -100%)',
              zIndex: 10000,
            }}
          >
            <PlaceMapDetailCard
              place={detailPlace}
              onClose={() => onDetailCloseRef.current?.()}
              onReviewClick={() => onDetailReviewClickRef.current?.()}
            />
          </div>,
          document.body
        )
      : null;

  return (
    <div className={className + ' relative'}>
      {detailPortal}

      {!sdkLoaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-gray-100/50 backdrop-blur-sm">
          <span className="text-sm text-gray-500">지도 로딩 중...</span>
        </div>
      )}

      {errorType && (
        <div className="absolute left-4 right-4 top-4 z-10 rounded p-2 text-sm text-yellow-800 shadow bg-yellow-100/90">
          {errorType === 'denied'
            ? '위치 권한이 거부되어 기본 위치(SSAFY 대전)를 표시합니다.'
            : '위치 정보를 가져올 수 없어 기본 위치(SSAFY 대전)를 표시합니다.'}
        </div>
      )}

      <div ref={mapRef} className="h-full w-full" />
    </div>
  );
}
