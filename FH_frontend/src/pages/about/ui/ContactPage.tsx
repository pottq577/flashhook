import Header from '@/widgets/header/ui/Header';
import Footer from '@/widgets/footer/ui/Footer';

function ContactPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <Header />
      <h1 style={{ marginTop: '2rem' }}>Contact Us</h1>
      
      <section style={{ marginTop: '2rem', lineHeight: '1.6' }}>
        <p>
          We'd love to hear your feedback or help you with any issues you're experiencing with FlashHook.
        </p>
        
        <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
          <h3>Email Support</h3>
          <p style={{ marginTop: '0.5rem' }}>
            For general inquiries, bug reports, or feature requests, please email us at:<br/>
            <strong>support@flashhook.kr</strong>
          </p>
        </div>

        <div style={{ marginTop: '1.5rem', padding: '1.5rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
          <h3>GitHub Issues</h3>
          <p style={{ marginTop: '0.5rem' }}>
            You can also open an issue on our GitHub repository if you prefer tracking it publicly.<br/>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-color)' }}>View GitHub Repository</a>
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
}

export default ContactPage;
