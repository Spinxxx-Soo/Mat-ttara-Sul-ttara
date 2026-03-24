import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class GlobalErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark px-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-lg border border-slate-100 dark:border-slate-800 text-center">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-red-500 text-3xl">sentiment_very_dissatisfied</span>
            </div>
            
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
              문제가 발생했습니다.
            </h1>
            
            <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
              예상치 못한 오류로 인해 화면을 표시할 수 없습니다.<br/>
              잠시 후 다시 시도해주시거나 새로고침을 해주세요.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <div className="mb-8 text-left max-h-48 overflow-auto bg-slate-50 dark:bg-slate-950 p-4 rounded-lg">
                <p className="text-red-500 font-mono text-sm mb-2 font-bold">{this.state.error.message}</p>
                <p className="text-slate-400 font-mono text-xs whitespace-pre-wrap">{this.state.error.stack}</p>
              </div>
            )}

            <button
              onClick={this.handleReload}
              className="w-full py-3.5 px-4 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[20px]">refresh</span>
              새로고침
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
