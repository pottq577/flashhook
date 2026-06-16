import { useAdminMetrics } from '@/entities/admin/api/useAdminQueries';
import { motion } from 'framer-motion';
import { RefreshCw, Users, Server, Activity } from 'lucide-react';
import { useEffect, useState } from 'react';
import styles from './AdminWidgets.module.css';

const AnimatedCounter = ({ value }: { value: number }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 1000;
    const increment = Math.ceil(value / (duration / 16));
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  return <span>{displayValue.toLocaleString()}</span>;
};

export const AdminMetricsWidget = () => {
  const { data, isLoading, isError, refetch, isFetching } = useAdminMetrics();

  if (isError) {
    return (
      <div className={styles.errorBox}>
        지표 데이터를 불러오는데 실패했습니다.
      </div>
    );
  }

  return (
    <div className={styles.metricsWrapper}>
      <div className={styles.header}>
        <h2 className={styles.title}>핵심 지표 요약</h2>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className={styles.refreshBtn}
        >
          <RefreshCw size={18} className={isFetching ? styles.spin : ''} />
        </button>
      </div>

      <div className={styles.metricsGrid}>
        {[
          {
            label: '오늘 생성된 엔드포인트',
            value: data?.endpointsCreatedToday || 0,
            icon: <Server size={24} />,
            iconClass: styles.metricIconBlue,
          },
          {
            label: '현재 활성 연결 (SSE)',
            value: data?.activeSseConnections || 0,
            icon: <Users size={24} />,
            iconClass: styles.metricIconGreen,
          },
          {
            label: '누적 웹훅 수신량',
            value: data?.totalWebhooksReceived || 0,
            icon: <Activity size={24} />,
            iconClass: styles.metricIconPurple,
          },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={styles.metricCard}
          >
            <div className={styles.metricHeader}>
              <div className={`${styles.metricIcon} ${item.iconClass}`}>
                {item.icon}
              </div>
              <h3 className={styles.metricLabel}>{item.label}</h3>
            </div>
            <div className={styles.metricValue}>
              {isLoading ? (
                <span>...</span>
              ) : (
                <AnimatedCounter value={item.value} />
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
