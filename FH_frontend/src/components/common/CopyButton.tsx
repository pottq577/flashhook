interface CopyButtonProps {
  text: string;
}

function CopyButton({ text }: CopyButtonProps) {
  // TODO: 클립보드 복사 구현
  return <button data-copy={text}>Copy</button>;
}

export default CopyButton;
