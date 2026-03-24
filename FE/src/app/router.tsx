import { createBrowserRouter, Navigate } from 'react-router-dom';

import { AuthInitializer } from '@/components/auth/AuthInitializer';
import { CompletedOnboardingRoute } from '@/components/auth/CompletedOnboardingRoute';
import { OnboardingOnlyRoute } from '@/components/auth/OnboardingOnlyRoute';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PublicRoute } from '@/components/auth/PublicRoute';
import Login from '@/pages/Login';
import Main from '@/pages/Main';
import MyPlan from '@/pages/MyPlan';
import MyPlanCreate from '@/pages/MyPlanCreate';
import MyPlanDetail from '@/pages/MyPlanDetail';
import MyPlanEdit from '@/pages/MyPlanEdit';
import Onboarding from '@/pages/Onboarding';
import Search from '@/pages/Search';
import Settings from '@/pages/Settings';

export const router = createBrowserRouter([
  {
    element: <AuthInitializer />,
    children: [
      {
        element: <PublicRoute />,
        children: [
          {
            path: '/login',
            element: <Login />,
          },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <OnboardingOnlyRoute />,
            children: [
              {
                path: '/onboarding',
                element: <Onboarding />,
              },
            ],
          },
          {
            element: <CompletedOnboardingRoute />,
            children: [
              {
                path: '/',
                element: <Main />,
              },
              {
                path: '/search',
                element: <Search />,
              },
              {
                path: '/my-plan',
                element: <MyPlan />,
              },
              {
                path: '/my-plan/new',
                element: <MyPlanCreate />,
              },
              {
                path: '/my-plan/:id',
                element: <MyPlanDetail />,
              },
              {
                path: '/my-plan/:id/edit',
                element: <MyPlanEdit />,
              },
              {
                path: '/settings',
                element: <Settings />,
              },
            ],
          },
        ],
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
