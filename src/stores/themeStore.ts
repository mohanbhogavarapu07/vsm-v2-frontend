import { create } from 'zustand';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  getEffectiveTheme: () => 'light' | 'dark';
}

function applyThemeToDOM(theme: Theme) {
  const root = document.documentElement;
  const effectiveTheme =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme;

  root.classList.remove('light', 'dark');
  root.classList.add(effectiveTheme);
}

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem('vsm-theme');
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    // localStorage may not be available
  }
  return 'light';
}

// Apply on initial load (before React renders)
const initialTheme = getStoredTheme();
applyThemeToDOM(initialTheme);

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initialTheme,

  setTheme: (theme: Theme) => {
    localStorage.setItem('vsm-theme', theme);
    applyThemeToDOM(theme);
    set({ theme });
  },

  getEffectiveTheme: () => {
    const { theme } = get();
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  },
}));

// Listen for system theme changes when in "system" mode
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { theme } = useThemeStore.getState();
    if (theme === 'system') {
      applyThemeToDOM('system');
    }
  });
}
