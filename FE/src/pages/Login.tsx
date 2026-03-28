import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import { useQueryClient } from '@tanstack/react-query'
import { socialLogin } from '@/api/authApi'
import { queryKeys } from '@/hooks/queries/queryKeys'
import { useAuthStore } from '@/stores/authStore'
import { getNaverLoginUrl, getNaverCodeFromUrl } from '@/lib/naverLogin'
import Button from '@/components/ui/Button'
import loginBackgroundImage from '@/assets/login-bg.jpg'
import appLogoImage from '@/assets/logo.png'

const Login = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { setAuth } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetAuthQueries = useCallback(() => {
    queryClient.removeQueries({ queryKey: queryKeys.user.all })
    queryClient.removeQueries({ queryKey: queryKeys.plan.all })
    queryClient.removeQueries({ queryKey: queryKeys.chat.all })
  }, [queryClient])

  // 구글 로그인 성공 핸들러
  const handleGoogleSuccess = async (response: { code: string }) => {
    try {
      setIsLoading(true)
      setError(null)

      const loginResponse = await socialLogin('google', response.code)

      // 토큰 및 신규 유저 여부 저장
      resetAuthQueries()
      setAuth(
        loginResponse.accessToken,
        loginResponse.refreshToken,
        loginResponse.isNewUser || false
      )

      // 신규 유저 여부에 따라 리다이렉트
      if (loginResponse.isNewUser) {
        navigate('/onboarding', { replace: true }) // 신규 유저 -> 온보딩
      } else {
        navigate('/', { replace: true }) // 기존 유저 -> 메인
      }
    } catch (err: any) {
      console.error('구글 로그인 실패:', err)
      setIsLoading(false)
      setError(err.response?.data?.message || '로그인에 실패했습니다. 다시 시도해주세요.')
    }
  }

  // 구글 로그인 실패 핸들러
  const handleGoogleError = () => {
    setError('구글 로그인에 실패했습니다. 다시 시도해주세요.')
  }

  // 구글 로그인 버튼 클릭 (useGoogleLogin 훅 사용)
  const googleLogin = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: handleGoogleError,
    flow: 'auth-code',
  })

  const handleGoogleLogin = () => {
    googleLogin()
  }

  // 네이버 로그인 버튼 클릭
  const handleNaverLogin = () => {
    const naverLoginUrl = getNaverLoginUrl()
    if (naverLoginUrl) {
      window.location.href = naverLoginUrl
    } else {
      setError('네이버 로그인 설정이 올바르지 않습니다.')
    }
  }

  // 네이버 콜백 처리
  const handleNaverCallback = useCallback(async (code: string) => {
    try {
      setIsLoading(true)
      setError(null)

      const loginResponse = await socialLogin('naver', code)

      // 토큰 및 신규 유저 여부 저장
      resetAuthQueries()
      setAuth(
        loginResponse.accessToken,
        loginResponse.refreshToken,
        loginResponse.isNewUser || false
      )

      // URL에서 code 제거
      window.history.replaceState({}, document.title, '/login')

      // 신규 유저 여부에 따라 리다이렉트
      if (loginResponse.isNewUser) {
        navigate('/onboarding', { replace: true }) // 신규 유저 -> 온보딩
      } else {
        navigate('/', { replace: true }) // 기존 유저 -> 메인
      }
    } catch (err: any) {
      console.error('네이버 로그인 실패:', err)
      setIsLoading(false)
      setError(err.response?.data?.message || '로그인에 실패했습니다. 다시 시도해주세요.')
    }
  }, [navigate, resetAuthQueries, setAuth])

  // URL에서 네이버 인증 코드 확인
  useEffect(() => {
    const naverCode = getNaverCodeFromUrl()
    if (naverCode) {
      void handleNaverCallback(naverCode)
    }
  }, [handleNaverCallback])

  return (
    <div className="relative h-screen w-full overflow-y-auto">
      <style>{`
        @keyframes landingFadeUp {
          0% { opacity: 0; transform: translate3d(0, 14px, 0); filter: blur(8px); }
          100% { opacity: 1; transform: translate3d(0, 0, 0); filter: blur(0); }
        }
        @keyframes landingLogoPop {
          0% { opacity: 0; transform: translate3d(0, -10px, 0) scale(0.98); filter: blur(10px); }
          70% { opacity: 1; transform: translate3d(0, 0, 0) scale(1.01); filter: blur(0); }
          100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); filter: blur(0); }
        }
        .landing-reveal { opacity: 0; animation: landingFadeUp 1550ms cubic-bezier(.2,.8,.2,1) forwards; }
        .landing-logo { opacity: 0; animation: landingLogoPop 1700ms cubic-bezier(.2,.9,.2,1) forwards; }
        .landing-delay-1 { animation-delay: 160ms; }
        .landing-delay-2 { animation-delay: 360ms; }
        .landing-delay-3 { animation-delay: 620ms; }
        .landing-delay-4 { animation-delay: 880ms; }
        .landing-delay-5 { animation-delay: 1040ms; }
        @media (prefers-reduced-motion: reduce) {
          .landing-reveal, .landing-logo { opacity: 1 !important; animation: none !important; filter: none !important; transform: none !important; }
        }
      `}</style>

      <div
        className="absolute inset-0 bg-center bg-cover"
        style={{ backgroundImage: `url(${loginBackgroundImage})` }}
      />
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/20 to-black/70" />

      <div className="relative z-10 flex h-full flex-col items-center px-6 pt-1 pb-10 sm:pt-2">
        {/* 상단 로고 */}
        <div className="flex w-full max-w-[520px] items-center justify-center">
          <img
            src={appLogoImage}
            alt="맛따라 술따라 로고"
            className="landing-logo landing-delay-1 h-40 w-auto drop-shadow-[0_10px_32px_rgba(0,0,0,0.45)] sm:h-56 md:h-64 lg:h-72"
            draggable={false}
          />
        </div>

        {/* 중앙 카피 */}
        <div className="flex flex-1 w-full max-w-[680px] items-center justify-center text-center lg:max-w-[760px]">
          <div className="w-full -translate-y-14 sm:-translate-y-16">
            <h1 className="landing-reveal landing-delay-2 break-keep text-6xl font-extrabold leading-tight tracking-tight text-white drop-shadow-[0_8px_28px_rgba(0,0,0,0.45)] md:text-7xl">
              <span className="block">AI와 함께하는</span>
              <span className="block">모임 플랜 생성 서비스</span>
            </h1>
            <p className="landing-reveal landing-delay-3 mt-4 break-keep text-xl font-medium text-white/85 md:text-2xl">
              맛집 추천부터 일정까지, 한 번에 완성하세요.
            </p>

          {error && (
            <div className="mt-6 rounded-xl border border-red-200/25 bg-red-900/30 p-3 backdrop-blur-sm">
              <p className="text-sm text-red-50">{error}</p>
            </div>
          )}
          </div>
        </div>

        {/* 하단 소셜 로그인 */}
        <div className="landing-reveal landing-delay-4 w-full max-w-[520px] space-y-3 mt-10 sm:mt-12">
          <Button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            variant="outline"
            size="lg"
            fullWidth
            className="h-14 rounded-xl bg-white/95 text-slate-800 hover:bg-white border-white/70 relative flex justify-center items-center"
          >
            <div
              className="w-5 h-5 bg-contain bg-no-repeat absolute left-5"
              style={{
                backgroundImage:
                  "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48ZyBmaWxsPSIjRkZGIiBmaWxsLXJ1bGU9Im5vbnplcm8iPjxwYXRoIGQ9Ik0xNy42NCA5LjIwNWMwLS42MzEtLjA1Ny0xLjIzNy0uMTY0LTEuODIxSDkuMTg3djMuNDk0aDQuNzUyYy0uMjA5IDEuMTI1LS44MzQgMi4wNzctMS43NzcgMi44NDV2Mi4yMTloMi44NzJjMS42ODQtMS41NDggMi42NTgtMy44MzUgMi42NTgtNi41MTd6IiBmaWxsPSIjNDI4NUY0Ii8+PHBhdGggZD0iTTkuMTg3IDE4YzIuNDA3IDAgNC40MzItLjggNS45NjctMi4xODVsLTIuODcyLTIuMjE5Yy0uNzU3LjUyOC0xLjcyNy44MzQtMi44OTUuODM0LTIuMjI3IDAtNC4xMDctMS40NjktNC43ODctMy40ODJoLTIuOTY3djIuMjg2QzMuMzM4IDE1Ljk4MyA2LjA0NSAxOCA5LjE4NyAxOHoiIGZpbGw9IiMzNEE4NTMiLz48cGF0aCBkPSJNNC40IDEwLjc1Yy0uMTU3LS40NjktLjI0Ny0uOTctLjI0Ny0xLjQ4NXMuMDktMS4wMTYuMjQ3LTEuNDg1VjUuNDk0SDEuNDMzQy44MTggNi43NDguNDU0IDguMTI0LjQ1NCA5LjYyNXMuMzY0IDIuODc3Ljk3OSA0LjEzMWwyLjU2Ny0yLjAwNnoiIGZpbGw9IiNGQkJDMDQiLz48cGF0aCBkPSJNOS4xODcgMy44MzNjMS4yNzQgMCAyLjQxNS40MzggMy4zMzEgMS4yNzNsMi41MTctMi41MTdDMTMuNjE4IDEuMDQ1IDExLjU5NC4yNSA5LjE4Ny4yNSA2LjA0NS4yNSAzLjMzOCAyLjI2MiAxLjQzMyA0LjQ5NGwyLjk2NyAyLjI4NmMuNjgtMi4wNTIgMi40Ni0zLjQ4NyA0Ljc4Ny0zLjQ4N3oiIGZpbGw9IiNFRTM0MzgiLz48L2c+PC9nPjwvc3ZnPg==')",
              }}
            />
            <span className="truncate font-semibold">
              {isLoading ? '로그인 중...' : '구글로 계속하기'}
            </span>
          </Button>

          <Button
            onClick={handleNaverLogin}
            disabled={isLoading}
            size="lg"
            fullWidth
            className="h-14 rounded-xl text-white bg-[#03C75A] hover:bg-[#02b351] border-none shadow-none relative flex justify-center items-center"
          >
            <div className="w-5 h-5 flex items-center justify-center font-bold text-lg text-[#03C75A] bg-white rounded absolute left-5">
              N
            </div>
            <span className="truncate font-semibold">
              {isLoading ? '로그인 중...' : '네이버로 계속하기'}
            </span>
          </Button>

          <p className="pt-2 text-center text-xs text-white/70">
            로그인 시{' '}
            <a className="underline underline-offset-2" href="#">
              이용약관
            </a>{' '}
            및{' '}
            <a className="underline underline-offset-2" href="#">
              개인정보 처리방침
            </a>
            에 동의하게 됩니다.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
