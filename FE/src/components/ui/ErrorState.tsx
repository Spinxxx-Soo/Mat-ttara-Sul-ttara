import { memo } from 'react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  actionText?: string;
  className?: string;
  isFetching?: boolean;
}

const ErrorState = memo(({
  title = '오류가 발생했습니다.',
  message = '네트워크 연결을 확인하거나 잠시 후 다시 시도해주세요.',
  onRetry,
  actionText = '다시 시도',
  className = '',
  isFetching = false
}: ErrorStateProps) => {
  return (
    <div className={`flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 text-center px-4 ${className}`}>
      <div className="w-16 h-16 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-red-500 text-3xl">error</span>
      </div>
      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">
        {title}
      </h3>
      <p className="text-slate-500 text-sm mb-6">
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          disabled={isFetching}
          className={`px-6 py-2 bg-primary text-white rounded-xl font-medium shadow-sm hover:bg-primary/90 transition-all flex items-center gap-2 ${
            isFetching ? 'opacity-70 cursor-not-allowed scale-95' : 'active:scale-95'
          }`}
        >
          {isFetching && (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          )}
          {isFetching ? '요청 중...' : actionText}
        </button>
      )}
    </div>
  );
});

ErrorState.displayName = 'ErrorState';

export default ErrorState;
