export function formatExpiresAt(expiresAt: string): string {
  const d = new Date(expiresAt);
  if (isNaN(d.getTime())) {
    return "-";
  }
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
