import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Activity, Filter, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function ActivityPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = () => {
    setLoading(true);
    api.getEventLog()
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchEvents(); }, []);

  const eventTypeColors: Record<string, string> = {
    GIT_COMMIT: 'bg-muted text-muted-foreground',
    PR_CREATED: 'bg-primary/10 text-primary',
    PR_MERGED: 'bg-success/10 text-success',
    CI_STATUS: 'bg-info/10 text-info',
    CHAT_MESSAGE: 'bg-warning/10 text-warning',
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Activity Feed</h1>
          <p className="text-sm text-muted-foreground">All system events and AI actions</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchEvents}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading events...</p>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Activity className="mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No events recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event: any) => (
              <div key={event.id} className="flex items-start gap-4 rounded-lg border border-border bg-card p-4">
                <Badge
                  variant="secondary"
                  className={`shrink-0 text-[10px] ${eventTypeColors[event.event_type] || ''}`}
                >
                  {event.event_type}
                </Badge>
                <div className="flex-1">
                  <p className="text-sm text-foreground">
                    {event.metadata?.message || event.metadata?.description || event.event_type}
                  </p>
                  {event.task_id && (
                    <p className="text-xs text-muted-foreground">Task #{event.task_id}</p>
                  )}
                </div>
                <p className="shrink-0 text-xs text-muted-foreground">
                  {new Date(event.created_at || event.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
