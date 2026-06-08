function JsonViewer({ data }: { data: unknown }) {
  if (data === undefined || data === null) {
    return (
      <div style={styles.container}>
        <span style={styles.empty}>null</span>
      </div>
    );
  }

  let content = '';
  if (typeof data === 'string') {
    try {
      // JSON 문자열인 경우 예쁘게 포맷팅
      const parsed = JSON.parse(data);
      content = JSON.stringify(parsed, null, 2);
    } catch {
      content = data;
    }
  } else {
    content = JSON.stringify(data, null, 2);
  }

  return (
    <div style={styles.container}>
      <pre style={styles.pre}>
        <code style={styles.code}>{content}</code>
      </pre>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: 'var(--bg-tertiary)',
    borderRadius: 'var(--radius-md)',
    padding: '1rem',
    overflowX: 'auto' as const,
    border: '1px solid var(--border)',
  },
  pre: {
    margin: 0,
  },
  code: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.85rem',
    color: 'var(--text-primary)',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-all' as const,
  },
  empty: {
    color: 'var(--text-muted)',
    fontStyle: 'italic' as const,
  }
};

export default JsonViewer;
