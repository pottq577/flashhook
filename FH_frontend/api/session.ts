export const config = {
  runtime: 'edge',
};

function escapeHtml(unsafe: string) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default async function handler(request: Request) {
  try {
    const url = new URL(request.url);
    
    const logId = url.searchParams.get('logId');

    if (!logId) {
      const indexUrl = new URL('/', request.url);
      return fetch(indexUrl);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const apiHost = process.env.VITE_API_URL || 'https://api.flashhook.site';
    const apiUrl = `${apiHost}/api/public/logs/${logId}`;
    const apiResponse = await fetch(apiUrl, {
      headers: { 'User-Agent': 'FlashHook-Edge' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    let title = 'FlashHook 공유 로그';
    let description = '안전하게 공유된 FlashHook 로그입니다.';

    if (apiResponse.ok) {
      const logData = await apiResponse.json();
      if (logData && typeof logData === 'object' && 'method' in logData && 'receivedAt' in logData) {
        title = `FlashHook 공유 로그 - ${String(logData.method)}`;
        const d = new Date(String(logData.receivedAt));
        const dateStr = isNaN(d.getTime()) ? '알 수 없는 시간' : d.toLocaleString();
        description = `안전하게 공유된 FlashHook 로그입니다. 수신 시간: ${dateStr}`;
      }
    }

    const indexController = new AbortController();
    const indexTimeoutId = setTimeout(() => indexController.abort(), 5000);
    const baseUrl = new URL('/', request.url);
    const indexResponse = await fetch(baseUrl, { signal: indexController.signal });
    clearTimeout(indexTimeoutId);
    let html = await indexResponse.text();

    const safeTitle = escapeHtml(title);
    const safeDescription = escapeHtml(description);

    html = html.replace(
      /<title>(.*?)<\/title>/,
      `<title>${safeTitle}</title>`
    );
    
    const ogTags = `
      <meta property="og:title" content="${safeTitle}"/>
      <meta property="og:description" content="${safeDescription}"/>
      <meta property="og:type" content="website"/>
      <meta name="description" content="${safeDescription}"/>
      ${url.searchParams.get('noindex') === 'true' ? '<meta name="robots" content="noindex" />' : ''}
    `;

    html = html.replace('</head>', `${ogTags}</head>`);

    return new Response(html, {
      status: 200,
      headers: { 
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=60, s-maxage=60'
      },
    });

  } catch (error) {
    console.error('Edge Function Error:', error);
    return fetch(new URL('/', request.url));
  }
}
