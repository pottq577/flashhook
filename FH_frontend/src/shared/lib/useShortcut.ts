import { useEffect, useRef } from "react";

const listeners = new Set<(e: KeyboardEvent) => void>();
let isListening = false;

const handleGlobalKeyDown = (e: KeyboardEvent) => {
  listeners.forEach((cb) => cb(e));
};

export function useShortcut(key: string, callback: () => void, metaKey = true) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target?.closest('input, textarea, select, [contenteditable="true"]')
      ) {
        return;
      }
      const isMetaPressed = metaKey ? e.metaKey || e.ctrlKey : true;
      if (isMetaPressed && e.key.toLowerCase() === key.toLowerCase()) {
        e.preventDefault();
        callbackRef.current();
      }
    };

    listeners.add(handleKeyDown);
    if (!isListening) {
      window.addEventListener("keydown", handleGlobalKeyDown);
      isListening = true;
    }

    return () => {
      listeners.delete(handleKeyDown);
      if (listeners.size === 0 && isListening) {
        window.removeEventListener("keydown", handleGlobalKeyDown);
        isListening = false;
      }
    };
  }, [key, metaKey]);
}
