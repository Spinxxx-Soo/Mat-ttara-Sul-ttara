/**
 * 네이버 로그인 유틸리티
 */

declare global {
  interface Window {
    naver: {
      LoginWithNaverId: new (options: {
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
    };
  }
}

/**
 * 네이버 로그인 인스턴스 초기화
 */
export const initNaverLogin = () => {
  const clientId = import.meta.env.VITE_NAVER_CLIENT_ID;
  const callbackUrl = import.meta.env.VITE_NAVER_CALLBACK_URL || window.location.origin + '/login';

  if (!clientId) {
    console.error('VITE_NAVER_CLIENT_ID is not set');
    return null;
  }

  if (!window.naver) {
    console.error('Naver SDK is not loaded');
    return null;
  }

  const naverLogin = new window.naver.LoginWithNaverId({
    clientId,
    callbackUrl,
    isPopup: false,
    loginButton: { color: 'green', type: 3, height: 58 },
    callbackHandle: true,
  });

  naverLogin.init();

  return naverLogin;
};

/**
 * 네이버 로그인 URL 생성 (팝업 방식)
 */
export const getNaverLoginUrl = (): string => {
  const clientId = import.meta.env.VITE_NAVER_CLIENT_ID;
  const callbackUrl = encodeURIComponent(
    import.meta.env.VITE_NAVER_CALLBACK_URL || window.location.origin + '/login'
  );
  const state = Math.random().toString(36).substring(2, 15);

  return `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=${callbackUrl}&state=${state}`;
};

/**
 * URL에서 네이버 인증 코드 추출
 */
export const getNaverCodeFromUrl = (): string | null => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('code');
};
