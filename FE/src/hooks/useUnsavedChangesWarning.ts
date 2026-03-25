import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

export const useUnsavedChangesWarning = (when: boolean, message: string) => {
  const blocker = useBlocker(when);

  useEffect(() => {
    if (blocker.state !== 'blocked') {
      return;
    }

    if (window.confirm(message)) {
      blocker.proceed();
      return;
    }

    blocker.reset();
  }, [blocker, message]);

  useEffect(() => {
    if (!when) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [message, when]);
};
