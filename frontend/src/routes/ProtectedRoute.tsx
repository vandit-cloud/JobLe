import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LoadingSkeleton } from "../components/common/LoadingSkeleton";

export function ProtectedRoute({ role = "recruiter" }: { role?: "recruiter" | "candidate" | "admin" }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSkeleton className="m-6 h-64" />;
  }

  if (!user || user.role !== role) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}
