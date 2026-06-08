import { useParams } from 'react-router-dom';
import { useEndpoint } from '../hooks/useEndpoint';
import { useLogs } from '../hooks/useLogs';
import { useSSE } from '../hooks/useSSE';
import Header from '../components/common/Header';
import EndpointInfo from '../components/dashboard/EndpointInfo';
import ConnectionStatus from '../components/dashboard/ConnectionStatus';
import LogList from '../components/dashboard/LogList';
import LogDetail from '../components/dashboard/LogDetail';

function DashboardPage() {
  const { endpointId } = useParams<{ endpointId: string }>();
  const { endpoint, loading, error } = useEndpoint(endpointId!);
  const { logs, selectedLog, addLog, selectLog } = useLogs(endpointId!);
  const { status } = useSSE(endpointId!, addLog);

  if (loading) return <div style={styles.center}>Loading...</div>;
  if (error) return <div style={styles.center}>Error: {error}</div>;
  if (!endpoint) return <div style={styles.center}>Endpoint not found</div>;

  return (
    <div style={styles.container}>
      <Header />
      <EndpointInfo endpoint={endpoint} />
      <ConnectionStatus status={status} />
      
      <main style={styles.main}>
        <section style={styles.sidebar}>
          <LogList 
            logs={logs} 
            selectedLogId={selectedLog?.logId || null} 
            onSelect={(logId) => selectLog(endpoint.endpointId, logId)} 
          />
        </section>
        <section style={styles.content}>
          <LogDetail log={selectedLog} />
        </section>
      </main>
    </div>
  );
}

const styles = {
  center: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    fontSize: '1.25rem',
  },
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100vh',
    backgroundColor: 'var(--bg-primary)',
  },
  main: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
    borderTop: '1px solid var(--border)',
  },
  sidebar: {
    width: '350px',
    borderRight: '1px solid var(--border)',
    backgroundColor: 'var(--bg-secondary)',
    overflowY: 'auto' as const,
  },
  content: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '1.5rem',
    backgroundColor: 'var(--bg-primary)',
  }
};

export default DashboardPage;
