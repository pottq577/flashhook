import styles from "@/shared/ui/MethodBadge.module.css";

function MethodBadge({ method }: { method: string }) {
  const getMethodColor = (m: string) => {
    switch (m.toUpperCase()) {
      case "GET":
        return "var(--method-get)";
      case "POST":
        return "var(--method-post)";
      case "PUT":
        return "var(--method-put)";
      case "DELETE":
        return "var(--method-delete)";
      case "PATCH":
        return "var(--method-patch)";
      default:
        return "var(--text-secondary)";
    }
  };

  return (
    <span
      className={styles.badge}
      style={{
        color: getMethodColor(method),
        borderColor: getMethodColor(method),
      }}
    >
      {method.toUpperCase()}
    </span>
  );
}

export default MethodBadge;
