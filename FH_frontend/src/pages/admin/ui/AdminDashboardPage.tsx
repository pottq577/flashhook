import { AdminMetricsWidget } from '@/widgets/admin/ui/AdminMetricsWidget';
import { AdminAbuserTable } from '@/widgets/admin/ui/AdminAbuserTable';
import { AdminBlacklistManager } from '@/widgets/admin/ui/AdminBlacklistManager';
import { AdminInfrastructureWidget } from '@/widgets/admin/ui/AdminInfrastructureWidget';
import { useAdminStore } from '@/entities/admin/model/adminStore';
import { LogOut, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AdminDashboardPage = () => {
  const logout = useAdminStore(state => state.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#0B0C0F]">
      <header className="sticky top-0 z-50 bg-[#0B0C0F]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-red-500/10 rounded-lg text-red-500">
              <Shield size={20} />
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight">FlashHook Backoffice</h1>
          </div>
          
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <LogOut size={16} />
            로그아웃
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-12">
        <section>
          <AdminMetricsWidget />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section className="lg:col-span-2">
            <AdminAbuserTable />
          </section>
          <section className="space-y-8">
            <AdminBlacklistManager />
            <AdminInfrastructureWidget />
          </section>
        </div>
      </main>
    </div>
  );
};
