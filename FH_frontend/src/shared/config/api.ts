export function resolveApiBaseUrl(): string {
  // 1. 환경변수 확인
  const envUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
  
  // 2. 폴백 결정
  const rawUrl = envUrl ? envUrl : (import.meta.env.PROD ? 'https://api.flashhook.site/api' : 'http://localhost:8080/api');
  
  // 3. 후행 슬래시 제거 후 반환
  return rawUrl.replace(/\/+$/, '');
}
