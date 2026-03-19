import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import { usePlansQuery } from '@/hooks/queries/plan/usePlanQueries';

const MyPlan = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState<number>(0);
  const { data, isPending, isError, refetch, isFetching } = usePlansQuery(page);

  const handleCreatePlan = () => {
    navigate('/my-plan/new');
  };

  const handleViewDetail = (id: string) => {
    navigate(`/my-plan/${id}`);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark">
      <Sidebar />
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-8 py-6 flex justify-between items-center border-b border-primary/5">
          <div>
            <h2 className="text-2xl font-black tracking-tight">마이플랜</h2>
            <p className="text-slate-500 text-sm mt-1">
              나만의 맛있는 여행 계획을 확인하고 관리하세요.
            </p>
          </div>
          <div className="flex gap-3">
            <button className="size-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-primary/10">
              <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">
                search
              </span>
            </button>
            <button className="size-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-primary/10">
              <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">
                notifications
              </span>
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="max-w-4xl mx-auto p-8 w-full overflow-y-auto">
          {/* Title & Add Button */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div className="space-y-1">
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                내 플랜 리스트
              </h3>
            </div>
            <button
              onClick={handleCreatePlan}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/25 hover:brightness-110 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined">add</span>
              플랜 새로 만들기
            </button>
          </div>

          {/* Plans List */}
          <div className="grid gap-6">
            {isPending ? (
              <LoadingState message="일정을 불러오는 중입니다..." />
            ) : isError ? (
              <ErrorState
                title="일정을 불러오는 중 오류가 발생했습니다."
                onRetry={() => refetch()}
                isFetching={isFetching}
              />
            ) : data && data.plans.length === 0 ? (
              <EmptyState
                icon="calendar_today"
                title="등록된 여행 계획이 없습니다."
                message="첫 번째 맛집 여행 계획을 만들어보세요!"
                actionText="플랜 만들기"
                onAction={handleCreatePlan}
              />
            ) : data ? (
              data.plans.map((plan) => (
                <div
                  key={plan.id}
                  className="group flex flex-col md:flex-row bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all border border-slate-100 dark:border-slate-800"
                >
                  <div className="w-full md:w-72 h-48 md:h-auto overflow-hidden relative">
                    <img
                      alt={plan.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      src={plan.thumbnailUrl}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400';
                      }}
                    />
                    {plan.status === 'upcoming' && plan.daysUntil !== undefined && (
                      <div className="absolute top-3 left-3 px-3 py-1 bg-primary/90 text-white text-xs font-bold rounded-full">
                        D-{plan.daysUntil}
                      </div>
                    )}
                    {plan.status === 'completed' && (
                      <div className="absolute top-3 left-3 px-3 py-1 bg-slate-500/90 text-white text-xs font-bold rounded-full">
                        종료
                      </div>
                    )}
                  </div>
                  <div className="flex-1 p-6 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">
                          {plan.title}
                        </h4>
                        <span className="material-symbols-outlined text-slate-400 cursor-pointer hover:text-primary">
                          bookmark
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <span className="material-symbols-outlined text-primary text-lg">
                            group
                          </span>
                          <span>인원: {plan.participantCount}명</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <span className="material-symbols-outlined text-primary text-lg">
                            payments
                          </span>
                          <span>예산: {plan.formattedBudget}원</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <span className="material-symbols-outlined text-primary text-lg">
                            location_on
                          </span>
                          <span>타입: {plan.planType}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <span className="material-symbols-outlined text-primary text-lg">
                            calendar_month
                          </span>
                          <span>{plan.formattedDate}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 flex items-center justify-end">
                      <button
                        onClick={() => handleViewDetail(plan.id)}
                        className="px-5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold rounded-lg hover:bg-primary hover:text-white transition-all"
                      >
                        상세 보기
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : null}
          </div>

          {/* Load More */}
          <div className="mt-12 flex justify-center">
            <button className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium hover:text-primary transition-colors">
              더 많은 플랜 보기
              <span className="material-symbols-outlined">expand_more</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MyPlan;
