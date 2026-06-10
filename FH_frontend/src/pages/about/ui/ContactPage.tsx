import Header from '@/widgets/header/ui/Header';
import Footer from '@/widgets/footer/ui/Footer';
import styles from './about.module.css';

function ContactPage() {
  return (
    <div className={styles.container}>
      <Header />
      <h1 className={styles.title}>문의하기</h1>
      
      <section className={styles.section}>
        <p>
          FlashHook을 사용하시면서 겪은 문제나 피드백을 언제든지 알려주세요.
        </p>
        
        <div className={styles.contactBox}>
          <h3>이메일 지원</h3>
          <p className={styles.contactText}>
            일반적인 문의, 버그 리포트, 또는 기능 제안이 있으시다면 아래 이메일로 연락해주세요:<br/>
            <strong>support@flashhook.kr</strong>
          </p>
        </div>

        <div className={styles.contactBoxSecondary}>
          <h3>GitHub 이슈</h3>
          <p className={styles.contactText}>
            공개적으로 이슈를 추적하는 것을 선호하신다면 GitHub 저장소에 이슈를 등록하실 수 있습니다.<br/>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className={styles.link}>GitHub 저장소 보기</a>
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
}

export default ContactPage;
