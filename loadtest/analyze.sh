#!/usr/bin/env python3
# K6 JSON 결과 파일에서 핵심 통계를 추출하는 헬퍼 스크립트 (Python 버전)

import sys
import json
import os
from collections import defaultdict
import math

def calculate_percentiles(durations):
    if not durations:
        return 0, 0, 0, 0
    durations.sort()
    n = len(durations)
    avg = sum(durations) / n
    p50 = durations[int(math.ceil(0.50 * n)) - 1]
    p95 = durations[int(math.ceil(0.95 * n)) - 1]
    p99 = durations[int(math.ceil(0.99 * n)) - 1]
    return avg, p50, p95, p99

def analyze(file_path):
    if not os.path.isfile(file_path):
        print(f"File not found: {file_path}")
        sys.exit(1)

    status_counts = defaultdict(int)
    durations_by_group = {
        '2xx': [],
        '429': [],
        '4xx(excl 429)': [],
        '5xx': [],
        '기타': []
    }
    
    custom_counters = defaultdict(float)
    custom_trends = defaultdict(list)
    
    target_custom_metrics = {
        'sse_events_received', 'webhook_error_rate', 'webhook_success_count',
        'rl_hit_count', 'rl_miss_count', 'endpoint_created_count', 'log_query_success',
        'replay_success', 'replay_failed', 'http_429_count'
    }
    target_trend_metrics = {
        'sse_delay_ms', 'pre_cap_duration_ms', 'post_cap_duration_ms'
    }

    filename = os.path.basename(file_path)
    print(f"📊 K6 Result Summary: {filename}")
    print("------------------------------------------------")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line: continue
            try:
                data = json.loads(line)
            except: continue
            
            if data.get('type') == 'Point':
                metric = data.get('metric')
                d = data.get('data', {})
                tags = d.get('tags', {})
                val = d.get('value')
                
                # cleanup 제외
                if tags.get('name') == 'cleanup':
                    continue
                
                if metric == 'http_reqs':
                    status = tags.get('status', 'unknown')
                    status_counts[status] += 1
                elif metric == 'http_req_duration':
                    status = tags.get('status', 'unknown')
                    if val is not None:
                        if status.startswith('2'):
                            durations_by_group['2xx'].append(val)
                        elif status == '429':
                            durations_by_group['429'].append(val)
                        elif status.startswith('4') and status != '429':
                            durations_by_group['4xx(excl 429)'].append(val)
                        elif status.startswith('5'):
                            durations_by_group['5xx'].append(val)
                        else:
                            durations_by_group['기타'].append(val)
                elif metric in target_custom_metrics:
                    if val is not None:
                        custom_counters[metric] += val
                elif metric in target_trend_metrics:
                    if val is not None:
                        custom_trends[metric].append(val)
                        
    print("1. HTTP 상태 코드별 카운트 (순수 비즈니스 로직):")
    if not status_counts:
        print("   데이터 없음")
    for status, count in sorted(status_counts.items()):
        print(f"   HTTP {status} : {count} 건")
        
    print("\n2. 상태 코드 그룹별 응답 시간 (ms):")
    has_duration = False
    for group in ['2xx', '429', '4xx(excl 429)', '5xx']:
        durations = durations_by_group[group]
        if durations:
            has_duration = True
            avg, p50, p95, p99 = calculate_percentiles(durations)
            print(f"   [{group}] Avg: {avg:.2f} | p50: {p50:.2f} | p95: {p95:.2f} | p99: {p99:.2f}  (Total: {len(durations)})")
    if not has_duration:
        print("   데이터 없음")
        
    print("\n3. 커스텀 지표 (Counters/Rates):")
    if not custom_counters:
        print("   데이터 없음")
    for metric, val in sorted(custom_counters.items()):
        if 'rate' in metric:
            print(f"   {metric} : {val*100:.2f} %")
        else:
            print(f"   {metric} : {int(val)} 건")
            
    print("\n4. 커스텀 지표 (Trends):")
    if not custom_trends:
        print("   데이터 없음")
    for metric, durations in sorted(custom_trends.items()):
        avg, p50, p95, p99 = calculate_percentiles(durations)
        print(f"   [{metric}] Avg: {avg:.2f} | p50: {p50:.2f} | p95: {p95:.2f} | p99: {p99:.2f}  (Total: {len(durations)})")

    print("------------------------------------------------")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: ./analyze.sh <path_to_json_file>")
        sys.exit(1)
    analyze(sys.argv[1])
