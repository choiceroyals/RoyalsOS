"use client";

import { useEffect, useState } from "react";
import {
  BRAND_OPERATIONS_EVENT,
  createInitialBrandOperationsState,
  loadBrandOperationsState,
  saveBrandOperationsState,
} from "@/lib/brands/client";
import styles from "./BrandSwitcher.module.css";

export default function BrandSwitcher({ onOpenBrands }: { onOpenBrands?: () => void }) {
  const [state, setState] = useState(() => createInitialBrandOperationsState());
  useEffect(() => {
    const refresh = () => setState(loadBrandOperationsState());
    refresh();
    window.addEventListener(BRAND_OPERATIONS_EVENT, refresh);
    return () => window.removeEventListener(BRAND_OPERATIONS_EVENT, refresh);
  }, []);
  const selected = state.brands.find((brand) => brand.id === state.selectedBrandId) ?? state.brands[0];
  return (
    <div className={styles.switcher} style={{ "--brand-accent": selected.accentColor } as React.CSSProperties}>
      <span>{selected.name.slice(0, 2).toUpperCase()}</span>
      <select
        aria-label="Current RoyalOS brand"
        value={selected.id}
        onChange={(event) => {
          const next = { ...state, selectedBrandId: event.target.value };
          setState(next);
          saveBrandOperationsState(next);
        }}
      >
        {state.brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
      </select>
      {onOpenBrands ? <button type="button" onClick={onOpenBrands}>Open</button> : null}
    </div>
  );
}
