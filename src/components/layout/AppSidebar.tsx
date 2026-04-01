import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import {
  LayoutDashboard,
  KanbanSquare,
  Activity,
  Bot,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const navItems = [
  { path: '/', icon: KanbanSquare, label: 'Board' },
  { path: '/activity', icon: Activity, label: 'AI Activity' },
  { path: '/decisions', icon: Bot, label: 'AI Decisions' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();

  const initials = user?.user_metadata?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || user?.email?.[0]?.toUpperCase() || '?';

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-sidebar-border bg-card transition-all duration-200',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Header */}
      <div className="flex h-14 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
          <Bot className="h-4 w-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="truncate text-sm font-semibold text-foreground">AI Workflow</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <Separator />

      {/* User */}
      <div className="p-2">
        <div className="flex items-center gap-3 rounded-md px-3 py-2">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-primary/10 text-xs text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 truncate">
              <p className="truncate text-sm font-medium text-foreground">
                {user?.user_metadata?.full_name || 'User'}
              </p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className={cn('w-full justify-start text-muted-foreground', collapsed && 'justify-center')}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="ml-2">Sign Out</span>}
        </Button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex h-10 items-center justify-center border-t border-sidebar-border text-muted-foreground hover:text-foreground"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  );
}
