import http.server
import socketserver
import time
import argparse

class SinkRequestHandler(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        # 200 OK 응답
        self.send_response(200)
        self.send_header('Content-Type', 'text/plain')
        self.end_headers()
        self.wfile.write(b"OK")
        
        # 간단한 로깅
        content_length = int(self.headers.get('Content-Length', 0))
        # print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Received POST request ({content_length} bytes)")

    def log_message(self, format, *args):
        # 너무 많은 로그가 찍히지 않도록 조절 (필요시 활성화)
        pass

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Dummy Sink Server for Load Testing")
    parser.add_argument('--host', default='198.51.100.1', help='Host IP to bind to')
    parser.add_argument('--port', type=int, default=9999, help='Port to bind to')
    args = parser.parse_args()

    handler = SinkRequestHandler
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer((args.host, args.port), handler) as httpd:
        print(f"Sink server listening on http://{args.host}:{args.port}")
        httpd.serve_forever()
