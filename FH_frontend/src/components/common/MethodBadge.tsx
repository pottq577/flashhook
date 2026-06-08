interface MethodBadgeProps {
  method: string;
}

function MethodBadge({ method }: MethodBadgeProps) {
  return <span>{method}</span>;
}

export default MethodBadge;
