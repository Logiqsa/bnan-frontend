import { Navigate, useLocation } from "react-router-dom";
import { usePortalAuth } from "@/portal/PortalAuthContext";
import { firstAllowedAdminPath, hasAdminPermission, permissionForAdminLocation } from "@/lib/adminPermissions";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = usePortalAuth();
  const location = useLocation();
  if (loading) return <div className="min-h-screen grid place-items-center font-cairo">جاري التحقق من الجلسة...</div>;
  if (!user) return <Navigate to="/portal/login" state={{ from: location.pathname }} replace />;
  if (user.role !== "admin") {
    const destination = user.role === "teacher"
      ? "/portal/teacher"
      : `/portal/${user.role}/schedule`;
    return <Navigate to={destination} replace />;
  }
  const permission = permissionForAdminLocation(location.pathname, location.search);
  if (!hasAdminPermission(user, permission)) return <Navigate to={firstAllowedAdminPath(user)} replace />;
  return <>{children}</>;
}
