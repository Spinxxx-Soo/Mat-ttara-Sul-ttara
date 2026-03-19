import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import LoadingState from '@/components/ui/LoadingState';

/**
 * 로그인한 사용자는 접근할 수 없는 경로 (예: 로그인 페이지)를 위한 가드 컴포넌트
 */
export const PublicRoute = () => {
  const { hasHydrated, isLoggedIn } = useAuthStore();

  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark px-4 py-6">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-xl items-center justify-center">
          <LoadingState
            message="로그인 상태를 확인하는 중입니다..."
            className="w-full max-w-md"
          />
        </div>
      </div>
    );
  }

  if (isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
