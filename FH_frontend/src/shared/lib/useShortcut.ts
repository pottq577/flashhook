import { useEffect } from 'react';

export function useShortcut(key: string, callback: () => void, metaKey = true) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) {
        return;
      }
      const isMetaPressed = metaKey ? (e.metaKey || e.ctrlKey) : true;
      if (isMetaPressed && e.key.toLowerCase() === key.toLowerCase()) {
        e.preventDefault();
        callback();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [key, callback, metaKey]);
}
