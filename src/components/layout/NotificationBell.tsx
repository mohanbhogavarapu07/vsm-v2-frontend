import { useState } from 'react';
import { Bell, Bot, AlertTriangle, RefreshCw, Info, CheckCheck, PlayCircle, PlusCircle, CheckCircle2 } from 'lucide-react';
import { useNotificationStore, type Notification } from '@/stores/notificationStore';
import { useWorkflowStore, type AIDecision } from '@/stores/workflowStore';
import { AIDecisionResolutionModal } from '@/components/ai/AIDecisionResolutionModal';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const iconMap: Record<Notification['type'] | string, React.ElementType> = {
  ai_decision: Bot,
  blocker: AlertTriangle,
  task_update: RefreshCw,
  system: Info,
  task_added: PlusCircle,
  sprint_start: PlayCircle,
  task_done: CheckCircle2,
  UNLINKED_CONTRIBUTION: AlertTriangle
};

const severityStyles: Record<Notification['severity'], string> = {
  info: 'bg-primary/10 text-primary',
  warning: 'bg-warning/20 text-warning-foreground border border-warning/50',
  critical: 'bg-destructive/20 text-destructive border border-destructive/50 ring-2 ring-destructive/20 shadow-[0_0_10px_hsl(var(--destructive)/0.2)]',
};

export function NotificationBell() {
  const { notifications, unreadCount, isOpen, setOpen, markAsRead, markAllRead } = useNotificationStore();
  const { fetchAIDecisions, fetchTasks, aiDecisions } = useWorkflowStore();
  const navigate = useNavigate();
  const { projectId, teamId } = useParams<{ projectId: string, teamId: string }>();
  
  const [selectedDecision, setSelectedDecision] = useState<AIDecision | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Differentiate alerts from normal feed
  const alerts = notifications.filter(n => n.isBlocker);
  const activeBlockerCount = alerts.length;
  const feed = notifications;

  const navToInsights = () => {
    setOpen(false);
    if (projectId && teamId) {
      navigate(`/projects/${projectId}/teams/${teamId}/insights`);
    }
  };

  const handleBlockerAction = async (notif?: Notification) => {
    // 1. Ensure we have the latest decisions for lookup
    if (teamId) {
      await fetchAIDecisions();
    }

    // 2. Find the relevant blocker decision
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
      setOpen(false); // Close the notification bell popover
      if (notif) markAsRead(notif.id, teamId);
    } else {
      // Fallback if decision object isn't in store yet
      navToInsights();
    }
  };

  return (
    <>
    <Popover open={isOpen} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 hover:bg-accent/80 transition-all rounded-xl focus-visible:ring-1">
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
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0 rounded-2xl shadow-2xl border-border/60 overflow-hidden backdrop-blur-md bg-card/95" align="end" sideOffset={12}>
        <div className="flex items-center justify-between border-b border-border/50 px-5 py-3.5 bg-muted/20">
          <h3 className="text-sm font-bold text-foreground tracking-tight">Project Heartbeat</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors hover:bg-primary/10 rounded-md" onClick={markAllRead}>
              <CheckCheck className="mr-1 h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>
        
        <ScrollArea className="max-h-[380px]">
          {activeBlockerCount > 0 && (
            <div className="p-3 bg-red-50/50 dark:bg-destructive/10 border-b border-destructive/10">
              <div 
                onClick={() => handleBlockerAction()}
                className="flex items-center justify-between p-3 rounded-xl bg-destructive text-destructive-foreground cursor-pointer hover:bg-destructive/90 transition-colors shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-xs font-bold">Action Required: {activeBlockerCount} AI Blockers</span>
                </div>
                <Button size="sm" variant="secondary" className="h-6 text-[10px] px-2 bg-white/20 hover:bg-white/30 text-white font-semibold">Review</Button>
              </div>
            </div>
          )}

          {feed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-10 w-10 rounded-full bg-muted/40 flex items-center justify-center mb-3">
                <Bell className="h-5 w-5 text-muted-foreground/30" />
              </div>
              <p className="text-sm font-medium text-foreground">You're all caught up</p>
              <p className="text-xs text-muted-foreground mt-0.5">No new project updates right now.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40 p-2">
              <AnimatePresence>
                {feed.map((n) => {
                  const Icon = iconMap[n.type] || Info;
                  return (
                    <motion.button
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      key={n.id}
                       onClick={() => {
                        if (n.isBlocker) {
                          handleBlockerAction(n);
                        } else {
                          markAsRead(n.id, teamId);
                        }
                      }}
                      className={cn(
                        'flex w-full items-start gap-3.5 px-3 py-3 text-left transition-all hover:bg-accent/60 rounded-xl my-0.5 relative group overflow-hidden',
                        !n.read && !n.isBlocker && 'bg-primary/5'
                      )}
                    >
                      {!n.read && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-xl" />
                      )}
                      
                      <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm', severityStyles[n.severity] || severityStyles.info)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      
                      <div className="min-w-0 flex-1 flex flex-col justify-center">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn('text-sm font-semibold tracking-tight', n.read ? 'text-muted-foreground/80' : 'text-foreground')}>
                            {n.title}
                          </p>
                        </div>
                        <p className={cn("mt-0.5 text-xs line-clamp-2 leading-relaxed pr-2", n.read ? "text-muted-foreground/70" : "text-muted-foreground/90")}>
                          {n.message}
                        </p>
                        <p className="mt-1.5 text-[10px] font-medium text-muted-foreground/50">
                          {formatTimeAgo(n.createdAt)}
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
    
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
