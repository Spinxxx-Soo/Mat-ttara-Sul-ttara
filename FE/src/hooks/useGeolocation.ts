import { useState, useCallback, useEffect } from 'react';
import type { Coordinates } from '@/types/map';
import { useLocationStore, FALLBACK_LOCATION } from '@/stores/locationStore';

// ==========================================
// S14P21B205-190, 191: 위치 기반 및 권한 훅
// ==========================================

export type GeolocationErrorType = 'denied' | 'unavailable' | 'timeout' | null;

interface UseGeolocationReturn {
  coordinates: Coordinates | null;
  isLoading: boolean;
  error: string | null;
  errorType: GeolocationErrorType;
  fetchLocation: () => void;
}

export const useGeolocation = (watch = false): UseGeolocationReturn => {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<GeolocationErrorType>(null);

  const handleSuccess = useCallback((position: GeolocationPosition) => {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    setCoordinates({ lat, lng });
    useLocationStore.getState().setLocation(lat, lng, false);
    setIsLoading(false);
    setError(null);
    setErrorType(null);
  }, []);

  const handleError = useCallback((err: GeolocationPositionError) => {
    let type: GeolocationErrorType = null;
    let message = err.message;

    switch (err.code) {
      case err.PERMISSION_DENIED:
        type = 'denied';
        message = '위치 정보 접근 권한이 거부되었습니다.';
        break;
      case err.POSITION_UNAVAILABLE:
        type = 'unavailable';
        message = '위치 정보를 확인할 수 없습니다 (GPS 꺼짐 등).';
        break;
      case err.TIMEOUT:
        type = 'timeout';
        message = '위치 정보를 가져오는 데 시간이 너무 오래 걸렸습니다.';
        break;
      default:
        break;
    }

    const { lat, lng } = FALLBACK_LOCATION;
    setCoordinates({ lat, lng });
    useLocationStore.getState().setLocation(lat, lng, true);
    setErrorType(type);
    setError(message);
    setIsLoading(false);
  }, []);

  const fetchLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('이 브라우저에서는 위치 서비스를 지원하지 않습니다.');
      setErrorType('unavailable');
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  }, [handleSuccess, handleError]);

  useEffect(() => {
    if (!watch) return;
    
    if (!navigator.geolocation) {
      setError('이 브라우저에서는 위치 서비스를 지원하지 않습니다.');
      setErrorType('unavailable');
      return;
    }

    setIsLoading(true);
    const id = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });

    return () => {
      if (id !== null) {
        navigator.geolocation.clearWatch(id);
      }
    };
  }, [watch, handleSuccess, handleError]);

  useEffect(() => {
    // 만약 watch가 아니고 첫 렌더링에만 가져오고 싶다면 여기서 fetchLocation() 호출
    // 하지만 보통은 버튼 클릭 등으로 트리거하는 경우가 많으므로 자동 호출은 선택 사항입니다.
    // 현재는 호출자가 직접 fetchLocation()을 실행하도록 하거나, 컴포넌트 마운트 시 한번 실행
    fetchLocation();
  }, [fetchLocation]);

  return { coordinates, isLoading, error, errorType, fetchLocation };
};
