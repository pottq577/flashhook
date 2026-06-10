import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateEndpointMutation } from '@/entities/endpoint/api/endpoint.queries';
import Footer from '@/widgets/footer/ui/Footer';
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
      {/* Hero Section */}
      <header className={styles.hero}>
        <h1 className={styles.title}>⚡ FlashHook</h1>
        <p className={styles.subtitle}>Instantly inspect HTTP webhooks without signup.</p>
        
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
      </header>

      {/* Features Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Key Features</h2>
        <div className={styles.grid}>
          <div className={styles.featureItem}>
            <h3>🚀 Instant Setup</h3>
            <p>No registration or CLI required. Click a button and get your webhook URL immediately.</p>
          </div>
          <div className={styles.featureItem}>
            <h3>⚡ Real-time Logging</h3>
            <p>Incoming requests appear instantly on your dashboard powered by Server-Sent Events (SSE).</p>
          </div>
          <div className={styles.featureItem}>
            <h3>🎭 Mock Responses</h3>
            <p>Configure custom HTTP status codes, headers, and JSON body to mock specific API responses.</p>
          </div>
          <div className={styles.featureItem}>
            <h3>🛡️ Privacy First</h3>
            <p>Your unique endpoint and all associated logs are completely purged from our servers after 24 hours.</p>
          </div>
        </div>
      </section>

      {/* How to use Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>How to Use</h2>
        <ol className={styles.steps}>
          <li><strong>Generate:</strong> Click the "Generate URL" button above.</li>
          <li><strong>Copy:</strong> Copy your unique webhook URL from the dashboard.</li>
          <li><strong>Configure:</strong> Paste it into the webhook settings of the service you're integrating (e.g., Stripe, GitHub).</li>
          <li><strong>Inspect:</strong> Watch the dashboard as requests arrive in real-time, complete with headers, body, and query params.</li>
        </ol>
      </section>

      {/* FAQ Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
        <div className={styles.faqList}>
          <div className={styles.faqItem}>
            <h3>Is FlashHook free to use?</h3>
            <p>Yes, FlashHook is completely free for individual developers. We provide this tool to help the community build better integrations.</p>
          </div>
          <div className={styles.faqItem}>
            <h3>How long are my logs kept?</h3>
            <p>To ensure privacy and maintain system performance, all webhook endpoints and their logs are automatically deleted 24 hours after creation.</p>
          </div>
          <div className={styles.faqItem}>
            <h3>Can I customize the HTTP response?</h3>
            <p>Absolutely. You can use the "Mock Config" tab on your dashboard to set a custom status code, delay, and JSON body for incoming requests.</p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default LandingPage;
