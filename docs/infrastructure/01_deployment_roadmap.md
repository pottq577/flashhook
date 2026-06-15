# FlashHook 배포 및 인프라 구축 로드맵

**최종 수정일:** 2026-06-15
**상황 요약:** OCI(Oracle Cloud) `VM.Standard.A1.Flex` 인스턴스 용량 부족 문제로 `VM.Standard.E2.1.Micro`에서 오토 프로비저닝 스크립트를 구동하며 대기 중. 대기 시간을 활용하여 타 인프라 및 프론트엔드 배포를 선행.

## 1. 전체 배포 로드맵

1. **Cloudflare DNS 세팅**
   - Cloudflare에 `flashhook.site` 도메인 등록 및 네임서버 변경
   - 프록시 및 SSL/TLS 설정
2. **Vercel 프론트엔드 배포**
   - Vercel에 GitHub 레포지토리 연동 및 `FH_frontend` 배포
   - `flashhook.site` 도메인 연결
3. **MongoDB Atlas 프로비저닝**
   - M0 무료 클러스터 생성 및 데이터베이스 유저/비밀번호 세팅
   - `MONGODB_URI` 환경변수 확보 및 IP 화이트리스트 설정 (임시로 `0.0.0.0/0` 허용 후 추후 고정 IP로 변경)
4. **E2.1.Micro 인스턴스 인프라 테스트 (임시)**
   - Nginx 리버스 프록시 설정, Docker Compose (Redis 포함) 셋업 테스트
   - 백엔드 이미지 빌드 및 구동 스크립트 작성
5. **(대기)** A1.Flex 인스턴스 자동 생성 스크립트 구동 유지
6. **A1.Flex 인스턴스 확보 및 최종 배포 (향후)**
   - E2.1.Micro에서 테스트한 인프라 설정 그대로 A1.Flex에 적용
   - Cloudflare에서 `api.flashhook.site`의 A 레코드를 A1.Flex IP로 지정하여 최종 라이브

---

## 2. 세부 진행 가이드 및 설계 결정 내역

### 2.1. Cloudflare DNS 세팅

1. **Cloudflare 도메인 추가 및 네임서버 변경**
   - Cloudflare Dashboard에 로그인 후 `flashhook.site` 도메인 추가 (Free 플랜)
   - 발급된 네임서버를 도메인 등록 업체(가비아, 호스팅케이알 등) 설정 페이지에 입력
2. **SSL/TLS 설정**
   - `SSL/TLS -> Overview`에서 암호화 모드를 **Full (strict)** 로 설정
   - _결정 사유:_ Vercel과 Oracle Nginx 모두 자체 인증서를 지원하므로 End-to-End 암호화를 통해 보안 극대화
3. **권장 보안 설정**
   - `Network -> IPv6 Compatibility`: On
   - `Rules -> Always Use HTTPS`: On
