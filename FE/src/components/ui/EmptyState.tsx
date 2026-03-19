interface EmptyStateProps {
  icon?: string;
  title?: string;
  message?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export default function EmptyState({
  icon = 'inbox',
  title = '데이터가 없습니다.',
  message,
  actionText,
  onAction,
  className = ''
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 text-center px-4 ${className}`}>
      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
        <span className="material-symbols-outlined text-3xl">{icon}</span>
      </div>
      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">
        {title}
      </h3>
      {message && (
        <p className="text-slate-500 text-sm mb-6">{message}</p>
      )}
      {onAction && actionText && (
        <button
          onClick={onAction}
          className="px-6 py-2 bg-primary text-white rounded-xl font-medium shadow-sm hover:bg-primary/90 transition-colors"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
