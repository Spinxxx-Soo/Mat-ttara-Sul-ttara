// ==========================================
// S14P21B205-189: 네이버 지도 SDK 글로벌 타입 선언
// ==========================================
// naverLogin.ts의 window.naver 선언(LoginWithNaverId)과 병합됩니다.
// TypeScript는 declare global의 같은 interface를 자동으로 머지합니다.

declare global {
  interface Window {
    naver: {
      // 네이버 로그인 SDK (naverLogin.ts와 머지)
      LoginWithNaverId?: new (options: {
        clientId: string;
        callbackUrl: string;
        isPopup: boolean;
        loginButton: { color: string; type: number; height: number };
        callbackHandle?: boolean;
      }) => {
        init(): void;
        getLoginStatus(callback: (status: { status: boolean }) => void): void;
        getAccessToken(): string | null;
        getAccessTokenExpiresAt(): number | null;
        getRefreshToken(): string | null;
        getRefreshTokenExpiresAt(): number | null;
        logout(): void;
      };

      // 네이버 지도 SDK
      maps: {
        Map: new (element: HTMLElement, options: NaverMapOptions) => NaverMapInstance;
        LatLng: new (lat: number, lng: number) => NaverLatLng;
        Marker: new (options: NaverMarkerOptions) => NaverMarkerInstance;
        Event: {
          addListener: (target: unknown, eventName: string, handler: (...args: unknown[]) => void) => void;
          removeListener: (listener: unknown) => void;
        };
      };
    };
  }
}

export interface NaverMapOptions {
  center: NaverLatLng;
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  scaleControl?: boolean;
  mapDataControl?: boolean;
}

export interface NaverMapInstance {
  setCenter: (latLng: NaverLatLng) => void;
  getCenter: () => NaverLatLng;
  setZoom: (zoom: number) => void;
  getZoom: () => number;
  destroy: () => void;
}

export interface NaverLatLng {
  lat: () => number;
  lng: () => number;
}

export interface NaverMarkerOptions {
  position: NaverLatLng;
  map?: NaverMapInstance;
  icon?: string | object;
  title?: string;
}

export interface NaverMarkerInstance {
  setMap: (map: NaverMapInstance | null) => void;
  getPosition: () => NaverLatLng;
  setPosition: (latLng: NaverLatLng) => void;
}
