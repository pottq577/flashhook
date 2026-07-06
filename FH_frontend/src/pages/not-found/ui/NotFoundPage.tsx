import { Link } from "react-router-dom";
import styles from "@/pages/not-found/ui/NotFoundPage.module.css";

function NotFoundPage() {
  return (
    <div className={styles.container}>
      <h1>404 - 페이지를 찾을 수 없어요</h1>
      <Link to="/" className={styles.link}>
        홈으로 돌아가기
      </Link>
    </div>
  );
}

export default NotFoundPage;
