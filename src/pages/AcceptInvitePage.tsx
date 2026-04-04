import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2, Mail, Users, Shield, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';

interface InvitationDetails {
  invitation_id: number;
  project_id: number;
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
  const { user, signInWithGoogle, signOut, initialize, loading: authLoading } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<InvitationDetails | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    const fetchInviteDetails = async () => {
      if (!invitationId) return;
      
      try {
        setLoading(true);
        const data = await api.getInvitationDetails(invitationId);
        setInvite(data);
        
        if (data.accepted_at) {
          setError("This invitation has already been accepted.");
        }
      } catch (err: any) {
        console.error("Failed to fetch invite:", err);
        setError(err.message || "Failed to fetch invitation details.");
      } finally {
        setLoading(false);
      }
    };

    fetchInviteDetails();
  }, [invitationId]);

  const isEmailMismatch = user && invite && user.email?.toLowerCase() !== invite.email.toLowerCase();

  const handleAccept = async () => {
    if (!user || !invite || isEmailMismatch) return;

    setAccepting(true);
    try {
      const result = await api.acceptInvitation(String(invite.team_id), {
        invitation_id: invite.invitation_id,
        name: user.name
      });

      toast.success(`Welcome to ${invite.team_name}!`);
      
      // Direct redirection to the team board
      if (result.project_id && result.team_id) {
        navigate(`/projects/${result.project_id}/teams/${result.team_id}/board`);
      } else {
        navigate('/projects');
      }
    } catch (err: any) {
      console.error("Failed to accept invite:", err);
      toast.error(err.message || "Failed to join team");
    } finally {
      setAccepting(false);
    }
  };

  const handleSwitchAccount = async () => {
    await signOut();
    // After signout, the UI will show the "Login with Google" button again
    toast.info("Signed out. Please log in with the invited email.");
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
        <p className="text-slate-500 animate-pulse font-medium">Validating your invitation...</p>
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
              <div className="rounded-lg bg-destructive/10 p-6 text-center border border-destructive/20">
                <AlertCircle className="mx-auto h-10 w-10 text-destructive mb-3" />
                <p className="font-semibold text-destructive text-lg">{error}</p>
                <Button variant="outline" asChild className="mt-4 border-destructive/30 hover:bg-destructive/5">
                  <Link to="/">Return to Home</Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700">
                    <div className="mt-1 rounded-full p-2 bg-blue-500/10 text-blue-500">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Team Name</p>
                      <p className="text-lg font-bold">{invite?.team_name}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700">
                    <div className="mt-1 rounded-full p-2 bg-indigo-500/10 text-indigo-500">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Your Role</p>
                      <p className="text-lg font-bold">{invite?.role_name}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700">
                    <div className="mt-1 rounded-full p-2 bg-purple-500/10 text-purple-500">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Invited By</p>
                      <p className="text-lg font-bold">{invite?.inviter_name}</p>
                    </div>
                  </div>
                </div>

                {isEmailMismatch && (
                  <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <div className="flex gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                          Email Mismatch
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          This invitation was sent to <span className="font-bold underline">{invite?.email}</span>, 
                          but you are logged in as <span className="font-bold">{user?.email}</span>.
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleSwitchAccount}
                          className="mt-1 h-8 text-xs border-amber-300 hover:bg-amber-100"
                        >
                          Switch Account
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {!user && (
                  <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300 text-center font-medium">
                      Please log in with Google to verify your invitation and join the team.
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
                    className="w-full h-12 text-lg font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] bg-primary hover:bg-primary/90"
                  >
                    {authLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Login with Google"}
                    {!authLoading && <ArrowRight className="ml-2 h-5 w-5" />}
                  </Button>
                ) : (
                  <Button 
                    onClick={handleAccept} 
                    disabled={accepting || isEmailMismatch}
                    className={`w-full h-12 text-lg font-semibold shadow-lg transition-all hover:scale-[1.02] ${
                      isEmailMismatch 
                        ? 'bg-slate-200 text-slate-500 cursor-not-allowed hover:scale-100 shadow-none' 
                        : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-indigo-200 dark:shadow-indigo-900/20'
                    }`}
                  >
                    {accepting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Accept Invitation"}
                    {!accepting && !isEmailMismatch && <CheckCircle2 className="ml-2 h-5 w-5" />}
                  </Button>
                )}
              </>
            )}
            
            <p className="text-[10px] text-center text-slate-400 mt-2">
              By joining, you agree to our Terms of Service and Privacy Policy.
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
};

export default AcceptInvitePage;
