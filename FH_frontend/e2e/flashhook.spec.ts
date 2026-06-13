import { test, expect } from '@playwright/test';

test.describe('FlashHook Core Journey', () => {
  test('should create endpoint, receive webhook, and show log', async ({ page, request }) => {
    // 1. 엔드포인트 생성
    await page.goto('/');
    
    const createBtn = page.getByRole('button', { name: /CREATE_NEW_ENDPOINT/i });
    await createBtn.click();

    // 동의 모달에서 동의 버튼 클릭
    const acceptBtn = page.getByRole('button', { name: /모두 동의하고 시작하기/i });
    await acceptBtn.click();

    // URL 표출 대기 (대시보드 로드 + Redis 캐시 포함)
    const urlLocator = page.getByTestId('webhook-url'); 
    await expect(urlLocator).toBeVisible({ timeout: 15000 });
    
    const webhookUrl = (await urlLocator.textContent()) || '';
    expect(webhookUrl).toContain('http');
    console.log('Parsed webhookUrl:', webhookUrl);

    // SSE 연결 완료 대기 (Race condition 방지)
    await expect(page.getByText('[ CONNECTED ]')).toBeVisible({ timeout: 10000 });

    // 2. 웹훅 전송 (Content-Type 명시)
    const response = await request.post(webhookUrl.trim(), {
      headers: { 'Content-Type': 'application/json' },
      data: { message: 'Hello E2E' },
    });
    console.log('Webhook POST response status:', response.status(), await response.text());
    expect(response.ok()).toBeTruthy();

    // 3. 로그 목록에 POST 항목 대기 (SSE 실시간 수신)
    const logItem = page.getByTestId('log-item').filter({ hasText: 'POST' }).first();
    await expect(logItem).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/before-click.png' });
    await logItem.click();
    await page.screenshot({ path: 'test-results/after-click.png' });

    // 4. log-detail 패널 대기
    await expect(page.locator('[data-testid="log-detail"]')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/log-detail-visible.png' });

    // 5. LogDetail(JsonViewer) 내에서 전송한 데이터 확인
    await expect(
      page.locator('[data-testid="log-detail"]')
        .getByText('Hello E2E')
    ).toBeVisible({ timeout: 10000 });
  });
});
