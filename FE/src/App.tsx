import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './stores/authStore'
import { getUserInfo } from './api/authApi'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Main from './pages/Main'
import Search from './pages/Search'
import MyPlan from './pages/MyPlan'
import MyPlanDetail from './pages/MyPlanDetail'
import MyPlanCreate from './pages/MyPlanCreate'
import Settings from './pages/Settings'

function App() {
  const { isLoggedIn, user, needsOnboarding, setUser } = useAuthStore()
  
  // 로그인 상태인데 유저 상세 정보가 없다면 가져오기
  useEffect(() => {
    if (isLoggedIn && !user) {
      const fetchUserInfo = async () => {
        try {
          const userInfo = await getUserInfo()
          setUser(userInfo)
        } catch (error) {
          console.error('유저 정보 조회 실패:', error)
          // 에러 처리는 axios interceptor(401 시 로그아웃)에 맡김
        }
      }
      fetchUserInfo()
    }
  }, [isLoggedIn, user, setUser])

  // 개발 모드 감지 (Vite)
  const isDev = import.meta.env?.MODE === 'development'
  
  // 개발 중: 인증 체크 우회 (개발 편의성)
  // 프로덕션: 인증 체크 활성화
  const ENABLE_AUTH_CHECK = false // 개발 중: false, 프로덕션: true
  
  const isAuthenticated = !ENABLE_AUTH_CHECK || isLoggedIn

  return (
    <BrowserRouter>
      <Routes>
        {/* 로그인 페이지 */}
        <Route 
          path="/login" 
          element={
            ENABLE_AUTH_CHECK && isAuthenticated 
              ? <Navigate to="/" replace />
              : <Login />
          } 
        />
        <Route 
          path="/onboarding" 
          element={
            // 개발 중: 항상 접근 가능, 프로덕션: 조건부 접근
            isDev || !ENABLE_AUTH_CHECK
              ? <Onboarding /> 
              : (isAuthenticated && needsOnboarding 
                  ? <Onboarding /> 
                  : <Navigate to={isAuthenticated ? "/" : "/login"} replace />)
          } 
        />
        {/* 루트 경로: 개발 중에는 자유 접근, 프로덕션에서는 인증 체크 */}
        <Route 
          path="/" 
          element={
            !ENABLE_AUTH_CHECK || isAuthenticated
              ? (needsOnboarding ? <Navigate to="/onboarding" replace /> : <Main />)
              : <Navigate to="/login" replace />
          } 
        />
        <Route 
          path="/search" 
          element={
            !ENABLE_AUTH_CHECK || isAuthenticated
              ? (needsOnboarding ? <Navigate to="/onboarding" replace /> : <Search />)
              : <Navigate to="/login" replace />
          } 
        />
        <Route 
          path="/my-plan" 
          element={
            !ENABLE_AUTH_CHECK || isAuthenticated
              ? (needsOnboarding ? <Navigate to="/onboarding" replace /> : <MyPlan />)
              : <Navigate to="/login" replace />
          } 
        />
        <Route 
          path="/my-plan/new" 
          element={
            !ENABLE_AUTH_CHECK || isAuthenticated
              ? (needsOnboarding ? <Navigate to="/onboarding" replace /> : <MyPlanCreate />)
              : <Navigate to="/login" replace />
          } 
        />
        <Route 
          path="/my-plan/:id" 
          element={
            !ENABLE_AUTH_CHECK || isAuthenticated
              ? (needsOnboarding ? <Navigate to="/onboarding" replace /> : <MyPlanDetail />)
              : <Navigate to="/login" replace />
          } 
        />
        <Route 
          path="/settings" 
          element={
            !ENABLE_AUTH_CHECK || isAuthenticated
              ? (needsOnboarding ? <Navigate to="/onboarding" replace /> : <Settings />)
              : <Navigate to="/login" replace />
          } 
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
