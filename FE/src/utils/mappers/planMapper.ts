import { Plan, PlanDetail, ApiCursorPaginationResponse } from '@/types/api';
import { PlanUIModel, PlanListUIModel } from '@/types/plan';
import dayjs from 'dayjs';

/**
 * 백엔드 Plan 데이터를 UI용 모델로 변환
 */
export const mapPlanToUI = (plan: Plan | PlanDetail): PlanUIModel => {
  const meetingDate = dayjs(plan.meetingAt);
  const now = dayjs();
  const isPast = meetingDate.isBefore(now, 'day');
  const daysDiff = meetingDate.diff(now, 'day');
  const shareToken = (plan as { shareToken?: string; shareId?: string }).shareToken
    || (plan as { shareToken?: string; shareId?: string }).shareId;

  // 임시 썸네일 선정 (나중에 plan.thumbnailUrl이 있으면 그것을 우선 사용)
  const defaultImages = [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400'
  ];
  const thumbnailUrl = plan.thumbnailUrl || defaultImages[plan.planId % defaultImages.length];

  // 상세 장소 정보가 있는 경우 (PlanDetail) 매핑
  const places = 'details' in plan ? plan.details.map(d => ({
    placeId: d.placeId,
    name: d.place?.name || '알 수 없는 장소',
    address: d.place?.address || '',
    category: d.place?.category ?? undefined,
    lat: d.place?.lat || 0,
    lng: d.place?.lng || 0,
    seqNo: d.seqNo
  })) : undefined;

  return {
    ...plan,
    id: plan.planId.toString(),
    shareToken,
    memo: plan.memo || '',
    updatedAt: plan.updatedAt || '',
    thumbnailUrl,
    places,
    
    // UI 전용 가공 필드
    formattedDate: meetingDate.format('YYYY. MM. DD.'),
    formattedBudget: plan.totalBudget.toLocaleString(),
    status: isPast ? 'completed' : 'upcoming',
    daysUntil: !isPast ? daysDiff : undefined,
  };
};

/**
 * 플랜 목록 응답 전체 변환 (S14P21B205-132: 커서 기반)
 */
export const mapPlanListToUI = (response: ApiCursorPaginationResponse<Plan>): PlanListUIModel => {
  return {
    plans: (response.content || []).map(mapPlanToUI),
    nextCursor: response.nextCursor || null,
    hasNext: response.hasNext || false,
  };
};
