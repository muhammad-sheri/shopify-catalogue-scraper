/**
 * Mirrors tests/test_catalogue_view.py from the scraper_agent repo, case for
 * case, using the same fixture rows. The point is not coverage for its own
 * sake: this file is the evidence that porting the filter layer to TypeScript
 * did not quietly change what the catalogue shows.
 */

import { describe, expect, it } from "vitest";
import {
  distinct,
  filterRows,
  groupProducts,
  priceBounds,
  priceLabel,
  variantsOf,
} from "./catalogue";
import { IN_STOCK, OUT_OF_STOCK, type Row } from "./types";

const row = (over: Partial<Row>): Row => ({ ...over } as Row);

const ROWS: Row[] = [
  row({
    product_id: 1, title: "Gold Star Ring", vendor: "David Von", product_type: "Rings",
    variant_title: "14K Yellow Gold / 4", option1: "14K Yellow Gold", option2: "4",
    sku: "R-4", price: "685.00", compare_at_price: null, discount_pct: null,
    available: true, tags: "Diana", url: "https://s.com/products/gold-star-ring",
    image: null,
  }),
  row({
    product_id: 1, title: "Gold Star Ring", vendor: "David Von", product_type: "Rings",
    variant_title: "14K White Gold / 8", option1: "14K White Gold", option2: "8",
    sku: "R-8", price: "1205.00", compare_at_price: "1400.00", discount_pct: 13.9,
    available: false, tags: "Diana", url: "https://s.com/products/gold-star-ring",
    image: "https://cdn/img.jpg",
  }),
  row({
    product_id: 2, title: "Silver Necklace", vendor: "Other Co", product_type: "Necklaces",
    variant_title: "One size", option1: "One size", option2: null,
    sku: "N-1", price: "585.00", compare_at_price: null, discount_pct: null,
    available: true, tags: "sale", url: "https://s.com/products/silver-necklace",
    image: null,
  }),
];

const skus = (rows: Row[]) => rows.map((r) => r.sku);

describe("search", () => {
  it("is case insensitive across fields", () => {
    expect(filterRows(ROWS, { search: "david von" })).toHaveLength(2);
    expect(filterRows(ROWS, { search: "R-8" })).toHaveLength(1);
  });

  it("ands terms rather than oring them", () => {
    expect(filterRows(ROWS, { search: "gold" })).toHaveLength(2);
    expect(filterRows(ROWS, { search: "gold white" })).toHaveLength(1);
    expect(filterRows(ROWS, { search: "gold necklace" })).toEqual([]);
  });

  it("ignores description noise", () => {
    const rows = [row({ ...ROWS[0], description: "hand-forged in a workshop in Antwerp" })];
    expect(filterRows(rows, { search: "antwerp" })).toEqual([]);
  });
});

describe("stock", () => {
  it("splits the rows", () => {
    expect(skus(filterRows(ROWS, { stock: IN_STOCK }))).toEqual(["R-4", "N-1"]);
    expect(skus(filterRows(ROWS, { stock: OUT_OF_STOCK }))).toEqual(["R-8"]);
  });

  it("treats unknown availability as neither", () => {
    const rows = [row({ ...ROWS[0], available: null })];
    expect(filterRows(rows, { stock: IN_STOCK })).toEqual([]);
    expect(filterRows(rows, { stock: OUT_OF_STOCK })).toEqual([]);
  });
});

describe("price", () => {
  it("reads string prices", () => {
    expect(skus(filterRows(ROWS, { priceRange: [500, 700] }))).toEqual(["R-4", "N-1"]);
  });

  it("bounds span the catalogue", () => {
    expect(priceBounds(ROWS)).toEqual([585, 1205]);
  });

  it("bounds of unpriced rows do not throw", () => {
    expect(priceBounds([row({ price: null }), row({ price: "n/a" })])).toEqual([0, 0]);
  });

  it("drops unpriced rows from a narrowed range", () => {
    const rows = [...ROWS, row({ ...ROWS[0], sku: "X", price: null })];
    expect(skus(filterRows(rows, { priceRange: [0, 2000] }))).not.toContain("X");
  });
});

describe("facets", () => {
  it("combines vendor and type", () => {
    expect(filterRows(ROWS, { vendors: ["David Von"], productTypes: ["Rings"] })).toHaveLength(2);
    expect(filterRows(ROWS, { vendors: ["David Von"], productTypes: ["Necklaces"] })).toEqual([]);
  });

  it("keeps only real markdowns when discounted-only is on", () => {
    expect(skus(filterRows(ROWS, { onSaleOnly: true }))).toEqual(["R-8"]);
  });

  it("skips blanks when listing distinct values", () => {
    expect(distinct(ROWS, "vendor")).toEqual(["David Von", "Other Co"]);
    expect(distinct([row({ vendor: "" }), row({ vendor: null })], "vendor")).toEqual([]);
  });

  it("is a no-op with no filters", () => {
    expect(filterRows(ROWS)).toEqual(ROWS);
  });
});

describe("grouping", () => {
  it("folds variants into one row per product", () => {
    const groups = groupProducts(ROWS);
    expect(groups.map((g) => g.title)).toEqual(["Gold Star Ring", "Silver Necklace"]);
    expect(groups.map((g) => g.variants)).toEqual([2, 1]);
  });

  it("reports the price spread, not one arbitrary variant", () => {
    const ring = groupProducts(ROWS)[0];
    expect([ring.price_min, ring.price_max]).toEqual([685, 1205]);
  });

  it("labels partial stock as partial", () => {
    expect(groupProducts(ROWS)[0].stock).toBe("1/2 in stock");
    expect(groupProducts(ROWS.slice(2))[0].stock).toBe("In stock");
    expect(groupProducts(ROWS.slice(1, 2))[0].stock).toBe("Out of stock");
  });

  it("prefers the first variant image that exists", () => {
    expect(groupProducts(ROWS)[0].image).toBe("https://cdn/img.jpg");
  });

  it("keeps the best discount", () => {
    expect(groupProducts(ROWS)[0].best_discount_pct).toBe(13.9);
  });

  it("returns only that product's variants", () => {
    expect(skus(variantsOf(ROWS, 1))).toEqual(["R-4", "R-8"]);
  });

  it("falls back to url when ids are missing", () => {
    const rows = ROWS.map((r) => row({ ...r, product_id: null }));
    expect(groupProducts(rows).map((g) => g.variants)).toEqual([2, 1]);
  });

  it("reports filtered counts when filtering then grouping", () => {
    const visible = filterRows(ROWS, { stock: IN_STOCK });
    expect(groupProducts(visible)[0].variants).toBe(1);
  });
});

describe("priceLabel", () => {
  it.each([
    [685, 1205, "USD", "$685.00 to $1,205.00"],
    [685, 685, "USD", "$685.00"],
    [10, 20, "GBP", "£10.00 to £20.00"],
    [10, 20, "XYZ", "10.00 to 20.00"],
    [null, null, "USD", "no prices"],
  ])("formats %s..%s in %s", (low, high, currency, expected) => {
    expect(priceLabel(low as number | null, high as number | null, currency as string)).toBe(
      expected,
    );
  });
});
