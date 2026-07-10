#!/bin/bash
# FlashHook 부하 테스트 실행 스크립트
# 사용: ./run.sh [s0|s1|s2|s3|s4|s5|s6|s7|s8|all]

set -e

K6=${K6:-$(which k6 2>/dev/null || echo k6)}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/scripts" && pwd)"
RESULTS_DIR="$(dirname "${BASH_SOURCE[0]}")/results"
mkdir -p "$RESULTS_DIR"
RESULTS_DIR="$(cd "$RESULTS_DIR" && pwd)"

TS=$(date +%Y%m%d_%H%M%S)
export BASE_URL=${BASE_URL:-http://localhost:8080}
export ADMIN_KEY=${ADMIN_KEY:?ADMIN_KEY 환경변수를 설정하세요}

check_backend() {
  if ! curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/endpoints" | grep -q "^[24]"; then
    echo "❌ Backend not reachable at $BASE_URL"
    exit 1
  fi
  echo "✅ Backend OK at $BASE_URL"
}

run_s0() {
  echo "=== S0 Smoke Test ==="
  $K6 run --out json="$RESULTS_DIR/s0_smoke_${TS}.json" \
    --env BASE_URL="$BASE_URL" \
    "$SCRIPT_DIR/s0_smoke.js"
}

run_s1() {
  echo "=== S1 Webhook Capacity Test (load profile required) ==="
  $K6 run --out json="$RESULTS_DIR/s1_capacity_${TS}.json" --env BASE_URL="$BASE_URL" "$SCRIPT_DIR/s1_webhook_capacity.js"
}

run_s2() {
  echo "=== S2 SSE Fanout Test (load profile required) ==="
  $K6 run --out json="$RESULTS_DIR/s2_sse_fanout_${TS}.json" --env BASE_URL="$BASE_URL" "$SCRIPT_DIR/s2_sse_fanout.js"
}

run_s3() {
  echo "=== S3 SSE Connection Scale Test ==="
  $K6 run --out json="$RESULTS_DIR/s3_sse_scale_${TS}.json" --env BASE_URL="$BASE_URL" "$SCRIPT_DIR/s3_sse_scale.js"
}

run_s4() {
  echo "=== S4 Endpoint Create Spike Test ==="
  $K6 run --out json="$RESULTS_DIR/s4_endpoint_spike_${TS}.json" --env BASE_URL="$BASE_URL" "$SCRIPT_DIR/s4_endpoint_spike.js"
}

run_s5() {
  echo "=== S5 Log Query Test ==="
  $K6 run --out json="$RESULTS_DIR/s5_log_query_${TS}.json" --env BASE_URL="$BASE_URL" "$SCRIPT_DIR/s5_log_query.js"
}

run_s6() {
  echo "=== S6 Replay Test ==="
  $K6 run --out json="$RESULTS_DIR/s6_replay_${TS}.json" --env BASE_URL="$BASE_URL" "$SCRIPT_DIR/s6_replay.js"
}

run_s7() {
  echo "=== S7 Rate Limit Validation (default profile required) ==="
  $K6 run --out json="$RESULTS_DIR/s7_ratelimit_${TS}.json" --env BASE_URL="$BASE_URL" "$SCRIPT_DIR/s7_ratelimit.js"
}

run_s8() {
  echo "=== S8 Log Cap Test (default profile required) ==="
  $K6 run --out json="$RESULTS_DIR/s8_logcap_${TS}.json" --env BASE_URL="$BASE_URL" "$SCRIPT_DIR/s8_log_cap.js"
}

case "${1:-all}" in
  s0) check_backend; run_s0 ;;
  s1) check_backend; run_s1 ;;
  s2) check_backend; run_s2 ;;
  s3) check_backend; run_s3 ;;
  s4) check_backend; run_s4 ;;
  s5) check_backend; run_s5 ;;
  s6) check_backend; run_s6 ;;
  s7) check_backend; run_s7 ;;
  s8) check_backend; run_s8 ;;
  all)
    check_backend
    run_s0
    echo ""
    echo "S7, S8 (RateLimit/LogCap 방어 로직) 테스트 실행 (default 설정 권장)..."
    run_s7
    run_s8
    echo ""
    echo "⚠️ S1~S6 (성능/한계치 측정) 테스트는 application-load.yaml 프로파일 활성화 상태에서 개별적으로 실행하세요:"
    echo "예: ./run.sh s1"
    ;;
  *) echo "Usage: $0 [s0|s1|s2|s3|s4|s5|s6|s7|s8|all]" ;;
esac
