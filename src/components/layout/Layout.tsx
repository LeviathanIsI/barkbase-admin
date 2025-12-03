import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ImpersonationBanner } from './ImpersonationBanner';
import { useImpersonation } from '@/contexts/ImpersonationContext';

export function Layout() {
  const { isImpersonating } = useImpersonation();

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <Sidebar />
      <ImpersonationBanner />
      <main
        className="min-h-screen"
        style={{ marginLeft: 'var(--sidebar-width)' }}
      >
        <div
          className="py-6 px-8 max-w-[var(--content-max-width)]"
          style={{ paddingTop: isImpersonating ? 'calc(1.5rem + 40px)' : '1.5rem' }}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}
