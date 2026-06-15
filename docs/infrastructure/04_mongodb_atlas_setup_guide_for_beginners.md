# 3단계: MongoDB Atlas(데이터베이스) 세팅 완벽 가이드

FlashHook의 모든 웹훅 로그와 엔드포인트 정보가 저장될 데이터베이스 공간을 클라우드상에 무료로 만드는 과정입니다.

---

## ✅ 1. 회원가입 및 클러스터 생성

1. **MongoDB Atlas 접속 및 가입**
   - [MongoDB Atlas 웹사이트](https://www.mongodb.com/cloud/atlas/register)에 접속해서 회원가입을 합니다. (Google 계정 연동 추천)
   - 설문조사가 나오면 대충 선택하고 넘어갑니다.

2. **무료 클러스터(M0) 생성**
   - 대시보드에서 클러스터(데이터베이스 서버)를 만드는 화면이 나옵니다.
   - 플랜 옵션 중 **`M0 Free` (무료)** 를 반드시 선택합니다!
   - Provider(제공자)는 AWS, Google Cloud 등 아무거나 상관없으나, Region(지역)은 가급적 한국(Seoul)과 가까운 **Tokyo**나 **Singapore** 등을 선택합니다. (무료 플랜은 한국 리전이 없을 수 있습니다.)
   - 하단의 **[Create] (생성)** 버튼을 누릅니다.

---

## ✅ 2. 데이터베이스 접속용 아이디/비밀번호 생성

1. **Security Quickstart (보안 빠른 설정) 화면**
   - 클러스터 생성을 누르면 "How would you like to authenticate your connection?" 이라는 화면이 뜹니다.
   - **Username(아이디)** 과 **Password(비밀번호)** 를 입력합니다.
     - _주의:_ 비밀번호는 나중에 백엔드 서버에 입력해야 하므로 **반드시 메모장 등에 복사해 둡니다.** (특수문자 중 `@` 같은 문자는 나중에 연결 주소 만들 때 에러를 유발할 수 있으므로 가급적 영문/숫자 위주로 만드는 것을 추천합니다.)
   - 입력 후 **[Create User]** 버튼을 누릅니다.

---

## ✅ 3. IP 화이트리스트(접속 허용 IP) 설정

데이터베이스는 아무나 접속하면 안 되기 때문에, 기본적으로 모든 접속을 막고 있습니다. 백엔드 서버가 이 DB에 접속할 수 있도록 허용해 줘야 합니다.

1. **접속 허용 설정 (Network Access)**
   - 아이디/비밀번호 생성 화면 바로 아래에 "Where would you like to connect from?" 이라는 항목이 있습니다.
   - **Local Environment** 를 선택합니다.
   - **[Allow Access from Anywhere] (어디서든 접속 허용)** 버튼을 누릅니다.
   - IP 주소 칸에 `0.0.0.0/0` 이 입력된 것을 확인하고 **[Add Entry]**를 누릅니다.
   - _참고:_ 실제 상용 서비스에서는 이렇게 다 열어두면 위험하지만, 우리는 포트폴리오용이고 나중에 Oracle 인스턴스의 IP가 바뀔 수 있으므로 일단 전체 개방으로 둡니다.
   - 하단의 **[Finish and Close]** 를 누르고 **[Go to Overview]** 를 클릭합니다.

---

## ✅ 4. 연결 주소(DB URI) 복사하기 (가장 중요 ⭐️)

이제 백엔드 서버가 이 DB에 찾아올 수 있는 "전체 주소"를 얻어야 합니다.

1. **Connect 버튼 클릭**
   - 대시보드 메인 화면(Database Deployments)에 생성된 클러스터가 보입니다.
   - 클러스터 이름 옆의 **[Connect]** 버튼을 누릅니다.

2. **연결 방식 선택**
   - 여러 방식 중 **[Drivers]** (또는 Connect your application) 를 선택합니다.
   - Driver 종류는 **Java**, 버전을 선택하는 곳이 있다면 기본값 그대로 둡니다.

3. **주소 복사**
   - `mongodb+srv://<db_password>@cluster0...` 와 같이 생긴 긴 주소가 나옵니다.
   - 이 주소를 복사해서 메모장에 붙여넣습니다.
   - 주소 중간에 `<password>` 라고 적힌 부분을 **아까 2번 단계에서 만든 실제 비밀번호**로 바꿔줍니다. (꺾쇠 `< >` 도 모두 지워야 합니다!)
   - **예시:** 비밀번호가 `my1234`라면, `mongodb+srv://flashhook:my1234@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority` 형태가 됩니다.

이 완성된 긴 주소를 **`MONGODB_URI`** 라고 부릅니다. 이 주소 하나만 있으면 나중에 백엔드 서버를 띄울 때 가장 중요한 DB 설정이 끝납니다!
