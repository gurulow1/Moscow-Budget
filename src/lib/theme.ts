import { useLayoutEffect, useState } from 'react';
import { safeLocalStorage } from './utils';

const STORAGE_KEY = 'mos_theme';

// A saved choice wins; without one the app follows the device's light or dark setting.
function readInitialDark() {
  const saved = safeLocalStorage.getItem(STORAGE_KEY);
  if (saved === 'dark' || saved === 'light') return saved === 'dark';
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function useTheme() {
  const [isDark, setIsDark] = useState(readInitialDark);

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    document.body.classList.toggle('dark', isDark);
    document
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((meta) => meta.setAttribute('content', isDark ? '#0A0D13' : '#EDF1F8'));
  }, [isDark]);

  const toggle = () => {
    safeLocalStorage.setItem(STORAGE_KEY, isDark ? 'light' : 'dark');
    setIsDark(!isDark);
  };

  return { isDark, toggle };
}
