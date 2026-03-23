import { Place } from '@/types/api';

/**
 * 장소 데이터에 크롤링이 필요한 null 필드가 있는지 확인합니다.
 */
export const hasNullFields = (place: Place): boolean => {
  // 필수 정보가 누락되었거나 보강되지 않은 상태인 경우
  const essentialFields: (keyof Place)[] = [
    'phone',
    'openingHours',
    'imageUrl',
    'category',
  ];

  // 이미 보강된 데이터라면 다시 요청하지 않음
  if (place.isEnriched) return false;

  return essentialFields.some((field) => {
    const value = place[field];
    return value === null || value === undefined || value === '';
  });
};
