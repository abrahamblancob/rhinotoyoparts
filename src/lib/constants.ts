// Rhino Hub Design Tokens
export const COLORS = {
  primary: '#D3010A',
  primaryDark: '#A80008',
  dark1: '#363435',
  dark2: '#242321',
  background: '#F5F5F4',
  white: '#FFFFFF',
  border: '#E2E0DE',
  text1: '#242321',
  text2: '#363435',
  text3: '#8A8886',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#D3010A',
  info: '#6366F1',
} as const;

export const ORG_TYPES = {
  PLATFORM: 'platform',
  AGGREGATOR: 'aggregator',
  ASSOCIATE: 'associate',
} as const;

export const MODULES = [
  'dashboard',
  'organizations',
  'users',
  'inventory',
  'catalog',
  'orders',
  'customers',
  'billing',
  'audit',
  'settings',
  'upload',
] as const;

export const ACTIONS = ['read', 'write', 'delete', 'manage'] as const;

export const ROLES = {
  PLATFORM_OWNER: 'platform_owner',
  PLATFORM_SUPPORT: 'platform_support',
  PLATFORM_VIEWER: 'platform_viewer',
  AGGREGATOR_ADMIN: 'aggregator_admin',
  AGGREGATOR_MANAGER: 'aggregator_manager',
  AGGREGATOR_VIEWER: 'aggregator_viewer',
  ASSOCIATE_ADMIN: 'associate_admin',
  ASSOCIATE_EDITOR: 'associate_editor',
  ASSOCIATE_VIEWER: 'associate_viewer',
} as const;

export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
] as const;

export const PRODUCT_STATUSES = [
  'active',
  'inactive',
  'out_of_stock',
] as const;

export type OrgType = (typeof ORG_TYPES)[keyof typeof ORG_TYPES];
export type Module = (typeof MODULES)[number];
export type Action = (typeof ACTIONS)[number];
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];
