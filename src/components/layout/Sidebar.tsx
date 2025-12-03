import { NavLink } from 'react-router-dom';
import { Headphones, AlertTriangle, Activity, Gauge, FileText, LogOut, ExternalLink, Calendar, Megaphone, Flag } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const navItems = [
  { to: '/support', label: 'Support Desk', icon: Headphones },
  { to: '/incidents', label: 'Incidents', icon: AlertTriangle },
  { to: '/command-center', label: 'Command Center', icon: Gauge },
  { to: '/audit-logs', label: 'Audit Logs', icon: FileText },
];

const configItems = [
  { to: '/maintenance', label: 'Maintenance', icon: Calendar },
  { to: '/broadcasts', label: 'Broadcasts', icon: Megaphone },
  { to: '/feature-flags', label: 'Feature Flags', icon: Flag },
];

export function Sidebar() {
  const { user, logout } = useAuth();

  const getInitials = (name: string | undefined, email: string | undefined) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.charAt(0).toUpperCase() || 'U';
  };

  const getRoleBadgeColor = (role: string | undefined) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-500/20 text-purple-400';
      case 'engineer':
        return 'bg-blue-500/20 text-blue-400';
      case 'support_lead':
        return 'bg-green-500/20 text-green-400';
      default:
        return 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]';
    }
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-[256px] bg-[var(--bg-sidebar)] border-r border-[var(--border-primary)] flex flex-col z-[var(--z-sidebar)]">
      {/* Logo */}
      <div className="h-16 px-5 flex items-center border-b border-[var(--border-primary)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-brand)] flex items-center justify-center">
            <span className="text-white font-bold text-sm">B</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-[var(--text-primary)]">BarkBase</div>
            <div className="text-xs text-[var(--text-muted)]">Ops Center</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        <div className="mb-2 px-3">
          <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
            Workspaces
          </span>
        </div>
        <ul className="space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all relative ${
                    isActive
                      ? 'bg-[var(--color-brand-subtle)] text-[var(--color-brand-light)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)] hover:text-[var(--text-primary)]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[var(--color-brand)] rounded-r-full" />
                    )}
                    <Icon size={18} className="flex-shrink-0" />
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Config Section */}
        <div className="mt-6 mb-2 px-3">
          <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
            Configuration
          </span>
        </div>
        <ul className="space-y-1">
          {configItems.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all relative ${
                    isActive
                      ? 'bg-[var(--color-brand-subtle)] text-[var(--color-brand-light)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)] hover:text-[var(--text-primary)]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[var(--color-brand)] rounded-r-full" />
                    )}
                    <Icon size={18} className="flex-shrink-0" />
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* External Links Section */}
        <div className="mt-6 mb-2 px-3">
          <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
            External
          </span>
        </div>
        <ul className="space-y-1">
          <li>
            <a
              href="/status"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)] hover:text-[var(--text-primary)] transition-all"
            >
              <Activity size={18} className="flex-shrink-0" />
              <span className="flex-1">Status Page</span>
              <ExternalLink size={14} className="text-[var(--text-muted)]" />
            </a>
          </li>
        </ul>
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-[var(--border-primary)]">
        <div className="flex items-center gap-3 p-2 rounded-md">
          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-[var(--color-brand-subtle)] flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-medium text-[var(--color-brand-light)]">
              {getInitials(user?.name, user?.email)}
            </span>
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
              {user?.name || user?.email || 'Unknown User'}
            </p>
            <span className={`inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded ${getRoleBadgeColor(user?.role)}`}>
              {user?.role?.replace('_', ' ').toUpperCase() || 'USER'}
            </span>
          </div>
        </div>
        <button
          onClick={() => logout()}
          className="flex items-center gap-2 w-full mt-2 px-3 py-2 rounded-md text-sm text-[var(--text-muted)] hover:bg-[var(--hover-overlay)] hover:text-[var(--text-secondary)] transition-colors"
        >
          <LogOut size={16} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
