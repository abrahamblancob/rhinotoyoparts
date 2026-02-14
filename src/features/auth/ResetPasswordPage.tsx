import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase.ts';

export function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase automatically detects the recovery token from the URL hash
    // and creates a session. We listen for the PASSWORD_RECOVERY event.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
          if (session) {
            setSessionReady(true);
            setChecking(false);
          }
        }
      }
    );

    // Also check if there's already a session (user clicked link and got redirected)
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionReady(true);
      }
      setChecking(false);
    };

    // Give Supabase a moment to process the hash fragment
    setTimeout(checkSession, 1500);

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    // Mark profile as active on first password set
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({ is_active: true, last_login: new Date().toISOString() })
        .eq('id', user.id);
    }

    setSuccess(true);
    setLoading(false);

    // Redirect to dashboard after 2 seconds
    setTimeout(() => {
      navigate('/hub');
    }, 2000);
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

        {/* Card */}
        <div className="rhino-hub-login-card">
          {checking ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" style={{ margin: '0 auto 12px', display: 'block', color: '#D3010A' }}>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p style={{ color: '#8A8886', fontSize: 14 }}>Verificando enlace...</p>
            </div>
          ) : !sessionReady ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
              <h2 style={{ marginBottom: 8 }}>Enlace inválido o expirado</h2>
              <p style={{ color: '#8A8886', fontSize: 14, marginBottom: 20 }}>
                El enlace de recuperación ha expirado o ya fue utilizado. Solicita uno nuevo desde la página de login.
              </p>
              <button
                onClick={() => navigate('/hub/login')}
                className="rhino-hub-btn-primary"
                style={{ padding: '12px 28px' }}
              >
                Ir a Iniciar sesión
              </button>
            </div>
          ) : success ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
              <h2 style={{ marginBottom: 8 }}>Contraseña establecida</h2>
              <p style={{ color: '#8A8886', fontSize: 14 }}>
                Tu contraseña fue actualizada exitosamente. Redirigiendo al dashboard...
              </p>
            </div>
          ) : (
            <>
              <h2>Establecer contraseña</h2>
              <p style={{ color: '#8A8886', fontSize: 14, marginBottom: 20 }}>
                Crea tu contraseña para acceder al sistema.
              </p>

              {error && (
                <div className="rhino-hub-error-box" style={{ marginBottom: 20 }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="rhino-hub-login-form">
                <div className="field">
                  <label className="rhino-hub-label">Nueva contraseña</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="rhino-hub-input"
                    placeholder="Mínimo 6 caracteres"
                    autoFocus
                  />
                </div>

                <div className="field">
                  <label className="rhino-hub-label">Confirmar contraseña</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="rhino-hub-input"
                    placeholder="Repite tu contraseña"
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
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Guardando...
                    </span>
                  ) : (
                    'Establecer contraseña'
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="rhino-hub-login-footer">
          Rhino Toyo Parts &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
