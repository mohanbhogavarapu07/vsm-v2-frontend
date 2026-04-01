import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';
import { Github, Mail, Loader2, Bot, ArrowRight } from 'lucide-react';

export function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const { signInWithEmail, signUpWithEmail, signInWithGithub, signInWithGoogle, resetPassword } =
    useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      if (isForgot) {
        await resetPassword(email);
        setMessage('Check your email for a password reset link.');
      } else if (isSignUp) {
        await signUpWithEmail(email, password, fullName);
        setMessage('Check your email to confirm your account.');
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'github' | 'google') => {
    setError('');
    try {
      if (provider === 'github') await signInWithGithub();
      else await signInWithGoogle();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        {/* Brand Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
            <Bot className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">AI Workflow Engine</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Intelligent project management with AI Scrum Master
          </p>
        </div>

        <Card className="border-border shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">
              {isForgot ? 'Reset Password' : isSignUp ? 'Create Account' : 'Welcome Back'}
            </CardTitle>
            <CardDescription>
              {isForgot
                ? 'Enter your email to receive a reset link'
                : isSignUp
                ? 'Sign up to start managing workflows'
                : 'Sign in to your workspace'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isForgot && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleOAuth('github')}
                    type="button"
                  >
                    <Github className="mr-2 h-4 w-4" />
                    GitHub
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleOAuth('google')}
                    type="button"
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Google
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or continue with email</span>
                  </div>
                </div>
              </>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              {isSignUp && !isForgot && (
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    required
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                />
              </div>

              {!isForgot && (
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
              )}

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              {message && (
                <p className="text-sm text-success">{message}</p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                {isForgot ? 'Send Reset Link' : isSignUp ? 'Create Account' : 'Sign In'}
              </Button>
            </form>

            <div className="flex items-center justify-between text-sm">
              {!isForgot && (
                <button
                  type="button"
                  onClick={() => setIsForgot(true)}
                  className="text-primary hover:underline"
                >
                  Forgot password?
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setIsForgot(false);
                  setError('');
                  setMessage('');
                }}
                className="text-primary hover:underline"
              >
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              </button>
              {isForgot && (
                <button
                  type="button"
                  onClick={() => {
                    setIsForgot(false);
                    setError('');
                    setMessage('');
                  }}
                  className="text-primary hover:underline"
                >
                  Back to sign in
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
