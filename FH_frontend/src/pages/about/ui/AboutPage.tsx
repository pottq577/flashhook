import Header from '@/widgets/header/ui/Header';
import Footer from '@/widgets/footer/ui/Footer';

function AboutPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <Header />
      <h1 style={{ marginTop: '2rem' }}>FlashHook 소개</h1>
      
      <section style={{ marginTop: '2rem', lineHeight: '1.6' }}>
        <p>
          FlashHook은 단순한 문제를 해결하기 위해 만들어졌습니다. 개발자들은 로컬 터널(ngrok 등)을 설정하거나 복잡한 서드파티 플랫폼에 가입할 필요 없이, 웹훅과 HTTP 클라이언트를 빠르고 안정적으로 테스트할 방법이 필요합니다.
        </p>
        <p style={{ marginTop: '1rem' }}>
          우리는 개발 도구가 마찰이 없어야 한다고 믿습니다. 그렇기 때문에 FlashHook은 <strong>회원가입, 설치, 그리고 어떠한 설정도 필요하지 않습니다.</strong> 버튼 하나만 누르면 URL이 발급되고, 실시간으로 Payload를 검사할 준비가 완료됩니다.
        </p>
        <p style={{ marginTop: '1rem' }}>
          React, Spring Boot, 그리고 Server-Sent Events와 같은 최신 기술로 구축된 FlashHook은 빠르고 실시간의 경험을 제공합니다. 프라이버시를 보장하고 데이터 누적을 방지하기 위해 모든 데이터는 24시간 후 자동 파기됩니다.
        </p>
      </section>
      <Footer />
    </div>
  );
}

export default AboutPage;
