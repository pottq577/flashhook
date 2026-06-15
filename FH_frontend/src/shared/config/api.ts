export function resolveApiBaseUrl(): string {
  // 환경변수(VITE_API_BASE_URL)가 있으면 우선 사용, 없으면 상대경로(/api)로 통일
  // 로컬: vite.config.ts proxy가 /api 를 http://localhost:8080 으로 포워딩
  // 배포: Nginx가 /api 를 백엔드로 리버스 프록시
  const envUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
  const rawUrl = envUrl ? envUrl : '/api';
  
  return rawUrl.replace(/\/+$/, '');
}
