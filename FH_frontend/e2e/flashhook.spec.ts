import { test, expect } from '@playwright/test';

test.describe('FlashHook Core Journey', () => {
  test('should create endpoint, receive webhook, and show log', async ({ page, request }) => {
    // 1. 엔드포인트 생성
    await page.goto('/');
    
    // 버튼 텍스트나 접근성 역할에 맞춰 수정 필요
    const createBtn = page.getByRole('button', { name: /URL 생성하기/i });
    await createBtn.click();

    // 동의 모달에서 동의 버튼 클릭
    const acceptBtn = page.getByRole('button', { name: /모두 동의하고 생성하기/i });
    await acceptBtn.click();

    // URL 표출 대기
    const urlLocator = page.getByTestId('webhook-url'); 
    await expect(urlLocator).toBeVisible();
    
    const webhookUrl = (await urlLocator.textContent()) || '';
    expect(webhookUrl).toContain('http');

    // 2. 웹훅 전송 (API 요청 모의)
    const response = await request.post(webhookUrl, {
      data: {
        message: 'Hello E2E',
      },
    });
    expect(response.ok()).toBeTruthy();

    // 3. 로그 조회 확인
    // 가설: UI에 전송한 데이터가 실시간 또는 새로고침 후 표시됨
    // LogItem 클릭 (첫번째 로그)
    const logItem = page.getByText('POST').first();
    await expect(logItem).toBeVisible({ timeout: 10000 });
    await logItem.click();

    // LogDetail(JsonViewer) 내에서 전송한 데이터 확인
    await expect(
      page.locator('[data-testid="log-detail"]')
        .getByText('Hello E2E')
    ).toBeVisible();
  });
});
