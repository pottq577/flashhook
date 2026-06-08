import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateEndpointMutation } from '../../../entities/endpoint/api/endpoint.queries';
import styles from './LandingPage.module.css';

function LandingPage() {
  const navigate = useNavigate();
  const { mutateAsync: createEndpoint } = useCreateEndpointMutation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await createEndpoint(undefined);
      navigate(`/dashboard/${response.endpointId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create endpoint');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>⚡ FlashHook</h1>
        <p className={styles.subtitle}>Instantly inspect HTTP webhooks without signup.</p>
      </header>

      <main className={styles.main}>
        <div className={styles.card}>
          <h2>Create a new Webhook URL</h2>
          <p className={styles.description}>
            Generate a unique, temporary URL to receive and inspect webhooks instantly.
            Data is strictly isolated and automatically deleted after 24 hours.
          </p>
          
          <button 
            className={styles.button} 
            onClick={handleCreate}
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? 'Creating...' : 'Generate URL'}
          </button>
          
          {error && <p className={styles.error} role="alert">{error}</p>}
        </div>
      </main>
    </div>
  );
}

export default LandingPage;
