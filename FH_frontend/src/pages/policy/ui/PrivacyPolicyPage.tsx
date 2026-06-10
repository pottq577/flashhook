import Header from '@/widgets/header/ui/Header';
import Footer from '@/widgets/footer/ui/Footer';

function PrivacyPolicyPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <Header />
      <h1 style={{ marginTop: '2rem' }}>Privacy Policy</h1>
      <p>Last updated: June 10, 2026</p>
      
      <section style={{ marginTop: '2rem' }}>
        <h2>1. Information We Collect</h2>
        <p>FlashHook is designed to be privacy-first. We do not require account creation, and we do not collect personal information such as names or emails. We temporarily store the HTTP requests sent to your generated webhook URLs.</p>
      </section>

      <section style={{ marginTop: '1.5rem' }}>
        <h2>2. How We Use Your Data</h2>
        <p>The HTTP payload data is strictly used to display the incoming webhook requests on your dashboard. This data is not shared with any third parties.</p>
      </section>

      <section style={{ marginTop: '1.5rem' }}>
        <h2>3. Data Retention</h2>
        <p>All endpoints and their associated webhook logs are completely and permanently deleted from our servers after 24 hours. You can also manually delete them at any time from your dashboard.</p>
      </section>

      <section style={{ marginTop: '1.5rem' }}>
        <h2>4. Contact Us</h2>
        <p>If you have any questions about our privacy policy, please visit our Contact page.</p>
      </section>
      <Footer />
    </div>
  );
}

export default PrivacyPolicyPage;
