interface ConnectionStatusProps {
  status: 'connecting' | 'connected' | 'disconnected';
}

function ConnectionStatus({ status }: ConnectionStatusProps) {
  return <div>ConnectionStatus: {status}</div>;
}

export default ConnectionStatus;
