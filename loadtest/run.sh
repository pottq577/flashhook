#!/bin/bash
# FlashHook 부하 테스트 실행 스크립트
# 사용: ./run.sh [s0|s1|s7|s8|all]
# 전제: application-load 프로파일로 백엔드 실행 중

set -e

K6=/home/hyun2y00/.local/bin/k6
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/scripts" && pwd)"
RESULTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/results" && pwd)"
mkdir -p "$RESULTS_DIR"

TS=$(date +%Y%m%d_%H%M%S)
BASE_URL=${BASE_URL:-http://localhost:8080}

check_backend() {
  if ! curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/endpoints" | grep -q "4\|2"; then
    echo "❌ Backend not reachable at $BASE_URL"
    exit 1
  fi
  echo "✅ Backend OK at $BASE_URL"
}

run_s0() {
  echo "=== S0 Smoke Test ==="
  $K6 run --out json="$RESULTS_DIR/s0_smoke_${TS}.json" "$SCRIPT_DIR/s0_smoke.js"
}

run_s1() {
  echo "=== S1 Webhook Capacity Test (load profile required) ==="
  echo "⚠️  전제: application-load.yaml 프로파일 활성화 상태 확인 필요"
  $K6 run --out json="$RESULTS_DIR/s1_capacity_${TS}.json" \
    --env BASE_URL="$BASE_URL" \
    "$SCRIPT_DIR/s1_webhook_capacity.js"
}

run_s7() {
  echo "=== S7 Rate Limit Validation (default limits) ==="
  echo "⚠️  전제: 디폴트 RL 설정 (application-load.yaml 비활성)"
  $K6 run --out json="$RESULTS_DIR/s7_ratelimit_${TS}.json" \
    --env BASE_URL="$BASE_URL" \
    "$SCRIPT_DIR/s7_ratelimit.js"
}

run_s8() {
  echo "=== S8 Log Cap Test (default limits) ==="
  $K6 run --out json="$RESULTS_DIR/s8_logcap_${TS}.json" \
    --env BASE_URL="$BASE_URL" \
    "$SCRIPT_DIR/s8_log_cap.js"
}

case "${1:-all}" in
  s0) check_backend; run_s0 ;;
  s1) check_backend; run_s1 ;;
  s7) check_backend; run_s7 ;;
  s8) check_backend; run_s8 ;;
  all)
    check_backend
    run_s0
    echo ""
    echo "S0 완료. S7(RL 검증)을 디폴트 설정으로 실행합니다..."
    run_s7
    echo ""
    echo "S7 완료. S8(로그 상한)을 실행합니다..."
    run_s8
    echo ""
    echo "⚠️  S1(용량) 테스트는 application-load.yaml 활성화 후 수동으로 실행하세요:"
    echo "   ./run.sh s1"
    ;;
  *) echo "Usage: $0 [s0|s1|s7|s8|all]" ;;
esac
