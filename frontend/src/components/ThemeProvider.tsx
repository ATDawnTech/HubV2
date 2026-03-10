import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuthz } from '@/hooks/useAuthz';
import { supabase } from '@/integrations/supabase/client';

type Theme = 'dark' | 'light' | 'system';

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'ui-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem(storageKey) as Theme) || defaultTheme;
  });
  const { user } = useAuthz();

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  // Sync theme preference with user profile
  useEffect(() => {
    if (user && theme !== 'system') {
      const saveTheme = async () => {
        try {
          await supabase
            .from('config')
            .upsert({
              user_id: user.id,
              key: 'theme',
              value: theme,
            }, {
              onConflict: 'user_id,key'
            });
        } catch (error) {
          console.error('Failed to save theme preference:', error);
        }
      };
      saveTheme();
    }
  }, [theme, user]);

  // Load theme preference from user profile on login
  useEffect(() => {
    if (user) {
      const loadTheme = async () => {
        try {
          const { data } = await supabase
            .from('config')
            .select('value')
            .eq('user_id', user.id)
            .eq('key', 'theme')
            .maybeSingle();
          
          if (data?.value && ['dark', 'light', 'system'].includes(data.value)) {
            setTheme(data.value as Theme);
          }
        } catch (error) {
          console.error('Failed to load theme preference:', error);
        }
      };
      loadTheme();
    }
  }, [user]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};