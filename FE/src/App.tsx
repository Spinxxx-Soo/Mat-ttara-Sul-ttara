import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Main from './pages/Main'
import Search from './pages/Search'
import MyPlan from './pages/MyPlan'
import MyPlanDetail from './pages/MyPlanDetail'
import MyPlanCreate from './pages/MyPlanCreate'
import Settings from './pages/Settings'

function App() {
  // TODO: 실제 인증 상태 확인 로직으로 교체
  // 개발 중 테스트를 위해 localStorage에서 인증 상태 확인
  const getAuthState = () => {
    const auth = localStorage.getItem('isAuthenticated')
    return auth === 'true'
  }
  
  const getOnboardingState = () => {
    const onboarding = localStorage.getItem('hasCompletedOnboarding')
    return onboarding === 'true'
  }
  
  const isAuthenticated = getAuthState()
  const hasCompletedOnboarding = getOnboardingState()
  
  // 개발 모드 감지 (Vite)
  // @ts-ignore - Vite의 import.meta.env는 런타임에 사용 가능
  const isDev = import.meta.env?.MODE === 'development' || import.meta.env?.DEV
  
  // TODO: 프로덕션 배포 시 이 값을 false로 변경하거나 제거
  // 개발 중: 인증 체크 우회 (개발 편의성)
  // 프로덕션: 인증 체크 활성화
  const ENABLE_AUTH_CHECK = false // 개발 중: false, 프로덕션: true

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
              : (isAuthenticated && !hasCompletedOnboarding 
                  ? <Onboarding /> 
                  : <Navigate to="/login" replace />)
          } 
        />
        {/* 루트 경로: 개발 중에는 자유 접근, 프로덕션에서는 인증 체크 */}
        <Route 
          path="/" 
          element={
            !ENABLE_AUTH_CHECK || isAuthenticated
              ? <Main />
              : <Navigate to="/login" replace />
          } 
        />
        <Route 
          path="/search" 
          element={
            !ENABLE_AUTH_CHECK || isAuthenticated
              ? <Search /> 
              : <Navigate to="/login" replace />
          } 
        />
        <Route 
          path="/my-plan" 
          element={
            !ENABLE_AUTH_CHECK || isAuthenticated
              ? <MyPlan /> 
              : <Navigate to="/login" replace />
          } 
        />
        <Route 
          path="/my-plan/new" 
          element={
            !ENABLE_AUTH_CHECK || isAuthenticated
              ? <MyPlanCreate /> 
              : <Navigate to="/login" replace />
          } 
        />
        <Route 
          path="/my-plan/:id" 
          element={
            !ENABLE_AUTH_CHECK || isAuthenticated
              ? <MyPlanDetail /> 
              : <Navigate to="/login" replace />
          } 
        />
        <Route 
          path="/settings" 
          element={
            !ENABLE_AUTH_CHECK || isAuthenticated
              ? <Settings /> 
              : <Navigate to="/login" replace />
          } 
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
