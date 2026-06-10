import styles from './ConnectionStatus.module.css';

function ConnectionStatus({ status }: { status: 'connecting' | 'connected' | 'disconnected' }) {
  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'var(--success)';
      case 'connecting': return 'var(--warning)';
      case 'disconnected': return 'var(--danger)';
      default: return 'var(--text-muted)';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected': return '연결됨';
      case 'connecting': return '연결 중';
      case 'disconnected': return '연결 끊김';
      default: return status;
    }
  };

  return (
    <div className={styles.container}>
      <span className={styles.dot} style={{ backgroundColor: getStatusColor() }}></span>
      <span className={styles.text}>
        {getStatusText()}
      </span>
    </div>
  );
}

export default ConnectionStatus;
