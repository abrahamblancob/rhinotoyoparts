import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar.tsx';

export function TermsPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 pt-16 pb-12">
        <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12">
          <h1 className="text-3xl font-bold text-[#242321] mb-2">Términos y Condiciones</h1>
          <p className="text-sm text-gray-500 mb-8">Última actualización: 24 de febrero de 2026</p>

          <div className="space-y-8 text-[#363435] leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold text-[#242321] mb-3">1. Aceptación de los Términos</h2>
              <p>
                Al acceder y utilizar la aplicación <strong>Rhino Móvil</strong>, el sitio web rhinotoyoparts.com
                y los servicios relacionados (en conjunto, el "Servicio") operados por Rhino Toyo Parts ("nosotros",
                "nuestro", "la Empresa"), usted acepta estar sujeto a estos Términos y Condiciones. Si no está de
                acuerdo con alguna parte de estos términos, no deberá utilizar el Servicio.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#242321] mb-3">2. Descripción del Servicio</h2>
              <p>Rhino Toyo Parts ofrece a través de su plataforma:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><strong>Rhino Hub:</strong> plataforma de gestión de pedidos, inventario y despachos para organizaciones asociadas.</li>
                <li><strong>Rhino Móvil:</strong> aplicación móvil para despachadores que permite el rastreo GPS de entregas en tiempo real.</li>
                <li><strong>Rastreo público:</strong> página web que permite a los clientes finales consultar el estado de su pedido mediante un código de seguimiento.</li>
                <li><strong>Catálogo digital:</strong> exhibición de productos y repuestos Toyota disponibles.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#242321] mb-3">3. Registro y Cuentas de Usuario</h2>
              <h3 className="font-semibold mt-4 mb-2">3.1 Creación de cuenta</h3>
              <p>
                Para acceder a ciertas funcionalidades del Servicio, es necesario registrarse con una cuenta. Usted se
                compromete a proporcionar información veraz, actualizada y completa durante el proceso de registro.
              </p>
              <h3 className="font-semibold mt-4 mb-2">3.2 Seguridad de la cuenta</h3>
              <p>
                Usted es responsable de mantener la confidencialidad de sus credenciales de acceso. Cualquier actividad
                realizada bajo su cuenta será su responsabilidad. Debe notificarnos inmediatamente si sospecha de un
                uso no autorizado de su cuenta.
              </p>
              <h3 className="font-semibold mt-4 mb-2">3.3 Tipos de cuenta</h3>
              <p>
                Existen diferentes roles de usuario (administrador, vendedor, despachador, visor) con distintos niveles
                de acceso y permisos. El administrador de cada organización es responsable de asignar los roles
                apropiados a sus usuarios.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#242321] mb-3">4. Uso del Servicio</h2>
              <h3 className="font-semibold mt-4 mb-2">4.1 Uso permitido</h3>
              <p>El Servicio debe utilizarse únicamente para:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Gestión legítima de pedidos y entregas de repuestos automotrices</li>
                <li>Rastreo de entregas asignadas dentro de la plataforma</li>
                <li>Consulta del estado de pedidos mediante códigos de seguimiento válidos</li>
                <li>Administración del inventario y catálogo de productos</li>
              </ul>

              <h3 className="font-semibold mt-4 mb-2">4.2 Uso prohibido</h3>
              <p>Queda estrictamente prohibido:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Utilizar el Servicio para actividades ilegales o no autorizadas</li>
                <li>Intentar acceder a cuentas, datos o áreas del sistema sin autorización</li>
                <li>Interferir con el funcionamiento normal del Servicio</li>
                <li>Compartir credenciales de acceso con terceros</li>
                <li>Utilizar el sistema de rastreo GPS para fines distintos al despacho de pedidos</li>
                <li>Extraer, copiar o recopilar datos del Servicio de forma automatizada</li>
                <li>Modificar, descompilar o realizar ingeniería inversa del software</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#242321] mb-3">5. Rastreo GPS y Ubicación</h2>
              <p>
                Los usuarios con rol de despachador que utilicen la aplicación Rhino Móvil aceptan que:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Su ubicación será rastreada en tiempo real durante su jornada de trabajo activa</li>
                <li>Los datos de ubicación serán visibles para la organización administradora y los clientes con código de seguimiento</li>
                <li>El rastreo se activa al iniciar la jornada y se desactiva al finalizarla</li>
                <li>Pueden revocar el permiso de ubicación en cualquier momento desde la configuración del dispositivo</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#242321] mb-3">6. Pedidos y Entregas</h2>
              <h3 className="font-semibold mt-4 mb-2">6.1 Códigos de seguimiento</h3>
              <p>
                Cada pedido confirmado genera un código de seguimiento único (formato RH-XXXX-XXXX) que permite al
                cliente consultar el estado de su entrega. Este código es confidencial y debe compartirse únicamente
                con el destinatario del pedido.
              </p>
              <h3 className="font-semibold mt-4 mb-2">6.2 Tiempos estimados</h3>
              <p>
                Los tiempos estimados de entrega son aproximados y pueden variar según condiciones de tráfico, clima
                y otros factores externos. Rhino Toyo Parts no garantiza tiempos exactos de entrega.
              </p>
              <h3 className="font-semibold mt-4 mb-2">6.3 Responsabilidad en la entrega</h3>
              <p>
                La responsabilidad por los productos durante el despacho recae en la organización asociada que gestiona
                el pedido. Rhino Toyo Parts provee la plataforma tecnológica pero no es responsable directo del proceso
                de entrega física.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#242321] mb-3">7. Propiedad Intelectual</h2>
              <p>
                Todo el contenido del Servicio, incluyendo pero no limitado a textos, gráficos, logotipos, iconos,
                imágenes, software y código fuente, es propiedad de Rhino Toyo Parts o de sus licenciantes y está
                protegido por las leyes de propiedad intelectual aplicables. No se otorga ninguna licencia o derecho
                sobre la propiedad intelectual excepto el derecho limitado de uso del Servicio conforme a estos términos.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#242321] mb-3">8. Privacidad</h2>
              <p>
                El uso de sus datos personales se rige por nuestra{' '}
                <Link to="/privacy" className="text-[#D3010A] hover:underline font-medium">Política de Privacidad</Link>,
                la cual forma parte integral de estos Términos y Condiciones. Al utilizar el Servicio, usted acepta
                las prácticas descritas en dicha política.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#242321] mb-3">9. Limitación de Responsabilidad</h2>
              <p>
                El Servicio se proporciona "tal cual" y "según disponibilidad". En la máxima medida permitida por la ley:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>No garantizamos que el Servicio sea ininterrumpido, seguro o libre de errores</li>
                <li>No somos responsables de daños indirectos, incidentales o consecuentes</li>
                <li>No asumimos responsabilidad por la pérdida de datos debido a fallos técnicos</li>
                <li>Nuestra responsabilidad total se limita al monto pagado por el usuario en los últimos 12 meses</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#242321] mb-3">10. Suspensión y Terminación</h2>
              <p>
                Nos reservamos el derecho de suspender o cancelar su acceso al Servicio si:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Incumple estos Términos y Condiciones</li>
                <li>Utiliza el Servicio de manera fraudulenta o ilegal</li>
                <li>Su conducta perjudica a otros usuarios o al funcionamiento del Servicio</li>
              </ul>
              <p className="mt-2">
                Usted puede solicitar la eliminación de su cuenta en cualquier momento a través de nuestra{' '}
                <Link to="/delete-account" className="text-[#D3010A] hover:underline font-medium">página de eliminación de cuenta</Link>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#242321] mb-3">11. Modificaciones</h2>
              <p>
                Nos reservamos el derecho de modificar estos Términos y Condiciones en cualquier momento. Los cambios
                serán efectivos desde su publicación en el Servicio. El uso continuado del Servicio después de la
                publicación de cambios constituye su aceptación de los nuevos términos. Le notificaremos sobre cambios
                significativos a través de la aplicación o por correo electrónico.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#242321] mb-3">12. Ley Aplicable</h2>
              <p>
                Estos Términos y Condiciones se rigen por las leyes de la República Bolivariana de Venezuela.
                Cualquier disputa será sometida a la jurisdicción de los tribunales competentes de la ciudad de Caracas.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#242321] mb-3">13. Contacto</h2>
              <p>
                Si tiene preguntas sobre estos Términos y Condiciones, puede contactarnos:
              </p>
              <ul className="list-none mt-2 space-y-1">
                <li><strong>Email:</strong> soporte@rhinotoyoparts.com</li>
                <li><strong>Sitio web:</strong>{' '}
                  <a href="https://www.rhinotoyoparts.com" className="text-[#D3010A] hover:underline">www.rhinotoyoparts.com</a>
                </li>
              </ul>
            </section>
          </div>
        </div>

        {/* Footer links */}
        <div className="text-center mt-8 flex items-center justify-center gap-4">
          <Link to="/" className="text-sm text-gray-500 hover:text-[#D3010A] transition-colors">
            &larr; Volver al inicio
          </Link>
          <span className="text-gray-300">|</span>
          <Link to="/privacy" className="text-sm text-gray-500 hover:text-[#D3010A] transition-colors">
            Política de Privacidad
          </Link>
          <span className="text-gray-300">|</span>
          <Link to="/delete-account" className="text-sm text-gray-500 hover:text-[#D3010A] transition-colors">
            Eliminar cuenta
          </Link>
        </div>
      </main>
    </div>
  );
}
