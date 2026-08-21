"use client";

import { useCallback, useRef, useState } from "react";
import type { CataloguePage, Row, StoreReport } from "./types";

/** Products per request. Matches DEFAULT_LIMIT in scraper_api/service.py. */
const PAGE_LIMIT = 100;

/**
 * Hard ceiling on requests. `fetch_products` in the core has the same guard,
 * for the same reason: a store that ignores `?page` answers page 1 forever,
 * and without a ceiling the loop below would never end.
 */
const MAX_PAGES = 200;

export type Phase = "idle" | "checking" | "fetching" | "done" | "error";

export interface Progress {
  page: number;
  products: number;
  rows: number;
}

export interface CatalogueState {
  phase: Phase;
  rows: Row[];
  store: StoreReport | null;
  error: string | null;
  /** True when the store is Shopify but its product API refused us. */
  refused: boolean;
  progress: Progress;
  descriptionsTrimmed: boolean;
  capped: boolean;
}

const EMPTY: CatalogueState = {
  phase: "idle",
  rows: [],
  store: null,
  error: null,
  refused: false,
  progress: { page: 0, products: 0, rows: 0 },
  descriptionsTrimmed: false,
  capped: false,
};

/** How groupProducts keys a row, so dedup and grouping agree on identity. */
const keyOf = (row: Row): string | number => (row.product_id || row.url || row.title || "") as string | number;

async function getJson<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((body as { error?: string }).error ?? `Request failed (${response.status})`);
  }
  return body as T;
}

export function useCatalogue() {
  const [state, setState] = useState<CatalogueState>(EMPTY);
  const inFlight = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    inFlight.current?.abort();
    inFlight.current = null;
  }, []);

  const reset = useCallback(() => {
    cancel();
    setState(EMPTY);
  }, [cancel]);

  const run = useCallback(
    async (rawUrl: string, maxProducts: number | null) => {
      cancel();
      const controller = new AbortController();
      inFlight.current = controller;
      const { signal } = controller;
      const url = rawUrl.trim();

      setState({ ...EMPTY, phase: "checking" });

      try {
        const store = await getJson<StoreReport>(
          `/api/store?url=${encodeURIComponent(url)}`,
          signal,
        );

        if (!store.catalogue_available) {
          // "Not Shopify" and "Shopify, but the API refused" are different
          // answers, and the user can act on only one of them.
          setState({
            ...EMPTY,
            phase: "error",
            store,
            error: store.detail,
            refused: store.is_shopify,
          });
          return;
        }

        setState({ ...EMPTY, phase: "fetching", store });

        const collected: Row[] = [];
        const seen = new Set<string | number>();
        let trimmed = false;
        let capped = false;
        let page = 1;

        while (page <= MAX_PAGES) {
          const data = await getJson<CataloguePage>(
            `/api/catalogue?url=${encodeURIComponent(url)}&page=${page}&limit=${PAGE_LIMIT}`,
            signal,
          );
          trimmed = trimmed || data.descriptions_trimmed;

          // (1) The catalogue ran out.
          if (data.products === 0) break;

          const addedHere = new Set<string | number>();
          for (const row of data.rows) {
            const id = keyOf(row);
            if (seen.has(id)) continue; // a store replaying an earlier page
            if (!addedHere.has(id)) {
              // (4) The user's product cap.
              if (maxProducts !== null && seen.size + addedHere.size >= maxProducts) {
                capped = true;
                break;
              }
              addedHere.add(id);
            }
            collected.push(row);
          }
          for (const id of addedHere) seen.add(id);

          // (2) Nothing new on this page: the store is ignoring ?page.
          if (addedHere.size === 0) break;

          setState((prev) => ({
            ...prev,
            rows: [...collected],
            progress: { page, products: seen.size, rows: collected.length },
            descriptionsTrimmed: trimmed,
          }));

          if (capped) break;
          // (3) A short page is the last page.
          if (!data.has_more) break;
          page += 1;
        }

        setState((prev) => ({
          ...prev,
          phase: "done",
          rows: collected,
          progress: { page: Math.min(page, MAX_PAGES), products: seen.size, rows: collected.length },
          descriptionsTrimmed: trimmed,
          capped,
        }));
      } catch (error) {
        if (signal.aborted) return; // a newer run replaced this one
        setState((prev) => ({
          ...prev,
          phase: "error",
          error: error instanceof Error ? error.message : String(error),
        }));
      } finally {
        if (inFlight.current === controller) inFlight.current = null;
      }
    },
    [cancel],
  );

  return { ...state, run, cancel, reset };
}
