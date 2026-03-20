import type { PropsWithChildren } from 'react';
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
  const { hasHydrated, isLoggedIn, lastUserSyncAt, user } = useAuthStore();

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
          actionLabel="다시 로그인하기"
          onAction={() => {
            logout();
          }}
          className="w-full max-w-md"
        />
      </FullScreenShell>
    );
  }

  return <>{children ?? <Outlet />}</>;
};
