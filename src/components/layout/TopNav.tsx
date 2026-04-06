import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  HelpCircle,
  Settings,
  Search,
  Command,
  User,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export function TopNav() {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [accountOpen, setAccountOpen] = useState(false);

  const userName = user?.name || user?.email?.split('@')[0] || 'User';
  const initials = userName
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || user?.email?.[0]?.toUpperCase() || '?';

  return (
    <header className="flex h-14 w-full items-center justify-between border-b border-border bg-card px-6">
      <div className="flex w-full max-w-md items-center gap-2">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            className="h-9 w-full rounded-md border-border bg-muted pl-9 pr-12 text-sm focus:bg-card focus:ring-1 focus:ring-primary"
          />
          <div className="absolute right-2.5 top-2 h-5 rounded border border-border bg-card px-1.5 text-[10px] font-medium text-muted-foreground flex items-center gap-0.5">
            <Command className="h-2.5 w-2.5" /> K
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-accent">
              <Bell className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Notifications</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-accent">
              <HelpCircle className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Help</TooltipContent>
        </Tooltip>



        {/* ── Profile Avatar with Popover ───────────────────────────── */}
        <div className="ml-2 pl-2 border-l border-border">
          <Popover open={accountOpen} onOpenChange={setAccountOpen}>
            <PopoverTrigger asChild>
              <button className="focus-visible:outline-none">
                <Avatar className="h-8 w-8 cursor-pointer ring-offset-2 ring-primary hover:ring-2 transition-all">
                  <AvatarFallback className="bg-primary text-[11px] font-bold text-primary-foreground shadow-inner uppercase tracking-wider">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </PopoverTrigger>

            <PopoverContent
              side="bottom"
              align="end"
              sideOffset={8}
              className="w-72 p-0 rounded-xl shadow-xl border border-border"
            >
              {/* User header */}
              <div className="flex items-center gap-3.5 px-5 py-4">
                <Avatar className="h-12 w-12 shrink-0 ring-2 ring-primary/30">
                  <AvatarFallback className="bg-primary text-base font-bold text-primary-foreground uppercase">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {userName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Menu items */}
              <div className="py-1.5">
                <button
                  onClick={() => {
                    setAccountOpen(false);
                    navigate('/settings?tab=profile');
                  }}
                  className="flex w-full items-center gap-3 px-5 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  Profile
                </button>
                <button
                  onClick={() => {
                    setAccountOpen(false);
                    navigate('/settings?tab=account');
                  }}
                  className="flex w-full items-center gap-3 px-5 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                >
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  Account settings
                </button>
              </div>

              <Separator />

              <div className="py-1.5">
                <button
                  onClick={() => {
                    setAccountOpen(false);
                    signOut();
                  }}
                  className="flex w-full items-center gap-3 px-5 py-2.5 text-sm text-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <LogOut className="h-4 w-4 text-muted-foreground" />
                  Log out
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  );
}
