import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, TriangleAlert, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase'; // to handle email magic link directly

export function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [emailSent, setEmailSent] = useState(false);

  const { signInWithGoogle } = useAuthStore();

  const handleOAuthLogin = async (provider: 'google' | 'azure' | 'apple' | 'slack') => {
    setLoading(true);
    setError('');
    try {
      if (provider === 'google') {
        await signInWithGoogle();
      } else {
        // Fallback for mocked providers
        setError(`${provider} login is not fully configured yet.`);
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || `Failed to initialize ${provider} login`);
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: window.location.origin
        }
      });
      
      if (authError) throw authError;
      setEmailSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send login link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFBFC] p-4 relative overflow-hidden">
      
      {/* Background abstract decoration matching the screenshot */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none opacity-50 flex justify-between items-end px-10">
        <svg width="400" height="300" viewBox="0 0 400 300" fill="none" opacity="0.6">
          <path d="M0 200 L100 250 L200 150 L300 200 L400 100 L400 300 L0 300 Z" fill="#E3F0FF" />
          <path d="M0 250 L100 200 L200 280 L300 220 L400 150 L400 300 L0 300 Z" fill="#0052CC" opacity="0.1" />
        </svg>
        <svg width="400" height="300" viewBox="0 0 400 300" fill="none" opacity="0.6" className="scale-x-[-1]">
          <path d="M0 200 L100 250 L200 150 L300 200 L400 100 L400 300 L0 300 Z" fill="#E3F0FF" />
          <path d="M0 250 L100 200 L200 280 L300 220 L400 150 L400 300 L0 300 Z" fill="#0052CC" opacity="0.1" />
        </svg>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-[400px] bg-white rounded shadow-sm border border-[#DFE1E6] p-8 z-10"
      >
        {/* Atlassian-style Header */}
        <div className="mb-8 text-center flex flex-col items-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="text-[#0052CC]">
              {/* Custom SVG replacing Atlassian Logo for VSM */}
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L22 20H2L12 2ZM12 8L7.5 16H16.5L12 8Z" />
              </svg>
            </div>
            <h1 className="text-[28px] font-bold text-[#0052CC] tracking-tight">Virtual Scrum Master</h1>
          </div>
          <h2 className="text-[#172B4D] font-medium text-[16px]">
            {mode === 'login' ? 'Log in to continue' : 'Sign up to continue'}
          </h2>
        </div>

        <AnimatePresence mode="wait">
          {!emailSent ? (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <form onSubmit={handleEmailSubmit} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="email" className="text-[12px] font-semibold text-[#5E6C84]">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="h-10 border-2 border-[#DFE1E6] focus:border-[#4C9AFF] focus:ring-0 bg-[#FAFBFC] hover:bg-[#EBECF0] transition-colors shadow-none text-[14px]"
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full h-10 bg-[#0052CC] hover:bg-[#0047B3] text-white font-medium rounded-[3px] shadow-sm text-[14px] mt-2"
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {mode === 'login' ? 'Continue' : 'Sign up'}
                </Button>
              </form>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-[#DFE1E6]"></div>
                <span className="flex-shrink-0 mx-3 text-[11px] font-medium text-[#5E6C84] uppercase tracking-wider">
                  Or continue with:
                </span>
                <div className="flex-grow border-t border-[#DFE1E6]"></div>
              </div>

              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  onClick={() => handleOAuthLogin('google')} 
                  disabled={loading}
                  className="w-full h-10 bg-white hover:bg-slate-50 text-[#172B4D] border-2 border-[#DFE1E6] hover:border-[#DFE1E6] rounded-[3px] shadow-sm justify-center font-medium"
                >
                  <svg className="w-[18px] h-[18px] mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google
                </Button>


              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 mt-4 text-sm rounded bg-red-50 text-red-600 border border-red-200">
                  <TriangleAlert className="h-4 w-4" />
                  {error}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6"
            >
              <div className="mx-auto w-16 h-16 bg-blue-50 text-[#0052CC] rounded-full flex items-center justify-center mb-4">
                <Mail className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-medium text-[#172B4D] mb-2">Check your inbox</h3>
              <p className="text-sm text-[#5E6C84] mb-6">
                We've sent a magic link to <br/>
                <span className="font-semibold text-[#172B4D]">{email}</span>
              </p>
              <Button 
                variant="outline" 
                onClick={() => setEmailSent(false)} 
                className="text-[#0052CC] border-[#DFE1E6]"
              >
                Use a different email
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {!emailSent && (
          <div className="mt-8 text-center border-t border-[#DFE1E6] pt-6">
            {mode === 'login' ? (
              <p className="text-[14px] text-[#5E6C84]">
                <a href="#" className="text-[#0052CC] hover:underline transition-all">Can't log in?</a>
                <span className="mx-2">•</span>
                <button onClick={() => setMode('signup')} className="text-[#0052CC] hover:underline transition-all">
                  Create an account
                </button>
              </p>
            ) : (
              <p className="text-[14px] text-[#5E6C84]">
                <button onClick={() => setMode('login')} className="text-[#0052CC] hover:underline transition-all">
                  Already have an account? Log in
                </button>
              </p>
            )}
            <div className="mt-6 flex flex-col items-center gap-1">
              <div className="flex items-center gap-2 text-[#0052CC] opacity-60">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L22 20H2L12 2Z" />
                </svg>
                <span className="font-bold tracking-tight">Virtual Scrum Master</span>
              </div>
              <p className="text-[12px] text-[#5E6C84]">
                One account for VSM, Planning, AI, and <a href="#" className="text-[#0052CC] hover:underline">more</a>.
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
