export const loadNaverMapScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const clientId = import.meta.env.VITE_NAVER_MAP_CLIENT_ID;
    if (!clientId) {
      reject(new Error('VITE_NAVER_MAP_CLIENT_ID is not defined in .env'));
      return;
    }

    // @ts-ignore
    if (window.naver && window.naver.maps) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Naver Map script'));
    document.head.appendChild(script);
  });
};
