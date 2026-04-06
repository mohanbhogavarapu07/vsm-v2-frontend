import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useProjectStore } from '@/stores/projectStore';
import { useThemeStore, type Theme } from '@/stores/themeStore';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User, Settings, Users, Workflow, Shield, FolderKanban, ArrowRight,
  Sun, Moon, Monitor, Camera, Briefcase, Building2, Phone, FileText,
  Github, ExternalLink, Calendar, ClipboardList, Activity, Loader2,
  Smartphone, Laptop, Globe, LogOut, CheckCircle2, AlertCircle,
  Paintbrush, Check,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Banner Gradient Presets ──────────────────────────────────────────────────
const BANNER_PRESETS = [
  { id: 'indigo',  label: 'Indigo',     value: 'bg-gradient-to-br from-primary/80 via-primary/50 to-primary/30' },
  { id: 'ocean',   label: 'Ocean',      value: 'bg-gradient-to-br from-blue-600/80 via-cyan-500/50 to-teal-400/30' },
  { id: 'sunset',  label: 'Sunset',     value: 'bg-gradient-to-br from-orange-500/80 via-rose-500/50 to-pink-500/30' },
  { id: 'forest',  label: 'Forest',     value: 'bg-gradient-to-br from-emerald-600/80 via-green-500/50 to-lime-400/30' },
  { id: 'purple',  label: 'Violet',     value: 'bg-gradient-to-br from-violet-600/80 via-purple-500/50 to-fuchsia-400/30' },
  { id: 'slate',   label: 'Slate',      value: 'bg-gradient-to-br from-slate-700/80 via-slate-500/50 to-slate-400/30' },
  { id: 'rose',    label: 'Rose',       value: 'bg-gradient-to-br from-rose-600/80 via-pink-500/50 to-red-400/30' },
  { id: 'amber',   label: 'Amber',      value: 'bg-gradient-to-br from-amber-500/80 via-yellow-500/50 to-orange-400/30' },
] as const;

const DEFAULT_BANNER = BANNER_PRESETS[0].value;

// ─── Helper: Google SVG icon ──────────────────────────────────────────────────
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

// ─── Helper: format relative time ─────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ─── Helper: Device icon from user agent ──────────────────────────────────────
function getDeviceInfo(userAgent: string) {
  const ua = userAgent.toLowerCase();
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return { icon: Smartphone, label: 'Mobile Device' };
  }
  if (ua.includes('tablet') || ua.includes('ipad')) {
    return { icon: Smartphone, label: 'Tablet' };
  }
  return { icon: Laptop, label: 'Desktop' };
}

function getBrowserName(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('edg')) return 'Edge';
  if (ua.includes('chrome')) return 'Chrome';
  if (ua.includes('safari')) return 'Safari';
  if (ua.includes('opera') || ua.includes('opr')) return 'Opera';
  return 'Browser';
}

