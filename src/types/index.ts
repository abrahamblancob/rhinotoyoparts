export interface Seller {
  id: string;
  name: string;
  role: string;
  description: string;
  imageUrl: string;
  whatsappNumber: string;
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  description: string;
  imageUrl: string;
  featured: boolean;
}

export type ProductCategory =
  | 'motor'
  | 'frenos'
  | 'suspension'
  | 'electrico'
  | 'carroceria'
  | 'accesorios';

export interface NavItem {
  label: string;
  href: string;
}

export interface ContactInfo {
  address: string;
  phone: string;
  email: string;
  instagramUrl: string;
  whatsappNumber: string;
}
