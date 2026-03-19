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
          message="잠시 후 다시 시도하거나 다시 로그인해주세요."
          onRetry={() => {
            void refetch();
          }}
          className="w-full max-w-md"
        />
      </FullScreenShell>
    );
  }

  return <>{children ?? <Outlet />}</>;
};
