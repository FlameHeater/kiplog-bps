import { useEffect, useState } from 'react';

interface StorageEstimateState {
  usagePercent: number | null; // null = unsupported/unknown
}

const POLL_INTERVAL_MS = 60_000;

// ST-04: navigator.storage.estimate() polled while the app is open.
export function useStorageEstimate(): StorageEstimateState {
  const [usagePercent, setUsagePercent] = useState<number | null>(null);

  useEffect(() => {
    if (!navigator.storage?.estimate) return;

    let cancelled = false;
    async function check() {
      const { usage, quota } = await navigator.storage.estimate();
      if (cancelled || !quota) return;
      setUsagePercent(Math.round(((usage ?? 0) / quota) * 100));
    }

    void check();
    const interval = setInterval(() => void check(), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { usagePercent };
}
