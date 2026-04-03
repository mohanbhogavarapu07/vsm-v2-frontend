import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

interface AuthState {
  user: { id: string; email?: string; name?: string; backendId?: string } | null;
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
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        await get().syncWithBackend(session);
      } else {
        set({ user: null, loading: false });
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          await get().syncWithBackend(session);
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
        redirectTo: window.location.origin
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
          'Content-Type': 'application/json'
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
