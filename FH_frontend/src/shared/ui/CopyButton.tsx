import { useState, useEffect } from 'react';
import Toast from './Toast';
import styles from './CopyButton.module.css';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setShowToast(true);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <>
      <button 
        onClick={handleCopy} 
        className={styles.button}
        title="Copy to clipboard"
        aria-label="Copy to clipboard"
      >
        {copied ? (
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        ) : (
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        )}
      </button>
      
      {showToast && (
        <Toast 
          message="Copied to clipboard!" 
          onClose={() => setShowToast(false)} 
        />
      )}
    </>
  );
}

export default CopyButton;
