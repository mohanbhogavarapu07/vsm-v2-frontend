import { useAuthStore } from '@/stores/authStore';
import { 
  Settings, 
  HelpCircle, 
  Users, 
  BookOpen, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  CreditCard
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function HomePage() {
  const { user } = useAuthStore();
  const userMeta = user?.user_metadata as Record<string, any> | undefined;
  const userName = userMeta?.full_name || user?.email?.split('@')[0] || 'User';
  const currentDate = format(new Date(), 'EEEE, MMMM d');

  const apps = [
    { id: 'settings', title: 'Account settings', icon: Settings, color: 'text-blue-500', bg: 'bg-blue-50' },
    { id: 'support', title: 'Atlassian Support', icon: HelpCircle, color: 'text-purple-500', bg: 'bg-purple-50' },
    { id: 'community', title: 'Atlassian Community', icon: Users, color: 'text-orange-500', bg: 'bg-orange-50' },
    { id: 'licensing', title: 'Self-managed licensing', icon: CreditCard, color: 'text-green-500', bg: 'bg-green-50' },
  ];

  return (
    <div className="flex-1 overflow-auto bg-slate-50/50 p-8 pt-6">
      <div className="mx-auto max-w-6xl space-y-8">
        
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-xl bg-[#FFAB00] p-8 text-white shadow-lg">
          <div className="relative z-10 space-y-2">
            <p className="text-sm font-medium opacity-90">{currentDate}</p>
            <h1 className="text-3xl font-bold tracking-tight">Hello, {userName}</h1>
          </div>
          
          {/* Decorative background elements matching the image */}
          <div className="absolute right-0 top-0 h-full w-1/2 overflow-hidden opacity-20">
            <TrendingUp className="absolute -right-8 -top-8 h-64 w-64 rotate-12" strokeWidth={1} />
            <div className="absolute right-20 top-10 h-32 w-32 rounded-full border-4 border-white/30" />
          </div>

          <div className="absolute bottom-4 right-4">
            <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur-md border border-white/20">
              <span className="h-2 w-2 rounded-full bg-orange-400" />
              Play of the day - AI Teammate
              <ExternalLink className="h-3 w-3" />
            </div>
          </div>
        </div>

        {/* Your Apps Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 font-inter">Your apps</h2>
            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900">
              View all apps <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {apps.map((app) => (
              <Card key={app.id} className="group cursor-pointer border-slate-200 transition-all hover:border-slate-300 hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-slate-100 shadow-sm transition-colors group-hover:bg-opacity-80", app.bg)}>
                    <app.icon className={cn("h-6 w-6", app.color)} />
                  </div>
                  <span className="font-medium text-slate-700 tracking-tight">{app.title}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Frequently Visited */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h2 className="text-lg font-semibold text-slate-900 font-inter">Frequently visited</h2>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md">
              <Button variant="secondary" size="sm" className="h-7 text-xs bg-white shadow-sm font-semibold text-blue-600">Your work</Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-500 font-medium">Teams</Button>
            </div>
          </div>
          
          <div className="flex flex-col items-center justify-center rounded-xl bg-slate-100/50 p-12 text-center border-2 border-dashed border-slate-200">
            <div className="mb-4 rounded-full bg-slate-200 p-3">
              <Users className="h-6 w-6 text-slate-500" />
            </div>
            <p className="text-sm font-medium text-slate-600">
              You haven't visited any places yet. Visit and view your team's spaces to start seeing your work.
            </p>
          </div>
        </section>

        {/* What's next */}
        <section className="space-y-4 pb-12">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h2 className="text-lg font-semibold text-slate-900 font-inter">What's next</h2>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md">
              <Button variant="secondary" size="sm" className="h-7 text-xs bg-white shadow-sm font-semibold text-blue-600 px-3">Worked on</Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-500 font-medium px-3">Viewed</Button>
            </div>
          </div>
          
          <div className="flex items-center gap-3 rounded-xl bg-slate-100/50 p-6 border-2 border-dashed border-slate-200">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
              <span className="block h-4 w-4 rounded-full border-2 border-green-500" />
            </div>
            <p className="text-sm font-medium text-slate-600">
              You're all done for now. Check back soon to find out what's next.
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}
