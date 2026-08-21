/**
 * Filtering and product grouping for catalogue rows.
 *
 * A direct port of `scraper_agent/catalogue_view.py`. It lives in TypeScript
 * because it has to run on every keystroke: the Streamlit original re-runs the
 * whole script server-side for each widget change, which is exactly the lag
 * this version exists to remove.
 *
 * `lib/catalogue.test.ts` mirrors `tests/test_catalogue_view.py` case for case,
 * so the two implementations are held to the same behaviour rather than
 * assumed to agree.
 */

import {
  ANY_STOCK,
  IN_STOCK,
  OUT_OF_STOCK,
  type Filters,
  type ProductGroup,
  type Row,
} from "./types";

/**
 * Fields a shopper-style search looks at. Deliberately excludes `description`,
 * which is long enough that almost any term would match something.
 */
export const SEARCH_FIELDS = [
  "title",
  "sku",
  "vendor",
  "product_type",
  "tags",
  "variant_title",
  "option1",
  "option2",
  "option3",
  "handle",
] as const;

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  CAD: "CA$",
  AUD: "A$",
  NZD: "NZ$",
  GBP: "£",
  EUR: "€",
  JPY: "¥",
  INR: "₹",
  PKR: "₨",
  AED: "AED ",
  SAR: "SAR ",
};

/** Shopify sends prices as strings ("91.00"). Number or null, never throws. */
export function toPrice(value: unknown): number | null {
  if (value === null || value === undefined || typeof value === "boolean") return null;
  const parsed = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

/** [min, max] across every priced row; [0, 0] when nothing has a price. */
export function priceBounds(rows: Row[]): [number, number] {
  const prices = rows
    .map((row) => toPrice(row.price))
    .filter((price): price is number => price !== null);
  if (prices.length === 0) return [0, 0];
  return [Math.min(...prices), Math.max(...prices)];
}

/** Sorted non-empty values of a field, ready to use as facet options. */
export function distinct(rows: Row[], field: string): string[] {
  const values = new Set<string>();
  for (const row of rows) {
    const raw = row[field];
    if (!raw) continue;
    values.add(String(raw).trim());
  }
  return [...values]
    .filter((value) => value && value.toLowerCase() !== "none")
    // Plain codepoint order, matching Python's sorted(); localeCompare would
    // reorder case and accents differently from the reference implementation.
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/**
 * Every term must appear somewhere in the row (AND, not OR).
 *
 * AND is what makes a two-word query useful: "gold ring" should mean both,
 * otherwise adding a word only ever widens the result set.
 */
function matchesSearch(row: Row, terms: string[]): boolean {
  const haystack = SEARCH_FIELDS.map((field) => row[field] ?? "")
    .join(" ")
    .toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

/** Apply the visible filters. Every field left at its default is a no-op. */
export function filterRows(rows: Row[], filters: Partial<Filters> = {}): Row[] {
  const {
    search = "",
    stock = ANY_STOCK,
    priceRange = null,
    vendors = [],
    productTypes = [],
    onSaleOnly = false,
  } = filters;

  const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
  const vendorSet = new Set(vendors.filter(Boolean));
  const typeSet = new Set(productTypes.filter(Boolean));

  return rows.filter((row) => {
    if (terms.length && !matchesSearch(row, terms)) return false;

    // Strict identity, not truthiness: a null flag is not evidence of stock,
    // and not evidence of the opposite either.
    if (stock === IN_STOCK && row.available !== true) return false;
    if (stock === OUT_OF_STOCK && row.available !== false) return false;

    if (priceRange !== null) {
      const price = toPrice(row.price);
      // An unpriced row cannot satisfy a price range, so it drops out only
      // once the user has actually narrowed the range from full width.
      if (price === null || price < priceRange[0] || price > priceRange[1]) return false;
    }

    if (vendorSet.size && !vendorSet.has(String(row.vendor ?? ""))) return false;
    if (typeSet.size && !typeSet.has(String(row.product_type ?? ""))) return false;
    if (onSaleOnly && (row.discount_pct === null || row.discount_pct === undefined ||
        (row.discount_pct as unknown) === "")) return false;

    return true;
  });
}

function groupKey(row: Row): string | number {
  const key = row.product_id || row.url || row.title;
  return (key ?? "") as string | number;
}

function stockLabel(inStock: number, total: number): string {
  if (inStock === 0) return "Out of stock";
  if (inStock === total) return "In stock";
  return `${inStock}/${total} in stock`;
}

/**
 * One summary row per product, in first-seen order.
 *
 * Variants of a product disagree about price and stock, which is the whole
 * reason the collapsed view exists: it reports the range and the in-stock
 * count rather than picking an arbitrary variant to stand for the product.
 */
export function groupProducts(rows: Row[]): ProductGroup[] {
  const order: (string | number)[] = [];
  const groups = new Map<string | number, Row[]>();

  for (const row of rows) {
    const key = groupKey(row);
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(row);
  }

  return order.map((key) => {
    const members = groups.get(key)!;
    const first = members[0];
    const prices = members
      .map((row) => toPrice(row.price))
      .filter((price): price is number => price !== null);
    const discounts = members
      .map((row) => row.discount_pct)
      .filter((pct): pct is number => pct !== null && pct !== undefined && (pct as unknown) !== "");
    const inStock = members.filter((row) => row.available === true).length;

    return {
      product_id: first.product_id,
      image: members.find((row) => row.image)?.image ?? null,
      title: first.title,
      url: first.url,
      vendor: first.vendor,
      product_type: first.product_type,
      variants: members.length,
      in_stock: inStock,
      stock: stockLabel(inStock, members.length),
      price_min: prices.length ? Math.min(...prices) : null,
      price_max: prices.length ? Math.max(...prices) : null,
      best_discount_pct: discounts.length ? Math.max(...discounts) : null,
      options: first.options,
      tags: first.tags,
      published_at: first.published_at,
    };
  });
}

/** The rows belonging to one product, matched the way groupProducts keys them. */
export function variantsOf(rows: Row[], productId: unknown): Row[] {
  return rows.filter((row) => groupKey(row) === productId);
}

function money(value: number, symbol: string): string {
  return `${symbol}${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * "$91.00" for a single price, "$91.00 to $130.00" for a spread.
 *
 * Spelled "to" rather than punctuated with a dash because this lands in a stat
 * tile people read at a glance, and a dash could be a minus sign.
 */
export function priceLabel(
  low: number | null,
  high: number | null,
  currency = "",
): string {
  if (low === null || high === null) return "no prices";
  const symbol = CURRENCY_SYMBOLS[(currency || "").toUpperCase()] ?? "";
  const left = money(low, symbol);
  if (Math.abs(high - low) < 0.005) return left;
  return `${left} to ${money(high, symbol)}`;
}
