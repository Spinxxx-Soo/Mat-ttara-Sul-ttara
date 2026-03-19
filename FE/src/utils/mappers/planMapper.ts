import { Plan, ApiPaginationResponse } from '@/types/api';
import { PlanUIModel, PlanListUIModel } from '@/types/plan';
import dayjs from 'dayjs';

/**
 * 백엔드 Plan 데이터를 UI용 모델로 변환
 */
export const mapPlanToUI = (plan: Plan): PlanUIModel => {
  const meetingDate = dayjs(plan.meetingAt);
  const now = dayjs();
  const isPast = meetingDate.isBefore(now, 'day');
  const daysDiff = meetingDate.diff(now, 'day');

  // 임시 썸네일 선정
  const defaultImages = [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400'
  ];
  const thumbnailUrl = defaultImages[plan.planId % defaultImages.length];

  return {
    ...plan,
    id: plan.planId.toString(),
    memo: plan.memo || '',
    updatedAt: plan.updatedAt || '',
    
    // UI 전용 가공 필드
    formattedDate: meetingDate.format('YYYY. MM. DD.'),
    formattedBudget: plan.totalBudget.toLocaleString(),
    status: isPast ? 'completed' : 'upcoming',
    daysUntil: !isPast ? daysDiff : undefined,
    thumbnailUrl,
  };
};

/**
 * 플랜 목록 응답 전체 변환
 */
export const mapPlanListToUI = (response: ApiPaginationResponse<Plan>): PlanListUIModel => {
  return {
    plans: response.content.map(mapPlanToUI),
    totalCount: response.pageInfo.totalElements,
  };
};
