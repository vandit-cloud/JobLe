import { Navigate } from "react-router-dom";
import { LoadingSkeleton } from "../components/common/LoadingSkeleton";
import { useAuth } from "../context/AuthContext";

export function RoleHomeRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSkeleton className="m-6 h-64" />;
  }

  if (!user) {
    return <Navigate replace to="/login" />;
  }

  if (user.role === "candidate") {
    return <Navigate replace to="/candidate/dashboard" />;
  }

  return <Navigate replace to="/recruiter/dashboard" />;
}
