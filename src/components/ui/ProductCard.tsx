import { motion } from 'framer-motion';
import { Package, MessageCircle } from 'lucide-react';
import type { Product } from '../../types';
import { WHATSAPP_BASE_URL } from '../../config/contact';
import { CONTACT_INFO } from '../../config/contact';

interface ProductCardProps {
  product: Product;
  index: number;
}

export function ProductCard({ product, index }: ProductCardProps) {
  const whatsappLink = `${WHATSAPP_BASE_URL}${CONTACT_INFO.whatsappNumber}?text=${encodeURIComponent(
    `Hola, me interesa el producto: ${product.name}. Me pueden dar mas informacion?`,
  )}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="bg-rhino-gray rounded-2xl overflow-hidden border border-rhino-light-gray hover:border-rhino-red/40 transition-all duration-300 group hover:shadow-lg hover:shadow-rhino-red/10"
    >
      {/* Image placeholder */}
      <div className="h-48 bg-rhino-light-gray flex items-center justify-center relative overflow-hidden">
        <Package size={48} className="text-rhino-steel/40" />
        {product.featured && (
          <span className="absolute top-3 right-3 bg-rhino-red text-white text-xs font-bold px-3 py-1 rounded-full">
            Destacado
          </span>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-rhino-gray/50 to-transparent" />
      </div>

      {/* Content */}
      <div className="p-5">
        <span className="text-rhino-red text-xs font-semibold uppercase tracking-wider">
          {product.category}
        </span>
        <h3 className="text-rhino-white font-bold text-lg mt-1 mb-2 group-hover:text-rhino-red transition-colors">
          {product.name}
        </h3>
        <p className="text-rhino-steel text-sm leading-relaxed mb-4">
          {product.description}
        </p>

        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-rhino-light-gray hover:bg-rhino-red text-rhino-white py-2.5 rounded-lg text-sm font-semibold transition-all duration-300"
        >
          <MessageCircle size={16} />
          Consultar
        </a>
      </div>
    </motion.div>
  );
}
