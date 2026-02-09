import { useState } from 'react';
import { motion } from 'framer-motion';
import { SectionWrapper } from '../ui/SectionWrapper';
import { SectionTitle } from '../ui/SectionTitle';
import { ProductCard } from '../ui/ProductCard';
import { products, CATEGORY_LABELS } from '../../data/products';

export function ProductsSection() {
  const [activeCategory, setActiveCategory] = useState('todos');

  const categories = ['todos', ...new Set(products.map((p) => p.category))];

  const filteredProducts =
    activeCategory === 'todos'
      ? products
      : products.filter((p) => p.category === activeCategory);

  return (
    <SectionWrapper id="productos">
      <SectionTitle
        title="Nuestros Productos"
        subtitle="Amplio catalogo de repuestos Toyota originales y compatibles. Calidad garantizada para tu vehiculo."
      />

      {/* Category filters */}
      <div className="flex flex-wrap justify-center gap-3 mb-12">
        {categories.map((cat) => (
          <motion.button
            key={cat}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveCategory(cat)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 cursor-pointer ${
              activeCategory === cat
                ? 'bg-rhino-red text-white shadow-lg shadow-rhino-red/25'
                : 'bg-rhino-gray text-rhino-steel hover:text-rhino-white border border-rhino-light-gray hover:border-rhino-red/40'
            }`}
          >
            {CATEGORY_LABELS[cat] || cat}
          </motion.button>
        ))}
      </div>

      {/* Products grid */}
      <motion.div
        layout
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {filteredProducts.map((product, index) => (
          <ProductCard key={product.id} product={product} index={index} />
        ))}
      </motion.div>
    </SectionWrapper>
  );
}
