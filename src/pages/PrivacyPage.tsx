import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar.tsx';

export function PrivacyPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 pt-16 pb-12">
        <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12">
          <h1 className="text-3xl font-bold text-[#242321] mb-2">Política de Privacidad</h1>
          <p className="text-sm text-gray-500 mb-8">Última actualización: 23 de febrero de 2026</p>

          <div className="space-y-8 text-[#363435] leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold text-[#242321] mb-3">1. Introducción</h2>
              <p>
                Rhino Toyo Parts ("nosotros", "nuestro") opera la aplicación móvil <strong>Rhino Móvil</strong> y el sitio web
                rhinotoyoparts.com (en conjunto, el "Servicio"). Esta política describe cómo recopilamos, usamos y protegemos
                su información personal cuando utiliza nuestro Servicio.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#242321] mb-3">2. Información que Recopilamos</h2>

              <h3 className="font-semibold mt-4 mb-2">2.1 Información de la cuenta</h3>
              <p>Cuando se registra en nuestro Servicio, recopilamos:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Nombre completo</li>
                <li>Dirección de correo electrónico</li>
                <li>Número de teléfono</li>
                <li>Organización a la que pertenece</li>
              </ul>

              <h3 className="font-semibold mt-4 mb-2">2.2 Datos de ubicación (GPS)</h3>
              <p>
                Nuestra aplicación móvil Rhino Móvil recopila datos de ubicación en tiempo real <strong>únicamente cuando
                el despachador inicia una jornada de trabajo</strong>. Estos datos incluyen:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Coordenadas GPS (latitud y longitud)</li>
                <li>Precisión de la ubicación</li>
                <li>Velocidad y dirección de movimiento</li>
                <li>Marca de tiempo de cada registro</li>
              </ul>
              <p className="mt-2">
                Los datos de ubicación se utilizan <strong>exclusivamente</strong> para permitir el rastreo de entregas en
                tiempo real por parte de los clientes y la organización. La recopilación de ubicación se detiene automáticamente
                cuando el despachador finaliza su jornada.
              </p>

              <h3 className="font-semibold mt-4 mb-2">2.3 Uso de la cámara</h3>
              <p>
                La aplicación solicita acceso a la cámara del dispositivo <strong>únicamente</strong> para escanear códigos QR
                asociados a los pedidos. No tomamos fotografías, no grabamos video y no almacenamos imágenes de la cámara.
              </p>

              <h3 className="font-semibold mt-4 mb-2">2.4 Información del dispositivo</h3>
              <p>Podemos recopilar información básica del dispositivo como:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Nivel de batería (para optimizar el rastreo GPS)</li>
                <li>Sistema operativo y versión</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#242321] mb-3">3. Cómo Usamos su Información</h2>
              <p>Utilizamos la información recopilada para:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Proporcionar el servicio de rastreo de entregas en tiempo real</li>
                <li>Permitir a los clientes ver el estado y ubicación de sus pedidos</li>
                <li>Gestionar las cuentas de los despachadores</li>
                <li>Mejorar la eficiencia de las rutas de entrega</li>
                <li>Comunicarnos con los usuarios sobre sus pedidos</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#242321] mb-3">4. Compartición de Datos</h2>
              <p>
                Sus datos de ubicación durante una entrega activa son compartidos con:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>El cliente que espera la entrega (a través de la página de rastreo público)</li>
                <li>La organización administradora del despacho</li>
              </ul>
              <p className="mt-2">
                <strong>No vendemos, alquilamos ni compartimos su información personal con terceros</strong> con fines de marketing
                o publicidad.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#242321] mb-3">5. Almacenamiento y Seguridad</h2>
              <p>
                Sus datos se almacenan de forma segura en servidores de Supabase con cifrado en tránsito (TLS/SSL)
                y en reposo. Implementamos medidas de seguridad técnicas y organizativas para proteger su información,
                incluyendo autenticación segura y control de acceso basado en roles (RLS).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#242321] mb-3">6. Retención de Datos</h2>
              <p>
                Los datos de ubicación de las jornadas de trabajo se conservan por un período necesario para el
                funcionamiento del servicio y la generación de reportes operativos. Los datos de la cuenta se
                mantienen mientras la cuenta esté activa.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#242321] mb-3">7. Sus Derechos</h2>
              <p>Usted tiene derecho a:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Acceder a sus datos personales</li>
                <li>Solicitar la corrección de datos inexactos</li>
                <li>Solicitar la eliminación de sus datos</li>
                <li>Revocar los permisos de ubicación y cámara en cualquier momento desde la configuración de su dispositivo</li>
                <li>Desactivar el rastreo GPS finalizando su jornada de trabajo</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#242321] mb-3">8. Permisos de la Aplicación</h2>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-lg">📍</span>
                  <div>
                    <p className="font-semibold">Ubicación (GPS)</p>
                    <p className="text-sm text-gray-600">Requerido para rastreo de entregas en tiempo real. Solo activo durante la jornada laboral.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-lg">📷</span>
                  <div>
                    <p className="font-semibold">Cámara</p>
                    <p className="text-sm text-gray-600">Requerido para escanear códigos QR de pedidos. No almacena imágenes.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-lg">🌐</span>
                  <div>
                    <p className="font-semibold">Internet</p>
                    <p className="text-sm text-gray-600">Requerido para sincronizar datos con el servidor y enviar ubicación.</p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#242321] mb-3">9. Cambios a esta Política</h2>
              <p>
                Podemos actualizar esta política de privacidad ocasionalmente. Le notificaremos sobre cualquier cambio
                significativo a través de la aplicación o por correo electrónico.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#242321] mb-3">10. Contacto</h2>
              <p>
                Si tiene preguntas sobre esta política de privacidad o sobre el manejo de sus datos, puede contactarnos:
              </p>
              <ul className="list-none mt-2 space-y-1">
                <li><strong>Email:</strong> soporte@rhinotoyoparts.com</li>
                <li><strong>Sitio web:</strong> <a href="https://www.rhinotoyoparts.com" className="text-[#D3010A] hover:underline">www.rhinotoyoparts.com</a></li>
              </ul>
            </section>
          </div>
        </div>

        {/* Footer link */}
        <div className="text-center mt-8">
          <Link to="/" className="text-sm text-gray-500 hover:text-[#D3010A] transition-colors">
            &larr; Volver al inicio
          </Link>
        </div>
      </main>
    </div>
  );
}
