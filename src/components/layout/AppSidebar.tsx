import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useProjectStore } from '@/stores/projectStore';
import { SidebarTeamsSkeleton } from '@/components/ui/PageSkeleton';
import {
  Home,
  Star,
  Clock,
  Bell,
  FolderKanban,
  Settings,
  MessageSquare,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Zap,
  ChevronDown,
  Hammer,
  Bot
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [isProjectExpanded, setIsProjectExpanded] = useState(false);
  const [lastProjectId, setLastProjectId] = useState<string | null>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { projectId, teamId } = useParams<{ projectId: string, teamId: string }>();
  const { teams, fetchTeams, setCurrentTeamId, currentProject, permissions, teamsLoading } = useProjectStore();

  // Sync state with URL but allow manual persistence
  useEffect(() => {
    if (projectId) {
      setLastProjectId(projectId);
      setIsProjectExpanded(true);
      fetchTeams(projectId);
      // Fetch project-level permissions to ensure 'Config' button is visible
      useProjectStore.getState().fetchPermissions(undefined, projectId);
    }
  }, [projectId, fetchTeams]);

  useEffect(() => {
    if (teamId) {
      setCurrentTeamId(teamId);
    }
  }, [teamId, setCurrentTeamId]);

  const isHome = location.pathname === '/home' || location.pathname === '/';
  const isProjects = location.pathname.startsWith('/projects');
  const isProjectsDashboard = location.pathname === '/projects' || location.pathname === '/projects/';

  const mainNav = [
    { path: '/home', icon: Home, label: 'Home', active: isHome },
    { path: '#', icon: Star, label: 'For you', active: false },
    { path: '#', icon: Clock, label: 'Recent', active: false },
    { path: '#', icon: Bell, label: 'Notifications', active: false },
  ];

  // Determine which project context to show
  const activeProjectId = projectId || lastProjectId;
  const hasActiveProjectContext = activeProjectId && isProjects && !isProjectsDashboard;

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-border bg-card transition-[width] duration-300 ease-in-out z-30 overflow-x-hidden',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Sidebar Header / Logo area */}
      <div className="flex h-14 items-center justify-between px-4 shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground shadow-sm">
              <Zap className="h-4 w-4 fill-current" />
            </div>
            <span className="text-sm font-bold text-foreground tracking-tight">VSM Global</span>
          </div>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 text-muted-foreground hover:bg-accent"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-0.5 px-2 py-4 overflow-y-auto scrollbar-hide overflow-x-hidden">
        {mainNav.map((item) => (
          <button
            key={item.label}
            onClick={() => item.path !== '#' && navigate(item.path)}
            className={cn(
              'group flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              item.active 
                ? 'bg-primary/10 text-primary shadow-sm' 
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <item.icon className={cn("h-4 w-4 shrink-0", item.active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}

        <div className="my-4 px-3">
          <Separator />
        </div>

        {/* Projects Section */}
        <div className="space-y-0.5">
          <button
            onClick={() => {
              if (!isProjects) {
                navigate('/projects');
                setIsProjectExpanded(false);
              } else if (hasActiveProjectContext) {
                setIsProjectExpanded(!isProjectExpanded);
              }
            }}
            className={cn(
              'group flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isProjects 
                ? 'bg-primary/10 text-primary shadow-sm' 
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <div className="flex items-center gap-3 truncate pr-2">
              <FolderKanban className={cn("h-4 w-4 shrink-0", isProjects ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
              {!collapsed && (
                <span className="truncate">
                  {isProjectExpanded && hasActiveProjectContext && currentProject?.name 
                    ? currentProject.name 
                    : 'Projects'}
                </span>
              )}
            </div>
            {!collapsed && isProjectExpanded && hasActiveProjectContext && (
              <ChevronDown className="h-3 w-3 shrink-0 text-primary transition-transform duration-200" />
            )}
            {!collapsed && !isProjectExpanded && hasActiveProjectContext && (
              <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
            )}
          </button>

          {/* Setup / Config (Shown if section is expanded and project context exists) */}
          {!collapsed && isProjectExpanded && hasActiveProjectContext && permissions.includes('MANAGE_TEAM') && (
            <button
              onClick={() => navigate(`/projects/${activeProjectId}/setup`)}
              className={cn(
                'group ml-9 flex w-full items-center gap-2 rounded-md py-1.5 pl-3 transition-colors text-xs font-medium',
                location.pathname.includes('/setup')
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              {currentProject?.setupComplete ? (
                <>
                  <Settings className="h-3.5 w-3.5" />
                  <span>Project Config</span>
                </>
              ) : (
                <>
                  <Hammer className="h-3.5 w-3.5 text-primary" />
                  <span className="font-semibold text-primary">Complete Setup</span>
                </>
              )}
            </button>
          )}

          {!collapsed && isProjectExpanded && hasActiveProjectContext && (
            teamsLoading ? (
              <SidebarTeamsSkeleton />
            ) : (
              <div className="ml-9 mt-2 space-y-0.5 border-l border-border hover:border-border/80 transition-colors">
                <div className="mb-2 pl-3">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Available Teams</span>
                </div>
                {teams.filter(t => t.name !== 'Initial Team').length > 0 ? (
                  teams
                    .filter((t) => t.name !== 'Initial Team')
                    .map((team) => (
                    <button
                      key={team.id}
                      onClick={() => navigate(`/projects/${activeProjectId}/teams/${team.id}/board`)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-r-md py-1.5 pl-3 pr-2 text-xs transition-colors border-l-2',
                        teamId === team.id 
                          ? 'bg-primary/10 text-primary border-primary font-semibold' 
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground border-transparent hover:border-muted-foreground/30'
                      )}
                    >
                      <span className="truncate">{team.name}</span>
                    </button>
                  ))
                ) : (
                  <div className="py-2 pl-3">
                    <span className="text-[10px] italic text-muted-foreground">No teams found</span>
                  </div>
                )}
              </div>
            )
          )}
        </div>

        {!collapsed && isProjectExpanded && hasActiveProjectContext && (
          <button 
            onClick={() => {
              setIsProjectExpanded(false);
              navigate('/projects');
            }}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors mt-2"
          >
            <LayoutGrid className="h-4 w-4 shrink-0" />
            <span className="truncate">View all projects</span>
          </button>
        )}
      </nav>

      {/* Sidebar Footer */}
      <div className="mt-auto space-y-1 p-2 shrink-0 border-t border-border bg-card">
        {!collapsed && (
          <>
            <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors">
              <Settings className="h-4 w-4" />
              <span>Customize sidebar</span>
            </button>
            <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors">
              <MessageSquare className="h-4 w-4" />
              <span>Give feedback</span>
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
