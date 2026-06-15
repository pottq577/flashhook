# FlashHook AdSense Integration PRD

## 목표 (Goal)
- SPA 환경(Vite + React)에서 Google AdSense 연동 시 발생하는 화면 레이아웃 붕괴 방지.
- 자동 광고 대신 수동 광고 컴포넌트(AdBanner)를 구성하여 정해진 안전 구역에만 광고 노출.
- Threads 자동화 봇 스크랩 시 필요한 메타 태그는 이미 완비되어 있으므로 변경 없음.

## 해결 방법 (Solution)
1. **`index.html` 스크립트 추가:** `adsbygoogle.js` 로드 (임시 client ID 포함).
2. **`AdBanner` 컴포넌트 개발:** React Lifecycle을 타지 않게 빈 `ins` 태그만 렌더링 후 `window.adsbygoogle.push({})` 실행.
3. **광고 배치:** 
   - Landing Page 하단
   - Dashboard 상단 띠 배너 또는 우측 패널 하단 (가장 안전한 구역 선택)
4. **스타일 격리:** CSS 모듈을 통해 광고 영역 크기를 고정(min-height)하여 레이아웃 시프트 방지.

## 작업 순서 (Steps)
1. `FH_frontend/index.html` 주석 해제 및 `ca-pub-XXXXXXXXX` 스크립트 활성화.
2. `FH_frontend/src/shared/ui/AdBanner.tsx` 및 `AdBanner.module.css` 생성.
3. `FH_frontend/src/pages/landing/ui/LandingPage.tsx` 에 광고 부착.
4. 빌드 및 동작(에러 유무) 확인.
