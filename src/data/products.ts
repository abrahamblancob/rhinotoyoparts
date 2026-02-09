import type { Product } from '../types';

export const products: Product[] = [
  {
    id: 'prod-1',
    name: 'Kit de Frenos Delanteros',
    category: 'frenos',
    description: 'Kit completo de pastillas y discos de freno para Toyota Hilux, Fortuner y 4Runner.',
    imageUrl: '/products/brakes.webp',
    featured: true,
  },
  {
    id: 'prod-2',
    name: 'Filtro de Aceite',
    category: 'motor',
    description: 'Filtro de aceite original compatible con motores 2.7L y 4.0L Toyota.',
    imageUrl: '/products/oil-filter.webp',
    featured: true,
  },
  {
    id: 'prod-3',
    name: 'Amortiguadores Traseros',
    category: 'suspension',
    description: 'Par de amortiguadores traseros de alta durabilidad para Toyota Hilux.',
    imageUrl: '/products/shocks.webp',
    featured: true,
  },
  {
    id: 'prod-4',
    name: 'Alternador',
    category: 'electrico',
    description: 'Alternador reconstruido con garantia para Toyota Corolla y Yaris.',
    imageUrl: '/products/alternator.webp',
    featured: false,
  },
  {
    id: 'prod-5',
    name: 'Parachoques Delantero',
    category: 'carroceria',
    description: 'Parachoques delantero compatible con Toyota Hilux 2016-2024.',
    imageUrl: '/products/bumper.webp',
    featured: true,
  },
  {
    id: 'prod-6',
    name: 'Kit de Embrague',
    category: 'motor',
    description: 'Kit de embrague completo: disco, plato y collarin para Toyota Hilux 2.7L.',
    imageUrl: '/products/clutch.webp',
    featured: false,
  },
];

export const CATEGORY_LABELS: Record<string, string> = {
  motor: 'Motor',
  frenos: 'Frenos',
  suspension: 'Suspension',
  electrico: 'Electrico',
  carroceria: 'Carroceria',
  accesorios: 'Accesorios',
  todos: 'Todos',
};
