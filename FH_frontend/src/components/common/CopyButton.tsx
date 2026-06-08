import { useState, useRef, useEffect } from 'react';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
        } catch (err) {
          console.error('Fallback copy failed', err);
        }
        document.body.removeChild(textArea);
      }
      setCopied(true);
      timeoutRef.current = window.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <button onClick={handleCopy} style={styles.button} title="Copy to clipboard">
      {copied ? '✓ Copied' : '📋 Copy'}
    </button>
  );
}

const styles = {
  button: {
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border)',
    padding: '0.25rem 0.5rem',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    fontSize: '0.8rem',
    transition: 'all 0.2s',
  }
};

export default CopyButton;
