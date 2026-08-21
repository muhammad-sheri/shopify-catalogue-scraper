/** One variant of one product: the shape `flatten_product` emits, per row. */
export interface Row {
  product_id: number | string | null;
  title: string | null;
  url: string | null;
  image: string | null;
  vendor: string | null;
  product_type: string | null;
  variant_title: string | null;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  sku: string | null;
  variant_id: number | string | null;
  price: string | number | null;
  compare_at_price: string | number | null;
  discount_pct: number | null;
  available: boolean | null;
  grams: number | null;
  requires_shipping: boolean | null;
  taxable: boolean | null;
  position: number | null;
  options: string | null;
  tags: string | null;
  handle: string | null;
  image_count: number | null;
  published_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  variant_updated_at: string | null;
  description: string | null;
  [key: string]: unknown;
}

/** One product, folded up from its variants by `groupProducts`. */
export interface ProductGroup {
  product_id: Row["product_id"];
  image: string | null;
  title: string | null;
  url: string | null;
  vendor: string | null;
  product_type: string | null;
  variants: number;
  in_stock: number;
  stock: string;
  price_min: number | null;
  price_max: number | null;
  best_discount_pct: number | null;
  options: string | null;
  tags: string | null;
  published_at: string | null;
}

export interface StoreReport {
  url: string;
  is_shopify: boolean;
  catalogue_available: boolean;
  status: number | null;
  detail: string;
  endpoint: string;
  meta: {
    name: string | null;
    currency: string | null;
    country: string | null;
    domain: string | null;
  };
}

export interface CataloguePage {
  url: string;
  page: number;
  limit: number;
  products: number;
  rows: Row[];
  has_more: boolean;
  descriptions_trimmed: boolean;
}

export const ANY_STOCK = "Any";
export const IN_STOCK = "In stock";
export const OUT_OF_STOCK = "Out of stock";
export type StockChoice = typeof ANY_STOCK | typeof IN_STOCK | typeof OUT_OF_STOCK;
export const STOCK_CHOICES: StockChoice[] = [ANY_STOCK, IN_STOCK, OUT_OF_STOCK];

export interface Filters {
  search: string;
  stock: StockChoice;
  priceRange: [number, number] | null;
  vendors: string[];
  productTypes: string[];
  onSaleOnly: boolean;
}

export const NO_FILTERS: Filters = {
  search: "",
  stock: ANY_STOCK,
  priceRange: null,
  vendors: [],
  productTypes: [],
  onSaleOnly: false,
};
