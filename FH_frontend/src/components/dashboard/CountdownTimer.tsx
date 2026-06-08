interface CountdownTimerProps {
  expiresAt: string;
}

function CountdownTimer({ expiresAt }: CountdownTimerProps) {
  // TODO: 카운트다운 로직 구현
  return <div>CountdownTimer: {expiresAt}</div>;
}

export default CountdownTimer;
