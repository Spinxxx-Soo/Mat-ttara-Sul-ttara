import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import LoadingState from '@/components/ui/LoadingState';

interface ProtectedRouteProps {
  allowGuest?: boolean;
}

/**
 * 인증이 필요한 경로를 위한 가드 컴포넌트
 */
export const ProtectedRoute = ({ allowGuest = false }: ProtectedRouteProps) => {
  const { hasHydrated, isLoggedIn } = useAuthStore();

  // 개발 환경 전용 인증 바이패스 설정
  const isAuthBypass = 
    import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH_BYPASS === 'true';

  if (!hasHydrated && !isAuthBypass) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark px-4 py-6">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-xl items-center justify-center">
          <LoadingState
            message="접근 권한을 확인하는 중입니다..."
            className="w-full max-w-md"
          />
        </div>
      </div>
    );
  }

  // 로그인하지 않았는데 익명 접근도 허용되지 않는 경우 (바이패스 시 통과)
  if (!isLoggedIn && !allowGuest && !isAuthBypass) {
    return <Navigate to="/login" replace />;
  }

  // 온보딩이 필요한 상태라면 온보딩 페이지로 (App.tsx에서도 처리하지만 여기서도 이중 방어)
  // 단, 온보딩 페이지 자체는 제외해야 함 (보통 App.tsx 라우팅 레벨에서 처리)

  return <Outlet />;
};
