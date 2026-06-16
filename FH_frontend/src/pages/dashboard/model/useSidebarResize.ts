import { useState, useCallback, useRef, useEffect } from "react";

export function useSidebarResize(
  initialWidth = 440,
  minWidth = 440,
  maxWidth = 800,
) {
  const [sidebarWidth, setSidebarWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const isDragging = useRef(false);
  const rafRef = useRef<number | null>(null);
  const originalStylesRef = useRef<{
    cursor: string;
    userSelect: string;
  } | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const restoreStyles = useCallback(() => {
    if (originalStylesRef.current) {
      document.body.style.cursor = originalStylesRef.current.cursor;
      document.body.style.userSelect = originalStylesRef.current.userSelect;
      originalStylesRef.current = null;
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging.current) return;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth >= minWidth && newWidth < maxWidth) {
          setSidebarWidth(newWidth);
        }
      });
    },
    [minWidth, maxWidth],
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging.current) {
      isDragging.current = false;
      setIsResizing(false);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      restoreStyles();
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    }
  }, [restoreStyles]);

  const startResizing = useCallback(() => {
    isDragging.current = true;
    setIsResizing(true);
    originalStylesRef.current = {
      cursor: document.body.style.cursor,
      userSelect: document.body.style.userSelect,
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    cleanupRef.current = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      isDragging.current = false;
      restoreStyles();
    };
  }, [restoreStyles]);

  return { sidebarWidth, isResizing, startResizing };
}
