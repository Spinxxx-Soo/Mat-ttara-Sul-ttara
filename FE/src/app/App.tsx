import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from 'react-hot-toast';
import { RouterProvider } from 'react-router-dom';

import { queryClient } from '@/app/queryClient';
import { envConfig } from '@/config/env';
import { router } from '@/app/router';
import { initKakao } from '@/lib/kakao';
import { GlobalErrorBoundary } from '@/components/ui/GlobalErrorBoundary';

export default function App() {
  useEffect(() => {
    initKakao();
  }, []);

  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GoogleOAuthProvider clientId={envConfig.googleClientId}>
          <Toaster position="top-center" reverseOrder={false} />
          <RouterProvider router={router} />
          {envConfig.isDev && <ReactQueryDevtools initialIsOpen={false} />}
        </GoogleOAuthProvider>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
}
