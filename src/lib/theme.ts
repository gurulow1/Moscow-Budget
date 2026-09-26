import { useLayoutEffect, useState } from 'react';
import { safeLocalStorage } from './utils';

const STORAGE_KEY = 'mos_theme';

// Light by default; night only after the visitor switches it on in the profile.
function readInitialDark() {
  return safeLocalStorage.getItem(STORAGE_KEY) === 'dark';
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
