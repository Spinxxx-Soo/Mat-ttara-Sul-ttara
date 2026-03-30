import { Navigate, Outlet } from 'react-router-dom';

import { useAuthStore } from '@/stores/authStore';

/**
 * 온보딩이 필요한 사용자만 접근 가능한 경로
 */
export const OnboardingOnlyRoute = () => {
  const { needsOnboarding } = useAuthStore();

  if (!needsOnboarding) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
