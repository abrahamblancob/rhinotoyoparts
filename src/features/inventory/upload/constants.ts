/**
 * Maps possible file header names (lowercase, trimmed) to Product fields.
 * Supports both English and Spanish column names.
 */
export const HEADER_ALIASES: Record<string, string> = {
  // name (required)
  'name': 'name',
  'nombre': 'name',
  'product_name': 'name',
  'nombre_producto': 'name',
  'producto': 'name',

  // sku
  'sku': 'sku',
  'codigo': 'sku',
  'code': 'sku',
  'part_number': 'sku',
  'numero_parte': 'sku',

  // description
  'description': 'description',
  'descripcion': 'description',
  'desc': 'description',

  // brand
  'brand': 'brand',
  'marca': 'brand',

  // oem_number
  'oem': 'oem_number',
  'oem_number': 'oem_number',
  'numero_oem': 'oem_number',
  'oem_numero': 'oem_number',

  // price (required)
  'price': 'price',
  'precio': 'price',
  'precio_venta': 'price',
  'sell_price': 'price',

  // cost
  'cost': 'cost',
  'costo': 'cost',
  'precio_compra': 'cost',

  // stock (required)
  'stock': 'stock',
  'cantidad': 'stock',
  'quantity': 'stock',
  'inventario': 'stock',

  // min_stock
  'min_stock': 'min_stock',
  'stock_minimo': 'min_stock',
  'min_quantity': 'min_stock',
  'minimo': 'min_stock',

  // status
  'status': 'status',
  'estado': 'status',
};

/** Product fields available for mapping */
export const PRODUCT_FIELDS = [
  { key: 'name', label: 'Nombre', required: true },
  { key: 'sku', label: 'SKU', required: false },
  { key: 'description', label: 'Descripcion', required: false },
  { key: 'brand', label: 'Marca', required: false },
  { key: 'oem_number', label: 'Numero OEM', required: false },
  { key: 'price', label: 'Precio', required: true },
  { key: 'cost', label: 'Costo', required: false },
  { key: 'stock', label: 'Stock', required: true },
  { key: 'min_stock', label: 'Stock Minimo', required: false },
  { key: 'status', label: 'Estado', required: false },
] as const;

/** Batch size for Supabase inserts */
export const UPLOAD_BATCH_SIZE = 100;

/** Chunk size for validation processing (rows per frame) */
export const VALIDATION_CHUNK_SIZE = 200;
