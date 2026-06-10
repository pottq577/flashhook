import Header from '@/widgets/header/ui/Header';
import Footer from '@/widgets/footer/ui/Footer';

function ContactPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <Header />
      <h1 style={{ marginTop: '2rem' }}>문의하기</h1>
      
      <section style={{ marginTop: '2rem', lineHeight: '1.6' }}>
        <p>
          FlashHook을 사용하시면서 겪은 문제나 피드백을 언제든지 알려주세요.
        </p>
        
        <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
          <h3>이메일 지원</h3>
          <p style={{ marginTop: '0.5rem' }}>
            일반적인 문의, 버그 리포트, 또는 기능 제안이 있으시다면 아래 이메일로 연락해주세요:<br/>
            <strong>support@flashhook.kr</strong>
          </p>
        </div>

        <div style={{ marginTop: '1.5rem', padding: '1.5rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
          <h3>GitHub 이슈</h3>
          <p style={{ marginTop: '0.5rem' }}>
            공개적으로 이슈를 추적하는 것을 선호하신다면 GitHub 저장소에 이슈를 등록하실 수 있습니다.<br/>
            <a href="https://github.com/pottq577/flashhook" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-color)' }}>GitHub 저장소 보기</a>
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
}

export default ContactPage;
