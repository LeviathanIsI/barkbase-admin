import { AlertTriangle, X } from 'lucide-react';
import { useImpersonation, isNearExpiry } from '@/contexts/ImpersonationContext';

export function ImpersonationBanner() {
  const { isImpersonating, impersonatedTenant, endImpersonation, timeRemaining } = useImpersonation();

  if (!isImpersonating || !impersonatedTenant) {
    return null;
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const nearExpiry = isNearExpiry(timeRemaining);

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[var(--z-modal)] px-4 py-2 flex items-center justify-center gap-4 text-sm font-medium ${
        nearExpiry
          ? 'bg-[var(--color-error)] text-white animate-pulse'
          : 'bg-[var(--color-warning)] text-black'
      }`}
      style={{ marginLeft: 'var(--sidebar-width)' }}
    >
      <div className="flex items-center gap-2">
        <AlertTriangle size={16} className="flex-shrink-0" />
        <span>
          IMPERSONATING: <strong>{impersonatedTenant.name}</strong>
        </span>
        {timeRemaining !== null && (
          <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
            nearExpiry ? 'bg-white/20' : 'bg-black/10'
          }`}>
            {nearExpiry ? 'EXPIRING IN ' : ''}{formatTime(timeRemaining)}
          </span>
        )}
      </div>
      <button
        onClick={endImpersonation}
        className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-semibold transition-colors ${
          nearExpiry
            ? 'bg-white text-[var(--color-error)] hover:bg-white/90'
            : 'bg-black/10 hover:bg-black/20'
        }`}
      >
        <X size={14} />
        Exit Impersonation
      </button>
    </div>
  );
}
