import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

/**
 * 로그인한 사용자는 접근할 수 없는 경로 (예: 로그인 페이지)를 위한 가드 컴포넌트
 */
export const PublicRoute = () => {
  const { isLoggedIn } = useAuthStore();

  if (isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
