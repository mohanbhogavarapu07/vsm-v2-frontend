import { useState } from 'react';
import { Bell, Bot, AlertTriangle, RefreshCw, Info, CheckCheck, PlayCircle, PlusCircle, CheckCircle2, X, Filter } from 'lucide-react';
import { useNotificationStore, type Notification } from '@/stores/notificationStore';
import { useWorkflowStore, type AIDecision } from '@/stores/workflowStore';
import { AIDecisionResolutionModal } from '@/components/ai/AIDecisionResolutionModal';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ElementType> = {
  ai_decision: Bot,
  blocker: AlertTriangle,
  task_update: RefreshCw,
  system: Info,
  task_added: PlusCircle,
  sprint_start: PlayCircle,
  task_done: CheckCircle2,
  UNLINKED_CONTRIBUTION: AlertTriangle
};

const severityStyles: Record<string, string> = {
  info: 'bg-primary/10 text-primary',
  warning: 'bg-warning/20 text-warning-foreground border border-warning/50',
  critical: 'bg-destructive/15 text-destructive border border-destructive/40',
};

type FilterType = 'all' | 'blockers' | 'ai' | 'updates';

export function NotificationBell() {
  const { notifications, unreadCount, isOpen, setOpen, markAsRead, markAllRead } = useNotificationStore();
  const { fetchAIDecisions, fetchTasks, aiDecisions } = useWorkflowStore();
  const navigate = useNavigate();
  const { projectId, teamId } = useParams<{ projectId: string, teamId: string }>();
  
  const [selectedDecision, setSelectedDecision] = useState<AIDecision | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  const alerts = notifications.filter(n => n.isBlocker);
  const activeBlockerCount = alerts.length;

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'blockers') return n.isBlocker;
    if (filter === 'ai') return n.type === 'ai_decision';
    if (filter === 'updates') return n.type === 'task_update' || n.type === 'task_done' || n.type === 'task_added';
    return true;
  });

  const navToInsights = () => {
    setOpen(false);
    if (projectId && teamId) {
      navigate(`/projects/${projectId}/teams/${teamId}/insights`);
    }
  };

  const handleBlockerAction = async (notif?: Notification) => {
    if (teamId) await fetchAIDecisions();

    let target: AIDecision | undefined;
    const blockers = ['BLOCKED', 'PENDING_APPROVAL', 'PENDING_CONFIRMATION'];
    
    if (notif?.taskId) {
      target = aiDecisions.find(d => String(d.taskId) === String(notif.taskId) && blockers.includes(d.status));
    } else {
      target = aiDecisions.find(d => blockers.includes(d.status));
    }

    if (target) {
      setSelectedDecision(target);
      setIsModalOpen(true);
      setOpen(false);
      if (notif) markAsRead(notif.id, teamId);
    } else {
      navToInsights();
    }
  };

  const filterTabs: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'blockers', label: 'Blockers' },
    { key: 'ai', label: 'AI' },
    { key: 'updates', label: 'Updates' },
  ];

  return (
    <>
    {/* Full-width notification panel that slides in from right */}
    <Button 
      variant="ghost" 
      size="icon" 
      className="relative h-9 w-9 hover:bg-accent/80 transition-all rounded-xl focus-visible:ring-1"
      onClick={() => setOpen(!isOpen)}
    >
      <Bell className="h-[18px] w-[18px] text-muted-foreground transition-transform hover:rotate-12 hover:scale-110" />
      {unreadCount > 0 && (
        <motion.span 
          initial={{ scale: 0 }} 
          animate={{ scale: 1 }}
          className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground shadow-sm ring-2 ring-background border-none"
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </motion.span>
      )}
    </Button>

    {/* Slide-over notification panel */}
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          
          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-[420px] bg-card border-l border-border shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
              <div>
                <h2 className="text-base font-bold text-foreground">Notifications</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {unreadCount} unread · {notifications.length} total
                </p>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-2.5 text-xs font-medium text-muted-foreground hover:text-primary"
                    onClick={markAllRead}
                  >
                    <CheckCheck className="mr-1 h-3 w-3" />
                    Mark all read
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-1 px-4 py-2.5 border-b border-border/50 bg-muted/20">
              {filterTabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                    filter === tab.key
                      ? 'bg-primary/10 text-primary shadow-sm'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  )}
                >
                  {tab.label}
                  {tab.key === 'blockers' && activeBlockerCount > 0 && (
                    <span className="ml-1 text-[10px] font-bold text-destructive">{activeBlockerCount}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Blockers banner */}
            {activeBlockerCount > 0 && filter !== 'updates' && filter !== 'ai' && (
              <div className="px-4 py-3 bg-destructive/5 border-b border-destructive/10">
                <div 
                  onClick={() => handleBlockerAction()}
                  className="flex items-center justify-between p-3 rounded-xl bg-destructive text-destructive-foreground cursor-pointer hover:bg-destructive/90 transition-colors shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-xs font-bold">{activeBlockerCount} AI Blocker{activeBlockerCount !== 1 ? 's' : ''} Need Action</span>
                  </div>
                  <Button size="sm" variant="secondary" className="h-6 text-[10px] px-2.5 bg-white/20 hover:bg-white/30 text-white font-semibold">
                    Review
                  </Button>
                </div>
              </div>
            )}

            {/* Notification list */}
            <ScrollArea className="flex-1">
              {filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="h-12 w-12 rounded-full bg-muted/40 flex items-center justify-center mb-4">
                    <Bell className="h-6 w-6 text-muted-foreground/30" />
                  </div>
                  <p className="text-sm font-medium text-foreground">You're all caught up</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {filter !== 'all' ? 'No notifications match this filter.' : 'No new project updates right now.'}
                  </p>
                </div>
              ) : (
                <div className="p-3 space-y-1">
                  {filteredNotifications.map((n) => {
                    const Icon = iconMap[n.type] || Info;
                    return (
                      <motion.button
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={n.id}
                        onClick={() => {
                          if (n.isBlocker) {
                            handleBlockerAction(n);
                          } else {
                            markAsRead(n.id, teamId);
                          }
                        }}
                        className={cn(
                          'flex w-full items-start gap-3.5 px-4 py-3.5 text-left transition-all hover:bg-accent/50 rounded-xl relative group',
                          !n.read && !n.isBlocker && 'bg-primary/[0.03]'
                        )}
                      >
                        {!n.read && (
                          <div className="absolute left-1 top-3 bottom-3 w-[3px] bg-primary rounded-full" />
                        )}
                        
                        <div className={cn(
                          'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm',
                          severityStyles[n.severity] || severityStyles.info
                        )}>
                          <Icon className="h-4 w-4" />
                        </div>
                        
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className={cn(
                              'text-sm font-semibold tracking-tight leading-snug',
                              n.read ? 'text-muted-foreground/70' : 'text-foreground'
                            )}>
                              {n.title}
                            </p>
                            <p className="text-[10px] font-medium text-muted-foreground/50 shrink-0 mt-0.5">
                              {formatTimeAgo(n.createdAt)}
                            </p>
                          </div>
                          <p className={cn(
                            "mt-1 text-xs line-clamp-2 leading-relaxed",
                            n.read ? "text-muted-foreground/60" : "text-muted-foreground/80"
                          )}>
                            {n.message}
                          </p>
                          
                          {n.isBlocker && (
                            <Badge variant="outline" className="mt-2 text-[9px] font-bold uppercase tracking-wider border-destructive/30 text-destructive bg-destructive/5">
                              Action Required
                            </Badge>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-border bg-muted/10">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-xs text-muted-foreground hover:text-primary"
                onClick={navToInsights}
              >
                View AI Insights →
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    
    <AIDecisionResolutionModal 
      isOpen={isModalOpen}
      decision={selectedDecision}
      onClose={() => setIsModalOpen(false)}
      onSuccess={() => {
        fetchAIDecisions();
        fetchTasks();
        if (teamId) useNotificationStore.getState().fetchNotifications(teamId);
      }}
    />
    </>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
