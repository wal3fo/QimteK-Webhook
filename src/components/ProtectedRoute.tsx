import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-qimtek-bg flex items-center justify-center page-enter px-4">
        <div className="text-qimtek-text-secondary flex flex-col sm:flex-row items-center gap-3">
          <div className="spinner w-5 h-5 border-2 border-[#82c91e] border-t-transparent rounded-full"></div>
          <span className="text-sm sm:text-base">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page with the return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    // Redirect to home page if user is not admin
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
