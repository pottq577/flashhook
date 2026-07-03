export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  try {
    const url = new URL(request.url);
    
    // vercel.json rewrite에 의해 /session/123 -> /api/session?logId=123 형태로 파라미터가 넘어옴
    const logId = url.searchParams.get('logId');

    if (!logId) {
      // logId가 없으면 원래 SPA의 index.html로 우회
      const indexUrl = new URL('/', request.url);
      return fetch(indexUrl);
    }

    // 1. 백엔드 API에서 공개 로그 조회
    const apiUrl = `https://api.flashhook.site/api/public/logs/${logId}`;
    const apiResponse = await fetch(apiUrl, {
      headers: { 'User-Agent': 'FlashHook-Edge' }
    });

    let title = 'FlashHook 공유 로그';
    let description = '안전하게 공유된 FlashHook 로그입니다.';

    if (apiResponse.ok) {
      const logData = await apiResponse.json();
      title = `FlashHook 공유 로그 - ${logData.method}`;
      description = `안전하게 공유된 FlashHook 로그입니다. 수신 시간: ${new Date(logData.receivedAt).toLocaleString()}`;
    }

    // 2. 자신의 index.html 로드
    // Edge Runtime 에서는 파일 시스템에 접근할 수 없으므로 자기 자신의 루트 URL(/)을 fetch하여 index.html을 가져옵니다.
    const baseUrl = new URL('/', request.url);
    const indexResponse = await fetch(baseUrl);
    let html = await indexResponse.text();

    // 3. 메타 태그 주입
    html = html.replace(
      /<title>(.*?)<\/title>/,
      `<title>${title}</title>`
    );
    
    const ogTags = `
      <meta property="og:title" content="${title}"/>
      <meta property="og:description" content="${description}"/>
      <meta property="og:type" content="website"/>
      <meta name="description" content="${description}"/>
    `;

    html = html.replace('</head>', `${ogTags}</head>`);

    // 4. 조작된 HTML 응답 반환
    return new Response(html, {
      status: 200,
      headers: { 
        'Content-Type': 'text/html; charset=utf-8',
        // 브라우저가 SPA 리소스를 올바른 경로에서 찾을 수 있도록 Cache-Control 설정 (선택사항)
        'Cache-Control': 'public, max-age=60, s-maxage=60'
      },
    });

  } catch (error) {
    console.error('Edge Function Error:', error);
    // 에러 발생 시 원본 index.html 반환하여 SPA에서 직접 처리하도록 Fallback
    return fetch(new URL('/', request.url));
  }
}
