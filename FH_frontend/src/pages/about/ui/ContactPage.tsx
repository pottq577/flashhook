import Header from '@/widgets/header/ui/Header';
import Footer from '@/widgets/footer/ui/Footer';
import styles from './about.module.css';

function ContactPage() {
  return (
    <div className={styles.container}>
      <Header />
      <h1 className={styles.title}>문의하기</h1>
      
      <section className={styles.section}>
        <p className={styles.description} style={{ textWrap: 'pretty' }}>
          FlashHook을 쓰면서 불편했던 점이나 의견이 있다면 편하게 알려주세요.
        </p>

        <div className={styles.contactBox}>
          <h3>이메일 지원</h3>
          <p className={styles.contactText} style={{ textWrap: 'pretty' }}>
            궁금한 점이나 버그, 필요한 기능이 있다면 아래 링크로 남겨주세요:<br/>
            <a href="https://forms.gle/5mQCgRZktwEyaYcx7" target="_blank" rel="noopener noreferrer" className={styles.link}>
              문의하기 (Google Forms)
            </a>
          </p>
        </div>

        <div className={styles.contactBoxSecondary}>
          <h3>GitHub 이슈</h3>
          <p className={styles.contactText} style={{ textWrap: 'pretty' }}>
            공개적으로 이슈를 남기고 싶다면 GitHub 저장소에 등록할 수 있어요.<br/>
            <a href="https://github.com/pottq577/flashhook/issues" target="_blank" rel="noopener noreferrer" className={styles.link}>GitHub 저장소 보기</a>
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
}

export default ContactPage;
