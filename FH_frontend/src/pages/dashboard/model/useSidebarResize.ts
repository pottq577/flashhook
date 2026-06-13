import { useState, useCallback, useRef, useEffect } from 'react';

export function useSidebarResize(initialWidth = 440, minWidth = 440, maxWidth = 800) {
  const [sidebarWidth, setSidebarWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const isDragging = useRef(false);
  const rafRef = useRef<number | null>(null);

  const startResizing = useCallback(() => {
    isDragging.current = true;
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth >= minWidth && newWidth < maxWidth) {
          setSidebarWidth(newWidth);
        }
      });
    };
    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        setIsResizing(false);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      isDragging.current = false;
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };
  }, [minWidth, maxWidth]);

  return { sidebarWidth, isResizing, startResizing };
}
