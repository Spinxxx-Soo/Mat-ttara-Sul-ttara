import { extractApiErrorMessage, extractFieldErrors, isApiError } from '@/lib/apiUtils';

type PlanMutationAction = 'create' | 'update' | 'delete';
type PlanPageMode = 'detail' | 'edit';

export const PLAN_MESSAGES = {
  createSuccess: '플랜이 생성되었습니다.',
  updateSuccess: '플랜이 수정되었습니다.',
  deleteSuccess: '플랜이 삭제되었습니다.',
  copySuccess: '플랜 링크가 복사되었습니다.',
  createPending: '플랜을 생성하는 중입니다...',
  updatePending: '변경사항을 저장하는 중입니다...',
  deletePending: '플랜을 삭제하는 중입니다...',
  delayedPending: '응답이 평소보다 느립니다. 잠시만 기다려주세요.',
  createCancel: '작성 중인 내용이 있습니다. 플랜 생성을 취소할까요?',
  editCancel: '수정 중인 내용이 있습니다. 플랜 수정을 취소할까요?',
  leaveWarning: '저장되지 않은 변경사항이 있습니다. 페이지를 떠나시겠습니까?',
  shareDescription: '아래 링크를 복사해 플랜을 공유하세요.',
  shareKakao: '카카오톡으로 공유하기',
  emptyPlaces: '오른쪽 지도에서 방문할 장소를 선택하세요.',
  emptyMemo: '메모가 없습니다.',
} as const;

export const getPlanMutationErrorMessage = (
  error: unknown,
  action: PlanMutationAction
) => {
  const fieldErrors = extractFieldErrors(error);
  const firstFieldError = Object.values(fieldErrors)[0];

  if (firstFieldError) {
    return firstFieldError;
  }

  switch (action) {
    case 'create':
      return extractApiErrorMessage(error, '플랜 생성 중 오류가 발생했습니다.');
    case 'update':
      return extractApiErrorMessage(error, '플랜 수정 중 오류가 발생했습니다.');
    case 'delete':
      return extractApiErrorMessage(error, '플랜 삭제 중 오류가 발생했습니다.');
    default:
      return '플랜 처리 중 오류가 발생했습니다.';
  }
};

export const getPlanPageErrorState = (error: unknown, mode: PlanPageMode) => {
  if (isApiError(error)) {
    const status = error.response?.status;

    if (status === 403) {
      return {
        title: '이 플랜에 접근할 권한이 없습니다.',
        message:
          mode === 'edit'
            ? '작성자만 플랜을 수정할 수 있습니다.'
            : '이 플랜을 조회할 수 있는 권한이 없습니다.',
        actionText: '목록으로 돌아가기',
      };
    }

    if (status === 404) {
      return {
        title: '플랜을 찾을 수 없습니다.',
        message:
          mode === 'edit'
            ? '삭제되었거나 존재하지 않는 플랜입니다.'
            : '유효하지 않은 링크이거나 삭제된 플랜입니다.',
        actionText: '목록으로 돌아가기',
      };
    }
  }

  return {
    title:
      mode === 'edit'
        ? '플랜 수정 화면을 불러오지 못했습니다.'
        : '플랜을 불러오지 못했습니다.',
    message: extractApiErrorMessage(
      error,
      '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    ),
    actionText: '목록으로 돌아가기',
  };
};

export const confirmDiscardPlanChanges = (message: string) =>
  window.confirm(message);
