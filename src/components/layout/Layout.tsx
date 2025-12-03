import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function Layout() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <Sidebar />
      <main
        className="min-h-screen"
        style={{ marginLeft: 'var(--sidebar-width)' }}
      >
        <div className="py-6 px-8 max-w-[var(--content-max-width)]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
