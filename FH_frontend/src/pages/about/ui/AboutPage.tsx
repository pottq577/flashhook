import Header from '@/widgets/header/ui/Header';
import Footer from '@/widgets/footer/ui/Footer';

function AboutPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <Header />
      <h1 style={{ marginTop: '2rem' }}>About FlashHook</h1>
      
      <section style={{ marginTop: '2rem', lineHeight: '1.6' }}>
        <p>
          FlashHook was created to solve a simple problem: developers often need a quick, reliable way to test webhooks and HTTP clients without the hassle of setting up local tunnels (like ngrok) or creating accounts on complex third-party platforms.
        </p>
        <p style={{ marginTop: '1rem' }}>
          We believe development tools should be frictionless. That's why FlashHook requires <strong>no signup, no installation, and no configuration</strong>. You click one button, get a URL, and you're ready to inspect payloads in real-time.
        </p>
        <p style={{ marginTop: '1rem' }}>
          Built with modern technologies like React, Spring Boot, and Server-Sent Events, FlashHook offers a snappy, real-time experience. To ensure privacy and reduce clutter, all data is automatically purged after 24 hours.
        </p>
      </section>
      <Footer />
    </div>
  );
}

export default AboutPage;
