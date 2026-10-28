import { Navigate, Outlet, useLocation } from "react-router-dom";
import { LoadingState } from "../../components/ui";
import { ROUTES } from "../../app/routePaths";
import { useAuth } from "./authContext";

export function RequireAuthentication() {
  const { session, isLoading, error } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingState message="Restoring your session" />;
  }

  if (!session) {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />;
  }

  if (error) {
    return <p role="alert" className="auth-error">Session state could not be verified: {error}</p>;
  }

  return <Outlet />;
}