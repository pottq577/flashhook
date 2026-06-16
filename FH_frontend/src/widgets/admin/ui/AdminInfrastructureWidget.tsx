import { Activity, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

export const AdminInfrastructureWidget = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-white">시스템 인프라 관리</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.a
          href="http://localhost:3000" // 개발 환경용 URL, 운영 환경에서는 proxy 또는 실 도메인 활용
          target="_blank"
          rel="noreferrer"
          whileHover={{ y: -2 }}
          className="block p-6 rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-transparent backdrop-blur-sm group hover:border-orange-500/40 transition-colors"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-orange-500/20 text-orange-400 rounded-xl">
                <Activity size={20} />
              </div>
              <h3 className="font-semibold text-white">Grafana 대시보드</h3>
            </div>
            <ExternalLink size={18} className="text-gray-500 group-hover:text-orange-400 transition-colors" />
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Prometheus에서 수집한 시스템 메트릭(CPU, 메모리, 트래픽 등)을 상세하게 관제합니다.
          </p>
          <div className="flex items-center gap-2 text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-green-400 font-medium">Monitoring Active</span>
          </div>
        </motion.a>
      </div>
    </div>
  );
};
