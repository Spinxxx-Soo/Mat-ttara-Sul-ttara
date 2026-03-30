import { useEffect, useState } from 'react';

export const usePendingDelay = (pending: boolean, delay = 800) => {
  const [showDelayedMessage, setShowDelayedMessage] = useState(false);

  useEffect(() => {
    if (!pending) {
      setShowDelayedMessage(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowDelayedMessage(true);
    }, delay);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [delay, pending]);

  return showDelayedMessage;
};
