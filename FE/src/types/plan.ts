/**
 * UI에서 표시하기 위한 플랜 모델
 *
 * Plan 원본 타입은 @/types/api 에서 직접 import 하세요.
 */
export interface PlanUIModel {
  id: string; // string for convenience
  planId: number; // original numeric ID
  title: string;
  meetingAt: string;
  participantCount: number;
  totalBudget: number;
  planType: string;
  memo: string;
  createdAt: string;
  updatedAt: string;
  thumbnailUrl: string;

  // 장소 정보 추가 (S14P21B205-213)
  places?: {
    placeId: number;
    name: string;
    address: string;
    category?: string;
    lat: number;
    lng: number;
    seqNo: number;
  }[];

  // UI 전용 가공 필드
  formattedDate: string;
  formattedBudget: string;
  status: 'upcoming' | 'completed';
  daysUntil?: number;
}

/**
 * 플랜 목록 응답 UI 모델 (S14P21B205-132: 커서 기반 대응)
 */
export interface PlanListUIModel {
  plans: PlanUIModel[];
  nextCursor: string | number | null;
  hasNext: boolean;
}
