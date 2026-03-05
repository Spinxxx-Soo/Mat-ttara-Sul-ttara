export const initKakao = () => {
  const kakaoKey = import.meta.env.VITE_KAKAO_JS_KEY;
  if (!kakaoKey) {
    console.warn('VITE_KAKAO_JS_KEY is not defined in .env');
    return;
  }

  // @ts-ignore
  if (window.Kakao && !window.Kakao.isInitialized()) {
    // @ts-ignore
    window.Kakao.init(kakaoKey);
    // @ts-ignore
    console.log('Kakao SDK initialized:', window.Kakao.isInitialized());
  }
};
