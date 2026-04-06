import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';

export default function GitHubCallbackPage() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const processCallback = () => {
      const installationId = searchParams.get('installation_id');
      const setupAction = searchParams.get('setup_action');
      const state = searchParams.get('state');

      // 1. Kick off the linking process in the background (optimistic execution)
      if (installationId && setupAction) {
         api.handleGitHubCallback(installationId, setupAction, state).catch(console.error);
      }

      // 2. Extract return URL if present in state and redirect INSTANTLY
      let returnUrl = '/projects?status=github_success'; // fallback
      if (state) {
        try {
          const paddedState = state + '='.repeat((4 - state.length % 4) % 4);
          const decoded = JSON.parse(atob(paddedState));
          if (decoded.return_url) {
            // Reconstruct path and append success status
            const urlObj = new URL(decoded.return_url, window.location.origin);
            urlObj.searchParams.set('status', 'github_success');
            returnUrl = urlObj.pathname + urlObj.search;
          }
        } catch (e) {
          console.error("Failed to decode state", e);
        }
      }
      
      // Navigate immediately without waiting for API
      window.location.replace(returnUrl);
    };
    
    processCallback();
  }, [searchParams]);

  return null; // Render absolutely nothing to ensure zero UI delay!
}
