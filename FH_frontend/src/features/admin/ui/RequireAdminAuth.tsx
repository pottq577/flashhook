import { Navigate, useLocation } from "react-router-dom";
import { useAdminStore } from "@/entities/admin/model/adminStore";

import type { ReactNode } from "react";

interface RequireAdminAuthProps {
  children: ReactNode;
}

export const RequireAdminAuth = ({ children }: RequireAdminAuthProps) => {
  const adminToken = useAdminStore((state) => state.adminToken);
  const location = useLocation();

  if (!adminToken) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
