import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './stores/authStore'
import { getUserInfo } from './api/authApi'
import { Toaster } from 'react-hot-toast'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { PublicRoute } from './components/auth/PublicRoute'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Main from './pages/Main'
import Search from './pages/Search'
import MyPlan from './pages/MyPlan'
import MyPlanDetail from './pages/MyPlanDetail'
import MyPlanCreate from './pages/MyPlanCreate'
import Settings from './pages/Settings'

const IS_DEV_AUTH_BYPASS = import.meta.env.VITE_DEV_AUTH_BYPASS === 'true'

function App() {
  const { isLoggedIn, user, needsOnboarding, setUser } = useAuthStore()
  
  useEffect(() => {
    if (isLoggedIn && !user) {
      const fetchUserInfo = async () => {
        try {
          const userInfo = await getUserInfo()
          setUser(userInfo)
        } catch (error) {
          console.error('유저 정보 조회 실패:', error)
          // Ticket 280/287: API 실패 시 익명/게스트 정보 주입 (Graceful Degradation)
          setUser({
            userId: -1,
            email: 'guest@matsul.com',
            name: '게스트',
            bio: '로그인이 필요합니다.',
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          })
        }
      }
      fetchUserInfo()
    }
  }, [isLoggedIn, user, setUser])

  const routes = IS_DEV_AUTH_BYPASS ? (
    // 개발용: 인증/온보딩 없이 모든 페이지 접근 허용
    <>
      <Route path="/login" element={<Login />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/" element={<Main />} />
      <Route path="/search" element={<Search />} />
      <Route path="/my-plan" element={<MyPlan />} />
      <Route path="/my-plan/new" element={<MyPlanCreate />} />
      <Route path="/my-plan/:id" element={<MyPlanDetail />} />
      <Route path="/settings" element={<Settings />} />
    </>
  ) : (
    // 배포용: 로그인 + 온보딩 상태에 따라 접근 제어
    <>
      {/* 공개 경로 (로그인한 사람은 못 들어감) */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
      </Route>

      {/* 온보딩 전용 (로그인 필요하지만 온보딩 단계인 사람만) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/onboarding" element={<Onboarding />} />
      </Route>

        {/* 보호된 경로 (로그인 및 온보딩 완료 사용자용) */}
      <Route element={<ProtectedRoute />}>
        {/* 메인 및 주요 기능 */}
        <Route
          path="/"
          element={
            needsOnboarding ? <Navigate to="/onboarding" replace /> : <Main />
          }
        />
        <Route
          path="/search"
          element={
            needsOnboarding ? <Navigate to="/onboarding" replace /> : <Search />
          }
        />
        <Route
          path="/my-plan"
          element={
            needsOnboarding
              ? <Navigate to="/onboarding" replace />
              : <MyPlan />
          }
        />
        <Route
          path="/my-plan/new"
          element={
            needsOnboarding
              ? <Navigate to="/onboarding" replace />
              : <MyPlanCreate />
          }
        />
        <Route
          path="/my-plan/:id"
          element={
            needsOnboarding
              ? <Navigate to="/onboarding" replace />
              : <MyPlanDetail />
          }
        />
        <Route
          path="/settings"
          element={
            needsOnboarding
              ? <Navigate to="/onboarding" replace />
              : <Settings />
          }
        />
      </Route>
    </>
  )

  return (
    <BrowserRouter>
      <Toaster position="top-center" reverseOrder={false} />
      <Routes>
        {routes}

        {/* 404 처리 (필요시 추가) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
