import { useMemo } from "react";
import { logger } from "@/shared/lib/logger";
import styles from "@/widgets/log-viewer/ui/JsonViewer.module.css";

function parseData(data: unknown): string {
  if (data === undefined || data === null) return "";
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data);
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      logger.warn("Failed to parse string data as JSON in JsonViewer", {
        error: e,
        data: data.slice(0, 100),
      });
      return data;
    }
  }
  return JSON.stringify(data, null, 2);
}

function JsonViewer({ data }: { data: unknown }) {
  const content = useMemo(() => parseData(data), [data]);

  if (data === undefined || data === null) {
    return (
      <div className={styles.container}>
        <span className={styles.empty}>null</span>
      </div>
    );
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
