import { useCallback, useEffect, useState } from 'react';
import { pendingCount } from '../lib/db';

export function usePendingCount() {
  const [count, setCount] = useState(0);
  const refresh = useCallback(() => void pendingCount().then(setCount), []);
  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => window.clearInterval(timer);
  }, [refresh]);
  return { count, refresh };
}

