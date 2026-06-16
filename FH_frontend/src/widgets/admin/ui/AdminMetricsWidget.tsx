import { useAdminMetrics } from '@/entities/admin/api/useAdminQueries';
import { motion } from 'framer-motion';
import { RefreshCw, Users, Server, Activity } from 'lucide-react';
import { useEffect, useState } from 'react';

const AnimatedCounter = ({ value }: { value: number }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 1000;
    const increment = Math.ceil(value / (duration / 16));
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  return <span>{displayValue.toLocaleString()}</span>;
};

export const AdminMetricsWidget = () => {
  const { data, isLoading, isError, refetch, isFetching } = useAdminMetrics();

  if (isError) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400">
        지표 데이터를 불러오는데 실패했습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">핵심 지표 요약</h2>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5 disabled:opacity-50"
        >
          <RefreshCw size={18} className={isFetching ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            label: '오늘 생성된 엔드포인트',
            value: data?.endpointsCreatedToday || 0,
            icon: <Server size={24} className="text-blue-400" />,
            bg: 'from-blue-500/10 to-transparent border-blue-500/20',
          },
          {
            label: '현재 활성 연결 (SSE)',
            value: data?.activeSseConnections || 0,
            icon: <Users size={24} className="text-green-400" />,
            bg: 'from-green-500/10 to-transparent border-green-500/20',
          },
          {
            label: '누적 웹훅 수신량',
            value: data?.totalWebhooksReceived || 0,
            icon: <Activity size={24} className="text-purple-400" />,
            bg: 'from-purple-500/10 to-transparent border-purple-500/20',
          },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`p-6 rounded-2xl border bg-gradient-to-br ${item.bg} backdrop-blur-sm`}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-white/5 rounded-xl">
                {item.icon}
              </div>
              <h3 className="text-sm font-medium text-gray-400">{item.label}</h3>
            </div>
            <div className="text-3xl font-bold text-white tracking-tight">
              {isLoading ? (
                <div className="h-9 w-24 bg-white/10 rounded animate-pulse" />
              ) : (
                <AnimatedCounter value={item.value} />
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
