import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, TriangleAlert, Eye, EyeOff, Mail, CheckCircle2 } from 'lucide-react';

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

// Password strength checker
function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map: Record<number, { label: string; color: string }> = {
    0: { label: 'Too weak', color: '#ef4444' },
    1: { label: 'Weak', color: '#f97316' },
    2: { label: 'Fair', color: '#eab308' },
    3: { label: 'Good', color: '#22c55e' },
    4: { label: 'Strong', color: '#16a34a' },
  };
  return { score, ...map[score] };
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { signUpWithEmail, signInWithGoogle } = useAuthStore();

  // Clean up bare '#' hash Supabase sometimes appends after redirects
  useEffect(() => {
    if (window.location.hash === '#' || window.location.hash === '') {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const strength = getPasswordStrength(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) { setError('Please enter your email'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }

    setIsSubmitting(true);
    try {
      await signUpWithEmail(email.trim(), password, name.trim() || undefined);
      // Check if the store now has a user (email confirmation disabled in Supabase)
      // or if we need to wait for email confirmation
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        navigate('/home', { replace: true });
      } else {
        setRegisteredEmail(email.trim());
        setEmailSent(true);
      }
    } catch (err: any) {
      const msg: string = err.message || 'Registration failed';
      if (msg.toLowerCase().includes('already registered')) {
        setError('This email is already registered. Try logging in instead.');
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
      // redirects away
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
      setIsSubmitting(false);
    }
  };

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
        className="w-full max-w-[420px] bg-white rounded shadow-sm border border-[#DFE1E6] p-8 z-10"
      >
        {/* Header */}
        <div className="mb-7 text-center flex flex-col items-center">
          <div className="flex items-center justify-center gap-2 mb-5">
            <div className="text-[#0052CC]">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L22 20H2L12 2ZM12 8L7.5 16H16.5L12 8Z" />
              </svg>
            </div>
            <h1 className="text-[26px] font-bold text-[#0052CC] tracking-tight">Virtual Scrum Master</h1>
          </div>
          <h2 className="text-[#172B4D] font-medium text-[16px]">Create your account</h2>
        </div>

        <AnimatePresence mode="wait">
          {emailSent ? (
            /* ── Email confirmation pending ── */
            <motion.div
              key="email-sent"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <div className="mx-auto w-16 h-16 bg-blue-50 text-[#0052CC] rounded-full flex items-center justify-center mb-4">
                <Mail className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold text-[#172B4D] mb-2">Check your inbox</h3>
              <p className="text-sm text-[#5E6C84] mb-6">
                We sent a confirmation link to{' '}
                <span className="font-semibold text-[#172B4D]">{registeredEmail}</span>.
                <br />Click the link to activate your account.
              </p>
              <Button
                variant="outline"
                onClick={() => { setEmailSent(false); setEmail(''); setPassword(''); setConfirmPassword(''); }}
                className="text-[#0052CC] border-[#DFE1E6]"
              >
                Use a different email
              </Button>
              <div className="mt-4">
                <Link to="/login" className="text-sm text-[#0052CC] hover:underline">
                  Already confirmed? Log in →
                </Link>
              </div>
            </motion.div>
          ) : (
            /* ── Registration form ── */
            <motion.div
              key="register-form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <form onSubmit={handleRegister} className="space-y-4" noValidate>
                {/* Full name (optional) */}
                <div className="space-y-1">
                  <Label htmlFor="reg-name" className="text-[12px] font-semibold text-[#5E6C84] uppercase tracking-wide">
                    Full name <span className="normal-case font-normal text-[#97A0AF]">(optional)</span>
                  </Label>
                  <Input
                    id="reg-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                    className="h-10 border-2 border-[#DFE1E6] focus:border-[#4C9AFF] focus:ring-0 bg-[#FAFBFC] hover:bg-[#EBECF0] transition-colors shadow-none text-[14px]"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <Label htmlFor="reg-email" className="text-[12px] font-semibold text-[#5E6C84] uppercase tracking-wide">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="reg-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="h-10 border-2 border-[#DFE1E6] focus:border-[#4C9AFF] focus:ring-0 bg-[#FAFBFC] hover:bg-[#EBECF0] transition-colors shadow-none text-[14px]"
                    required
                  />
                </div>

                {/* Create password */}
                <div className="space-y-1">
                  <Label htmlFor="reg-password" className="text-[12px] font-semibold text-[#5E6C84] uppercase tracking-wide">
                    Create password <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      autoComplete="new-password"
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
                  {/* Strength bar */}
                  {password.length > 0 && (
                    <div className="mt-1.5 space-y-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className="h-1 flex-1 rounded-full transition-colors duration-300"
                            style={{
                              backgroundColor: i <= strength.score ? strength.color : '#DFE1E6',
                            }}
                          />
                        ))}
                      </div>
                      <p className="text-[11px] font-medium" style={{ color: strength.color }}>
                        {strength.label}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div className="space-y-1">
                  <Label htmlFor="reg-confirm" className="text-[12px] font-semibold text-[#5E6C84] uppercase tracking-wide">
                    Confirm password <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="reg-confirm"
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                      className={`h-10 border-2 focus:ring-0 bg-[#FAFBFC] transition-colors shadow-none text-[14px] pr-10 ${
                        passwordsMismatch
                          ? 'border-red-400 focus:border-red-400'
                          : passwordsMatch
                          ? 'border-green-400 focus:border-green-500'
                          : 'border-[#DFE1E6] hover:bg-[#EBECF0] focus:border-[#4C9AFF]'
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5E6C84] hover:text-[#172B4D] transition-colors"
                      tabIndex={-1}
                      aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    {passwordsMatch && (
                      <CheckCircle2 className="absolute right-9 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500 pointer-events-none" />
                    )}
                  </div>
                  {passwordsMismatch && (
                    <p className="text-[11px] text-red-500 font-medium mt-1">Passwords do not match</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || passwordsMismatch}
                  className="w-full h-10 bg-[#0052CC] hover:bg-[#0047B3] text-white font-medium rounded-[3px] shadow-sm text-[14px] mt-1"
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create account
                </Button>
              </form>

              {/* Divider */}
              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-[#DFE1E6]" />
                <span className="flex-shrink-0 mx-3 text-[11px] font-medium text-[#5E6C84] uppercase tracking-wider">
                  Or sign up with
                </span>
                <div className="flex-grow border-t border-[#DFE1E6]" />
              </div>

              {/* Google */}
              <Button
                variant="outline"
                onClick={handleGoogle}
                disabled={isSubmitting}
                className="w-full h-10 bg-white hover:bg-slate-50 text-[#172B4D] border-2 border-[#DFE1E6] hover:border-[#C1C7D0] rounded-[3px] shadow-sm justify-center font-medium gap-2"
              >
                <GoogleIcon />
                <span>Continue with Google</span>
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
          )}
        </AnimatePresence>

        {/* Footer */}
        {!emailSent && (
          <div className="mt-7 text-center border-t border-[#DFE1E6] pt-5">
            <p className="text-[14px] text-[#5E6C84]">
              Already have an account?{' '}
              <Link to="/login" className="text-[#0052CC] hover:underline font-medium transition-all">
                Log in
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
        )}
      </motion.div>
    </div>
  );
}

export default RegisterPage;
