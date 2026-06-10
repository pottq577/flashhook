import type { WebhookLog } from '@/entities/log/model/log.schema';
import { motion, useReducedMotion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import LogItem from './LogItem';
import styles from './LogList.module.css';

interface LogListProps {
  logs: WebhookLog[];
  selectedLogId: string | null;
  onSelect: (logId: string) => void;
  endpointId?: string;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

function LogList({ logs, selectedLogId, onSelect }: LogListProps) {
  const shouldReduceMotion = useReducedMotion();

  if (!logs || logs.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No webhooks received yet.</p>
        <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Send a request to your unique URL to see it here.</p>
      </div>
    );
  }

  return (
    <motion.div 
      className={styles.container}
      variants={shouldReduceMotion ? undefined : containerVariants}
      initial={shouldReduceMotion ? false : "hidden"}
      animate={shouldReduceMotion ? undefined : "show"}
    >
      {logs.map((log) => (
        <motion.div key={log.logId} variants={shouldReduceMotion ? undefined : itemVariants}>
          <LogItem 
            log={log} 
            isSelected={selectedLogId === log.logId} 
            onClick={() => onSelect(log.logId)} 
          />
        </motion.div>
      ))}
    </motion.div>
  );
}

export default LogList;
