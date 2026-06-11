import Header from '@/widgets/header/ui/Header';
import Footer from '@/widgets/footer/ui/Footer';
import styles from './about.module.css';

function AboutPage() {
  return (
    <div className={styles.container}>
      <Header />
      <h1 className={styles.title}>FlashHook 소개</h1>
      
      <section className={styles.section}>
        <p>
          FlashHook은 단순한 문제를 해결하기 위해 만들었어요. 개발자들은 로컬 터널(ngrok 등)을 설정하거나 복잡한 서드파티 플랫폼에 가입할 필요 없이, 웹훅과 HTTP 클라이언트를 빠르고 안정적으로 테스트할 수 있어야 해요.
        </p>
        <p className={styles.paragraph}>
          우리는 개발 도구가 편해야 한다고 믿어요. 그래서 FlashHook은 <strong>회원가입, 설치, 복잡한 설정이 필요 없어요.</strong> 버튼 하나만 누르면 URL이 발급되고, 실시간으로 Payload를 검사할 준비가 끝나요.
        </p>
        <p className={styles.paragraph}>
          React, Spring Boot, 그리고 Server-Sent Events와 같은 최신 기술로 만든 FlashHook은 빠르고 쾌적한 경험을 제공해요. 프라이버시를 보호하고 데이터가 쌓이지 않도록, 모든 데이터는 24시간이 지나면 자동으로 삭제돼요.
        </p>
      </section>
      <Footer />
    </div>
  );
}

export default AboutPage;
