"use client";

import { useEffect, useState } from "react";

export type ChartThemeColors = {
  primary: string;
  success: string;
  warning: string;
  destructive: string;
  mutedForeground: string;
  border: string;
  card: string;
  foreground: string;
};

/** Parse `hsl(…)` / `hsla(…)` components (commas, spaces, optional alpha). */
function parseHslComponents(color: string): { h: number; s: number; l: number } | null {
  const trimmed = color.trim();
  const innerMatch = trimmed.match(/^hsla?\(\s*(.+)\)$/i);
  if (!innerMatch) return null;
  let inner = innerMatch[1].trim();
  // Drop alpha: `/ 0.2` or `, 0.2`
  inner = inner.replace(/\s*\/\s*[\d.]+\s*$/, "");
  inner = inner.replace(/\s*,\s*[\d.]+\s*$/, "");
  const parts = inner.includes(",")
    ? inner.split(",").map((p) => p.trim())
    : inner.split(/\s+/).filter(Boolean);
  if (parts.length < 3) return null;
  const h = Number(parts[0].replace("%", ""));
  const s = Number(parts[1].replace("%", ""));
  const l = Number(parts[2].replace("%", ""));
  if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(l)) return null;
  return { h, s, l };
}

/** HSL → RGB for canvas-safe `rgba()` (avoids hsla parsing edge cases in some renderers). */
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const s1 = s / 100;
  const l1 = l / 100;
  const c = (1 - Math.abs(2 * l1 - 1)) * s1;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l1 - c / 2;
  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (h < 60) {
    rp = c;
    gp = x;
  } else if (h < 120) {
    rp = x;
    gp = c;
  } else if (h < 180) {
    gp = c;
    bp = x;
  } else if (h < 240) {
    gp = x;
    bp = c;
  } else if (h < 300) {
    rp = x;
    bp = c;
  } else {
    rp = c;
    bp = x;
  }
  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  };
}

/**
 * ECharts canvas gradients require parseable colors. Appending hex alpha (e.g. `33`)
 * only works for `#rrggbb`; it breaks `hsl(...)` → invalid `hsl(...)33`.
 */
export function colorWithAlpha(color: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  // Legacy bug: `hsl(...) + "33"` for alpha — strip trailing hex digits after `)`
  const trimmed = color.trim().replace(/\)([0-9a-f]{2,8})$/i, ")");

  if (trimmed.startsWith("#")) {
    const hex = trimmed.slice(1);
    let r: number;
    let g: number;
    let b: number;
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length >= 6) {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    } else {
      return trimmed;
    }
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  const hsl = parseHslComponents(trimmed);
  if (hsl) {
    const { r, g, b } = hslToRgb(hsl.h, hsl.s, hsl.l);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  return trimmed;
}

const FALLBACK: ChartThemeColors = {
  primary: "hsl(221, 83%, 53%)",
  success: "hsl(142, 71%, 45%)",
  warning: "hsl(38, 92%, 50%)",
  destructive: "hsl(0, 84%, 60%)",
  mutedForeground: "hsl(220, 9%, 46%)",
  border: "hsl(220, 13%, 91%)",
  card: "hsl(0, 0%, 100%)",
  foreground: "hsl(222, 47%, 11%)",
};

/** Read Tailwind HSL tokens from `:root` / `.dark` for ECharts styling. */
export function useChartThemeColors(): ChartThemeColors {
  const [colors, setColors] = useState<ChartThemeColors>(FALLBACK);

  useEffect(() => {
    const root = document.documentElement;
    const g = (name: string, fb: string) => {
      const raw = getComputedStyle(root).getPropertyValue(name).trim();
      return raw ? `hsl(${raw.split(/\s+/).join(", ")})` : fb;
    };
    setColors({
      primary: g("--primary", FALLBACK.primary),
      success: g("--success", FALLBACK.success),
      warning: g("--warning", FALLBACK.warning),
      destructive: g("--destructive", FALLBACK.destructive),
      mutedForeground: g("--muted-foreground", FALLBACK.mutedForeground),
      border: g("--border", FALLBACK.border),
      card: g("--card", FALLBACK.card),
      foreground: g("--foreground", FALLBACK.foreground),
    });
  }, []);

  return colors;
}
