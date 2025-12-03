import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from '@/services/api';

interface ImpersonatedTenant {
  id: string;
  name: string;
}

interface ImpersonationContextType {
  isImpersonating: boolean;
  impersonatedTenant: ImpersonatedTenant | null;
  startImpersonation: (tenantId: string, tenantName: string, reason: string) => Promise<void>;
  endImpersonation: () => void;
  expiresAt: Date | null;
  timeRemaining: number | null; // in seconds
}

const ImpersonationContext = createContext<ImpersonationContextType | null>(null);

const IMPERSONATION_DURATION = 30 * 60 * 1000; // 30 minutes in ms
const WARNING_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [impersonatedTenant, setImpersonatedTenant] = useState<ImpersonatedTenant | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('impersonation');
    if (stored) {
      try {
        const { tenant, expiresAt: storedExpiry } = JSON.parse(stored);
        const expiry = new Date(storedExpiry);
        if (expiry > new Date()) {
          setImpersonatedTenant(tenant);
          setExpiresAt(expiry);
        } else {
          localStorage.removeItem('impersonation');
        }
      } catch {
        localStorage.removeItem('impersonation');
      }
    }
  }, []);

  // Timer to update time remaining and check expiry
  useEffect(() => {
    if (!expiresAt) {
      setTimeRemaining(null);
      return;
    }

    const updateRemaining = () => {
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        endImpersonation();
      }
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const startImpersonation = useCallback(async (tenantId: string, tenantName: string, reason: string) => {
    // Log the impersonation start to the backend
    await api.startImpersonation(tenantId, reason);

    const tenant = { id: tenantId, name: tenantName };
    const expiry = new Date(Date.now() + IMPERSONATION_DURATION);

    setImpersonatedTenant(tenant);
    setExpiresAt(expiry);

    localStorage.setItem('impersonation', JSON.stringify({
      tenant,
      expiresAt: expiry.toISOString(),
    }));
  }, []);

  const endImpersonation = useCallback(() => {
    if (impersonatedTenant) {
      // Log the impersonation end (fire and forget)
      api.endImpersonation(impersonatedTenant.id).catch(console.error);
    }

    setImpersonatedTenant(null);
    setExpiresAt(null);
    localStorage.removeItem('impersonation');
  }, [impersonatedTenant]);

  const isImpersonating = impersonatedTenant !== null;

  return (
    <ImpersonationContext.Provider
      value={{
        isImpersonating,
        impersonatedTenant,
        startImpersonation,
        endImpersonation,
        expiresAt,
        timeRemaining,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation(): ImpersonationContextType {
  const context = useContext(ImpersonationContext);
  if (!context) {
    throw new Error('useImpersonation must be used within an ImpersonationProvider');
  }
  return context;
}

// Helper to check if we're close to expiry (for showing warning)
export function isNearExpiry(timeRemaining: number | null): boolean {
  if (timeRemaining === null) return false;
  return timeRemaining <= WARNING_THRESHOLD / 1000 && timeRemaining > 0;
}
