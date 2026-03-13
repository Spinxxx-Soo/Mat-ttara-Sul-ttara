import { envConfig } from '@/config/env';

// ==========================================
// S14P21B205-188: 지도 SDK 로더 및 초기화 로직
// ==========================================

/**
 * 네이버 지도 SDK가 이미 로드된 상태인지 확인합니다.
 */
export const isNaverMapLoaded = (): boolean => {
  return !!(window as any).naver?.maps;
};

// 중복 로드 방지를 위한 진행 중인 Promise 캐시
let loadingPromise: Promise<void> | null = null;

/**
 * 네이버 지도 SDK 스크립트를 동적으로 로드합니다.
 * - 이미 로드된 경우 즉시 resolve
 * - 로드 중인 경우 기존 Promise를 재사용해 중복 요청 방지
 * - envConfig를 통해 Client ID를 주입
 */
export const loadNaverMapScript = (): Promise<void> => {
  // 이미 로드 완료
  if (isNaverMapLoaded()) {
    return Promise.resolve();
  }

  // 이미 로드 진행 중이면 기존 Promise 재사용
  if (loadingPromise) {
    return loadingPromise;
  }

  const clientId = envConfig.naverMapClientId;
  if (!clientId) {
    return Promise.reject(
      new Error('[NaverMap] VITE_NAVER_MAP_CLIENT_ID가 설정되지 않았습니다. .env.local을 확인해주세요.'),
    );
  }

  loadingPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}`;
    script.async = true;
    script.onload = () => {
      resolve();
    };
    script.onerror = () => {
      loadingPromise = null; // 실패 시 재시도 가능하도록 캐시 초기화
      reject(new Error('[NaverMap] 네이버 지도 스크립트 로드에 실패했습니다.'));
    };
    document.head.appendChild(script);
  });

  return loadingPromise;
};
