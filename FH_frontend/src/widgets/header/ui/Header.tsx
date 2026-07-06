import { Link } from "react-router-dom";
import styles from "@/widgets/header/ui/Header.module.css";

function Header() {
  return (
    <header className={styles.header}>
      <Link to="/" className={styles.logo}>
        <img src="/favicon.svg" alt="" width="24" height="24" className={styles.logoIcon} fetchPriority="high" />
        FlashHook
      </Link>
      <nav className={styles.nav}>
        <a
          href="https://github.com/pottq577/flashhook"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
        >
          GitHub
        </a>
      </nav>
    </header>
  );
}

export default Header;
