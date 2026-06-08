interface MethodBadgeProps {
  method: string;
}

function MethodBadge({ method }: { method: string }) {
  const m = method.toUpperCase();
  const colorVar = `--method-${m.toLowerCase()}`;
  
  return (
    <span style={{...styles.badge, color: `var(${colorVar}, var(--accent))`}}>
      {m}
    </span>
  );
}

const styles = {
  badge: {
    fontSize: '0.8rem',
    fontWeight: 'bold',
    padding: '0.2rem 0.4rem',
    borderRadius: '4px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  }
};

export default MethodBadge;
