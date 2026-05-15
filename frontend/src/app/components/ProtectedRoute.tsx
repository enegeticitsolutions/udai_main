import { Navigate, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";
import type { ReactNode } from "react";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="p-10 text-center text-sm text-[#776a66]">Checking your session...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/new-arrivals" state={{ from: location.pathname }} replace />;
  }

  return children;
}
