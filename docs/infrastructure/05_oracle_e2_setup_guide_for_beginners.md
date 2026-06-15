# 4단계: Oracle Cloud(OCI) 인프라 세팅 및 백엔드 배포 가이드

임시로 띄워둔 E2.1.Micro 인스턴스에 접속하여 백엔드 서버를 띄우는 과정입니다.
(이 과정은 나중에 A1.Flex 인스턴스가 생성되어도 똑같이 진행하시면 됩니다!)

---

## ✅ 1. 서버 접속하기 (SSH)

1. 터미널(맥/리눅스)이나 CMD/PowerShell(윈도우)을 엽니다.
2. Oracle Cloud에서 인스턴스를 만들 때 다운로드했던 비밀키(예: `ssh-key.key`)가 있는 폴더로 이동합니다.
3. 아래 명령어를 입력해 서버에 접속합니다. (`인스턴스IP` 부분은 OCI 대시보드에서 확인한 Public IP로 바꿉니다.)

   ```bash
   # (맥/리눅스 사용자만) 키 파일 권한 설정
   chmod 400 ssh-key.key

   # 접속
   ssh -i ssh-key.key ubuntu@인스턴스IP
   ```

---

## ✅ 2. 서버에 필수 프로그램(Docker) 설치하기

빈 깡통 서버이므로 프로그램을 실행해줄 Docker(도커)를 설치해야 합니다. 접속한 서버 터미널에 아래 명령어를 한 줄씩 복사해서 붙여넣고 엔터를 치세요.

```bash
# 1. 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# 2. Docker 및 Docker Compose 설치
sudo apt install -y docker.io docker-compose

---

## ✅ 3. 코드 가져오기 (Git Clone)

이제 우리가 만든 코드와 자동화 스크립트를 서버로 가져옵니다.

```bash
# GitHub에서 코드 다운로드 (본인의 레포지토리 주소로 변경하세요)
git clone https://github.com/본인계정/flashhook.git

# 폴더로 이동
cd flashhook
```

---

## ✅ 4. 환경변수(.env) 설정 및 백엔드 실행하기

보안 및 깔끔한 환경 관리를 위해, 환경변수 파일(`.env`)을 직접 생성하여 DB 주소를 주입하고 실행합니다.

1. **`.env` 파일 생성 및 주소 입력**

   ```bash
   nano .env
   ```

   - 까만 화면이 열리면, 아래 내용을 복사해서 붙여넣습니다. (아래 빈칸에 3단계에서 확보한 진짜 주소를 넣으세요)

   ```text
   MONGODB_URI=여기에_진짜_주소를_넣으세요
   REDIS_PASSWORD=보안을_위한_안전한_비밀번호_설정
   ```

   - `Ctrl + O` 누르고 `Enter` 쳐서 저장한 뒤, `Ctrl + X`를 눌러서 빠져나옵니다.
   - **(중요) 다른 사용자가 환경 변수 파일을 읽지 못하도록 권한을 잠급니다.**
     ```bash
     chmod 600 .env
     ```

2. **Docker Compose로 백엔드 실행**

   ```bash
   # 도커 컴포즈 실행 (백그라운드에서 빌드 후 실행됨)
   sudo docker-compose -f docker-compose.prod.yml up --build -d
   ```

   - 컴퓨터가 스스로 `.env` 파일에 적어둔 주소를 읽어가며 서버를 빌드하고 구동합니다. (약 3~5분 소요)

---

## ✅ 5. Nginx 리버스 프록시 설정 (80 포트 연결)

현재 백엔드는 8080 포트에서 돌고 있습니다. 사용자들이 `flashhook.site`를 쳤을 때 80 포트로 들어오는 요청을 8080 포트로 넘겨주는(프록시) 역할을 Nginx가 해야 합니다.

1. **Nginx 설치**

   ```bash
   sudo apt install -y nginx
   ```

2. **설정 파일 열기**

   ```bash
   sudo nano /etc/nginx/sites-available/default
   ```

3. **내용 수정**
   - 열린 파일의 내용을 전부 지우고(또는 `#` 주석이 아닌 부분만 지우고), 아래 내용을 그대로 복사해서 붙여넣습니다.

   ```nginx
   server {
       listen 80;
       listen [::]:80;
       server_name api.flashhook.site;  # (추후 Cloudflare 연결할 API 서브도메인)

       location / {
           proxy_pass http://localhost:8080;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }

       # SSE 전용 프록시 (버퍼링 무시, 타임아웃 연장)
       location /api/endpoints/ {
           proxy_pass http://localhost:8080;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_buffering off;
           proxy_cache off;
           proxy_read_timeout 1800s;
       }
   }
   ```

   - 저장하고 나옵니다. (`Ctrl + O` 누르고 `Enter`, 그다음 `Ctrl + X` 눌러서 종료)

4. **Nginx 재시작**

   ```bash
   sudo systemctl restart nginx
   ```

5. **(중요) Certbot을 이용한 HTTPS (SSL/TLS) 암호화 적용**
   Cloudflare와 오라클 서버 간의 통신을 암호화하기 위해 무료 인증서를 발급받습니다. (이 단계를 진행하기 전에 Cloudflare DNS에 `api` 서브도메인이 서버 IP로 연결되어 있어야 합니다.)

   ```bash
   # Certbot 설치
   sudo apt install -y certbot python3-certbot-nginx

   # Nginx에 인증서 자동 발급 및 적용 (이메일 입력 및 약관 동의 필요)
   sudo certbot --nginx -d api.flashhook.site
   ```

🎉 여기까지 하면 Oracle 서버 세팅 및 보안 설정이 완벽하게 끝납니다!
마지막으로 Cloudflare 대시보드에 들어가서 SSL/TLS 암호화 모드를 **전체(엄격) (Full (strict))** 로 설정해 주시면 안전하게 프론트엔드와 백엔드가 연동됩니다!