function getOSName(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes('windows')) return 'Windows';
  if (ua.includes('mac')) return 'macOS';
  if (ua.includes('linux')) return 'Linux';
  if (ua.includes('android')) return 'Android';
  if (ua.includes('iphone') || ua.includes('ipad')) return 'iOS';
  return 'Unknown OS';
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────
function ProfileTab({ user, projects }: { user: any; projects: any[] }) {
  const [saving, setSaving] = useState(false);
  const [bannerPickerOpen, setBannerPickerOpen] = useState(false);
  const [profile, setProfile] = useState({
    fullName: user?.name || '',
    jobTitle: '',
    department: '',
    phone: '',
    bio: '',
    bannerGradient: DEFAULT_BANNER,
  });

  const [loading, setLoading] = useState(true);

  // Load profile from backend
  useEffect(() => {
    async function loadProfile() {
      if (!user?.email) return;
      try {
        setLoading(true);
        const data = await api.getUserProfile(user.email);
        setProfile((prev) => ({
          ...prev,
          fullName: data.name || user?.name || '',
          jobTitle: data.jobTitle || '',
          department: data.department || '',
          phone: data.phone || '',
          bio: data.bio || '',
          bannerGradient: data.bannerGradient || DEFAULT_BANNER,
        }));
      } catch (err) {
        console.error('Failed to load profile from backend:', err);
        // Fallback to local storage if API is down
        const stored = localStorage.getItem('vsm_profile');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setProfile((prev) => ({ ...prev, ...parsed, fullName: user?.name || parsed.fullName || '' }));
          } catch { /* ignore */ }
        }
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [user?.email, user?.name]);

  const handleSave = async () => {
    if (!user?.email) return;
    setSaving(true);
    try {
      // Update Supabase user_metadata for the full name
      const { error } = await supabase.auth.updateUser({
        data: { full_name: profile.fullName },
      });
      if (error) throw error;

      // Update extended profile on the backend
      await api.updateUserProfile(user.email, {
        name: profile.fullName,
        jobTitle: profile.jobTitle,
        department: profile.department,
        phone: profile.phone,
        bio: profile.bio,
        bannerGradient: profile.bannerGradient,
      });

      // Persist fallback locally
      localStorage.setItem('vsm_profile', JSON.stringify(profile));
      toast.success('Profile updated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const fullName = profile.fullName || user?.email?.split('@')[0] || 'User';
  const initials = fullName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  const createdAt = user?.id
    ? new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
      {/* ── Profile Header Card ────────────────────────────────────────── */}
      <Card className="overflow-hidden">
        {/* gradient banner — editable */}
        <div className={cn('h-28 relative group/banner', profile.bannerGradient)}>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZG90cyIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48Y2lyY2xlIGN4PSIxMCIgY3k9IjEwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSJ1cmwoI2RvdHMpIi8+PC9zdmc+')] opacity-60" />

          {/* Banner edit button */}
          <Popover open={bannerPickerOpen} onOpenChange={setBannerPickerOpen}>
            <PopoverTrigger asChild>
              <button
                className="absolute top-3 right-3 flex items-center gap-1.5 rounded-lg bg-black/30 backdrop-blur-sm px-3 py-1.5 text-[11px] font-medium text-white opacity-0 group-hover/banner:opacity-100 transition-opacity hover:bg-black/50 cursor-pointer"
              >
                <Paintbrush className="h-3.5 w-3.5" />
                Edit banner
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={4} className="w-72 p-3">
              <p className="text-xs font-semibold text-foreground mb-2">Choose banner style</p>
              <div className="grid grid-cols-4 gap-2">
                {BANNER_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setProfile((p) => ({ ...p, bannerGradient: preset.value }));
                      setBannerPickerOpen(false);
                    }}
                    className={cn(
                      'relative h-10 rounded-lg transition-all duration-150',
                      preset.value,
                      profile.bannerGradient === preset.value
                        ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-105'
                        : 'hover:scale-105 hover:ring-1 hover:ring-border'
                    )}
                    title={preset.label}
                  >
                    {profile.bannerGradient === preset.value && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Check className="h-4 w-4 text-white drop-shadow-md" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <CardContent className="relative px-6 pb-6">
          <div className="flex flex-col sm:flex-row items-start gap-4 -mt-12">
            <div className="relative group">
              <Avatar className="h-24 w-24 ring-4 ring-card shadow-lg">
                <AvatarFallback className="bg-orange-500 text-2xl font-bold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="pt-1 sm:pt-14 flex-1 min-w-0">
              <h2 className="text-xl font-bold text-foreground truncate">{fullName}</h2>
              <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
              {profile.jobTitle && (
                <p className="text-xs text-muted-foreground mt-0.5">{profile.jobTitle}{profile.department ? ` · ${profile.department}` : ''}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Personal Information ───────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Personal Information
          </CardTitle>
          <CardDescription>Manage your personal details visible to your team</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={profile.fullName}
                onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))}
                placeholder="Enter your full name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user?.email || ''} readOnly className="bg-muted cursor-not-allowed" />
              <p className="text-[11px] text-muted-foreground">Managed by your identity provider</p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="jobTitle" className="flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                Job Title
              </Label>
              <Input
                id="jobTitle"
                value={profile.jobTitle}
                onChange={(e) => setProfile((p) => ({ ...p, jobTitle: e.target.value }))}
                placeholder="e.g. Scrum Master"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="department" className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                Department
              </Label>
              <Input
                id="department"
                value={profile.department}
                onChange={(e) => setProfile((p) => ({ ...p, department: e.target.value }))}
                placeholder="e.g. Engineering"
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bio" className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              Bio
            </Label>
            <Textarea
              id="bio"
              value={profile.bio}
              onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
              placeholder="Tell your team a little about yourself..."
              className="min-h-[80px] resize-none"
              maxLength={300}
            />
            <p className="text-[11px] text-muted-foreground text-right">{profile.bio.length}/300</p>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving} size="sm" className="min-w-[120px]">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Connected Accounts ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-primary" />
            Connected Accounts
          </CardTitle>
          <CardDescription>Services linked to your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Google — always connected since that's the login provider */}
          <div className="flex items-center justify-between rounded-lg border border-border p-4 bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-card border border-border shadow-sm">
                <GoogleIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Google</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          </div>

          {/* GitHub — placeholder */}
          <div className="flex items-center justify-between rounded-lg border border-border p-4 bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white dark:bg-card border border-border shadow-sm">
                <Github className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">GitHub</p>
                <p className="text-xs text-muted-foreground">Link GitHub for repository integrations</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="text-xs">
              Connect
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Activity Overview ──────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Activity Overview
          </CardTitle>
          <CardDescription>Your account activity at a glance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border bg-muted/20 p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground mb-0.5">Member Since</p>
              <p className="text-sm font-semibold text-foreground">{createdAt}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <FolderKanban className="h-5 w-5 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground mb-0.5">Projects</p>
              <p className="text-sm font-semibold text-foreground">{projects.length}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground mb-0.5">Teams Joined</p>
              <p className="text-sm font-semibold text-foreground">—</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground mb-0.5">Last Active</p>
              <p className="text-sm font-semibold text-foreground">Today</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Theme Option Card ────────────────────────────────────────────────────────
function ThemeOptionCard({
  value,
  label,
  description,
  icon: Icon,
  current,
  onSelect,
}: {
  value: Theme;
  label: string;
  description: string;
  icon: React.ElementType;
  current: Theme;
  onSelect: (v: Theme) => void;
}) {
  const isActive = current === value;
  return (
    <button
      onClick={() => onSelect(value)}
      className={cn(
        'flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all duration-200 text-center',
        isActive
          ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20'
          : 'border-border bg-card hover:border-primary/40 hover:bg-accent/30'
      )}
    >
      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full transition-colors',
          isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className={cn('text-sm font-semibold', isActive ? 'text-primary' : 'text-foreground')}>{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      {isActive && (
        <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px]">
          Active
        </Badge>
      )}
    </button>
  );
}

// ─── Account Settings Tab ─────────────────────────────────────────────────────
function AccountSettingsTab() {
  const { theme, setTheme } = useThemeStore();
  const { signOut } = useAuthStore();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Fetch active sessions from Supabase (MFA or session list)
  useEffect(() => {
    async function loadSessions() {
      setLoadingSessions(true);
      try {
        // Supabase doesn't expose multi-session list via standard REST API,
        // so we simulate with the current session info
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const currentSession = {
            id: session.access_token.slice(-12),
            isCurrent: true,
            browser: getBrowserName(navigator.userAgent),
            os: getOSName(navigator.userAgent),
            device: getDeviceInfo(navigator.userAgent),
            ip: '—',
            lastActive: new Date().toISOString(),
            userAgent: navigator.userAgent,
          };
          setSessions([currentSession]);
        }
      } catch (err) {
        console.error('Failed to load sessions', err);
      } finally {
        setLoadingSessions(false);
      }
    }
    loadSessions();
  }, []);

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingId(sessionId);
    try {
      // For the current session, this is effectively a sign-out
      await signOut();
      toast.success('Session revoked successfully');
    } catch {
      toast.error('Failed to revoke session');
    } finally {
      setRevokingId(null);
    }
  };

  const handleSignOutAll = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' });
      toast.success('Signed out of all devices');
    } catch {
      toast.error('Failed to sign out of all devices');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
      {/* ── Appearance / Theme ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5 text-primary" />
            Appearance
          </CardTitle>
          <CardDescription>
            Choose how the application looks to you. Changes apply instantly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <ThemeOptionCard
              value="light"
              label="Light"
              description="Clean & bright"
              icon={Sun}
              current={theme}
              onSelect={setTheme}
            />
            <ThemeOptionCard
              value="dark"
              label="Dark"
              description="Easy on the eyes"
              icon={Moon}
              current={theme}
              onSelect={setTheme}
            />
            <ThemeOptionCard
              value="system"
              label="System"
              description="Match your OS"
              icon={Monitor}
              current={theme}
              onSelect={setTheme}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Session Management ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Active Sessions
              </CardTitle>
              <CardDescription className="mt-1">
                Devices currently signed in to your account. Revoke access to any unfamiliar session.
              </CardDescription>
            </div>
            {sessions.length > 1 && (
              <Button variant="outline" size="sm" onClick={handleSignOutAll} className="text-destructive hover:text-destructive shrink-0">
                <LogOut className="h-3.5 w-3.5 mr-1.5" />
                Sign out all
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingSessions ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading sessions…
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p className="text-sm">No active sessions found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => {
                const DeviceIcon = session.device.icon;
                return (
                  <div
                    key={session.id}
                    className={cn(
                      'flex items-center justify-between rounded-lg border p-4 transition-colors',
                      session.isCurrent
                        ? 'border-primary/30 bg-primary/5'
                        : 'border-border bg-muted/20 hover:bg-muted/40'
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          'flex h-11 w-11 items-center justify-center rounded-lg',
                          session.isCurrent ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        )}
                      >
                        <DeviceIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">
                            {session.browser} on {session.os}
                          </p>
                          {session.isCurrent && (
                            <Badge variant="secondary" className="bg-success/10 text-success text-[10px] border-success/20">
                              This device
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {session.device.label} · Last active {timeAgo(session.lastActive)}
                        </p>
                      </div>
                    </div>

                    {!session.isCurrent && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeSession(session.id)}
                        disabled={revokingId === session.id}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        {revokingId === session.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <LogOut className="h-3.5 w-3.5 mr-1.5" />
                            Revoke
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── API Configuration (preserved from original) ────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            API Configuration
          </CardTitle>
          <CardDescription>Backend connection settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Backend API URL</Label>
            <Input
              value={import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}
              readOnly
              className="bg-muted font-mono text-sm cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">
              Set via VITE_API_BASE_URL environment variable
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user } = useAuthStore();
  const { projectId, teamId } = useParams<{ projectId: string; teamId?: string }>();
  const { currentProject, teams, roles, workflowStages, projects } = useProjectStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get('tab') || 'profile';
  const currentTeam = teams.find((t) => t.id === teamId);

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          {projectId
            ? `Manage settings for ${currentProject?.name || 'Project'}`
            : 'Manage your account and preferences'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        <div className="mx-auto max-w-5xl">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="bg-muted/50 border border-border p-1">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="account" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Account
              </TabsTrigger>
              {projectId && (
                <TabsTrigger value="project" className="flex items-center gap-2">
                  <FolderKanban className="h-4 w-4" />
                  Project
                </TabsTrigger>
              )}
              {teamId && (
                <TabsTrigger value="team" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Team
                </TabsTrigger>
              )}
            </TabsList>

            {/* ── Profile Tab ─────────────────────────────────────────── */}
            <TabsContent value="profile">
              <ProfileTab user={user} projects={projects} />
            </TabsContent>

            {/* ── Account Settings Tab ────────────────────────────────── */}
            <TabsContent value="account">
              <AccountSettingsTab />
            </TabsContent>

            {/* ── Project Tab (preserved) ─────────────────────────────── */}
            {projectId && (
              <TabsContent value="project" className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
                <Card>
                  <CardHeader>
                    <CardTitle>Project Details</CardTitle>
                    <CardDescription>Basic information about this project</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Project Name</Label>
                      <Input value={currentProject?.name || ''} />
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button size="sm">Update Project</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Workflow Wizard</CardTitle>
                    <CardDescription>Relaunch the step-by-step setup guide</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Need to add more roles or teams? You can relaunch the configuration wizard at any time.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/projects/${projectId}/setup`)}
                      className="flex items-center gap-2"
                    >
                      <Settings className="h-4 w-4" />
                      Launch Wizard
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* ── Team Tab (preserved) ────────────────────────────────── */}
            {teamId && (
              <TabsContent value="team" className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
                <Card>
                  <CardHeader>
                    <CardTitle>Team: {currentTeam?.name}</CardTitle>
                    <CardDescription>Manage roles and workflow for this team</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        <h4 className="text-sm font-semibold">Roles ({roles.length})</h4>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {roles.map((role) => (
                          <div key={role.id} className="rounded-md border p-2 text-xs flex justify-between bg-muted/30">
                            <span>{role.name}</span>
                            <span className="text-muted-foreground">{role.access_level}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Workflow className="h-5 w-5 text-primary" />
                        <h4 className="text-sm font-semibold">Workflow Stages ({workflowStages.length})</h4>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {workflowStages
                          .sort((a, b) => a.stage_order - b.stage_order)
                          .map((stage) => (
                            <div key={stage.id} className="rounded-full border px-3 py-1 text-xs bg-muted/30">
                              {stage.name}
                            </div>
                          ))}
                      </div>
                    </div>

                    <Separator />

                    <div className="flex justify-end">
                      <Button variant="link" onClick={() => navigate(`/projects/${projectId}/setup`)}>
                        Manage Detailed Config
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
}
