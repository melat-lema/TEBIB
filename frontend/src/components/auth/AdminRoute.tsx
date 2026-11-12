import { Navigate } from 'react-router-dom';
import { ADMIN_TOKEN_KEY, tokenIsValid, adminLogout } from '../../lib/adminApi';

/** Blocks the admin pages unless a non-expired admin token exists. The server still verifies every request. */
export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!tokenIsValid(token)) {
    adminLogout();
    return <Navigate to="/admin/login" replace />;
  }
  return <>{children}</>;
}
