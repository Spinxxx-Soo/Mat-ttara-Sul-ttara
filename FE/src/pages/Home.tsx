import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import CopyLinkButton from '@/components/CopyLinkButton';
import NaverMap from '@/components/NaverMap';
import { useAuthStore } from '@/stores/authStore';
import { Plan } from '@/types/plan';

export default function Home() {
  const { isLoggedIn, logout } = useAuthStore();

  // Polling MVP: 데이터 refetch 간격(10초)으로 셋팅
  const { data: plans, isLoading } = useQuery<Plan[]>({
    queryKey: ['plans'],
    queryFn: async () => {
      // 실제 프로젝트에서는 axios apiClient 훅 연동
      // const response = await apiClient.get('/api/plans');
      // return response.data;
      return [
        { id: '1', title: 'Plan A', description: 'MVP 첫 번째 플랜', createdAt: '', updatedAt: '' },
      ];
    },
    refetchInterval: 10000,
  });

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <header className="flex justify-between items-center border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-800">FE Dashboard</h1>
        <nav className="space-x-4">
          <Link to="/plan/1" className="text-blue-500 hover:underline">디테일 뷰(테스트)</Link>
          {isLoggedIn ? (
            <button onClick={logout} className="text-red-500 font-semibold hover:underline">로그아웃</button>
          ) : (
            <Link to="/login" className="text-blue-500 font-semibold hover:underline">로그인</Link>
          )}
        </nav>
      </header>

      <main className="space-y-12">
        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-700">React Query + Polling</h2>
          {isLoading ? (
            <p className="text-gray-500">데이터를 불러오는 중입니다...</p>
          ) : (
            <ul className="list-disc pl-5 space-y-2">
              {plans?.map((plan: Plan) => (
                <li key={plan.id} className="text-gray-800">
                  <span className="font-semibold">{plan.title}</span> - {plan.description}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Naver Map Integration</h2>
          <NaverMap />
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Share Link</h2>
          <CopyLinkButton
            linkUrl={window.location.href}
          />
        </section>
      </main>
    </div>
  );
}
