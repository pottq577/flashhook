# Phase 0. 측정 인프라 구축 및 베이스라인 스냅샷

## 1. 애널리틱스 도입 현황
현재 프론트엔드(`FH_frontend/src/main.tsx`)에 **Vercel Analytics (`@vercel/analytics`)** 가 연동되어 있습니다. 
Vercel Analytics는 기본적으로 UTM 파라미터, Referrer(유입 출처), OS/브라우저, 방문 페이지 경로를 분리해서 집계해 주므로 별도의 Cloudflare Web Analytics나 GA4를 중복 설치하지 않아도 유입 소스 추적이 가능합니다. 

## 2. UTM / Referrer 소스 분리 체계
향후 디렉토리 리스팅(Phase 5) 및 커뮤니티 공유 시, 인위적인 UTM 파라미터가 거부될 가능성을 대비하여 **Referrer 도메인**을 최우선 식별자로 사용합니다.
*   **Organic Search:** Referrer가 `google.com`, `bing.com` 등 검색엔진일 경우
*   **Referral (디렉토리):** Referrer가 `alternativeto.net`, `saashub.com` 등 리스팅 도메인일 경우
*   **Referral (소셜/커뮤니티):** Referrer가 `github.com`, `slack.com`, `discord.com` 등일 경우
*   만약 리퍼러가 유실되는 환경(예: 일부 앱/메신저 내부 링크)에 한정하여 `?utm_source=direct&utm_medium=share` 형태를 보조적으로 사용.

## 3. 핵심 추적 이벤트 정의 (향후 구현 시 추가)
Vercel Analytics의 `track()` 함수를 이용해 주요 전환 행동을 커스텀 이벤트로 분리합니다.
1.  **`View_Webhook_Guide`**: 프로그래매틱 SEO 페이지(`/webhooks/[provider]`) 접속 시 트리거. (속성: `provider_name`)
2.  **`View_Shared_Session`**: 유저가 공유한 세션 페이지(`/session/[id]`) 접속 시 트리거.
3.  **`Create_Endpoint_From_SEO`**: `/webhooks/*` 나 `/session/*` 페이지 내 CTA 버튼을 눌러 실제 웹훅 엔드포인트를 생성했을 때 트리거 (가장 중요한 전환 지표).

## 4. 베이스라인 스냅샷
*작업 착수 전(2026-07-03 기준) 현재는 SEO/PLG 최적화가 안 되어 있으므로, 대다수의 유입이 지인 공유(Direct)나 특정 커뮤니티 글로 한정되어 있을 것으로 가정합니다.*
*   **Organic Search 트래픽:** 현재 0 ~ 극소수
*   **공유 링크(Referral) 트래픽:** 현재 0 ~ 극소수
이 문서는 추후 Phase 1~5 작업이 완료된 후 트래픽 상승분을 비교하는 기준점이 됩니다.
