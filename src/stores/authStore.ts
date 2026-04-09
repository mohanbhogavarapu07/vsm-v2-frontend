import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

interface AuthState {
  user: { 
    id: string; 
    email?: string; 
    name?: string; 
    backendId?: string;
    user_metadata?: Record<string, any>;
  } | null;
  loading: boolean;
  initialize: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  syncWithBackend: (session: any) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,

  initialize: async () => {
    try {
      // 1. Initial manual check to show something fast
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const storedBackendId = localStorage.getItem('vsm_user_id');
        if (storedBackendId) {
          const email = session.user.email;
          const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0];
          set({
            user: { 
              id: session.user.id, 
              backendId: storedBackendId,
              email, 
              name 
            },
            loading: false,
          });
        } else {
          // In session but no backendId (first time return from Google)
          // We wait for onAuthStateChange to handle the sync (safer than dual-syncing)
          // But we set loading: true to show the spinner while we wait
          set({ loading: true });
        }
      } else {
        // No session at all
        set({ user: null, loading: false });
      }

      // 2. Continuous listener for all auth events
      supabase.auth.onAuthStateChange(async (event, session) => {
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
          // Clean up auth tokens from URL hash
          if (window.location.hash && window.location.hash.includes('access_token')) {
            window.history.replaceState(null, '', window.location.pathname || '/home');
          }
          
          const storedBackendId = localStorage.getItem('vsm_user_id');
          if (!storedBackendId) {
            await get().syncWithBackend(session);
          } else {
            const email = session.user.email;
            const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0];
            set({
              user: { 
                id: session.user.id, 
                backendId: storedBackendId,
                email, 
                name 
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

  signInWithGoogle: async () => {
    set({ loading: true });
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/home`
      }
    });
    if (error) {
      set({ loading: false });
      throw error;
    }
  },

  syncWithBackend: async (session: any) => {
    try {
      const email = session.user.email;
      const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0];
      
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';
      
      // Auto-register/sync the Google user in the backend
      const response = await fetch(`${API_BASE}/auth/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({
          email,
          name,
          auth_id: session.user.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to sync user with backend');
      }

      const data = await response.json();
      
      // Save backend ID for api.ts context
      localStorage.setItem('vsm_user_id', data.user_id.toString());
      
      set({
        user: { 
          id: session.user.id, 
          backendId: data.user_id.toString(),
          email, 
          name 
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
