import { Navigate } from "react-router-dom";
import { useAuth } from "../auth";

// Wrap any recruiter-only page in this. Not logged in → /login. Logged in
// as a CANDIDATE → /board (their side of the app). This is UX routing only —
// the real wall is the backend's role gate; even a candidate who forces a
// recruiter page open gets nothing but 403s from the API.
function ProtectedRoute({ children }) {
  const { token, role } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (role === "candidate") return <Navigate to="/board" replace />;
  return children;
}

export default ProtectedRoute;
