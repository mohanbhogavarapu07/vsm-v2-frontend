import { Bell, Bot, AlertTriangle, RefreshCw, Info, CheckCheck } from 'lucide-react';
import { useNotificationStore, type Notification } from '@/stores/notificationStore';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const iconMap: Record<Notification['type'], React.ElementType> = {
  ai_decision: Bot,
  blocker: AlertTriangle,
  task_update: RefreshCw,
  system: Info,
};

const severityStyles: Record<Notification['severity'], string> = {
  info: 'bg-info/10 text-info',
  warning: 'bg-warning/10 text-warning',
  critical: 'bg-destructive/10 text-destructive',
};

export function NotificationBell() {
  const { notifications, unreadCount, isOpen, setOpen, markAsRead, markAllRead } = useNotificationStore();

  return (
    <Popover open={isOpen} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground animate-in zoom-in-50">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end" sideOffset={8}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={markAllRead}>
              <CheckCheck className="mr-1 h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Bell className="mb-2 h-8 w-8 text-muted-foreground/20" />
              <p className="text-xs text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => {
                const Icon = iconMap[n.type] || Info;
                return (
                  <button
                    key={n.id}
                    onClick={() => markAsRead(n.id)}
                    className={cn(
                      'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50',
                      !n.read && 'bg-primary/[0.03]'
                    )}
                  >
                    <div className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full', severityStyles[n.severity])}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={cn('text-xs font-medium', n.read ? 'text-muted-foreground' : 'text-foreground')}>
                          {n.title}
                        </p>
                        {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">{n.message}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground/60">
                        {formatTimeAgo(n.createdAt)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
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
