import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar.tsx';

export function DeleteAccountPage() {
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm) return;
    // TODO: conectar al backend cuando esté listo
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-3xl mx-auto px-6 pt-16 pb-12">
        {!submitted ? (
          <>
            <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12">
              <h1 className="text-3xl font-bold text-[#242321] mb-2">Eliminar cuenta</h1>
              <p className="text-sm text-gray-500 mb-8">Rhino Móvil — Rhino Toyo Parts</p>

              <div className="space-y-8 text-[#363435] leading-relaxed">
                {/* Warning */}
                <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <p className="font-semibold text-red-800 mb-1">Esta acción es irreversible</p>
                      <p className="text-sm text-red-700">
                        Una vez procesada tu solicitud, se eliminarán permanentemente tu cuenta y los datos asociados.
                        No podrás recuperar tu cuenta después de la eliminación.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Steps */}
                <section>
                  <h2 className="text-xl font-semibold text-[#242321] mb-4">Pasos para eliminar tu cuenta</h2>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#242321] text-white flex items-center justify-center text-sm font-bold">1</div>
                      <div>
                        <p className="font-semibold">Completa el formulario de solicitud</p>
                        <p className="text-sm text-gray-600">Ingresa el correo electrónico asociado a tu cuenta de Rhino Móvil y opcionalmente indica el motivo de la eliminación.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#242321] text-white flex items-center justify-center text-sm font-bold">2</div>
                      <div>
                        <p className="font-semibold">Verificación de identidad</p>
                        <p className="text-sm text-gray-600">Recibirás un correo de confirmación para verificar que eres el titular de la cuenta.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#242321] text-white flex items-center justify-center text-sm font-bold">3</div>
                      <div>
                        <p className="font-semibold">Procesamiento de la solicitud</p>
                        <p className="text-sm text-gray-600">Tu solicitud será procesada en un plazo máximo de 7 días hábiles.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#242321] text-white flex items-center justify-center text-sm font-bold">4</div>
                      <div>
                        <p className="font-semibold">Confirmación de eliminación</p>
                        <p className="text-sm text-gray-600">Recibirás una notificación confirmando que tu cuenta y datos han sido eliminados.</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* What gets deleted */}
                <section>
                  <h2 className="text-xl font-semibold text-[#242321] mb-4">Datos que se eliminarán</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-red-50 rounded-xl p-4">
                      <p className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                        <span>🗑️</span> Se eliminarán permanentemente
                      </p>
                      <ul className="text-sm text-red-700 space-y-1.5">
                        <li className="flex items-start gap-2"><span>•</span> Información del perfil (nombre, email, teléfono)</li>
                        <li className="flex items-start gap-2"><span>•</span> Credenciales de acceso</li>
                        <li className="flex items-start gap-2"><span>•</span> Historial de ubicación GPS</li>
                        <li className="flex items-start gap-2"><span>•</span> Preferencias y configuración de la app</li>
                        <li className="flex items-start gap-2"><span>•</span> Tokens de sesión y autenticación</li>
                      </ul>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-4">
                      <p className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                        <span>📋</span> Se conservarán (anonimizados)
                      </p>
                      <ul className="text-sm text-amber-700 space-y-1.5">
                        <li className="flex items-start gap-2"><span>•</span> Registros de pedidos y entregas (sin datos personales)</li>
                        <li className="flex items-start gap-2"><span>•</span> Registros de auditoría operativa (anonimizados)</li>
                        <li className="flex items-start gap-2"><span>•</span> Datos agregados de estadísticas de entrega</li>
                      </ul>
                      <p className="text-xs text-amber-600 mt-3">
                        Estos datos se conservan de forma anonimizada por un máximo de 12 meses para cumplir con
                        obligaciones legales y operativas, según lo establecido en nuestra{' '}
                        <Link to="/privacy" className="underline">Política de Privacidad</Link>.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Form */}
                <section>
                  <h2 className="text-xl font-semibold text-[#242321] mb-4">Solicitar eliminación de cuenta</h2>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                        Correo electrónico de tu cuenta *
                      </label>
                      <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@correo.com"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D3010A] focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1.5">
                        Motivo de eliminación (opcional)
                      </label>
                      <select
                        id="reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D3010A] focus:border-transparent bg-white"
                      >
                        <option value="">Selecciona un motivo</option>
                        <option value="no_longer_use">Ya no uso la aplicación</option>
                        <option value="privacy_concerns">Preocupaciones de privacidad</option>
                        <option value="switched_service">Cambié a otro servicio</option>
                        <option value="too_many_notifications">Demasiadas notificaciones</option>
                        <option value="other">Otro motivo</option>
                      </select>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={confirm}
                          onChange={(e) => setConfirm(e.target.checked)}
                          className="mt-1 w-4 h-4 accent-[#D3010A]"
                        />
                        <span className="text-sm text-gray-700">
                          Entiendo que esta acción es <strong>irreversible</strong> y que todos mis datos personales,
                          incluyendo historial de ubicación, información de perfil y credenciales de acceso serán
                          eliminados permanentemente de los servidores de Rhino Toyo Parts.
                        </span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={!confirm || !email}
                      className="w-full py-3.5 rounded-xl text-white font-semibold text-sm transition-all duration-200"
                      style={{
                        background: confirm && email ? '#DC2626' : '#D1D5DB',
                        cursor: confirm && email ? 'pointer' : 'not-allowed',
                      }}
                    >
                      Solicitar eliminación de mi cuenta
                    </button>
                  </form>
                </section>

                {/* Contact */}
                <section className="border-t border-gray-100 pt-6">
                  <h2 className="text-lg font-semibold text-[#242321] mb-3">¿Necesitas ayuda?</h2>
                  <p className="text-sm text-gray-600">
                    Si tienes preguntas sobre el proceso de eliminación o necesitas asistencia, puedes contactarnos:
                  </p>
                  <ul className="list-none mt-3 space-y-1 text-sm">
                    <li><strong>Email:</strong> soporte@rhinotoyoparts.com</li>
                    <li><strong>Sitio web:</strong>{' '}
                      <a href="https://www.rhinotoyoparts.com" className="text-[#D3010A] hover:underline">www.rhinotoyoparts.com</a>
                    </li>
                  </ul>
                </section>
              </div>
            </div>

            {/* Footer link */}
            <div className="text-center mt-8 flex items-center justify-center gap-4">
              <Link to="/" className="text-sm text-gray-500 hover:text-[#D3010A] transition-colors">
                &larr; Volver al inicio
              </Link>
              <span className="text-gray-300">|</span>
              <Link to="/privacy" className="text-sm text-gray-500 hover:text-[#D3010A] transition-colors">
                Política de Privacidad
              </Link>
            </div>
          </>
        ) : (
          /* Success state */
          <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-[#242321] mb-3">Solicitud recibida</h1>
            <p className="text-gray-600 mb-2 max-w-md mx-auto">
              Hemos recibido tu solicitud de eliminación de cuenta para <strong>{email}</strong>.
            </p>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Recibirás un correo de confirmación en las próximas 24 horas. Tu cuenta y datos serán eliminados
              en un plazo máximo de <strong>7 días hábiles</strong>.
            </p>
            <div className="bg-blue-50 rounded-xl p-4 mb-8 max-w-md mx-auto">
              <p className="text-sm text-blue-800">
                Si no solicitaste esta eliminación, contacta inmediatamente a{' '}
                <a href="mailto:soporte@rhinotoyoparts.com" className="font-semibold underline">soporte@rhinotoyoparts.com</a>
              </p>
            </div>
            <Link
              to="/"
              className="inline-block px-8 py-3 rounded-xl text-white font-semibold text-sm transition-all duration-200"
              style={{ background: '#242321' }}
            >
              Volver al inicio
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
