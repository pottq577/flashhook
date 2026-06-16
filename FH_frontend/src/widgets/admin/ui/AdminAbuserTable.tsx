import { useAdminSuspiciousEndpoints, useDeleteEndpointMutation } from '@/entities/admin/api/useAdminQueries';
import { Trash2, AlertTriangle, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

export const AdminAbuserTable = () => {
  const { data, isLoading } = useAdminSuspiciousEndpoints();
  const deleteMutation = useDeleteEndpointMutation();

  const handleDelete = (endpointId: string) => {
    if (confirm('이 엔드포인트를 즉시 삭제하시겠습니까?')) {
      deleteMutation.mutate(endpointId);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-semibold text-white">과부하 의심 엔드포인트</h2>
        <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">
          Top 10
        </span>
      </div>
      
      <div className="bg-[#1a1b1e] border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="text-xs uppercase bg-white/5 text-gray-500">
              <tr>
                <th className="px-6 py-4 font-medium">엔드포인트 ID</th>
                <th className="px-6 py-4 font-medium">라벨</th>
                <th className="px-6 py-4 font-medium">로그 수</th>
                <th className="px-6 py-4 font-medium">생성 IP</th>
                <th className="px-6 py-4 font-medium text-right">작업</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex justify-center items-center gap-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      데이터를 불러오는 중...
                    </div>
                  </td>
                </tr>
              ) : !data || data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    현재 탐지된 과부하 의심 엔드포인트가 없습니다.
                  </td>
                </tr>
              ) : (
                data.map((endpoint, i) => (
                  <motion.tr 
                    key={endpoint.endpointId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-t border-white/5 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-6 py-4 font-mono text-gray-300">
                      {endpoint.endpointId.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4 text-white">
                      {endpoint.label || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-amber-400">
                        <AlertTriangle size={14} />
                        {endpoint.logCount.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">
                      {endpoint.creatorIp}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <a 
                          href={`/dashboard/${endpoint.endpointId}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-1.5 text-gray-500 hover:text-blue-400 transition-colors rounded-lg hover:bg-blue-500/10"
                        >
                          <ExternalLink size={16} />
                        </a>
                        <button
                          onClick={() => handleDelete(endpoint.endpointId)}
                          disabled={deleteMutation.isPending}
                          className="p-1.5 text-gray-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
