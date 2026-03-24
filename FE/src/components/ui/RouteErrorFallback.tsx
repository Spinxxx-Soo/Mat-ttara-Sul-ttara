import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';
import ErrorState from './ErrorState';

export const RouteErrorFallback = () => {
  const error = useRouteError();
  const navigate = useNavigate();

  let title = '페이지를 찾을 수 없습니다.';
  let message = '요청하신 경로가 올바르지 않거나 삭제된 페이지입니다.';
  
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = '페이지를 찾을 수 없습니다.';
      message = '요청하신 경로가 올바르지 않거나 삭제된 페이지입니다.';
    } else if (error.status === 401) {
      title = '로그인이 필요합니다.';
      message = '이 페이지에 접근하려면 로그인이 필요합니다.';
    } else if (error.status === 403) {
      title = '접근 권한이 없습니다.';
      message = '이 페이지를 볼 수 있는 권한이 없습니다.';
    } else if (error.status === 500) {
      title = '서버 오류가 발생했습니다.';
      message = '서버에서 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    } else {
      title = `상태 코드 ${error.status}`;
      message = error.statusText || '알 수 없는 오류가 발생했습니다.';
    }
  } else if (error instanceof Error) {
    title = '오류가 발생했습니다.';
    message = error.message;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark p-4">
      <div className="w-full max-w-md">
        <ErrorState 
          title={title} 
          message={message} 
          actionText="홈으로 돌아가기" 
          onRetry={() => navigate('/')} 
          secondaryActionText="이전 페이지로"
          onSecondaryAction={() => navigate(-1)}
        />
      </div>
    </div>
  );
};
