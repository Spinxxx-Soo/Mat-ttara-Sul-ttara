interface LoadingStateProps {
  message?: string;
  className?: string;
}

export default function LoadingState({ message = '데이터를 불러오는 중입니다...', className = '' }: LoadingStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 ${className}`}>
      <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
      <p className="text-slate-500 font-medium">{message}</p>
    </div>
  );
}
