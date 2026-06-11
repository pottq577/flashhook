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
      case 'connected': return '[ CONNECTED ]';
      case 'connecting': return '[ CONNECTING ]';
      case 'disconnected': return '[ DISCONNECTED ]';
      default: return `[ ${status.toUpperCase()} ]`;
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
