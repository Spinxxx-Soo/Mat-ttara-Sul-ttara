/**
 * Kakao Maps JS SDK 동적 로딩을 관리하는 유틸리티
 */

let scriptLoadingPromise: Promise<void> | null = null;

export const loadKakaoMapScript = (apiKey: string): Promise<void> => {
  if (typeof window === 'undefined') return Promise.resolve();

  if (window.kakao && window.kakao.maps) {
    return Promise.resolve();
  }

  if (scriptLoadingPromise) {
    return scriptLoadingPromise;
  }

  scriptLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false&libraries=services,clusterer`;
    script.async = true;

    script.onload = () => {
      if (window.kakao && window.kakao.maps) {
        window.kakao.maps.load(() => {
          resolve();
        });
      } else {
        reject(new Error('Kakao Maps SDK failed to load properly.'));
      }
    };

    script.onerror = () => {
      scriptLoadingPromise = null;
      reject(new Error('Failed to load Kakao Maps SDK script.'));
    };

    document.head.appendChild(script);
  });

  return scriptLoadingPromise;
};

export const isKakaoMapLoaded = (): boolean => {
  return !!(window.kakao && window.kakao.maps && window.kakao.maps.Map);
};
