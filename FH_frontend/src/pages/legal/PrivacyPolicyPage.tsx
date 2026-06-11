import styles from '../../widgets/legal/legal.module.css';

export const PrivacyPolicyPage = () => {
  return (
    <div className={styles.legalContainer}>
      <h1 className={styles.title}>개인정보처리방침</h1>
      <p className={styles.paragraph}>
        FlashHook(이하 "서비스")은 소중한 개인정보를 안전하게 보호하기 위해 관련 법령을 엄격히 준수하고 있어요. 아래 내용은 서비스 이용 시 어떤 데이터가 어떻게 처리되는지 설명하는 공식 방침입니다. 본 방침은 [TODO: 서비스 오픈일 확정 시 기재]부터 시행됩니다.
      </p>

      <h2 className={styles.sectionTitle}>1. 개인정보의 수집 항목 및 방법</h2>
      <p className={styles.paragraph}>본 서비스는 회원가입 절차 없이 이용 가능한 비회원제 서비스입니다. 다만 서비스 제공 과정에서 다음의 정보가 수집될 수 있습니다.</p>
      <ul className={styles.list}>
        <li className={styles.listItem}><strong>필수 수집 항목 (웹훅 수신 시):</strong> 웹훅 Payload 전체 (Headers, Query Parameters, Raw Body), 발신처 IP 주소</li>
        <li className={styles.listItem}><strong>자동 수집 항목:</strong> 이용자의 IP 주소, 접속 로그, 서비스 이용 기록(생성된 Endpoint 정보), accessToken (sessionStorage 임시 저장, 브라우저 탭 종료 시 자동 소멸)</li>
      </ul>
      <p className={styles.paragraph}><strong>수집 방법:</strong> 모든 HTTP 메서드(GET, POST, PUT, PATCH, DELETE 등)를 통한 외부 서비스 호출 시 수집 및 서비스 접속 시 시스템을 통한 자동 수집</p>

      <div className={styles.highlightBox}>
        <strong>[주의] 제3자 개인정보 유입 가능성 안내</strong>
        <p>FlashHook은 웹훅 수신 도구이므로, 연결하신 외부 시스템에서 들어오는 데이터(예: 결제 정보, 이메일, 이름 등)에 다른 사람의 개인정보가 섞여 있을 수 있어요. 이는 서비스 구조상 불가피하게 들어오는 데이터이며, FlashHook이 의도적으로 수집하는 개인정보가 아니라는 점을 꼭 확인해주세요.</p>
      </div>

      <h2 className={styles.sectionTitle}>2. 개인정보의 처리 목적</h2>
      <p className={styles.paragraph}>수집된 정보는 다음의 목적을 위해서만 처리됩니다.</p>
      <ul className={styles.list}>
        <li className={styles.listItem}><strong>서비스 제공:</strong> 수신된 웹훅 데이터를 실시간으로 대시보드에 렌더링하고 디버깅 기능 제공</li>
        <li className={styles.listItem}><strong>보안 및 남용 방지:</strong> IP 주소 기반 요청 빈도 제한(Rate Limiting) 및 동시 연결 수 제어</li>
      </ul>

      <h2 className={styles.sectionTitle}>3. 개인정보의 보유 및 이용기간</h2>
      <p className={styles.paragraph}>원칙적으로 개인정보 수집 및 이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다.</p>
      <ul className={styles.list}>
        <li className={styles.listItem}><strong>보존 기간:</strong> Endpoint 생성 후 24시간 이내</li>
        <li className={styles.listItem}><strong>파기 방법:</strong> MongoDB의 TTL(Time-To-Live) 인덱스를 통해 24시간 경과 시 전자적 파일 형태로 저장된 데이터를 복구할 수 없는 방법으로 영구 삭제</li>
      </ul>

      <h2 className={styles.sectionTitle}>4. 개인정보의 제3자 제공</h2>
      <p className={styles.paragraph}>본 서비스는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만, 아래의 경우에는 예외로 합니다.</p>
      <ul className={styles.list}>
        <li className={styles.listItem}>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
      </ul>

      <h2 className={styles.sectionTitle}>5. 개인정보 처리위탁 및 국외 이전</h2>
      <p className={styles.paragraph}>안정적인 서비스 제공을 위해 아래와 같이 외부 클라우드 인프라에 개인정보 처리를 위탁하고 있습니다.</p>
      <ul className={styles.list}>
        <li className={styles.listItem}><strong>프론트엔드 호스팅:</strong> Vercel</li>
        <li className={styles.listItem}><strong>백엔드 서버:</strong> Oracle Cloud</li>
        <li className={styles.listItem}><strong>데이터베이스:</strong> MongoDB Atlas M0</li>
        <li className={styles.listItem}><strong>DNS 및 프록시:</strong> Cloudflare</li>
      </ul>
      <div className={styles.todoBox}>
        [TODO: 위탁 업체의 인프라 리전 확정 후 국외 이전 세부 항목(이전되는 국가, 일시, 연락처 등) 명시 필요. 기본적으로 국내 리전을 우선 사용하나, 글로벌 서비스 특성상 국외 법인 위탁 및 데이터 이전이 발생할 수 있습니다.]
      </div>

      <h2 className={styles.sectionTitle}>6. 개인정보 보호책임자</h2>
      <p className={styles.paragraph}>개인정보와 관련된 문의사항은 아래의 연락처로 문의해 주시기 바랍니다.</p>
      <ul className={styles.list}>
        <li className={styles.listItem}><strong>담당:</strong> FlashHook 개발팀</li>
        <li className={styles.listItem}>
          <strong>이메일:</strong> <a href="/contact" style={{ color: 'var(--accent-color, #2563eb)' }}>문의 페이지를 통해 연락</a>
        </li>
      </ul>
    </div>
  );
};
