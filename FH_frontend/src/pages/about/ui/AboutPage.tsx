import { Header } from "@/widgets/header";
import { Footer } from "@/widgets/footer";
import { SEOHead } from "@/shared/ui/SEOHead";
import styles from "./about.module.css";

function AboutPage() {
  return (
    <div className={styles.container}>
      <SEOHead
        title="소개 - FlashHook"
        description="복잡한 회원가입이나 터널링 설정 없이 웹훅과 HTTP 요청을 바로 테스트할 수 있는 FlashHook에 대해 알아보세요."
      />
      <Header />
      <h1 className={styles.title}>FlashHook 소개</h1>

      <section className={styles.section}>
        <p className={styles.text} style={{ textWrap: "pretty" }}>
          개발할 때 복잡한 가입 절차나 터널링 설정 없이, 웹훅과 HTTP 요청을 바로
          테스트할 수 있도록 FlashHook을 만들었어요.
        </p>
        <p className={styles.text} style={{ textWrap: "pretty" }}>
          개발 도구는 편해야 하니까 회원가입, 설치, 복잡한 설정을 모두 없앴어요.
          버튼 하나만 누르면 URL을 발급받고 바로 요청 내용을 확인할 수 있어요.
        </p>
        <p className={styles.text} style={{ textWrap: "pretty" }}>
          FlashHook은 빠르고 쾌적하게 동작해요. 소중한 정보가 남지 않도록 모든
          데이터는 24시간 뒤에 알아서 지울게요.
        </p>
      </section>
      <Footer />
    </div>
  );
}

export default AboutPage;
