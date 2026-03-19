import { Plan } from '@/types/api';

/**
 * 플랜 목록 조회 응답 포맷 (Legacy/Backup - Prefer types/api.ts)
 */
export interface GetPlansResponse {
  plans: Plan[];
  totalCount: number;
}

export type { Plan };
