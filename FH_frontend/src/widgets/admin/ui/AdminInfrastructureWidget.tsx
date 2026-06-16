import { Activity, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import styles from './AdminWidgets.module.css';

export const AdminInfrastructureWidget = () => {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>시스템 인프라 관리</h2>
      </div>
      
      <div style={{ marginTop: 'var(--spacing-md)' }}>
        <motion.a
          href="http://localhost:3000"
          target="_blank"
          rel="noreferrer"
          whileHover={{ y: -2 }}
          className={styles.infraCard}
        >
          <div className={styles.infraHeader}>
            <div className={styles.infraTitleWrap}>
              <div className={styles.infraIcon}>
                <Activity size={20} />
              </div>
              <h3 className={styles.infraTitle}>Grafana 대시보드</h3>
            </div>
            <ExternalLink size={18} className={styles.infraLinkIcon} />
          </div>
          <p className={styles.infraDesc}>
            Prometheus에서 수집한 시스템 메트릭(CPU, 메모리, 트래픽 등)을 상세하게 관제합니다.
          </p>
          <div className={styles.infraStatus}>
            <span className={styles.statusDot}>
              <span className={styles.statusDotPing}></span>
              <span className={styles.statusDotCore}></span>
            </span>
            <span>Monitoring Active</span>
          </div>
        </motion.a>
      </div>
    </div>
  );
};
