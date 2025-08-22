import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const ProtectedRoute = ({ children, adminOnly = false, evaluatorOnly = false, adminOrEvaluator = false }) => {
  const { isAuthenticated, isAdmin, isEvaluator, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (evaluatorOnly && !isEvaluator) {
    return <Navigate to="/dashboard" replace />;
  }

  if (adminOrEvaluator && !isAdmin && !isEvaluator) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;

