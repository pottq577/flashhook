#!/bin/bash
# FlashHook 부하 테스트 실행 스크립트
# 사용: ./run.sh [s0|s1|s2|s3|s4|s5|s6|s7|s8|all]

set -e

if [ -f "./k6" ]; then
  K6="./k6"
else
  K6=${K6:-$(which k6 2>/dev/null || echo k6)}
fi
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/scripts" && pwd)"
RESULTS_DIR="$(dirname "${BASH_SOURCE[0]}")/results"
mkdir -p "$RESULTS_DIR"
RESULTS_DIR="$(cd "$RESULTS_DIR" && pwd)"
DATE_DIR="$RESULTS_DIR/$(date +%Y-%m-%d)"
mkdir -p "$DATE_DIR"

TS=$(date +%Y%m%d_%H%M%S)
export BASE_URL=${BASE_URL:-http://localhost:8080}
export HEALTH_URL=${HEALTH_URL:-http://localhost:9090/actuator/health}
export ADMIN_KEY=${ADMIN_KEY:?ADMIN_KEY 환경변수를 설정하세요}

check_backend() {
  if ! curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" | grep -q "^2"; then
    echo "❌ Backend not reachable at $HEALTH_URL"
    exit 1
  fi
  echo "✅ Backend OK at $BASE_URL"
}

check_profile() {
  local req=$1
  local is_load=$(curl -s http://127.0.0.1:9090/actuator/env | python3 -c "import sys, json; data=json.load(sys.stdin); print('load' in data.get('activeProfiles', []))" 2>/dev/null)
  
  if [ "$req" = "load" ] && [ "$is_load" != "True" ]; then
    echo "❌ 에러: 이 시나리오는 'load' 프로파일이 필요합니다. SPRING_PROFILES_ACTIVE=local,load 로 기동하세요."
    exit 1
  elif [ "$req" = "default" ] && [ "$is_load" = "True" ]; then
    echo "❌ 에러: 이 시나리오는 'load' 프로파일이 없어야 합니다. SPRING_PROFILES_ACTIVE=local 로 기동하세요."
    exit 1
  fi
}

start_monitor() {
  local name=$1
  local out_file="$DATE_DIR/${name}_prometheus_${TS}.txt"
  echo "📡 프로메테우스 메트릭 수집 시작 (5초 간격) -> $(basename $out_file)"
  while true; do
    echo "--- $(date -u +"%Y-%m-%dT%H:%M:%SZ") ---" >> "$out_file"
    curl -s http://127.0.0.1:9090/actuator/prometheus | grep -E "jvm_memory|tomcat_threads|mongodb_driver|lettuce_command|executor_" >> "$out_file" || true
    sleep 5
  done &
  MONITOR_PID=$!
}

stop_monitor() {
  if [ -n "$MONITOR_PID" ]; then
    kill $MONITOR_PID 2>/dev/null
    wait $MONITOR_PID 2>/dev/null || true
    MONITOR_PID=""
  fi
}

run_s0() {
  echo "=== S0 Smoke Test ==="
  start_monitor "s0_smoke"
  $K6 run --out json="$DATE_DIR/s0_smoke_${TS}.json" \
    --env BASE_URL="$BASE_URL" \
    "$SCRIPT_DIR/s0_smoke.js"
  stop_monitor
}

run_s1() {
  check_profile "load"
  echo "=== S1 Webhook Capacity Test (load profile required) ==="
  start_monitor "s1_capacity"
  $K6 run --out json="$DATE_DIR/s1_capacity_${TS}.json" --env BASE_URL="$BASE_URL" "$SCRIPT_DIR/s1_webhook_capacity.js"
  stop_monitor
}

run_s2() {
  check_profile "load"
  echo "=== S2 SSE Fanout Test (load profile required) ==="
  echo "⚠️ xk6-sse 확장이 필요합니다. 기본 k6 대신 커스텀 바이너리를 사용하세요."
  start_monitor "s2_sse_fanout"
  $K6 run --out json="$DATE_DIR/s2_sse_fanout_${TS}.json" --env BASE_URL="$BASE_URL" "$SCRIPT_DIR/s2_sse_fanout.js"
  stop_monitor
}

run_s3() {
  check_profile "load"
  echo "=== S3 SSE Connection Scale Test ==="
  echo "⚠️ xk6-sse 확장이 필요합니다. 기본 k6 대신 커스텀 바이너리를 사용하세요."
  echo "팁: Soak 테스트 시에는 DURATION=30m 환경변수를 넘겨주세요."
  start_monitor "s3_sse_scale"
  $K6 run --out json="$DATE_DIR/s3_sse_scale_${TS}.json" --env BASE_URL="$BASE_URL" "$SCRIPT_DIR/s3_sse_scale.js"
  stop_monitor
}

run_s4() {
  check_profile "load"
  echo "=== S4 Endpoint Create Spike Test ==="
  start_monitor "s4_endpoint_spike"
  $K6 run --out json="$DATE_DIR/s4_endpoint_spike_${TS}.json" --env BASE_URL="$BASE_URL" "$SCRIPT_DIR/s4_endpoint_spike.js"
  stop_monitor
}

run_s5() {
  check_profile "load"
  echo "=== S5 Log Query Test ==="
  start_monitor "s5_log_query"
  $K6 run --out json="$DATE_DIR/s5_log_query_${TS}.json" --env BASE_URL="$BASE_URL" "$SCRIPT_DIR/s5_log_query.js"
  stop_monitor
}

run_s6() {
  check_profile "load"
  echo "=== S6 Replay Test (load profile required) ==="
  start_monitor "s6_replay"
  $K6 run --out json="$DATE_DIR/s6_replay_${TS}.json" --env BASE_URL="$BASE_URL" "$SCRIPT_DIR/s6_replay.js"
  stop_monitor
}

run_s7() {
  check_profile "default"
  echo "=== S7 Rate Limit Validation (default profile required) ==="
  start_monitor "s7_ratelimit"
  $K6 run --out json="$DATE_DIR/s7_ratelimit_${TS}.json" --env BASE_URL="$BASE_URL" "$SCRIPT_DIR/s7_ratelimit.js"
  stop_monitor
}

run_s8() {
  check_profile "default"
  echo "=== S8 Log Cap Test (default profile required) ==="
  start_monitor "s8_logcap"
  $K6 run --out json="$DATE_DIR/s8_logcap_${TS}.json" --env BASE_URL="$BASE_URL" "$SCRIPT_DIR/s8_log_cap.js"
  stop_monitor
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
  *) echo "Usage: $0 [s0|s1|s2|s3|s4|s5|s6|s7|s8|all]" >&2; exit 2 ;;
esac
