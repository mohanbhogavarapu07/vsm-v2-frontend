import { 
  Bell, 
  HelpCircle, 
  Settings, 
  Search,
  Command
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';

export function TopNav() {
  const { user } = useAuthStore();
  const userMeta = user?.user_metadata as Record<string, any> | undefined;
  const userName = userMeta?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = userName
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || user?.email?.[0]?.toUpperCase() || '?';

  return (
    <header className="flex h-14 w-full items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex w-full max-w-md items-center gap-2">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            type="search"
            placeholder="Search..."
            className="h-9 w-full rounded-md border-slate-200 bg-slate-50 pl-9 pr-12 text-sm focus:bg-white focus:ring-1 focus:ring-blue-500"
          />
          <div className="absolute right-2.5 top-2 h-5 rounded border border-slate-200 bg-white px-1.5 text-[10px] font-medium text-slate-500 flex items-center gap-0.5">
            <Command className="h-2.5 w-2.5" /> K
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:text-slate-900 hover:bg-slate-50">
              <Bell className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Notifications</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:text-slate-900 hover:bg-slate-50">
              <HelpCircle className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Help</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:text-slate-900 hover:bg-slate-50">
              <Settings className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Settings</TooltipContent>
        </Tooltip>

        <div className="ml-2 pl-2 border-l border-slate-200">
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className="h-8 w-8 cursor-pointer ring-offset-2 ring-blue-500 hover:ring-2">
                <AvatarFallback className="bg-blue-700 text-[11px] font-bold text-white shadow-inner uppercase tracking-wider">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="end" className="bg-slate-900 border-none px-3 py-1.5 shadow-xl text-white">
              <p className="text-[11px] font-medium leading-none tracking-tight">{user?.email}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </header>
  );
}
