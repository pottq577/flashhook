import { Link } from "react-router-dom";
import styles from "./Footer.module.css";

function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.links}>
          <Link to="/about">서비스 소개</Link>
          <Link to="/contact">문의하기</Link>
          <Link to="/privacy">개인정보처리방침</Link>
          <Link to="/terms">이용약관</Link>
        </div>
        <div className={styles.copyright}>
          &copy; {new Date().getFullYear()} FlashHook. 모든 권리 보유.
        </div>
      </div>
    </footer>
  );
}

export default Footer;
