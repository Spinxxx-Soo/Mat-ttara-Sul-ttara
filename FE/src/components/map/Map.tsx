import { useEffect, useRef } from 'react'

interface Place {
  id: string
  name: string
  lat: number
  lng: number
  isOpen?: boolean
  address?: string
}

interface MapProps {
  places?: Place[]
  onPlaceClick?: (place: Place) => void
  selectedPlaceId?: string | null
  center?: { lat: number; lng: number }
  zoom?: number
}

/**
 * 지도 컴포넌트
 * 
 * 프론트엔드에서 지도 API를 연동하여 실제 지도를 표시합니다.
 * 백엔드에서 받은 장소 데이터를 마커로 표시합니다.
 * 
 * 사용 방법:
 * 1. 네이버 지도 또는 카카오맵 API 키를 환경 변수에 설정
 * 2. 해당 지도 API의 스크립트를 index.html에 추가
 * 3. 이 컴포넌트를 사용하여 지도 표시
 */
const Map = ({
  places = [],
  onPlaceClick,
  center = { lat: 37.5665, lng: 126.9780 }, // 서울시청 기본 위치
  zoom = 15
}: MapProps) => {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])

  useEffect(() => {
    if (!mapRef.current) return

    // TODO: 실제 지도 API 연동
    // 예시: 네이버 지도 또는 카카오맵 API 사용
    // 
    // 네이버 지도 예시:
    // const map = new naver.maps.Map(mapRef.current, {
    //   center: new naver.maps.LatLng(center.lat, center.lng),
    //   zoom: zoom
    // })
    // 
    // 카카오맵 예시:
    // const container = mapRef.current
    // const options = {
    //   center: new kakao.maps.LatLng(center.lat, center.lng),
    //   level: zoom
    // }
    // const map = new kakao.maps.Map(container, options)

    // 현재는 배경 이미지로 대체
    console.log('지도 초기화 - 실제 지도 API 연동 필요')
  }, [center, zoom])

  useEffect(() => {
    if (!mapInstanceRef.current || !places.length) return

    // 기존 마커 제거
    markersRef.current.forEach(() => {
      // marker.setMap(null) // 네이버 지도
      // marker.setMap(null) // 카카오맵
    })
    markersRef.current = []

    // 새 마커 추가
    places.forEach((place) => {
      // TODO: 실제 지도 API로 마커 생성
      // 예시:
      // const marker = new naver.maps.Marker({
      //   position: new naver.maps.LatLng(place.lat, place.lng),
      //   map: mapInstanceRef.current,
      //   title: place.name
      // })
      // 
      // marker.addListener('click', () => {
      //   onPlaceClick?.(place)
      // })

      console.log('마커 추가:', place.name, place.lat, place.lng)
    })
  }, [places, onPlaceClick])

  return (
    <div
      ref={mapRef}
      className="absolute inset-0 w-full h-full"
      style={{
        // 임시 배경 이미지 (실제 지도 API 연동 시 제거)
        backgroundImage: "url('https://images.unsplash.com/photo-1524661135-423995f22d0b?w=1200')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* 실제 지도 API 연동 시 이 부분은 지도로 대체됩니다 */}
      <div className="absolute inset-0 bg-slate-400/10 pointer-events-none" />
    </div>
  )
}

export default Map
