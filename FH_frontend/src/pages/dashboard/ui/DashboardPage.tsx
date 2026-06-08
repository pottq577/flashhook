import { useParams } from 'react-router-dom';
import { useEndpointQuery } from '../../../entities/endpoint/api/endpoint.queries';
import { useLogsQuery } from '../../../entities/log/api/log.queries';
import { useSSE } from '../../../entities/log/api/useSSE';
import { useLogStore } from '../../../entities/log/model/log.store';
import Header from '../../../widgets/header/ui/Header';
import EndpointInfo from '../../../widgets/endpoint-info/ui/EndpointInfo';
import ConnectionStatus from '../../../widgets/endpoint-info/ui/ConnectionStatus';
import LogList from '../../../widgets/log-viewer/ui/LogList';
import LogDetail from '../../../widgets/log-viewer/ui/LogDetail';
import styles from './DashboardPage.module.css';

function DashboardPage() {
  const { endpointId } = useParams<{ endpointId: string }>();
  
  const { data: endpoint, isLoading, error } = useEndpointQuery(endpointId);
  
  // Fetch initial logs
  useLogsQuery(endpointId || '', 0, 50);

  const { logs, selectedLog, addLog, setSelectedLog } = useLogStore();

  const { status } = useSSE(endpointId, addLog);

  if (!endpointId) return <div className={styles.center}>Invalid Endpoint ID</div>;
  if (isLoading) return <div className={styles.center}>Loading...</div>;
  if (error) return <div className={styles.center}>Error: {(error as Error).message}</div>;
  if (!endpoint) return <div className={styles.center}>Endpoint not found</div>;

  return (
    <div className={styles.container}>
      <Header />
      <EndpointInfo endpoint={endpoint} />
      <ConnectionStatus status={status} />
      
      <main className={styles.main}>
        <section className={styles.sidebar}>
          <LogList 
            logs={logs} 
            selectedLogId={selectedLog?.logId || null} 
            onSelect={(logId) => {
              const log = logs.find(l => l.logId === logId);
              if (log) {
                // In a real app we might fetch details here, but for now we set what we have
                // The log detail query hook can be used inside LogDetail component
                setSelectedLog({ ...log, url: '', headers: {}, queryParams: {}, body: {} }); 
              }
            }} 
            endpointId={endpointId}
          />
        </section>
        <section className={styles.content}>
          <LogDetail logId={selectedLog?.logId} endpointId={endpointId} />
        </section>
      </main>
    </div>
  );
}

export default DashboardPage;
