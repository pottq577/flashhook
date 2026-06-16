import { Navigate, useLocation } from 'react-router-dom';
import { useAdminStore } from '@/entities/admin/model/adminStore';

interface Props {
  children: React.ReactNode;
}

export const RequireAdminAuth = ({ children }: Props) => {
  const adminToken = useAdminStore((state) => state.adminToken);
  const location = useLocation();

  if (!adminToken) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
