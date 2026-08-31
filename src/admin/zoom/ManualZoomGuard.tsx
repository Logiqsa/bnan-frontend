import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { usePortalAuth } from "@/portal/PortalAuthContext";

export default function ManualZoomGuard({ children, role }: { children: ReactNode; role: "admin" | "supervisor" }) {
  const { user, loading } = usePortalAuth();
  const location = useLocation();
  if (loading) return <div className="grid min-h-screen place-items-center font-cairo">جاري التحقق من الجلسة...</div>;
  if (!user) return <Navigate to="/portal/login" state={{ from: `${location.pathname}${location.search}` }} replace />;
  if (user.role !== role) {
    const destination = user.role === "admin"
      ? "/admin"
      : user.role === "supervisor"
        ? "/portal/supervisor/schedule"
        : `/portal/${user.role}/schedule`;
    return <Navigate to={destination} replace />;
  }
  return <>{children}</>;
}
