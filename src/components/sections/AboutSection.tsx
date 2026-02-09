import { SectionWrapper } from '../ui/SectionWrapper';
import { SectionTitle } from '../ui/SectionTitle';
import { SellerCard } from '../ui/SellerCard';
import { sellers } from '../../data/sellers';

export function AboutSection() {
  return (
    <SectionWrapper id="nosotros" dark>
      <SectionTitle
        title="Sobre Nosotros"
        subtitle="Somos un equipo apasionado por los vehiculos Toyota. Con anos de experiencia en el mercado venezolano, ofrecemos repuestos de calidad con atencion personalizada."
      />

      {/* Team grid - 1 col mobile, 2 cols tablet, 2 cols desktop (max 4 por fila cuando hay 8) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-10">
        {sellers.map((seller, index) => (
          <SellerCard key={seller.id} seller={seller} index={index} />
        ))}
      </div>
    </SectionWrapper>
  );
}
