import type { WebhookLog } from '@/entities/log/model/log.schema';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
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
        <p>아직 수신된 웹훅이 없습니다.</p>
        <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>위의 웹훅 URL로 요청을 보내면 이곳에 실시간으로 표시됩니다.</p>
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
      <AnimatePresence initial={false}>
        {logs.map((log) => (
          <motion.div 
            key={log.logId} 
            variants={shouldReduceMotion ? undefined : itemVariants}
            layout
            exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
          >
            <LogItem 
              log={log} 
              isSelected={selectedLogId === log.logId} 
              onClick={() => onSelect(log.logId)} 
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

export default LogList;
