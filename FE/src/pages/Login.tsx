import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import { useQueryClient } from '@tanstack/react-query'
import { socialLogin } from '@/api/authApi'
import { queryKeys } from '@/hooks/queries/queryKeys'
import { useAuthStore } from '@/stores/authStore'
import { getNaverLoginUrl, getNaverCodeFromUrl } from '@/lib/naverLogin'
import Button from '@/components/ui/Button'

const Login = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { setAuth } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetAuthQueries = () => {
    queryClient.removeQueries({ queryKey: queryKeys.user.all })
    queryClient.removeQueries({ queryKey: queryKeys.plan.all })
    queryClient.removeQueries({ queryKey: queryKeys.chat.all })
  }

  // URL에서 네이버 인증 코드 확인
  useEffect(() => {
    const naverCode = getNaverCodeFromUrl()
    if (naverCode) {
      handleNaverCallback(naverCode)
    }
  }, [])

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
        navigate('/onboarding') // 신규 유저 -> 온보딩
      } else {
        navigate('/') // 기존 유저 -> 메인
      }
    } catch (err: any) {
      console.error('구글 로그인 실패:', err)
      setError(err.response?.data?.message || '로그인에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
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
  const handleNaverCallback = async (code: string) => {
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
        navigate('/onboarding') // 신규 유저 -> 온보딩
      } else {
        navigate('/') // 기존 유저 -> 메인
      }
    } catch (err: any) {
      console.error('네이버 로그인 실패:', err)
      setError(err.response?.data?.message || '로그인에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark">
      <div className="flex flex-1 justify-center items-center py-10">
        <div className="flex flex-col max-w-[480px] w-full px-6">
          <div className="flex flex-col items-center mb-12">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-primary text-6xl">
                restaurant_menu
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-2">
              맛따라 술따라
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-center">
              전국 맛집과 함께하는 최고의 반주 가이드
            </p>
          </div>

          <div className="flex w-full mb-8">
            <div className="w-full aspect-[16/9] rounded-xl overflow-hidden bg-primary/5">
              <div
                className="w-full h-full bg-center bg-no-repeat bg-cover"
                style={{
                  backgroundImage:
                    'url("https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800")',
                }}
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="flex flex-col gap-3 items-stretch">
            <Button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              variant="outline"
              size="lg"
              fullWidth
              className="h-14 rounded-xl text-slate-700 bg-white border-slate-200 hover:bg-slate-50 relative flex justify-center items-center"
            >
              <div
                className="w-5 h-5 bg-contain bg-no-repeat absolute left-5"
                style={{
                  backgroundImage:
                    "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48ZyBmaWxsPSIjRkZGIiBmaWxsLXJ1bGU9Im5vbnplcm8iPjxwYXRoIGQ9Ik0xNy42NCA5LjIwNWMwLS42MzEtLjA1Ny0xLjIzNy0uMTY0LTEuODIxSDkuMTg3djMuNDk0aDQuNzUyYy0uMjA5IDEuMTI1LS44MzQgMi4wNzctMS43NzcgMi44NDV2Mi4yMTloMi44NzJjMS42ODQtMS41NDggMi42NTgtMy44MzUgMi42NTgtNi41MTd6IiBmaWxsPSIjNDI4NUY0Ii8+PHBhdGggZD0iTTkuMTg3IDE4YzIuNDA3IDAgNC40MzItLjggNS45NjctMi4xODVsLTIuODcyLTIuMjE5Yy0uNzU3LjUyOC0xLjcyNy44MzQtMi44OTUuODM0LTIuMjI3IDAtNC4xMDctMS40NjktNC43ODctMy40ODJoLTIuOTY3djIuMjg2QzMuMzM4IDE1Ljk4MyA2LjA0NSAxOCA5LjE4NyAxOHoiIGZpbGw9IiMzNEE4NTMiLz48cGF0aCBkPSJNNC40IDEwLjc1Yy0uMTU3LS40NjktLjI0Ny0uOTctLjI0Ny0xLjQ4NXMuMDktMS4wMTYuMjQ3LTEuNDg1VjUuNDk0SDEuNDMzQy44MTggNi43NDguNDU0IDguMTI0LjQ1NCA5LjYyNXMuMzY0IDIuODc3Ljk3OSA0LjEzMWwyLjU2Ny0yLjAwNnoiIGZpbGw9IiNGQkJDMDQiLz48cGF0aCBkPSJNOS4xODcgMy44MzNjMS4yNzQgMCAyLjQxNS40MzggMy4zMzEgMS4yNzNsMi41MTctMi41MTdDMTMuNjE4IDEuMDQ1IDExLjU5NC4yNSA5LjE4Ny4yNSA2LjA0NS4yNSAzLjMzOCAyLjI2MiAxLjQzMyA0LjQ5NGwyLjk2NyAyLjI4NmMuNjgtMi4wNTIgMi40Ni0zLjQ4NyA0Ljc4Ny0zLjQ4N3oiIGZpbGw9IiNFRTM0MzgiLz48L2c+PC9nPjwvc3ZnPg==')",
                }}
              />
              <span className="truncate">
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
              <span className="truncate">
                {isLoading ? '로그인 중...' : '네이버로 계속하기'}
              </span>
            </Button>
          </div>

          <div className="flex flex-col items-center gap-4 mt-6">
            <p className="text-slate-400 dark:text-slate-500 text-xs font-normal leading-normal px-4 text-center">
              로그인 시{' '}
              <a className="underline" href="#">
                이용약관
              </a>{' '}
              및{' '}
              <a className="underline" href="#">
                개인정보 처리방침
              </a>
              에 동의하게 됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
