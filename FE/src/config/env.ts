// ==========================================
// 환경별 설정 aggregator (S14P21B205-146)
// ==========================================
// 모든 import.meta.env 참조를 이 파일로 통일합니다.
// 컴포넌트/훅에서는 직접 import.meta.env 를 참조하지 말고 이 파일을 import 하세요.

const getEnvVar = (key: string, fallback = ''): string => {
    const value = import.meta.env[key];
    if (!value && !fallback) {
        console.warn(`[envConfig] 환경 변수 ${key}가 설정되지 않았습니다.`);
    }
    return value ?? fallback;
};

export const envConfig = {
    // API
    apiBaseUrl: getEnvVar('VITE_API_BASE_URL', 'http://localhost:8080'),

    // 지도
    kakaoMapJsKey: getEnvVar('VITE_KAKAO_MAP_JS_KEY'),
    kakaoJsKey: getEnvVar('VITE_KAKAO_JS_KEY'),
    // (호환용) Naver Map 관련 코드가 남아있을 때 타입체크를 통과시키기 위한 값
    naverMapClientId: getEnvVar('VITE_NAVER_MAP_CLIENT_ID'),

    // OAuth
    googleClientId: getEnvVar('VITE_GOOGLE_CLIENT_ID'),
    naverClientId: getEnvVar('VITE_NAVER_CLIENT_ID'),
    naverCallbackUrl: getEnvVar('VITE_NAVER_CALLBACK_URL'),

    // 실행 환경
    isDev: import.meta.env.DEV as boolean,
    isProd: import.meta.env.PROD as boolean,
    mode: import.meta.env.MODE as string,
} as const;
