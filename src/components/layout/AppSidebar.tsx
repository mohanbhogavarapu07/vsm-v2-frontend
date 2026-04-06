import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useProjectStore } from '@/stores/projectStore';
import {
  Home,
  Star,
  Clock,
  Bell,
  FolderKanban,
  Users,
  Target,
  Plus,
  Settings,
  HelpCircle,
  MessageSquare,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ExternalLink,
  Zap,
  ChevronDown,
  Hammer
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [isProjectExpanded, setIsProjectExpanded] = useState(false);
  const [lastProjectId, setLastProjectId] = useState<string | null>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { projectId, teamId } = useParams<{ projectId: string, teamId: string }>();
  const { user, signOut } = useAuthStore();
  const { teams, fetchTeams, setCurrentTeamId, currentProject, permissions } = useProjectStore();

  // Sync state with URL but allow manual persistence
  useEffect(() => {
    if (projectId) {
      setLastProjectId(projectId);
      setIsProjectExpanded(true);
      fetchTeams(projectId);
    }
  }, [projectId, fetchTeams]);

  useEffect(() => {
    if (teamId) {
      setCurrentTeamId(teamId);
    }
  }, [teamId, setCurrentTeamId]);

  const isHome = location.pathname === '/home' || location.pathname === '/';
  const isProjects = location.pathname.startsWith('/projects');

  const mainNav = [
    { path: '/home', icon: Home, label: 'Home', active: isHome },
    { path: '#', icon: Star, label: 'For you', active: false },
    { path: '#', icon: Clock, label: 'Recent', active: false },
    { path: '#', icon: Bell, label: 'Notifications', active: false },
  ];

  const userMeta = user?.user_metadata as Record<string, any> | undefined;
  const userName = userMeta?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = userName
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || user?.email?.[0]?.toUpperCase() || '?';

  // Determine which project context to show
  const activeProjectId = projectId || lastProjectId;

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-slate-200 bg-white transition-all duration-300 ease-in-out z-30 overflow-x-hidden',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Sidebar Header / Logo area */}
      <div className="flex h-14 items-center justify-between px-4 shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-600 text-white shadow-sm">
              <Zap className="h-4 w-4 fill-current" />
            </div>
            <span className="text-sm font-bold text-slate-900 tracking-tight">VSM Global</span>
          </div>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 text-slate-500 hover:bg-slate-100"
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
                ? 'bg-blue-50 text-blue-700 shadow-sm' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            )}
          >
            <item.icon className={cn("h-4 w-4 shrink-0", item.active ? "text-blue-600" : "text-slate-500 group-hover:text-slate-700")} />
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}

        <div className="my-4 px-3">
          <Separator className="bg-slate-100" />
        </div>

        {/* Projects Section */}
        <div className="space-y-0.5">
          <button
            onClick={() => {
              if (!isProjects) {
                navigate('/projects');
                setIsProjectExpanded(true);
              } else {
                setIsProjectExpanded(!isProjectExpanded);
              }
            }}
            className={cn(
              'group flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isProjects 
                ? 'bg-blue-50 text-blue-700 shadow-sm' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            )}
          >
            <div className="flex items-center gap-3">
              <FolderKanban className={cn("h-4 w-4 shrink-0", isProjects ? "text-blue-600" : "text-slate-500 group-hover:text-slate-700")} />
              {!collapsed && <span>Projects</span>}
            </div>
            {!collapsed && isProjectExpanded && activeProjectId && (
              <ChevronDown className="h-3 w-3 text-blue-500 transition-transform duration-200" />
            )}
            {!collapsed && !isProjectExpanded && activeProjectId && (
              <ChevronRight className="h-3 w-3 text-slate-400" />
            )}
          </button>

          {/* Setup / Config (Shown if section is expanded and project context exists) */}
          {!collapsed && isProjectExpanded && activeProjectId && permissions.includes('MANAGE_TEAM') && (
            <button
              onClick={() => navigate(`/projects/${activeProjectId}/setup`)}
              className={cn(
                'group ml-9 flex w-full items-center gap-2 rounded-md py-1.5 pl-3 transition-colors text-xs font-medium',
                location.pathname.includes('/setup')
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              )}
            >
              {currentProject?.setupComplete ? (
                <>
                  <Settings className="h-3.5 w-3.5" />
                  <span>Project Config</span>
                </>
              ) : (
                <>
                  <Hammer className="h-3.5 w-3.5 text-blue-600" />
                  <span className="font-semibold text-blue-700">Complete Setup</span>
                </>
              )}
            </button>
          )}

          {/* Teams List (Shown if section is expanded and project context exists) */}
          {!collapsed && isProjectExpanded && activeProjectId && (
            <div className="ml-9 mt-2 space-y-0.5 border-l border-slate-200">
              <div className="mb-2 pl-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Available Teams</span>
              </div>
              {teams.length > 0 ? (
                teams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => navigate(`/projects/${activeProjectId}/teams/${team.id}/board`)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-r-md py-1.5 pl-3 pr-2 text-xs transition-colors border-l-2',
                      teamId === team.id 
                        ? 'bg-blue-50/80 text-blue-700 border-blue-600 font-semibold' 
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 border-transparent hover:border-slate-300'
                    )}
                  >
                    <span className="truncate">{team.name}</span>
                  </button>
                ))
              ) : (
                <div className="py-2 pl-3">
                  <span className="text-[10px] italic text-slate-400">No teams found</span>
                </div>
              )}
            </div>
          )}
        </div>

        {!collapsed && (
          <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors mt-2">
            <LayoutGrid className="h-4 w-4" />
            <span>View all apps</span>
          </button>
        )}
      </nav>

      {/* Sidebar Footer */}
      <div className="mt-auto space-y-1 p-2 shrink-0 border-t border-slate-100 bg-white">
        {!collapsed && (
          <>
            <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors">
              <Settings className="h-4 w-4" />
              <span>Customize sidebar</span>
            </button>
            <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors">
              <MessageSquare className="h-4 w-4" />
              <span>Give feedback</span>
            </button>
          </>
        )}
        <div className="px-3 py-2">
          <Separator className="bg-slate-100" />
        </div>
        
        {/* Simplified User UI for Sidebar matching TopNav */}
        {!collapsed && (
          <div className="mb-2 flex items-center gap-3 rounded-md px-3 py-2">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-blue-700 text-[11px] font-bold text-white uppercase tracking-wider">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-1 flex-col truncate">
              <span className="truncate text-sm font-medium text-slate-900">{userName}</span>
              <span className="truncate text-[11px] text-slate-500">{user?.email}</span>
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className={cn('w-full justify-start text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors', collapsed && 'justify-center')}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="ml-2">Sign Out</span>}
        </Button>
      </div>
    </aside>
  );
}
