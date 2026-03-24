import { useCallback, useLayoutEffect, useState, type RefObject } from 'react'

import type { Place } from '@/types/api'
import type { KakaoMapInstance } from '@/types/kakao.d'

/**
 * 선택한 장소 좌표를 지도 컨테이너 픽셀로 변환해, main 래퍼 기준 (left, top) 앵커를 반환합니다.
 * 지도 이동/줌/리사이즈 시 핀 위 카드가 따라가도록 idle·resize에 맞춰 갱신합니다.
 */
export function useMapPinAnchor(
  mainRef: RefObject<HTMLElement | null>,
  mapInstance: KakaoMapInstance | null,
  selectedPlace: Place | null,
  mapCenterLat: number,
  mapCenterLng: number,
  mapLevel: number
): { x: number; y: number } | null {
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null)

  const recalc = useCallback(() => {
    if (!selectedPlace || !mapInstance || !mainRef.current) {
      setAnchor(null)
      return
    }
    const kakao = window.kakao
    if (!kakao?.maps) {
      setAnchor(null)
      return
    }
    try {
      const projection = mapInstance.getProjection()
      const latlng = new kakao.maps.LatLng(selectedPlace.lat, selectedPlace.lng)
      const point = projection.latLngToContainerPoint(latlng)
      const mapContainer = mapInstance.getContainer()
      const mainEl = mainRef.current
      const containerRect = mapContainer.getBoundingClientRect()
      const mainRect = mainEl.getBoundingClientRect()
      const px =
        typeof point.getX === 'function' ? point.getX() : (point as { x: number }).x
      const py =
        typeof point.getY === 'function' ? point.getY() : (point as { y: number }).y
      setAnchor({
        x: px + (containerRect.left - mainRect.left),
        y: py + (containerRect.top - mainRect.top),
      })
    } catch {
      setAnchor(null)
    }
  }, [mainRef, mapInstance, selectedPlace])

  useLayoutEffect(() => {
    recalc()
  }, [recalc, mapCenterLat, mapCenterLng, mapLevel])

  useLayoutEffect(() => {
    window.addEventListener('resize', recalc)
    return () => window.removeEventListener('resize', recalc)
  }, [recalc])

  useLayoutEffect(() => {
    if (!mapInstance || !window.kakao?.maps) return
    const kakao = window.kakao
    const listener = kakao.maps.event.addListener(mapInstance, 'idle', () => {
      recalc()
    })
    return () => {
      kakao.maps.event.removeListener(mapInstance, 'idle', listener)
    }
  }, [mapInstance, recalc])

  return anchor
}
