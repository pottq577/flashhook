import { useParams } from 'react-router-dom';
import { useEndpoint } from '../hooks/useEndpoint';

function DashboardPage() {
  const { endpointId } = useParams<{ endpointId: string }>();
  const { endpoint, loading, error } = useEndpoint(endpointId!);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!endpoint) return <div>Endpoint not found</div>;

  return <div>DashboardPage: {endpoint.id}</div>;
}

export default DashboardPage;
