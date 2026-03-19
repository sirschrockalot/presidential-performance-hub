import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Handshake, BarChart3, Banknote, Trophy,
  FileText, Users, Settings, ChevronLeft, Building2
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Deals', path: '/deals', icon: Handshake },
  { label: 'KPIs', path: '/kpis', icon: BarChart3 },
  { label: 'Draws', path: '/draws', icon: Banknote },
  { label: 'Points', path: '/points', icon: Trophy },
  { label: 'Reports', path: '/reports', icon: FileText },
  { label: 'Team', path: '/team', icon: Users },
  { label: 'Settings', path: '/settings', icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={cn(
      'flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-200 h-screen sticky top-0',
      collapsed ? 'w-[60px]' : 'w-[220px]'
    )}>
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 h-14 border-b border-sidebar-border',
        collapsed ? 'justify-center px-2' : 'px-4'
      )}>
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary shrink-0">
          <Building2 className="h-4 w-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-[13px] font-bold text-sidebar-primary truncate leading-tight">Presidential Digs</span>
            <span className="text-[10px] text-sidebar-muted truncate leading-tight">Performance Hub</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto scrollbar-thin">
        {navItems.map(item => {
          const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-all duration-150',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-sidebar-border">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full py-2 rounded-md text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft className={cn('h-4 w-4 transition-transform duration-200', collapsed && 'rotate-180')} />
        </button>
      </div>
    </aside>
  );
}
