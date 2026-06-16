import { AdminMetricsWidget } from '@/widgets/admin/ui/AdminMetricsWidget';
import { AdminAbuserTable } from '@/widgets/admin/ui/AdminAbuserTable';
import { AdminBlacklistManager } from '@/widgets/admin/ui/AdminBlacklistManager';
import { AdminInfrastructureWidget } from '@/widgets/admin/ui/AdminInfrastructureWidget';
import { useAdminStore } from '@/entities/admin/model/adminStore';
import { LogOut, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './AdminDashboardPage.module.css';

export const AdminDashboardPage = () => {
  const logout = useAdminStore(state => state.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logoWrapper}>
            <div className={styles.logoIcon}>
              <Shield size={20} />
            </div>
            <h1 className={styles.title}>FlashHook Backoffice</h1>
          </div>
          
          <button 
            onClick={handleLogout}
            className={styles.logoutBtn}
          >
            <LogOut size={16} />
            로그아웃
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <section>
          <AdminMetricsWidget />
        </section>

        <div className={styles.grid}>
          <section>
            <AdminAbuserTable />
          </section>
          <section className={styles.sidePanel}>
            <AdminBlacklistManager />
            <AdminInfrastructureWidget />
          </section>
        </div>
      </main>
    </div>
  );
};
