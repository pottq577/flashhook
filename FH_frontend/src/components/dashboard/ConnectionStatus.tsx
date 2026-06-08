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
    <div style={styles.container}>
      <span style={{...styles.dot, backgroundColor: getStatusColor()}}></span>
      <span style={styles.text}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1.5rem',
    backgroundColor: 'var(--bg-tertiary)',
    borderBottom: '1px solid var(--border)',
    fontSize: '0.9rem',
  },
  dot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  text: {
    color: 'var(--text-secondary)',
  }
};

export default ConnectionStatus;
