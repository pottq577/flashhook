import Header from '@/widgets/header/ui/Header';
import Footer from '@/widgets/footer/ui/Footer';

function TermsPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <Header />
      <h1 style={{ marginTop: '2rem' }}>Terms of Service</h1>
      <p>Last updated: June 10, 2026</p>

      <section style={{ marginTop: '2rem' }}>
        <h2>1. Acceptance of Terms</h2>
        <p>By using FlashHook, you agree to these Terms of Service. If you do not agree, do not use the service.</p>
      </section>

      <section style={{ marginTop: '1.5rem' }}>
        <h2>2. Use of Service</h2>
        <p>FlashHook provides temporary webhook URLs for testing and development purposes. You agree not to use the service for any illegal activities, distributing malware, or abusing third-party APIs.</p>
      </section>

      <section style={{ marginTop: '1.5rem' }}>
        <h2>3. Rate Limiting and Abuse</h2>
        <p>We implement rate limiting to ensure service stability. Creating excessive endpoints or sending an unreasonable amount of requests may result in a temporary or permanent block of your IP address.</p>
      </section>

      <section style={{ marginTop: '1.5rem' }}>
        <h2>4. Disclaimer of Warranties</h2>
        <p>The service is provided "AS IS" without warranties of any kind. We do not guarantee that the service will be uninterrupted or error-free.</p>
      </section>
      <Footer />
    </div>
  );
}

export default TermsPage;
