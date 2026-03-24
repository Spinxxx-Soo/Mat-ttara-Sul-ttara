import { useEffect, type PropsWithChildren } from 'react';
import { Outlet } from 'react-router-dom';

import ErrorState from '@/components/ui/ErrorState';
import LoadingState from '@/components/ui/LoadingState';
import { isUserDataStale, useUser } from '@/hooks/queries/user/useUser';
import { useAuthStore } from '@/stores/authStore';

const FullScreenShell = ({ children }: PropsWithChildren) => (
  <div className="min-h-screen bg-background-light dark:bg-background-dark px-4 py-6">
    <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-xl items-center justify-center">
      {children}
    </div>
  </div>
);

export const AuthInitializer = ({ children }: PropsWithChildren) => {
  const { hasHydrated, isLoggedIn, lastUserSyncAt, user, setUser } = useAuthStore();

  // 개발 환경 전용 인증 바이패스 설정 및 Mock 데이터 주입
  useEffect(() => {
    const isAuthBypass = 
      import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH_BYPASS === 'true';

    if (isAuthBypass && hasHydrated && !isLoggedIn) {
      console.warn('[DEV] Auth Bypass active: Injecting mock user data');
      setUser({
        userId: 9999,
        email: 'dev-tester@matsul.com',
        name: '개발용_테스터',
        bio: '인증 바이패스 모드입니다.',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      });
      // Note: setTokens는 호출하지 않음 (isLoggedIn: true 상태로 만들지 않음)
      // ProtectedRoute에서도 isAuthBypass 체크를 통해 통과시키므로 안전합니다.
    }
  }, [hasHydrated, isLoggedIn, setUser]);

  const shouldSyncUser =
    hasHydrated && isLoggedIn && (!user || isUserDataStale(lastUserSyncAt));

  const { isError, isFetching, isLoading, refetch } = useUser({
    enabled: shouldSyncUser,
  });

  const { logout } = useAuthStore();

  if (!hasHydrated) {
    return (
      <FullScreenShell>
        <LoadingState
          message="인증 상태를 복원하는 중입니다..."
          className="w-full max-w-md"
        />
      </FullScreenShell>
    );
  }

  if (shouldSyncUser && (isLoading || isFetching)) {
    return (
      <FullScreenShell>
        <LoadingState
          message="사용자 정보를 동기화하는 중입니다..."
          className="w-full max-w-md"
        />
      </FullScreenShell>
    );
  }

  if (shouldSyncUser && isError && !user) {
    return (
      <FullScreenShell>
        <ErrorState
          title="사용자 정보를 불러오지 못했습니다."
          message="세션이 만료되었거나 일시적인 오류일 수 있습니다."
          onRetry={() => {
            void refetch();
          }}
          // 피드백 반영: 로그아웃을 통한 재로그인 유도
          secondaryActionText="다시 로그인하기"
          onSecondaryAction={() => {
            logout();
          }}
          className="w-full max-w-md"
        />
      </FullScreenShell>
    );
  }

  return <>{children ?? <Outlet />}</>;
};
