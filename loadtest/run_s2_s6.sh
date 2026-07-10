#!/bin/bash
set -e

cd /home/hyun2y00/01_Portfolio/02_FlashHook
K6=/home/hyun2y00/01_Portfolio/02_FlashHook/loadtest/k6
export BASE_URL=http://localhost:8080
export ADMIN_KEY=FhAdmin729XpQk4v

echo "=== Running S2 (SSE Fanout) ==="
$K6 run --out json=loadtest/results/s2_sse_fanout.json loadtest/scripts/s2_sse_fanout.js 2>&1

echo "=== Running S3 (SSE Connection Scale) ==="
$K6 run --out json=loadtest/results/s3_sse_scale.json loadtest/scripts/s3_sse_scale.js 2>&1

echo "=== Running S4 (Endpoint Create Spike) ==="
$K6 run --out json=loadtest/results/s4_endpoint_spike.json loadtest/scripts/s4_endpoint_spike.js 2>&1

echo "=== Running S5 (Log Query) ==="
$K6 run --out json=loadtest/results/s5_log_query.json loadtest/scripts/s5_log_query.js 2>&1

echo "=== Running S6 (Replay) ==="
$K6 run --out json=loadtest/results/s6_replay.json loadtest/scripts/s6_replay.js 2>&1

echo "ALL TESTS COMPLETED"
