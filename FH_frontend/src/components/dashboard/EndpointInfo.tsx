import type { Endpoint } from '../../types/endpoint';

interface EndpointInfoProps {
  endpoint: Endpoint;
}

function EndpointInfo({ endpoint }: EndpointInfoProps) {
  return <div>EndpointInfo: {endpoint.id}</div>;
}

export default EndpointInfo;
