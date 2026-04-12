import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, TriangleAlert, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

const LAST_PROVIDER_KEY = 'vsm_last_provider';

// Google SVG icon
function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="flex-shrink-0">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const { signInWithEmail, signInWithGoogle, user, loading, initialize } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const lastProvider = localStorage.getItem(LAST_PROVIDER_KEY);
  const googleWasLastUsed = lastProvider === 'google';

  // Initialize auth on this public page too — needed for email confirmation link handling
  useEffect(() => {
    initialize();
  }, [initialize]);

  // If already authenticated (e.g. after clicking confirmation link or returning from Google),
  // redirect straight to /home
  useEffect(() => {
    if (user) {
      navigate('/home', { replace: true });
    }
  }, [user, navigate]);

  // Clean up bare '#' that Supabase appends after OAuth / confirmation redirects
  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Please enter your email'); return; }
    if (!password) { setError('Please enter your password'); return; }

    setIsSubmitting(true);
    try {
      await signInWithEmail(email.trim(), password);
      navigate('/home', { replace: true });
    } catch (err: any) {
      const msg: string = err.message || 'Invalid email or password';
      // Make Supabase error messages friendly
      if (msg.toLowerCase().includes('invalid login credentials')) {
        setError('Incorrect email or password. Please try again.');
      } else if (msg.toLowerCase().includes('email not confirmed')) {
        setError('Please confirm your email address before logging in. Check your inbox.');
      } else {
        setError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      // signInWithGoogle redirects — page navigates away
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
      setIsSubmitting(false);
    }
  };

  // Only local submit state controls disabled — don't let global auth loading freeze the page
  const busy = isSubmitting;

  // While auth is resolving (e.g. processing email confirmation hash), show a spinner.
  // Once done, the user effect above will redirect to /home if authenticated.
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAFBFC]">
        <Loader2 className="h-8 w-8 animate-spin text-[#0052CC]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFBFC] p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none flex justify-between items-end px-10">
        <svg width="420" height="280" viewBox="0 0 420 280" fill="none" opacity="0.55">
          <path d="M0 180 L110 230 L220 130 L320 190 L420 80 L420 280 L0 280 Z" fill="#E3F0FF" />
          <path d="M0 240 L110 190 L220 260 L320 210 L420 140 L420 280 L0 280 Z" fill="#0052CC" opacity="0.08" />
        </svg>
        <svg width="420" height="280" viewBox="0 0 420 280" fill="none" opacity="0.55" style={{ transform: 'scaleX(-1)' }}>
          <path d="M0 180 L110 230 L220 130 L320 190 L420 80 L420 280 L0 280 Z" fill="#E3F0FF" />
          <path d="M0 240 L110 190 L220 260 L320 210 L420 140 L420 280 L0 280 Z" fill="#0052CC" opacity="0.08" />
        </svg>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-[400px] bg-white rounded shadow-sm border border-[#DFE1E6] p-8 z-10"
      >
        {/* Header */}
        <div className="mb-8 text-center flex flex-col items-center">
          <div className="flex items-center justify-center gap-2 mb-5">
            <div className="text-[#0052CC]">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L22 20H2L12 2ZM12 8L7.5 16H16.5L12 8Z" />
              </svg>
            </div>
            <h1 className="text-[26px] font-bold text-[#0052CC] tracking-tight">Virtual Scrum Master</h1>
          </div>
          <h2 className="text-[#172B4D] font-medium text-[16px]">Log in to your account</h2>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key="login-form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              {/* Email */}
              <div className="space-y-1">
                <Label htmlFor="login-email" className="text-[12px] font-semibold text-[#5E6C84] uppercase tracking-wide">
                  Email
                </Label>
                <Input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  autoComplete="email"
                  className="h-10 border-2 border-[#DFE1E6] focus:border-[#4C9AFF] focus:ring-0 bg-[#FAFBFC] hover:bg-[#EBECF0] transition-colors shadow-none text-[14px]"
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-1">
                <Label htmlFor="login-password" className="text-[12px] font-semibold text-[#5E6C84] uppercase tracking-wide">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="h-10 border-2 border-[#DFE1E6] focus:border-[#4C9AFF] focus:ring-0 bg-[#FAFBFC] hover:bg-[#EBECF0] transition-colors shadow-none text-[14px] pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5E6C84] hover:text-[#172B4D] transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={busy}
                className="w-full h-10 bg-[#0052CC] hover:bg-[#0047B3] text-white font-medium rounded-[3px] shadow-sm text-[14px] mt-1"
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Log in
              </Button>
            </form>

            {/* Divider */}
            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-[#DFE1E6]" />
              <span className="flex-shrink-0 mx-3 text-[11px] font-medium text-[#5E6C84] uppercase tracking-wider">
                Or continue with
              </span>
              <div className="flex-grow border-t border-[#DFE1E6]" />
            </div>

            {/* Google Button */}
            <Button
              variant="outline"
              onClick={handleGoogle}
              disabled={busy}
              className="w-full h-10 bg-white hover:bg-slate-50 text-[#172B4D] border-2 border-[#DFE1E6] hover:border-[#C1C7D0] rounded-[3px] shadow-sm justify-center font-medium gap-2 relative"
            >
              <GoogleIcon />
              <span>Google</span>
              {googleWasLastUsed && (
                <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                  <CheckCircle2 className="h-3 w-3" />
                  Last used
                </span>
              )}
            </Button>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 p-3 text-sm rounded bg-red-50 text-red-600 border border-red-200"
              >
                <TriangleAlert className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <div className="mt-7 text-center border-t border-[#DFE1E6] pt-5">
          <p className="text-[14px] text-[#5E6C84]">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#0052CC] hover:underline font-medium transition-all">
              Sign up
            </Link>
          </p>
          <div className="mt-5 flex flex-col items-center gap-1">
            <div className="flex items-center gap-2 text-[#0052CC] opacity-50">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L22 20H2L12 2Z" />
              </svg>
              <span className="font-bold tracking-tight text-sm">Virtual Scrum Master</span>
            </div>
            <p className="text-[12px] text-[#97A0AF]">
              One account for VSM, Planning, AI, and more.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
