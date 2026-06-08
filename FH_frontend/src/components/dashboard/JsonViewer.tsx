interface JsonViewerProps {
  data: unknown;
}

function JsonViewer({ data }: JsonViewerProps) {
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}

export default JsonViewer;
