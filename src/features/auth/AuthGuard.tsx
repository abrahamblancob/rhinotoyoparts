import { useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore.ts';
import { Spinner } from '@/components/ui/Spinner.tsx';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const initialized = useAuthStore((s) => s.initialized);
  const loadSession = useAuthStore((s) => s.loadSession);
  const navigate = useNavigate();

  useEffect(() => {
    if (!initialized) {
      loadSession();
    }
  }, [initialized, loadSession]);

  useEffect(() => {
    if (initialized && !loading && !user) {
      navigate('/hub/login');
    }
  }, [initialized, loading, user, navigate]);

  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <img src="/logo.jpg" alt="Rhino" className="w-16 h-16 mx-auto mb-4 object-contain" />
          <div className="flex items-center justify-center gap-2 mt-3">
            <Spinner size={20} color="#D3010A" />
            <span className="text-sm" style={{ color: '#8A8886' }}>Cargando...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
