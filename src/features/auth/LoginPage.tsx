import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore.ts';
import { supabase } from '@/lib/supabase.ts';
import { Spinner } from '@/components/ui/Spinner.tsx';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const result = await login(email, password);
    if (result.error) {
      setError(result.error);
    } else {
      navigate('/hub');
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Ingresa tu correo electrónico primero');
      return;
    }
    setResetLoading(true);
    setError('');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/hub/reset-password`,
    });
    setResetLoading(false);
    if (resetError) {
      setError(resetError.message);
    } else {
      setResetSent(true);
    }
  };

  return (
    <div className="rhino-hub-login">
      <div className="rhino-hub-login-wrapper">
        {/* Header with logo */}
        <div className="rhino-hub-login-header">
          <img
            src="/logo.jpg"
            alt="Rhino Toyo Parts"
            className="rhino-hub-login-logo"
          />
          <h1 className="rhino-hub-login-title">Rhino Hub</h1>
          <p className="rhino-hub-login-subtitle">Plataforma de gestión B2B</p>
        </div>

        {/* Login card */}
        <div className="rhino-hub-login-card">
          <h2>Iniciar sesión</h2>

          {error && (
            <div className="rhino-hub-error-box" style={{ marginBottom: 20 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="rhino-hub-login-form">
            <div className="field">
              <label className="rhino-hub-label">Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rhino-hub-input"
                placeholder="usuario@correo.com"
              />
            </div>

            <div className="field">
              <label className="rhino-hub-label">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="rhino-hub-input"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="rhino-hub-btn-primary"
              style={{ width: '100%', padding: '14px 28px', marginTop: 4 }}
            >
              {loading ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Spinner size={16} />
                  Ingresando...
                </span>
              ) : (
                'Iniciar sesión'
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resetLoading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#D3010A',
                  fontSize: 13,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                }}
              >
                {resetLoading ? 'Enviando...' : '¿Olvidaste tu contraseña?'}
              </button>
            </div>

            {resetSent && (
              <div style={{
                marginTop: 12,
                padding: '12px 16px',
                borderRadius: 8,
                backgroundColor: '#10B98115',
                color: '#10B981',
                fontSize: 13,
                textAlign: 'center',
              }}>
                Se envió un correo a <strong>{email}</strong> con instrucciones para restablecer tu contraseña.
              </div>
            )}
          </form>
        </div>

        <p className="rhino-hub-login-footer">
          Rhino Toyo Parts &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
