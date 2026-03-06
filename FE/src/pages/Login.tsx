import { useNavigate } from 'react-router-dom'

const Login = () => {
  const navigate = useNavigate()

  const handleGoogleLogin = () => {
    // TODO: 구글 로그인 구현
    console.log('구글 로그인')
    // 임시: 로그인 성공 시 인증 상태 저장
    localStorage.setItem('isAuthenticated', 'true')
    localStorage.setItem('hasCompletedOnboarding', 'true')
    navigate('/')
  }

  const handleNaverLogin = () => {
    // TODO: 네이버 로그인 구현
    console.log('네이버 로그인')
    // 임시: 로그인 성공 시 인증 상태 저장
    localStorage.setItem('isAuthenticated', 'true')
    localStorage.setItem('hasCompletedOnboarding', 'true')
    navigate('/')
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

          <div className="flex flex-col gap-3 items-stretch">
            <button
              onClick={handleGoogleLogin}
              className="flex min-w-[84px] cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-xl h-14 px-5 bg-white border border-slate-200 text-slate-700 text-base font-semibold leading-normal transition-all hover:bg-slate-50"
            >
              <div
                className="w-5 h-5 bg-contain bg-no-repeat"
                style={{
                  backgroundImage:
                    "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48ZyBmaWxsPSIjRkZGIiBmaWxsLXJ1bGU9Im5vbnplcm8iPjxwYXRoIGQ9Ik0xNy42NCA5LjIwNWMwLS42MzEtLjA1Ny0xLjIzNy0uMTY0LTEuODIxSDkuMTg3djMuNDk0aDQuNzUyYy0uMjA5IDEuMTI1LS44MzQgMi4wNzctMS43NzcgMi44NDV2Mi4yMTloMi44NzJjMS42ODQtMS41NDggMi42NTgtMy44MzUgMi42NTgtNi41MTd6IiBmaWxsPSIjNDI4NUY0Ii8+PHBhdGggZD0iTTkuMTg3IDE4YzIuNDA3IDAgNC40MzItLjggNS45NjctMi4xODVsLTIuODcyLTIuMjE5Yy0uNzU3LjUyOC0xLjcyNy44MzQtMi44OTUuODM0LTIuMjI3IDAtNC4xMDctMS40NjktNC43ODctMy40ODJoLTIuOTY3djIuMjg2QzMuMzM4IDE1Ljk4MyA2LjA0NSAxOCA5LjE4NyAxOHoiIGZpbGw9IiMzNEE4NTMiLz48cGF0aCBkPSJNNC40IDEwLjc1Yy0uMTU3LS40NjktLjI0Ny0uOTctLjI0Ny0xLjQ4NXMuMDktMS4wMTYuMjQ3LTEuNDg1VjUuNDk0SDEuNDMzQy44MTggNi43NDguNDU0IDguMTI0LjQ1NCA5LjYyNXMuMzY0IDIuODc3Ljk3OSA0LjEzMWwyLjU2Ny0yLjAwNnoiIGZpbGw9IiNGQkJDMDQiLz48cGF0aCBkPSJNOS4xODcgMy44MzNjMS4yNzQgMCAyLjQxNS40MzggMy4zMzEgMS4yNzNsMi41MTctMi41MTdDMTMuNjE4IDEuMDQ1IDExLjU5NC4yNSA5LjE4Ny4yNSA2LjA0NS4yNSAzLjMzOCAyLjI2MiAxLjQzMyA0LjQ5NGwyLjk2NyAyLjI4NmMuNjgtMi4wNTIgMi40Ni0zLjQ4NyA0Ljc4Ny0zLjQ4N3oiIGZpbGw9IiNFRTM0MzgiLz48L2c+PC9nPjwvc3ZnPg==')",
                }}
              />
              <span className="truncate">구글로 계속하기</span>
            </button>

            <button
              onClick={handleNaverLogin}
              className="flex min-w-[84px] cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-xl h-14 px-5 bg-[#03C75A] text-white text-base font-semibold leading-normal transition-all hover:bg-[#02b351]"
            >
              <div className="w-5 h-5 flex items-center justify-center font-bold text-lg text-white bg-white rounded">
                N
              </div>
              <span className="truncate">네이버로 계속하기</span>
            </button>
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
