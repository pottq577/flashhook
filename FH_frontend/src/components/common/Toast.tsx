interface ToastProps {
  message: string;
  isVisible: boolean;
}

function Toast({ message, isVisible }: ToastProps) {
  if (!isVisible) return null;

  return <div>{message}</div>;
}

export default Toast;
