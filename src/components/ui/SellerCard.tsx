import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { User } from 'lucide-react';
import type { Seller } from '../../types';
import { useWhatsappLink } from '../../hooks/useWhatsappLink';
import { trackWhatsAppClick } from '../../utils/analytics';

interface SellerCardProps {
  seller: Seller;
  index: number;
}

export function SellerCard({ seller, index }: SellerCardProps) {
  const whatsappLink = useWhatsappLink(
    seller.whatsappNumber,
    `Hola ${seller.name}, me comunico desde la web de Rhino Toyo Parts. Me interesa consultar sobre repuestos.`,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="rhino-seller-card rounded-2xl border border-rhino-light-gray hover:border-rhino-red/40 group"
      style={{ backgroundColor: '#ffffff' }}
    >
      {/* Avatar + Name */}
      <div className="seller-header flex items-center gap-3">
        <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-full bg-rhino-light-gray flex items-center justify-center overflow-hidden border-2 border-rhino-red/30 group-hover:border-rhino-red transition-colors">
          {seller.imageUrl && !seller.imageUrl.includes('placeholder') ? (
            <img
              src={seller.imageUrl}
              alt={seller.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <User size={24} className="text-rhino-steel" />
          )}
        </div>
        <div className="min-w-0">
          <h3 className="text-rhino-white font-bold text-base sm:text-lg truncate">
            {seller.name}
          </h3>
          <p className="text-rhino-red text-xs sm:text-sm font-medium truncate">
            {seller.role}
          </p>
        </div>
      </div>

      {/* Description */}
      <p className="seller-desc text-rhino-steel text-xs sm:text-sm leading-relaxed line-clamp-3">
        {seller.description}
      </p>

      {/* QR + WhatsApp button */}
      <div className="flex items-end justify-between gap-3">
        <div className="bg-white p-1.5 sm:p-2 rounded-lg shrink-0 border border-rhino-light-gray">
          <QRCodeSVG
            value={whatsappLink}
            size={64}
            bgColor="#ffffff"
            fgColor="#0a0a0a"
            level="M"
          />
        </div>

        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="rhino-whatsapp-btn-sm"
          aria-label={`Contactar a ${seller.name} por WhatsApp`}
          onClick={() => trackWhatsAppClick(seller.name, seller.role)}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          WhatsApp
        </a>
      </div>

      <p className="seller-qr-label text-rhino-steel/50 text-[10px] sm:text-xs text-center">
        Escanea el QR para contactar
      </p>
    </motion.div>
  );
}
