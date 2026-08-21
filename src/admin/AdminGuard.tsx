import { Navigate, useLocation } from "react-router-dom";
import { usePortalAuth } from "@/portal/PortalAuthContext";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = usePortalAuth();
  const location = useLocation();
  if (loading) return <div className="min-h-screen grid place-items-center font-cairo">جاري التحقق من الجلسة...</div>;
  if (!user) return <Navigate to="/portal/login" state={{ from: location.pathname }} replace />;
  if (user.role !== "admin") return <Navigate to={`/portal/${user.role}/schedule`} replace />;
  return <>{children}</>;
}
