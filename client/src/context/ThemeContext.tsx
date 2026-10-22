import { setPreference } from '../i18n/consent';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('scholarflow_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    setPreference('scholarflow_theme', theme);
  }, [theme]);

  /**
   * Cross-fades the whole page when the theme changes. Uses the View Transitions API where it exists,
   * and otherwise a short CSS colour transition; both are skipped for reduced-motion users.
   */
  const applyTheme = (next: Theme | ((prev: Theme) => Theme)) => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    if (!reduce && typeof doc.startViewTransition === 'function') {
      doc.startViewTransition(() => {
        flushSync(() => setThemeState(next));
      });
      return;
    }
    if (!reduce) {
      const root = document.documentElement;
      root.classList.add('theme-fade');
      window.setTimeout(() => root.classList.remove('theme-fade'), 400);
    }
    setThemeState(next);
  };

  const toggleTheme = () => applyTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

  const setTheme = (t: Theme) => applyTheme(t);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
