import { Instagram, Mail, MapPin } from 'lucide-react';
import { CONTACT_INFO } from '../../config/contact';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-rhino-light-gray">
      <div className="rhino-container rhino-footer">
        <div className="footer-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {/* Brand */}
          <div>
            <img src="/logo.jpg" alt="Rhino Toyo Parts" width="140" height="64" loading="lazy" className="h-16 w-auto" />
            <p className="footer-brand-text text-rhino-steel text-sm leading-relaxed">
              Tu proveedor de confianza en repuestos Toyota en Venezuela.
              Calidad, garantia y los mejores precios del mercado.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="footer-heading text-rhino-white font-semibold uppercase tracking-wider text-sm">
              Enlaces
            </h4>
            <nav aria-label="Enlaces del sitio" className="footer-links flex flex-col">
              {['Inicio', 'Nosotros', 'Tienda'].map((link) => (
                <a
                  key={link}
                  href={`#${link.toLowerCase()}`}
                  className="text-rhino-steel hover:text-rhino-white transition-colors text-sm"
                >
                  {link}
                </a>
              ))}
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h4 className="footer-heading text-rhino-white font-semibold uppercase tracking-wider text-sm">
              Contacto
            </h4>
            <address className="footer-contact-items flex flex-col" style={{ fontStyle: 'normal' }}>
              <a
                href={`mailto:${CONTACT_INFO.email}`}
                className="flex items-center gap-2 text-rhino-steel hover:text-rhino-white transition-colors text-sm"
              >
                <Mail size={16} className="shrink-0" />
                <span className="break-all">{CONTACT_INFO.email}</span>
              </a>
              <a
                href="https://maps.app.goo.gl/YmAzq4YsuZYD9CT58"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-rhino-steel hover:text-rhino-white transition-colors text-sm"
              >
                <MapPin size={16} className="shrink-0" />
                {CONTACT_INFO.address}
              </a>
              <a
                href={CONTACT_INFO.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-rhino-steel hover:text-rhino-red transition-colors text-sm"
              >
                <Instagram size={16} className="shrink-0" />
                @rhinotoyoparts
              </a>
            </address>
          </div>
        </div>

        {/* Bottom */}
        <div className="footer-bottom border-t border-rhino-light-gray text-center">
          <p className="text-rhino-steel text-xs sm:text-sm">
            &copy; {currentYear} Rhino Toyo Parts. Todos los derechos reservados. | desarrollado por{' '}
            <a
              href="https://www.wabyte.net"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#d32f2f', textDecoration: 'none', fontWeight: 600 }}
            >
              www.wabyte.net
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
