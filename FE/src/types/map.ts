// ==========================================
// 지도/장소 관련 타입 정의
// S14P21B205-167, 169, 171, 172
// ==========================================

// ------------------------------------------
// 167: 좌표 타입
// ------------------------------------------

/** 위/경도 좌표 */
export interface Coordinates {
    lat: number;
    lng: number;
}

/** 지도 뷰포트 상태 (중심 좌표 + 줌 레벨) */
export interface MapViewport {
    center: Coordinates;
    zoom: number;
}

// ------------------------------------------
// 169: 마커 타입
// ------------------------------------------

/** 지도 위에 표시되는 마커 한 개의 데이터 */
export interface MapMarker {
    id: string | number;
    position: Coordinates;
    label?: string;
    /** 마커 클릭 시 선택 상태로 표시할지 여부 */
    isSelected?: boolean;
}

// ------------------------------------------
// 171: 장소 검색 요청/응답 타입
// ------------------------------------------

/** 주변 장소 조회 요청 파라미터 */
export interface NearbyPlacesParams {
    lat: number;
    lng: number;
    radius?: number;  // 미터 단위, 기본값은 백엔드 default
    category?: string;
    page?: number;
    size?: number;
}

/** 지도/백엔드 Place 타입을 MapMarker로 변환시 사용하는 중간 타입 */
export interface PlaceMarkerData extends MapMarker {
    name: string;
    address: string;
    phone?: string;
    rating?: number;
    isOpen?: boolean;
}

// ------------------------------------------
// 172: 공통 비동기 상태 타입
// ------------------------------------------

/** 로딩/에러/데이터를 포함한 3-state 비동기 상태 */
export interface AsyncState<T> {
    data: T | null;
    isLoading: boolean;
    error: string | null;
}

/** 지도 이동 시 재조회 여부를 판단하기 위한 상태 */
export interface MapMoveState {
    hasMoved: boolean;
    lastFetchedViewport: MapViewport | null;
}
