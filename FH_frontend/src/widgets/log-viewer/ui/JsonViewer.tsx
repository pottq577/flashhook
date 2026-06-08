import styles from './JsonViewer.module.css';

function JsonViewer({ data }: { data: unknown }) {
  if (data === undefined || data === null) {
    return (
      <div className={styles.container}>
        <span className={styles.empty}>null</span>
      </div>
    );
  }

  let content: string;
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      content = JSON.stringify(parsed, null, 2);
    } catch {
      content = data;
    }
  } else {
    content = JSON.stringify(data, null, 2);
  }

  return (
    <div className={styles.container}>
      <pre className={styles.pre}>
        <code className={styles.code}>{content}</code>
      </pre>
    </div>
  );
}

export default JsonViewer;
