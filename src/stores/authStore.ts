import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const LAST_PROVIDER_KEY = 'vsm_last_provider'; // 'google' | 'email'

interface AuthState {
  user: {
    id: string;
    email?: string;
    name?: string;
    backendId?: string;
    authProvider?: string;
    user_metadata?: Record<string, any>;
  } | null;
  loading: boolean;
  initialize: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>;
  checkEmail: (email: string) => Promise<{ exists: boolean; provider: string | null }>;
  signOut: () => Promise<void>;
  syncWithBackend: (session: any, provider?: string) => Promise<void>;
}

async function backendFetch(path: string, body: object) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.detail || `Request failed: ${path}`);
  }
  return res.json();
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,

  initialize: async () => {
    try {
      // 1. Quick initial check
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        const storedBackendId = localStorage.getItem('vsm_user_id');
        if (storedBackendId) {
          const email = session.user.email;
          const name =
            session.user.user_metadata?.full_name || session.user.email?.split('@')[0];
          set({
            user: {
              id: session.user.id,
              backendId: storedBackendId,
              email,
              name,
              authProvider: localStorage.getItem(LAST_PROVIDER_KEY) || 'email',
            },
            loading: false,
          });
        } else {
          // In session but no backendId — first return from Google OAuth
          set({ loading: true });
        }
      } else {
        set({ user: null, loading: false });
      }

      // 2. Continuous listener
      supabase.auth.onAuthStateChange(async (event, session) => {
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
          // Clean up auth tokens or bare '#' from URL hash after OAuth redirect
          if (window.location.hash && (window.location.hash.includes('access_token') || window.location.hash === '#')) {
            window.history.replaceState(null, '', window.location.pathname || '/home');
          }

          const storedBackendId = localStorage.getItem('vsm_user_id');
          if (!storedBackendId) {
            // Detect Google vs email via app_metadata
            const identityProvider =
              session.user.app_metadata?.provider || 'email';
            const isGoogle = identityProvider === 'google';
            await get().syncWithBackend(session, isGoogle ? 'GOOGLE' : 'EMAIL');
          } else {
            const email = session.user.email;
            const name =
              session.user.user_metadata?.full_name || session.user.email?.split('@')[0];
            set({
              user: {
                id: session.user.id,
                backendId: storedBackendId,
                email,
                name,
                authProvider: localStorage.getItem(LAST_PROVIDER_KEY) || 'email',
              },
              loading: false,
            });
          }
        } else if (event === 'SIGNED_OUT') {
          localStorage.removeItem('vsm_user_id');
          set({ user: null, loading: false });
        }
      });
    } catch (error) {
      console.error('Auth initialization failed', error);
      set({ loading: false });
    }
  },

  // ── Google OAuth ────────────────────────────────────────────────────────────
  signInWithGoogle: async () => {
    set({ loading: true });
    localStorage.setItem(LAST_PROVIDER_KEY, 'google');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/home`,
      },
    });
    if (error) {
      set({ loading: false });
      throw error;
    }
  },

  // ── Email / Password Login ──────────────────────────────────────────────────
  signInWithEmail: async (email: string, password: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      localStorage.setItem(LAST_PROVIDER_KEY, 'email');

      // Sync backend
      const backendData = await backendFetch('/auth/login', { email });
      localStorage.setItem('vsm_user_id', backendData.user_id.toString());

      const name =
        data.session?.user.user_metadata?.full_name ||
        data.session?.user.email?.split('@')[0];

      set({
        user: {
          id: data.session!.user.id,
          backendId: backendData.user_id.toString(),
          email,
          name,
          authProvider: 'email',
        },
        loading: false,
      });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  // ── Email / Password Registration ───────────────────────────────────────────
  signUpWithEmail: async (email: string, password: string, name?: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name || email.split('@')[0] },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) throw error;

      // ── Supabase silently swallows signUp for already-existing users ──────────
      // Instead of an error it returns: user.identities = [] (empty array).
      // We detect this and throw a friendly error so the UI shows "log in instead".
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        throw new Error('This email is already registered. Please log in instead.');
      }

      localStorage.setItem(LAST_PROVIDER_KEY, 'email');

      // Register in backend
      const backendData = await backendFetch('/auth/register', {
        email,
        name: name || email.split('@')[0],
        auth_id: data.user?.id,
      });
      localStorage.setItem('vsm_user_id', backendData.user_id.toString());

      // data.session is present when Supabase "Confirm email" is OFF (auto-confirmed).
      // It is null when "Confirm email" is ON — user must click the link first.
      if (data.session) {
        set({
          user: {
            id: data.user!.id,
            backendId: backendData.user_id.toString(),
            email,
            name: name || email.split('@')[0],
            authProvider: 'email',
          },
          loading: false,
        });
      } else {
        // Confirmation email sent — caller will show "check your inbox"
        set({ loading: false });
      }
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  // ── Check if email exists in backend ────────────────────────────────────────
  checkEmail: async (email: string) => {
    const res = await fetch(`${API_BASE}/auth/check-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) return { exists: false, provider: null };
    return res.json();
  },

  // ── Google / magic-link post-auth sync ──────────────────────────────────────
  syncWithBackend: async (session: any, provider = 'EMAIL') => {
    try {
      const email = session.user.email;
      const name =
        session.user.user_metadata?.full_name || session.user.email?.split('@')[0];

      const data = await backendFetch('/auth/sync', {
        email,
        name,
        auth_id: session.user.id,
        auth_provider: provider,
      });

      localStorage.setItem('vsm_user_id', data.user_id.toString());

      set({
        user: {
          id: session.user.id,
          backendId: data.user_id.toString(),
          email,
          name,
          authProvider: provider.toLowerCase(),
        },
        loading: false,
      });
    } catch (error) {
      console.error('Backend sync failed', error);
      set({ loading: false });
    }
  },

  signOut: async () => {
    set({ loading: true });
    await supabase.auth.signOut();
    localStorage.removeItem('vsm_user_id');
    set({ user: null, loading: false });
  },
}));
