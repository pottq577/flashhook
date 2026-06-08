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

  return (
    <div className={styles.container}>
      <span className={styles.dot} style={{ backgroundColor: getStatusColor() }}></span>
      <span className={styles.text}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    </div>
  );
}

export default ConnectionStatus;
