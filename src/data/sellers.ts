import type { Seller } from '../types';

export const sellers: Seller[] = [
  {
    id: 'vendedor-1',
    name: 'Diego Rendiles',
    role: 'CEO',
    description:
      'Experto en motores y repuestos Toyota con más de 15 años de experiencia en el mercado.',
    imageUrl: 'https://omeoiefgckiilgwhczra.supabase.co/storage/v1/object/public/assets/diego-rendiles.jpeg',
    whatsappNumber: '584241396324',
  },
  {
    id: 'vendedor-2',
    name: 'Enrique Rendiles',
    role: 'COO',
    description:
      'Experto en logística y mercadeo, garantizando la mejor experiencia para nuestros clientes.',
    imageUrl: 'https://omeoiefgckiilgwhczra.supabase.co/storage/v1/object/public/assets/enrique-rendiles.jpeg',
    whatsappNumber: '584242121072',
  },
  {
    id: 'vendedor-3',
    name: 'Alito Ramos',
    role: 'Especialista en electrónica',
    description:
      'Experto en repuestos eléctricos y electrónicos, con conocimientos para pruebas en sitio.',
    imageUrl: '/sellers/seller-placeholder.webp',
    whatsappNumber: '584242374723',
  },
  {
    id: 'vendedor-4',
    name: 'Giuseppe Giannitti',
    role: 'Especialista en Ventas',
    description:
      'Experto en ventas y marketing, brindando asesoría personalizada para cada cliente.',
    imageUrl: 'https://omeoiefgckiilgwhczra.supabase.co/storage/v1/object/public/assets/Giuseppe-Giannitti.jpeg',
    whatsappNumber: '584121169448',
  },
];
