import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      id="offline-mode-indicator"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-100 shadow-lg"
    >
      <WifiOff className="w-3.5 h-3.5 text-emerald-400" />
      <span>Offline Mode — Running 100% locally</span>
    </div>
  );
};
