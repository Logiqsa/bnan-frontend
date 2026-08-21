import { Navigate, useLocation } from "react-router-dom";
import type { PortalRole } from "@/api/types";
import { usePortalAuth } from "./PortalAuthContext";

export default function PortalGuard({ role, children }: { role: PortalRole; children: React.ReactNode }) {
  const { user, loading } = usePortalAuth(); const location = useLocation();
  if (loading) return <div className="min-h-screen grid place-items-center font-cairo">جاري التحقق من الجلسة...</div>;
  if (!user) return <Navigate to="/portal/login" state={{ from: location.pathname }} replace />;
  if (user.role !== role) return <Navigate to={user.role === "admin" ? "/admin" : `/portal/${user.role}/schedule`} replace />;
  return <>{children}</>;
}
