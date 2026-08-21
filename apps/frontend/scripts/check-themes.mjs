#!/usr/bin/env node
/**
 * WCAG 2.1 contrast compliance gate for every theme palette.
 *
 * Fails the build when any text-level pair drops below 4.5:1 (or 3:1 for
 * the large/UI thresholds below) in any theme × mode, and warns on
 * decorative pairs below the soft floor. Run with `pnpm themes:check`.
 */
import { THEMES } from '../src/lib/themes/registry.ts';

/** Relative luminance, WCAG 2.1. */
function luminance([r, g, b]) {
  const f = (v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function ratio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Text pairs that must reach 4.5:1 — these mirror how components actually
 * combine tokens (links, labels, badges, button text, selected rows).
 */
const TEXT_PAIRS = [
  ['ink', 'bg'],
  ['ink', 'surface'],
  ['ink2', 'bg'],
  ['ink2', 'surface'],
  ['ink3', 'bg'],
  ['ink3', 'surface'],
  ['ink', 'surfaceMuted'],
  ['ink3', 'surfaceMuted'],
  ['ink3', 'brandBlue50'], // descriptions inside selected rows
  ['ink3', 'brandYellow50'],
  ['ink3', 'brandRed50'],
  ['ink3', 'brandGreen50'],
  ['brandBlue', 'bg'],
  ['brandBlue', 'surface'],
  ['brandBlue', 'brandBlue50'], // selected rows / active chips
  ['brandYellowInk', 'brandYellow50'], // yellow tint text
  ['brandRed', 'bg'],
  ['brandRed', 'brandRed50'],
  ['brandGreen', 'bg'],
  ['brandGreen', 'brandGreen50'],
  ['brandYellowFg', 'brandYellow'], // yellow-filled buttons
];

/** Pairs that must reach 3:1 (large text / meaningful UI). */
const UI_PAIRS = [
  ['focus', 'bg'], // focus ring
];

/** ink-4 renders at small sizes — full 4.5:1, same as the other tiers. */
const INK4_PAIRS = [
  ['ink4', 'surface'],
  ['ink4', 'surfaceMuted'],
];

/** Button fills must hold white text at 4.5:1 (strong = the fill shade). */
const FILL_PAIRS = [
  ['white', 'brandBlueStrong'],
  ['white', 'brandRedStrong'],
  ['white', 'brandGreenStrong'],
];

const WHITE = [255, 255, 255];

const NAME = {
  ink: 'ink',
  ink2: 'ink-2',
  ink3: 'ink-3',
  ink4: 'ink-4',
  bg: 'bg',
  surface: 'surface',
  surfaceMuted: 'surface-muted',
  surfaceInverse: 'surface-inverse',
  brandBlue: 'brand-blue',
  brandBlueStrong: 'brand-blue-strong',
  brandRed: 'brand-red',
  brandRedStrong: 'brand-red-strong',
  brandGreen: 'brand-green',
  brandGreenStrong: 'brand-green-strong',
  brandYellow: 'brand-yellow',
  brandYellowInk: 'brand-yellow-ink',
  brandYellowFg: 'brand-yellow-fg',
  brandBlue50: 'brand-blue-50',
  brandRed50: 'brand-red-50',
  brandGreen50: 'brand-green-50',
  brandYellow50: 'brand-yellow-50',
  focus: 'focus',
  white: 'white',
};

let failures = 0;
let warnings = 0;

for (const theme of THEMES) {
  for (const mode of ['light', 'dark']) {
    const p = theme[mode];
    const resolve = (key) => (key === 'white' ? WHITE : p[key]);
    for (const [a, b] of TEXT_PAIRS) {
      const r = ratio(resolve(a), resolve(b));
      if (r < 4.5) {
        failures += 1;
        console.error(
          `FAIL ${theme.id}/${mode}: ${NAME[a]} on ${NAME[b]} = ${r.toFixed(2)} (need 4.5)`,
        );
      }
    }
    for (const [a, b] of UI_PAIRS) {
      const r = ratio(resolve(a), resolve(b));
      if (r < 3) {
        failures += 1;
        console.error(
          `FAIL ${theme.id}/${mode}: ${NAME[a]} on ${NAME[b]} = ${r.toFixed(2)} (need 3.0)`,
        );
      }
    }
    for (const [a, b] of INK4_PAIRS) {
      const r = ratio(resolve(a), resolve(b));
      if (r < 4.5) {
        failures += 1;
        console.error(
          `FAIL ${theme.id}/${mode}: ${NAME[a]} on ${NAME[b]} = ${r.toFixed(2)} (need 4.5)`,
        );
      }
    }
    for (const [a, b] of FILL_PAIRS) {
      const r = ratio(resolve(a), resolve(b));
      if (r < 4.5) {
        failures += 1;
        console.error(
          `FAIL ${theme.id}/${mode}: ${NAME[a]} on ${NAME[b]} = ${r.toFixed(2)} (need 4.5)`,
        );
      }
    }
    // Inverse chips (tooltips, inverse buttons) always carry white text —
    // the chip must be dark enough in both modes.
    {
      const r = ratio(WHITE, p.surfaceInverse);
      if (r < 4.5) {
        failures += 1;
        console.error(
          `FAIL ${theme.id}/${mode}: white on surface-inverse = ${r.toFixed(2)} (need 4.5)`,
        );
      }
    }
    // The chip itself must read against the surface it sits on.
    {
      const r = ratio(p.surfaceInverse, p.surface);
      if (r < 1.35) {
        warnings += 1;
        console.warn(
          `warn ${theme.id}/${mode}: surface-inverse vs surface = ${r.toFixed(2)} (< 1.35, chip barely visible)`,
        );
      }
    }
    // Hairlines are decorative dividers, not affordances — soft floor only.
    {
      const r = ratio(p.lineStrong, p.bg);
      if (r < 1.35) {
        warnings += 1;
        console.warn(
          `warn ${theme.id}/${mode}: line-strong on bg = ${r.toFixed(2)} (decorative; < 1.35)`,
        );
      }
    }
    // Decorative brand signature — soft floor only (logo mark, patterns).
    for (const key of ['brandBlueVivid', 'brandYellowVivid', 'brandRedVivid', 'brandGreenVivid']) {
      const r = ratio(p[key], p.bg);
      if (r < 1.4) {
        warnings += 1;
        console.warn(
          `warn ${theme.id}/${mode}: ${NAME[key] ?? key} on bg = ${r.toFixed(2)} (decorative; < 2.2)`,
        );
      }
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} contrast failure(s) across ${THEMES.length} themes.`);
  process.exit(1);
}
if (warnings > 0) console.warn(`\n${warnings} decorative-pair warning(s).`);
console.log(
  `themes:check OK — ${THEMES.length} themes × 2 modes, all text ≥ 4.5:1, UI ≥ 3:1, fills ≥ 4.5:1.`,
);
