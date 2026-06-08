import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createEndpoint } from '../api/endpoints';
import * as tokenStorage from '../utils/tokenStorage';

function LandingPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await createEndpoint();
      tokenStorage.set(response.endpointId, response.accessToken);
      navigate(`/dashboard/${response.endpointId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create endpoint');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>⚡ FlashHook</h1>
        <p style={styles.subtitle}>Instantly inspect HTTP webhooks without signup.</p>
      </header>

      <main style={styles.main}>
        <div style={styles.card}>
          <h2>Create a new Webhook URL</h2>
          <p style={styles.description}>
            Generate a unique, temporary URL to receive and inspect webhooks instantly.
            Data is strictly isolated and automatically deleted after 24 hours.
          </p>
          
          <button 
            style={{...styles.button, ...(isLoading ? styles.buttonDisabled : {})}} 
            onClick={handleCreate}
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? 'Creating...' : 'Generate URL'}
          </button>
          
          {error && <p style={styles.error} role="alert">{error}</p>}
        </div>
      </main>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '2rem',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '3rem',
  },
  title: {
    fontSize: '3rem',
    color: 'var(--accent)',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '1.25rem',
    color: 'var(--text-secondary)',
  },
  main: {
    width: '100%',
    maxWidth: '500px',
  },
  card: {
    backgroundColor: 'var(--bg-secondary)',
    padding: '2rem',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-md)',
    textAlign: 'center' as const,
    border: '1px solid var(--border)',
  },
  description: {
    color: 'var(--text-muted)',
    margin: '1rem 0 2rem',
    fontSize: '0.9rem',
  },
  button: {
    backgroundColor: 'var(--accent)',
    color: '#000',
    border: 'none',
    padding: '1rem 2rem',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    width: '100%',
    transition: 'background-color 0.2s',
  },
  buttonDisabled: {
    backgroundColor: 'var(--text-muted)',
    cursor: 'not-allowed',
  },
  error: {
    color: 'var(--danger)',
    marginTop: '1rem',
    fontSize: '0.9rem',
  }
};

export default LandingPage;
