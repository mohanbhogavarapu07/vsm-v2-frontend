import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2, Mail, Users, Shield, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface InvitationDetails {
  invitation_id: number;
  team_id: number;
  team_name: string;
  role_name: string;
  inviter_name: string;
  email: string;
  accepted_at: string | null;
}

const AcceptInvitePage = () => {
  const { invitationId } = useParams<{ invitationId: string }>();
  const navigate = useNavigate();
  const { user, signInWithGoogle, loading: authLoading } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<InvitationDetails | null>(null);
  const [accepting, setAccepting] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  useEffect(() => {
    const fetchInviteDetails = async () => {
      try {
        const response = await fetch(`${API_BASE}/invitations/${invitationId}`);
        if (!response.ok) {
          if (response.status === 404) throw new Error("Invitation not found or expired.");
          throw new Error("Failed to fetch invitation details.");
        }
        const data = await response.json();
        setInvite(data);
        
        if (data.accepted_at) {
          setError("This invitation has already been accepted.");
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (invitationId) {
      fetchInviteDetails();
    }
  }, [invitationId, API_BASE]);

  const handleAccept = async () => {
    if (!user || !invite) return;

    setAccepting(true);
    try {
      const response = await fetch(`${API_BASE}/teams/${invite.team_id}/invitations/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': user.backendId || ''
        },
        body: JSON.stringify({
          invitation_id: invite.invitation_id,
          name: user.name
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to accept invitation.");
      }

      toast.success(`Welcome to ${invite.team_name}!`);
      // Redirect to the project board
      // Note: We might need the projectId, but usually accepting an invite 
      // is enough to let the user see the projects list.
      navigate('/projects');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
        <p className="text-slate-500 animate-pulse">Loading invitation details...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100 via-slate-50 to-indigo-100 dark:from-slate-900 dark:via-slate-950 dark:to-indigo-950">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-none shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
          
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Users className="h-8 w-8" />
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight">You're Invited!</CardTitle>
            <CardDescription className="text-lg mt-2">
              Join the future of autonomous Scrum
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-4">
            {error ? (
              <div className="rounded-lg bg-destructive/10 p-4 text-center">
                <AlertCircle className="mx-auto h-8 w-8 text-destructive mb-2" />
                <p className="font-semibold text-destructive">{error}</p>
                <Button variant="link" asChild className="mt-2">
                  <Link to="/">Go to Home</Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                    <div className="mt-1 rounded-full p-2 bg-blue-500/10 text-blue-500">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500">Team Name</p>
                      <p className="text-lg font-bold">{invite?.team_name}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                    <div className="mt-1 rounded-full p-2 bg-indigo-500/10 text-indigo-500">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500">Your Role</p>
                      <p className="text-lg font-bold">{invite?.role_name}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                    <div className="mt-1 rounded-full p-2 bg-purple-500/10 text-purple-500">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500">Invited By</p>
                      <p className="text-lg font-bold">{invite?.inviter_name}</p>
                    </div>
                  </div>
                </div>

                {!user && (
                  <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300 text-center">
                      Please log in with Google to accept this invitation and continue.
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pb-8 px-6">
            {!error && (
              <>
                {!user ? (
                  <Button 
                    onClick={signInWithGoogle} 
                    disabled={authLoading}
                    className="w-full h-12 text-lg font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
                  >
                    {authLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Login with Google"}
                    {!authLoading && <ArrowRight className="ml-2 h-5 w-5" />}
                  </Button>
                ) : (
                  <Button 
                    onClick={handleAccept} 
                    disabled={accepting}
                    className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 transition-all hover:scale-[1.02]"
                  >
                    {accepting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Accept Invitation"}
                    {!accepting && <CheckCircle2 className="ml-2 h-5 w-5" />}
                  </Button>
                )}
              </>
            )}
            
            <p className="text-xs text-center text-slate-400 mt-2">
              By joining, you agree to our Terms of Service and Privacy Policy.
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
};

export default AcceptInvitePage;
