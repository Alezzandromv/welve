import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import type { Rol } from "@/types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: Rol[];
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const token = useAuthStore((s) => s.token);
  const rol = useAuthStore((s) => s.rol);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (roles && rol && !roles.includes(rol)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
