/**
 * Mock API 프리셋 카탈로그
 *
 * 6개 외부 서비스의 실제 응답 스펙을 기반으로 한 정적 프리셋 목록.
 * docs/artifacts/02_mock_api_features.md 와 1:1 대응.
 *
 * ⚠️ 변경 시 FE 재배포 필요 (의도적으로 수용한 트레이드오프 — docs/adr/0001 참고)
 * ⚠️ 동적 프리셋(Slack URL Verification 등)은 Phase 2에서 presetType 필드로 처리 (docs/adr/0002 참고)
 */

export interface PresetScenario {
  id: string;
  label: string;
  desc: string;
  statusCode: number;
  delayMs: number;
  headers: Record<string, string>;
  body: string;
  isDynamic?: boolean;
  presetType?: string;
}

export interface PresetService {
  id: string;
  label: string;
  docUrl?: string;
  scenarios: PresetScenario[];
}

const CT_JSON = { "Content-Type": "application/json" };
const CT_JSON_UTF8 = { "Content-Type": "application/json;charset=UTF-8" };

// ─────────────────────────────────────────────────────────────────────────────
// 1. 카카오 (Kakao)
// ─────────────────────────────────────────────────────────────────────────────
const kakaoPresets: PresetService = {
  id: "KAKAO",
  label: "카카오 (Kakao)",
  docUrl: "https://developers.kakao.com/docs/ko",
  scenarios: [
    {
      id: "kakao_token_success",
      label: "토큰 발급 성공",
      desc: "(200 OK)",
      statusCode: 200,
      delayMs: 0,
      headers: CT_JSON_UTF8,
      body: JSON.stringify(
        {
          token_type: "bearer",
          access_token: "aGFzaD9hY2Nlc3N0b2tlbg.dummy-access-token-value",
          expires_in: 21599,
          refresh_token: "cmVmcmVzaHRva2Vu.dummy-refresh-token-value",
          refresh_token_expires_in: 5183999,
          scope: "profile_nickname profile_image",
        },
        null,
        2,
      ),
    },
    {
      id: "kakao_invalid_client",
      label: "invalid_client (앱 키 오류)",
      desc: "(400 KOE101)",
      statusCode: 400,
      delayMs: 0,
      headers: CT_JSON_UTF8,
      body: JSON.stringify(
        {
          error: "invalid_client",
          error_description: "Not exist client_id flashhook-dummy-rest-api-key",
          error_code: "KOE101",
        },
        null,
        2,
      ),
    },
    {
      id: "kakao_invalid_grant",
      label: "invalid_grant (인가코드 만료)",
      desc: "(400 KOE320)",
      statusCode: 400,
      delayMs: 0,
      headers: CT_JSON_UTF8,
      body: JSON.stringify(
        {
          error: "invalid_grant",
          error_description:
            "authorization code not found for code=dummy-expired-code",
          error_code: "KOE320",
        },
        null,
        2,
      ),
    },
    {
      id: "kakao_misconfigured",
      label: "misconfigured (플랫폼 설정 오류)",
      desc: "(400 KOE009)",
      statusCode: 400,
      delayMs: 0,
      headers: CT_JSON_UTF8,
      body: JSON.stringify(
        {
          error: "misconfigured",
          error_description:
            "invalid android_key_hash or ios_bundle_id or web_site_url",
          error_code: "KOE009",
        },
        null,
        2,
      ),
    },
    {
      id: "kakao_webhook_timeout",
      label: "웹훅 타임아웃 테스트",
      desc: "(200 + 3500ms 지연)",
      statusCode: 200,
      delayMs: 3500,
      headers: CT_JSON,
      body: "ok",
    },
    {
      id: "kakao_webhook_unlink",
      label: "앱 연결 해제 알림 (Unlink)",
      desc: "(200 OK)",
      statusCode: 200,
      delayMs: 0,
      headers: CT_JSON,
      presetType: "KAKAO_UNLINK_WEBHOOK",
      body: JSON.stringify(
        {
          app_id: "123456",
          user_id: "3891047281",
          referrer_type: "UNLINK_FROM_APPS",
        },
        null,
        2,
      ),
    },
    {
      id: "kakao_webhook_status_change",
      label: "계정 상태 변경 알림 (SSF/SET)",
      desc: "(202 Accepted)",
      statusCode: 202,
      delayMs: 0,
      headers: CT_JSON,
      presetType: "KAKAO_ACCOUNT_STATUS_CHANGE",
      body: JSON.stringify(
        {
          iss: "https://kapi.kakao.com",
          aud: "123456",
          iat: 1718251890,
          jti: "some-unique-jwt-id",
          events: {
            "http://schemas.openid.net/secevent/oauth/event-type/user-unlinked":
              {
                subject: {
                  subject_type: "oauth_helper",
                  user_id: "3891047281",
                },
              },
          },
        },
        null,
        2,
      ),
    },
    {
      id: "kakao_channel_add",
      label: "카카오톡 채널 추가 알림",
      desc: "(200 OK)",
      statusCode: 200,
      delayMs: 0,
      headers: CT_JSON,
      presetType: "KAKAO_CHANNEL_CALLBACK",
      body: JSON.stringify(
        {
          event: "add_channel",
          id: "123456",
          user_id: "3891047281",
          channel_uuid: "ch_123456",
          updated_at: "2024-01-15T18:30:00Z",
        },
        null,
        2,
      ),
    },
    {
      id: "kakao_channel_block",
      label: "카카오톡 채널 차단 알림",
      desc: "(200 OK)",
      statusCode: 200,
      delayMs: 0,
      headers: CT_JSON,
      presetType: "KAKAO_CHANNEL_CALLBACK",
      body: JSON.stringify(
        {
          event: "block_channel",
          id: "123456",
          user_id: "3891047281",
          channel_uuid: "ch_123456",
          updated_at: "2024-01-15T18:30:00Z",
        },
        null,
        2,
      ),
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. 토스페이먼츠 (Toss Payments)
// ─────────────────────────────────────────────────────────────────────────────
const tossPresets: PresetService = {
  id: "TOSS",
  label: "토스페이먼츠 (Toss Payments)",
  docUrl: "https://developers.tosspayments.com/",
  scenarios: [
    {
      id: "toss_confirm_success",
      label: "결제 승인 성공",
      desc: "(200 OK)",
      statusCode: 200,
      delayMs: 0,
      headers: CT_JSON,
      body: JSON.stringify(
        {
          mId: "tosspayments_dummy_mid",
          lastTransactionKey: "TXN_20240115_ABCDE12345",
          paymentKey: "tgen_20240115_abc12345",
          orderId: "ORDER-2024-00001",
          orderName: "FlashHook Pro 구독",
          status: "DONE",
          requestedAt: "2024-01-15T14:23:31+09:00",
          approvedAt: "2024-01-15T14:23:33+09:00",
          currency: "KRW",
          totalAmount: 15000,
          balanceAmount: 15000,
          suppliedAmount: 13637,
          vat: 1363,
          taxFreeAmount: 0,
        },
        null,
        2,
      ),
    },
    {
      id: "toss_already_processed",
      label: "ALREADY_PROCESSED_PAYMENT",
      desc: "(400 중복 승인)",
      statusCode: 400,
      delayMs: 0,
      headers: CT_JSON,
      body: JSON.stringify(
        {
          code: "ALREADY_PROCESSED_PAYMENT",
          message: "이미 처리된 결제입니다.",
        },
        null,
        2,
      ),
    },
    {
      id: "toss_failed_payment_internal_system_processing",
      label: "FAILED_PAYMENT_INTERNAL_SYSTEM_PROCESSING",
      desc: "(500 뱅킹망 장애)",
      statusCode: 500,
      delayMs: 0,
      headers: CT_JSON,
      body: JSON.stringify(
        {
          code: "FAILED_PAYMENT_INTERNAL_SYSTEM_PROCESSING",
          message:
            "결제 기관에서 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
        },
        null,
        2,
      ),
    },
    {
      id: "toss_already_canceled",
      label: "ALREADY_CANCELED_PAYMENT",
      desc: "(400 이미 취소)",
      statusCode: 400,
      delayMs: 0,
      headers: CT_JSON,
      body: JSON.stringify(
        {
          code: "ALREADY_CANCELED_PAYMENT",
          message: "이미 취소된 결제입니다.",
        },
        null,
        2,
      ),
    },
    {
      id: "toss_invalid_card",
      label: "INVALID_REJECT_CARD",
      desc: "(400 카드사 거절)",
      statusCode: 400,
      delayMs: 0,
      headers: CT_JSON,
      body: JSON.stringify(
        {
          code: "INVALID_REJECT_CARD",
          message: "카드 사용이 거절되었습니다. 카드사에 문의해주세요.",
        },
        null,
        2,
      ),
    },
    {
      id: "toss_webhook_vbank",
      label: "가상계좌 입금 웹훅 수신",
      desc: "(200 정상 응답)",
      statusCode: 200,
      delayMs: 0,
      headers: CT_JSON,
      body: JSON.stringify(
        {
          createdAt: "2024-01-15T18:30:00+09:00",
          secret: "dummyWebhookSecretKey",
          status: "DONE",
          transactionKey: "TXN_20240115_VBANK001",
          orderId: "ORDER-2024-00002",
        },
        null,
        2,
      ),
    },
    {
      id: "toss_webhook_status_changed",
      label: "결제 상태 변경 웹훅 수신",
      desc: "(200 정상 응답)",
      statusCode: 200,
      delayMs: 0,
      headers: CT_JSON,
      body: JSON.stringify(
        {
          eventType: "PAYMENT.STATUS_CHANGED",
          createdAt: "2024-01-15T18:30:00.123456+09:00",
          data: {
            paymentKey: "tgen_20240115_abc12345",
            orderId: "ORDER-2024-00001",
            status: "DONE",
          },
        },
        null,
        2,
      ),
    },
    {
      id: "toss_webhook_500",
      label: "웹훅 재전송 테스트",
      desc: "(500 의도적 오류)",
      statusCode: 500,
      delayMs: 0,
      headers: CT_JSON,
      body: JSON.stringify(
        {
          error: "internal_server_error",
          message: "Mock: 의도적 서버 오류 — 재전송 로직 테스트용",
        },
        null,
        2,
      ),
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. 포트원 V2 (PortOne)
// ─────────────────────────────────────────────────────────────────────────────
const portonePresets: PresetService = {
  id: "PORTONE",
  label: "포트원 V2 (PortOne)",
  docUrl: "https://developers.portone.io/opi/ko/readme?v=v2",
  scenarios: [
    {
      id: "portone_paid",
      label: "결제 조회 성공 (PAID)",
      desc: "(200 OK)",
      statusCode: 200,
      delayMs: 0,
      headers: CT_JSON,
      body: JSON.stringify(
        {
          payment: {
            id: "payment_dummy_abc123xyz",
            transactionId: "txn_portone_20240115_001",
            merchantId: "flashhook-merchant-01",
            currency: "KRW",
            amount: { total: 25000, taxFree: 0, vat: 2273 },
            status: "PAID",
            orderId: "ORDER-FH-2024-00005",
            orderName: "FlashHook Enterprise Plan",
            requestedAt: "2024-01-15T10:00:00+09:00",
            paidAt: "2024-01-15T10:00:05+09:00",
          },
        },
        null,
        2,
      ),
    },
    {
      id: "portone_not_found",
      label: "존재하지 않는 결제",
      desc: "(404 NOT_FOUND)",
      statusCode: 404,
      delayMs: 0,
      headers: CT_JSON,
      body: JSON.stringify(
        {
          type: "PAYMENT_NOT_FOUND",
          message: "존재하지 않는 결제건입니다.",
        },
        null,
        2,
      ),
    },
    {
      id: "portone_pending",
      label: "미승인 상태 (PENDING)",
      desc: "(200 PENDING)",
      statusCode: 200,
      delayMs: 0,
      headers: CT_JSON,
      body: JSON.stringify(
        {
          payment: {
            id: "payment_dummy_pending001",
            status: "PENDING",
            orderId: "ORDER-FH-2024-00006",
            currency: "KRW",
            amount: { total: 9900 },
            requestedAt: "2024-01-15T11:00:00+09:00",
          },
        },
        null,
        2,
      ),
    },
    {
      id: "portone_failed_card",
      label: "카드사 거절 (6000번대)",
      desc: "(200 FAILED)",
      statusCode: 200,
      delayMs: 0,
      headers: CT_JSON,
      body: JSON.stringify(
        {
          payment: {
            id: "payment_dummy_failed001",
            status: "FAILED",
            orderId: "ORDER-FH-2024-00007",
            currency: "KRW",
            amount: { total: 9900 },
            failedAt: "2024-01-15T12:00:03+09:00",
            failure: { pgCode: "6000", pgMessage: "카드사 거절 — 한도 초과" },
          },
        },
        null,
        2,
      ),
    },
    {
      id: "portone_idempotency",
      label: "IDEMPOTENCY_OUTSTANDING_REQUEST",
      desc: "(409 중복 요청)",
      statusCode: 409,
      delayMs: 0,
      headers: CT_JSON,
      body: JSON.stringify(
        {
          type: "IDEMPOTENCY_OUTSTANDING_REQUEST",
          message: "동일한 Idempotency-Key로 이미 처리 중인 요청이 있습니다.",
        },
        null,
        2,
      ),
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. 솔라피 (Solapi)
// ─────────────────────────────────────────────────────────────────────────────
const solapiPresets: PresetService = {
  id: "SOLAPI",
  label: "솔라피 (Solapi)",
  docUrl: "https://solapi.com/developers",
  scenarios: [
    {
      id: "solapi_success",
      label: "문자 발송 성공 (2000)",
      desc: "(200 정상 접수)",
      statusCode: 200,
      delayMs: 0,
      headers: CT_JSON,
      body: JSON.stringify(
        {
          groupId: "G4V20240115093045ABCDE12345",
          messageId: "M4V20240115093045FGHIJ67890",
          to: "01098765432",
          from: "01012345678",
          type: "SMS",
          statusCode: "2000",
          statusMessage: "정상 접수",
        },
        null,
        2,
      ),
    },
    {
      id: "solapi_1030",
      label: "잔액 부족 (1030)",
      desc: "(400 잔액 부족)",
      statusCode: 400,
      delayMs: 0,
      headers: CT_JSON,
      body: JSON.stringify(
        {
          errorCode: "1030",
          errorMessage: "잔액이 부족합니다.",
        },
        null,
        2,
      ),
    },
    {
      id: "solapi_3059",
      label: "도용차단 가입 번호 (3059)",
      desc: "(400 도용차단 가입 번호)",
      statusCode: 400,
      delayMs: 0,
      headers: CT_JSON,
      body: JSON.stringify(
        {
          errorCode: "3059",
          errorMessage: "번호도용문자 차단 서비스에 가입된 발신번호입니다.",
        },
        null,
        2,
      ),
    },
    {
      id: "solapi_group_report",
      label: "대량 발송 결과 리포트 (GROUP-REPORT)",
      desc: "(200 정상 응답)",
      statusCode: 200,
      delayMs: 0,
      headers: CT_JSON,
      body: JSON.stringify(
        {
          groupId: "G4V20240115093045ABCDE12345",
          accountId: "111111111111",
          type: "GROUP-REPORT",
          status: "COMPLETE",
          count: {
            total: 100,
            sentSuccess: 97,
            sentFailed: 3,
            sentPending: 0,
          },
          dateSent: "2024-01-15T09:30:10+09:00",
          dateCompleted: "2024-01-15T09:35:10+09:00",
        },
        null,
        2,
      ),
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. 깃허브 (GitHub)
// ─────────────────────────────────────────────────────────────────────────────
const githubPresets: PresetService = {
  id: "GITHUB",
  label: "깃허브 (GitHub)",
  docUrl: "https://docs.github.com/ko",
  scenarios: [
    {
      id: "github_push",
      label: "Push Event",
      desc: "(200 push)",
      isDynamic: true,
      presetType: "GITHUB",
      statusCode: 200,
      delayMs: 0,
      headers: {
        ...CT_JSON,
        "X-GitHub-Event": "push",
        "X-GitHub-Delivery": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "X-GitHub-Hook-ID": "12345678",
        "X-GitHub-Hook-Installation-Target-Type": "repository",
        "X-GitHub-Hook-Installation-Target-ID": "987654321",
        "User-Agent": "GitHub-Hookshot/abc1234",
      },
      body: JSON.stringify(
        {
          ref: "refs/heads/main",
          before: "abc123def456abc123def456abc123def456abc12",
          after: "789xyz012789xyz012789xyz012789xyz012789xy",
          repository: {
            id: 987654321,
            name: "my-awesome-app",
            full_name: "flashhook-user/my-awesome-app",
            private: false,
          },
          pusher: { name: "flashhook-user", email: "dev@flashhook.io" },
          commits: [
            {
              id: "789xyz012789xyz012789xyz012789xy",
              message: "feat: webhook 연동 테스트 추가",
              timestamp: "2024-01-15T14:30:00+09:00",
              author: { name: "FlashHook Dev", email: "dev@flashhook.io" },
              added: ["src/webhook/handler.ts"],
              modified: [],
              removed: [],
            },
          ],
          head_commit: {
            id: "789xyz012789xyz012789xyz012789xy",
            message: "feat: webhook 연동 테스트 추가",
            timestamp: "2024-01-15T14:30:00+09:00",
          },
        },
        null,
        2,
      ),
    },
    {
      id: "github_pr_opened",
      label: "Pull Request Opened",
      desc: "(200 pull_request)",
      isDynamic: true,
      presetType: "GITHUB",
      statusCode: 200,
      delayMs: 0,
      headers: {
        ...CT_JSON,
        "X-GitHub-Event": "pull_request",
        "X-GitHub-Delivery": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        "X-GitHub-Hook-ID": "12345678",
        "X-GitHub-Hook-Installation-Target-Type": "repository",
        "X-GitHub-Hook-Installation-Target-ID": "987654321",
        "User-Agent": "GitHub-Hookshot/abc1234",
      },
      body: JSON.stringify(
        {
          action: "opened",
          number: 42,
          pull_request: {
            id: 112233445,
            state: "open",
            title: "feat: Mock API 프리셋 시나리오 추가",
            user: { login: "flashhook-contributor" },
            head: { ref: "feature/mock-api-presets" },
            base: { ref: "main" },
            created_at: "2024-01-15T15:00:00Z",
          },
          repository: {
            name: "my-awesome-app",
            full_name: "flashhook-user/my-awesome-app",
          },
          sender: { login: "flashhook-contributor" },
        },
        null,
        2,
      ),
    },
    {
      id: "github_release",
      label: "Release Published",
      desc: "(200 release)",
      isDynamic: true,
      presetType: "GITHUB",
      statusCode: 200,
      delayMs: 0,
      headers: {
        ...CT_JSON,
        "X-GitHub-Event": "release",
        "X-GitHub-Delivery": "c3d4e5f6-a7b8-9012-cdef-123456789012",
        "X-GitHub-Hook-ID": "12345678",
        "X-GitHub-Hook-Installation-Target-Type": "repository",
        "X-GitHub-Hook-Installation-Target-ID": "987654321",
        "User-Agent": "GitHub-Hookshot/abc1234",
      },
      body: JSON.stringify(
        {
          action: "published",
          release: {
            id: 55566677,
            tag_name: "v1.2.0",
            name: "FlashHook v1.2.0",
            draft: false,
            prerelease: false,
            published_at: "2024-01-15T16:05:00Z",
          },
          repository: {
            name: "my-awesome-app",
            full_name: "flashhook-user/my-awesome-app",
          },
          sender: { login: "flashhook-user" },
        },
        null,
        2,
      ),
    },
    {
      id: "github_secret_none",
      label: "Push Event (시크릿 없음)",
      desc: "(200 signature absent)",
      statusCode: 200,
      delayMs: 0,
      headers: {
        ...CT_JSON,
        "X-GitHub-Event": "push",
        "X-GitHub-Delivery": "d4e5f6a7-b8c9-0123-def0-123456789012",
        "X-GitHub-Hook-ID": "12345678",
        "X-GitHub-Hook-Installation-Target-Type": "repository",
        "X-GitHub-Hook-Installation-Target-ID": "987654321",
        "User-Agent": "GitHub-Hookshot/abc1234",
      },
      body: JSON.stringify(
        {
          ref: "refs/heads/main",
          before: "abc123def456abc123def456abc123def456abc12",
          after: "789xyz012789xyz012789xyz012789xyz012789xy",
          repository: {
            id: 987654321,
            name: "my-awesome-app",
            full_name: "flashhook-user/my-awesome-app",
            private: false,
          },
          pusher: { name: "flashhook-user", email: "dev@flashhook.io" },
          commits: [
            {
              id: "789xyz012789xyz012789xyz012789xy",
              message: "feat: webhook 연동 테스트 추가",
              timestamp: "2024-01-15T14:30:00+09:00",
              author: { name: "FlashHook Dev", email: "dev@flashhook.io" },
              added: ["src/webhook/handler.ts"],
              modified: [],
              removed: [],
            },
          ],
          head_commit: {
            id: "789xyz012789xyz012789xyz012789xy",
            message: "feat: webhook 연동 테스트 추가",
            timestamp: "2024-01-15T14:30:00+09:00",
          },
        },
        null,
        2,
      ),
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. 슬랙 (Slack)
// ─────────────────────────────────────────────────────────────────────────────
const slackPresets: PresetService = {
  id: "SLACK",
  label: "슬랙 (Slack)",
  docUrl: "https://docs.slack.dev/",
  scenarios: [
    {
      id: "slack_app_mention",
      label: "app_mention 이벤트",
      desc: "(200 event_callback)",
      statusCode: 200,
      delayMs: 0,
      headers: CT_JSON,
      body: JSON.stringify(
        {
          token: "deprecated-legacy-token-value",
          team_id: "T0FLASHHK1",
          api_app_id: "A0FLASHAPP",
          event: {
            type: "app_mention",
            user: "U0USER1234",
            text: "<@U0BOTID123> webhook 테스트 시작해줘",
            ts: "1705283400.000016",
            channel: "C0CHANNEL1",
            event_ts: "1705283400000016",
          },
          type: "event_callback",
          event_id: "Ev0EVENTID1",
          event_time: 1705283400,
        },
        null,
        2,
      ),
    },
    {
      id: "slack_url_verification",
      label: "URL Verification (Challenge Echo)",
      desc: "⚡ 동적",
      isDynamic: true,
      presetType: "SLACK_URL_VERIFICATION",
      statusCode: 200,
      delayMs: 0,
      headers: CT_JSON,
      body: '{"challenge": "동적 처리됨"}',
    },
    {
      id: "slack_retry",
      label: "retry 이벤트 (재전송 방어)",
      desc: "(500 X-Slack-No-Retry: 1)",
      statusCode: 500,
      delayMs: 0,
      headers: { ...CT_JSON, "X-Slack-No-Retry": "1" },
      body: JSON.stringify(
        {
          type: "event_callback",
          event_id: "Ev0EVENTID1",
          event: {
            type: "app_mention",
            user: "U0USER1234",
            text: "<@U0BOTID123> webhook 테스트 시작해줘",
            ts: "1705283400.000016",
          },
        },
        null,
        2,
      ),
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// 전체 카탈로그
// ─────────────────────────────────────────────────────────────────────────────
export const PRESET_CATALOG: PresetService[] = [
  kakaoPresets,
  tossPresets,
  portonePresets,
  solapiPresets,
  githubPresets,
  slackPresets,
];

export const CUSTOM_SERVICE_ID = "CUSTOM";
