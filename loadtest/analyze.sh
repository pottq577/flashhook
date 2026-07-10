#!/usr/bin/env python3
# K6 JSON 결과 파일에서 핵심 통계를 추출하는 헬퍼 스크립트 (Python 버전)

import sys
import json
import os
from collections import defaultdict

def analyze(file_path):
    if not os.path.isfile(file_path):
        print(f"File not found: {file_path}")
        sys.exit(1)

    status_counts = defaultdict(int)
    duration_sum = 0
    duration_count = 0
    fail_429 = 0
    
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
                
                if metric == 'http_reqs':
                    status = d.get('tags', {}).get('status', 'unknown')
                    status_counts[status] += 1
                    if status == '429':
                        fail_429 += 1
                elif metric == 'http_req_duration':
                    val = d.get('value')
                    if val is not None:
                        duration_sum += val
                        duration_count += 1
                        
    print("1. HTTP 상태 코드별 카운트 (총 요청 수):")
    if not status_counts:
        print("   데이터 없음")
    for status, count in sorted(status_counts.items()):
        print(f"   HTTP {status} : {count} 건")
        
    print("\n2. 평균 응답 시간 (Duration):")
    if duration_count > 0:
        print(f"   {duration_sum/duration_count:.2f} ms")
    else:
        print("   데이터 없음")
        
    print("\n3. 429 Too Many Requests (Rate Limit 차단 건수):")
    print(f"   {fail_429} 건")
    print("------------------------------------------------")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: ./analyze.sh <path_to_json_file>")
        sys.exit(1)
    analyze(sys.argv[1])

