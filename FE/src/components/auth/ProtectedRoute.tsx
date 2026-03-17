import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

interface ProtectedRouteProps {
  allowGuest?: boolean;
}

/**
 * 인증이 필요한 경로를 위한 가드 컴포넌트
 */
export const ProtectedRoute = ({ allowGuest = false }: ProtectedRouteProps) => {
  const { isLoggedIn } = useAuthStore();

  // 로그인하지 않았는데 익명 접근도 허용되지 않는 경우
  if (!isLoggedIn && !allowGuest) {
    return <Navigate to="/login" replace />;
  }

  // 온보딩이 필요한 상태라면 온보딩 페이지로 (App.tsx에서도 처리하지만 여기서도 이중 방어)
  // 단, 온보딩 페이지 자체는 제외해야 함 (보통 App.tsx 라우팅 레벨에서 처리)

  return <Outlet />;
};
