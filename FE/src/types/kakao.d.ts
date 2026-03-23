declare global {
  interface Window {
    kakao: any;
  }
}

export type KakaoMapInstance = any;
export type KakaoMarkerInstance = any;
export type KakaoLatLng = any;

// 추후 필요한 구체적인 타입들을 여기에 정의합니다.
// 일단은 any로 시작하여 개발 편의성을 확보하고 점진적으로 구체화합니다.
