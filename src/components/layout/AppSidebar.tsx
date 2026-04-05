import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useProjectStore } from '@/stores/projectStore';
import {
  KanbanSquare,
  Activity,
  Bot,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Users,
  FolderKanban,
  ArrowLeft,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId, teamId } = useParams<{ projectId: string; teamId?: string }>();
  const { user, signOut } = useAuthStore();
  const { currentProject, permissions, teams, fetchTeams, setCurrentTeamId } = useProjectStore();

  useEffect(() => {
    if (projectId) {
      fetchTeams(projectId);
    }
  }, [projectId, fetchTeams]);

  useEffect(() => {
    if (teamId) {
      setCurrentTeamId(teamId);
    }
  }, [teamId, setCurrentTeamId]);

  const hasPermission = (perm: string) => permissions.includes(perm);

  const userMeta = user?.user_metadata as Record<string, any> | undefined;
  const initials = userMeta?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || user?.email?.[0]?.toUpperCase() || '?';

  let projectNav: any[] = [];
  if (projectId && permissions.includes('MANAGE_TEAM')) {
    if (!currentProject?.setupComplete) {
      projectNav.push({ 
        path: `/projects/${projectId}/setup`, 
        icon: Settings, 
        label: 'Complete Setup',
        className: 'text-warning font-semibold bg-warning/5'
      });
    } else {
      projectNav.push({ path: `/projects/${projectId}/setup`, icon: Settings, label: 'Project Config' });
    }
  }

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-sidebar-border bg-card shadow-soft z-20 transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-64'
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

      {/* Back to Projects & Team List */}
      {projectId && (
        <div className="border-b border-sidebar-border">
          <button
            onClick={() => navigate('/projects')}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
            {!collapsed && (
              <span className="truncate">
                {currentProject?.name || 'All Projects'}
              </span>
            )}
          </button>
          
          {!collapsed && teams.length > 0 && (
            <div className="px-4 pb-3">
              <p className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Teams</p>
              <div className="space-y-0.5">
                {teams.map(team => (
                  <button
                    key={team.id}
                    onClick={() => navigate(`/projects/${projectId}/teams/${team.id}/board`)}
                    className={cn(
                      'w-full text-left truncate text-xs px-2 py-1.5 rounded-md transition-colors',
                      teamId === team.id ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    {team.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-2">
        {!projectId && (
          <button
            onClick={() => navigate('/projects')}
            className={cn(
              'group relative flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200',
              location.pathname === '/projects'
                ? 'bg-primary/10 text-primary shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            {location.pathname === '/projects' && (
              <div className="absolute left-0 top-1/2 h-2/3 w-1 -translate-y-1/2 rounded-r-md bg-primary" />
            )}
            <FolderKanban className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
            {!collapsed && <span>Projects</span>}
          </button>
        )}
        {projectNav.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'group relative flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary/10 text-primary shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                item.className
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 h-2/3 w-1 -translate-y-1/2 rounded-r-md bg-primary" />
              )}
              <item.icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
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
                {userMeta?.full_name || 'User'}
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
