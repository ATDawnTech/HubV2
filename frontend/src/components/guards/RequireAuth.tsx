import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface RequireAuthProps {
  children: React.ReactNode;
}

/**
 * Redirects unauthenticated users to /login.
 * Preserves the current path so the user can be returned after login (future).
 */
export function RequireAuth({ children }: RequireAuthProps): JSX.Element | null {
  const { token, isLoading } = useAuth();
  const location = useLocation();

  // Wait for dev token auto-fetch before deciding (local env only)
  if (isLoading) return null;

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
