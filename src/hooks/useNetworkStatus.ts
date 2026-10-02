import { useEffect, useState } from 'react';
import * as Network from 'expo-network';

export interface NetworkStatus { connected: boolean; checking: boolean; type?: string; }

export function useNetworkStatus(intervalMs = 15000): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({ connected: true, checking: true });

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        if (!active) return;
        setStatus({ connected: state.isConnected !== false, checking: false, type: state.type });
      } catch {
        if (active) setStatus((current) => ({ ...current, checking: false }));
      }
    };
    void check();
    const id = setInterval(check, intervalMs);
    return () => { active = false; clearInterval(id); };
  }, [intervalMs]);

  return status;
}
