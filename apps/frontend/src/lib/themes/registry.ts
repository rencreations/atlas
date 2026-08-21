/**
 * The Atlas theme catalog — the single source of truth for every theme.
 *
 * Each theme is a full token set for light and dark mode. Tokens are the
 * same CSS variables `globals.css` and `tailwind.config.ts` consume, so
 * switching a theme re-skins the entire app (including the wordmark,
 * signature, and corner patterns) without touching component code.
 *
 * Generated CSS lives in `src/app/themes.generated.css` — after editing
 * this file run `pnpm themes:generate`. Compliance is enforced by
 * `pnpm themes:check` (WCAG 2.1 contrast) and the Playwright theme matrix.
 *
 * Token contract:
 *  - Core:    bg, surface, surfaceMuted, surfaceInverse, ink 1-4, line,
 *             lineStrong, focus, shimmer.
 *  - Brand:   blue/yellow/red/green (text, icons, links), their -50 tints,
 *             `strong` variants (button fills in dark mode — must hold
 *             white text at ≥ 4.5:1), `yellowInk` (readable text on the
 *             yellow tint), and `vivid` variants (the decorative brand
 *             signature — exempt from text contrast).
 *
 * The theme id list must stay in sync with the backend catalog at
 * `apps/backend/src/modules/settings/theme-ids.ts` (godmode enum +
 * public-config) — the backend validates ids, the frontend owns the
 * palettes.
 */

export type RGB = readonly [number, number, number];

export interface ThemeShadows {
  one: string;
  two: string;
  three: string;
}

export interface ThemePalette {
  bg: RGB;
  surface: RGB;
  surfaceMuted: RGB;
  surfaceInverse: RGB;
  ink: RGB;
  ink2: RGB;
  ink3: RGB;
  ink4: RGB;
  line: RGB;
  lineStrong: RGB;
  focus: RGB;
  shimmer: RGB;
  brandBlue: RGB;
  brandBlue50: RGB;
  brandBlueStrong: RGB;
  brandBlueVivid: RGB;
  brandYellow: RGB;
  brandYellow50: RGB;
  brandYellowInk: RGB;
  /** Text color on yellow-filled buttons (yellow is bright in both modes). */
  brandYellowFg: RGB;
  brandYellowVivid: RGB;
  brandRed: RGB;
  brandRed50: RGB;
  brandRedStrong: RGB;
  brandRedVivid: RGB;
  brandGreen: RGB;
  brandGreen50: RGB;
  brandGreenStrong: RGB;
  brandGreenVivid: RGB;
  shadows: ThemeShadows;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  /** One line shown in the settings gallery. */
  description: string;
  light: ThemePalette;
  dark: ThemePalette;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export const DEFAULT_THEME_ID = 'atlas';
export const THEME_MODES: ThemeMode[] = ['light', 'dark', 'system'];

/* ─── Palette helpers ──────────────────────────────────────────────────
   Pure and deterministic so the contrast checker and the CSS generator
   see identical values. */

/** Mix `a` toward `b` by `t` (0 = pure a, 1 = pure b). */
export function mix(a: RGB, b: RGB, t: number): RGB {
  const w = Math.min(1, Math.max(0, t));
  return [
    Math.round(a[0] + (b[0] - a[0]) * w),
    Math.round(a[1] + (b[1] - a[1]) * w),
    Math.round(a[2] + (b[2] - a[2]) * w),
  ];
}

/** Convert a palette to CSS custom properties (`--bg: 255 255 255`). */
export function paletteToCssVars(p: ThemePalette): string {
  const lines: string[] = [];
  const push = (name: string, value: RGB) => lines.push(`  --${name}: ${value.join(' ')};`);
  push('bg', p.bg);
  push('surface', p.surface);
  push('surface-muted', p.surfaceMuted);
  push('surface-inverse', p.surfaceInverse);
  push('ink', p.ink);
  push('ink-2', p.ink2);
  push('ink-3', p.ink3);
  push('ink-4', p.ink4);
  push('line', p.line);
  push('line-strong', p.lineStrong);
  push('focus', p.focus);
  push('shimmer', p.shimmer);
  push('brand-blue', p.brandBlue);
  push('brand-blue-50', p.brandBlue50);
  push('brand-blue-strong', p.brandBlueStrong);
  push('brand-blue-vivid', p.brandBlueVivid);
  push('brand-yellow', p.brandYellow);
  push('brand-yellow-50', p.brandYellow50);
  push('brand-yellow-ink', p.brandYellowInk);
  push('brand-yellow-fg', p.brandYellowFg);
  push('brand-yellow-vivid', p.brandYellowVivid);
  push('brand-red', p.brandRed);
  push('brand-red-50', p.brandRed50);
  push('brand-red-strong', p.brandRedStrong);
  push('brand-red-vivid', p.brandRedVivid);
  push('brand-green', p.brandGreen);
  push('brand-green-50', p.brandGreen50);
  push('brand-green-strong', p.brandGreenStrong);
  push('brand-green-vivid', p.brandGreenVivid);
  lines.push(`  --shadow-1: ${p.shadows.one};`);
  lines.push(`  --shadow-2: ${p.shadows.two};`);
  lines.push(`  --shadow-3: ${p.shadows.three};`);
  return lines.join('\n');
}

/* ─── Palette builder ────────────────────────────────────────────────── */

interface ThemeSeed {
  bg: RGB;
  surface: RGB;
  surfaceMuted: RGB;
  ink: RGB;
  ink2: RGB;
  ink3: RGB;
  ink4: RGB;
  blue: RGB;
  yellow: RGB;
  red: RGB;
  green: RGB;
  /** Filled-button color in dark mode (holds white text ≥ 4.5:1). */
  blueStrong: RGB;
  redStrong: RGB;
  greenStrong: RGB;
  yellowInk: RGB;
  blueVivid: RGB;
  yellowVivid: RGB;
  redVivid: RGB;
  greenVivid: RGB;
  /** In light mode the "inverse" surface is near-ink; override per theme. */
  surfaceInverse?: RGB;
  /** Shadow tint in light mode (defaults to the ink color). */
  shadowTint?: RGB;
}

/**
 * Build a full palette from a seed. Light mode tints brand colors over the
 * surface; dark mode tints them over the page background so the -50 chips
 * stay deep while the brand text stays bright. Lines and shadows are
 * derived from ink so every theme keeps its own cast.
 */
function palette(seed: ThemeSeed, mode: 'light' | 'dark'): ThemePalette {
  // Light tints sit on the surface (pastel chips); dark tints sit on the
  // page background (deep chips) so the bright brand text still contrasts.
  const base = mode === 'dark' ? seed.bg : seed.surface;
  const tintWeight = mode === 'dark' ? 0.22 : 0.1;
  const ink = seed.ink;
  // ink-3 sits on brand tints too (descriptions inside selected rows), and
  // the tints are dimmer than plain surfaces — pull it slightly toward ink
  // in light mode so it holds 4.5:1 everywhere.
  const ink3 = mode === 'light' ? mix(seed.ink3, seed.ink, 0.12) : seed.ink3;

  // Inverse surfaces (tooltips, inverse buttons) always carry white text,
  // so they stay dark chips in both modes. In dark mode they are a clearly
  // lighter chip than the surface without leaving white-text range.
  const surfaceInverse =
    seed.surfaceInverse ?? (mode === 'dark' ? mix(seed.bg, ink, 0.28) : ink);

  const shadowTint = seed.shadowTint ?? ink;
  const shadows: ThemeShadows =
    mode === 'light'
      ? {
          one: `0 1px 2px rgba(${shadowTint[0]}, ${shadowTint[1]}, ${shadowTint[2]}, 0.05), 0 1px 1px rgba(${shadowTint[0]}, ${shadowTint[1]}, ${shadowTint[2]}, 0.04)`,
          two: `0 6px 24px -8px rgba(${shadowTint[0]}, ${shadowTint[1]}, ${shadowTint[2]}, 0.12), 0 2px 6px -2px rgba(${shadowTint[0]}, ${shadowTint[1]}, ${shadowTint[2]}, 0.06)`,
          three: `0 24px 60px -20px rgba(${shadowTint[0]}, ${shadowTint[1]}, ${shadowTint[2]}, 0.20), 0 4px 12px -4px rgba(${shadowTint[0]}, ${shadowTint[1]}, ${shadowTint[2]}, 0.08)`,
        }
      : {
          one: '0 1px 2px rgba(0, 0, 0, 0.35), 0 1px 1px rgba(0, 0, 0, 0.25)',
          two: '0 6px 24px -8px rgba(0, 0, 0, 0.55), 0 2px 6px -2px rgba(0, 0, 0, 0.35)',
          three: '0 24px 60px -20px rgba(0, 0, 0, 0.65), 0 4px 12px -4px rgba(0, 0, 0, 0.40)',
        };

  return {
    bg: seed.bg,
    surface: seed.surface,
    surfaceMuted: seed.surfaceMuted,
    surfaceInverse,
    ink: seed.ink,
    ink2: seed.ink2,
    ink3,
    // ink-4 (placeholders, quaternary captions) renders at small sizes,
    // so it must hold the full 4.5:1 like every other text tier. There is
    // no luminance headroom between ink-3 and a compliant ink-4 on light
    // surfaces, so in light mode it equals ink-3; in dark mode it stays a
    // step below ink-3 to keep the hierarchy.
    ink4: mode === 'light' ? ink3 : mix(seed.ink4, seed.ink3, 0.9),
    line: mix(ink, seed.bg, mode === 'light' ? 0.92 : 0.85),
    lineStrong: mix(ink, seed.bg, mode === 'light' ? 0.82 : 0.72),
    focus: seed.blue,
    shimmer:
      mode === 'light' ? ([255, 255, 255] as const) : (mix(seed.bg, ink, 0.1) as RGB),
    brandBlue: seed.blue,
    brandBlue50: mix(base, seed.blue, tintWeight),
    brandBlueStrong: seed.blueStrong,
    brandBlueVivid: seed.blueVivid,
    brandYellow: seed.yellow,
    brandYellow50: mix(base, seed.yellow, tintWeight),
    brandYellowInk: seed.yellowInk,
    brandYellowFg: mix(seed.yellow, [12, 10, 6], 0.8),
    brandYellowVivid: seed.yellowVivid,
    brandRed: seed.red,
    brandRed50: mix(base, seed.red, tintWeight),
    brandRedStrong: seed.redStrong,
    brandRedVivid: seed.redVivid,
    brandGreen: seed.green,
    brandGreen50: mix(base, seed.green, tintWeight),
    brandGreenStrong: seed.greenStrong,
    brandGreenVivid: seed.greenVivid,
    shadows,
  };
}

function theme(
  id: string,
  name: string,
  description: string,
  light: ThemeSeed,
  dark: ThemeSeed,
): ThemeDefinition {
  return { id, name, description, light: palette(light, 'light'), dark: palette(dark, 'dark') };
}

/* ─── The catalog ────────────────────────────────────────────────────── */

export const THEMES: ThemeDefinition[] = [
  theme(
    'atlas',
    'Atlas Blue',
    'The original Atlas palette — calm, neutral, and dependable.',
    {
      bg: [255, 255, 255],
      surface: [255, 255, 255],
      surfaceMuted: [247, 247, 245],
      ink: [14, 17, 22],
      ink2: [59, 65, 80],
      ink3: [107, 114, 128],
      ink4: [154, 161, 173],
      blue: [47, 95, 176],
      yellow: [247, 191, 51],
      red: [196, 42, 32],
      green: [13, 116, 77],
      blueStrong: [47, 95, 176],
      redStrong: [196, 42, 32],
      greenStrong: [13, 116, 77],
      yellowInk: [128, 99, 20],
      blueVivid: [58, 109, 197],
      yellowVivid: [246, 190, 50],
      redVivid: [248, 64, 64],
      greenVivid: [68, 188, 141],
    },
    {
      bg: [14, 17, 22],
      surface: [20, 24, 30],
      surfaceMuted: [26, 31, 39],
      ink: [240, 242, 245],
      ink2: [196, 201, 211],
      ink3: [145, 152, 165],
      ink4: [100, 106, 118],
      blue: [122, 156, 219],
      yellow: [247, 191, 51],
      red: [255, 102, 102],
      green: [58, 190, 135],
      blueStrong: [64, 108, 184],
      redStrong: [211, 58, 50],
      greenStrong: [24, 132, 84],
      yellowInk: [232, 199, 103],
      blueVivid: [130, 165, 230],
      yellowVivid: [250, 200, 80],
      redVivid: [255, 110, 110],
      greenVivid: [90, 205, 160],
    },
  ),
  theme(
    'ocean',
    'Deep Ocean',
    'Teal depths with coral accents — calm water, warm light.',
    {
      bg: [248, 252, 252],
      surface: [255, 255, 255],
      surfaceMuted: [242, 247, 247],
      ink: [13, 32, 34],
      ink2: [55, 80, 84],
      ink3: [84, 110, 114],
      ink4: [150, 172, 175],
      blue: [13, 116, 109],
      yellow: [242, 168, 76],
      red: [192, 46, 58],
      green: [17, 112, 74],
      blueStrong: [13, 116, 109],
      redStrong: [192, 46, 58],
      greenStrong: [17, 112, 74],
      yellowInk: [128, 88, 22],
      blueVivid: [20, 148, 140],
      yellowVivid: [250, 176, 80],
      redVivid: [230, 70, 82],
      greenVivid: [50, 170, 116],
    },
    {
      bg: [9, 24, 26],
      surface: [13, 31, 33],
      surfaceMuted: [18, 39, 42],
      ink: [234, 244, 244],
      ink2: [188, 206, 207],
      ink3: [140, 160, 162],
      ink4: [96, 114, 116],
      blue: [94, 200, 190],
      yellow: [242, 168, 76],
      red: [255, 128, 122],
      green: [84, 200, 150],
      blueStrong: [14, 118, 110],
      redStrong: [203, 56, 68],
      greenStrong: [22, 128, 86],
      yellowInk: [240, 196, 110],
      blueVivid: [110, 215, 205],
      yellowVivid: [250, 180, 90],
      redVivid: [255, 140, 134],
      greenVivid: [100, 215, 165],
    },
  ),
  theme(
    'forest',
    'Forest',
    'Deep green canopy with moss gold and clay red.',
    {
      bg: [247, 250, 247],
      surface: [255, 255, 255],
      surfaceMuted: [240, 246, 241],
      ink: [14, 28, 20],
      ink2: [52, 74, 61],
      ink3: [88, 112, 98],
      ink4: [146, 166, 154],
      blue: [20, 100, 52],
      yellow: [196, 148, 46],
      red: [184, 48, 54],
      green: [13, 114, 94],
      blueStrong: [20, 100, 52],
      redStrong: [184, 48, 54],
      greenStrong: [13, 114, 94],
      yellowInk: [112, 82, 20],
      blueVivid: [30, 128, 66],
      yellowVivid: [214, 166, 58],
      redVivid: [210, 62, 66],
      greenVivid: [36, 156, 126],
    },
    {
      bg: [11, 22, 16],
      surface: [15, 28, 21],
      surfaceMuted: [20, 36, 28],
      ink: [234, 243, 238],
      ink2: [188, 205, 195],
      ink3: [140, 160, 149],
      ink4: [96, 114, 104],
      blue: [110, 198, 148],
      yellow: [216, 178, 88],
      red: [255, 132, 128],
      green: [110, 205, 168],
      blueStrong: [24, 106, 58],
      redStrong: [186, 52, 58],
      greenStrong: [14, 116, 96],
      yellowInk: [238, 204, 118],
      blueVivid: [130, 215, 165],
      yellowVivid: [234, 196, 100],
      redVivid: [255, 146, 142],
      greenVivid: [130, 220, 180],
    },
  ),
  theme(
    'meadow',
    'Meadow',
    'Fresh spring greens with sunny gold and poppy red.',
    {
      bg: [246, 252, 245],
      surface: [255, 255, 255],
      surfaceMuted: [240, 248, 239],
      ink: [16, 30, 20],
      ink2: [56, 80, 63],
      ink3: [92, 118, 99],
      ink4: [150, 172, 156],
      blue: [19, 122, 58],
      yellow: [222, 174, 44],
      red: [192, 52, 54],
      green: [8, 120, 110],
      blueStrong: [19, 122, 58],
      redStrong: [192, 52, 54],
      greenStrong: [8, 120, 110],
      yellowInk: [122, 94, 20],
      blueVivid: [34, 150, 74],
      yellowVivid: [238, 190, 56],
      redVivid: [232, 78, 80],
      greenVivid: [30, 172, 160],
    },
    {
      bg: [12, 24, 18],
      surface: [16, 30, 23],
      surfaceMuted: [21, 38, 30],
      ink: [236, 245, 239],
      ink2: [190, 208, 196],
      ink3: [142, 162, 149],
      ink4: [98, 116, 104],
      blue: [116, 206, 150],
      yellow: [224, 184, 66],
      red: [255, 138, 132],
      green: [116, 210, 172],
      blueStrong: [22, 126, 62],
      redStrong: [208, 62, 64],
      greenStrong: [10, 118, 108],
      yellowInk: [240, 206, 96],
      blueVivid: [136, 222, 166],
      yellowVivid: [240, 200, 78],
      redVivid: [255, 152, 146],
      greenVivid: [136, 226, 186],
    },
  ),
  theme(
    'sunset',
    'Sunset',
    'Warm coral and amber over a dusky horizon.',
    {
      bg: [253, 248, 245],
      surface: [255, 255, 255],
      surfaceMuted: [250, 243, 239],
      ink: [38, 22, 16],
      ink2: [86, 62, 52],
      ink3: [128, 104, 94],
      ink4: [172, 152, 144],
      blue: [180, 62, 8],
      yellow: [242, 158, 12],
      red: [190, 44, 60],
      green: [14, 116, 110],
      blueStrong: [180, 62, 8],
      redStrong: [190, 44, 60],
      greenStrong: [14, 116, 110],
      yellowInk: [126, 80, 14],
      blueVivid: [242, 104, 20],
      yellowVivid: [250, 170, 24],
      redVivid: [214, 58, 74],
      greenVivid: [30, 150, 142],
    },
    {
      bg: [27, 15, 12],
      surface: [33, 19, 15],
      surfaceMuted: [42, 25, 20],
      ink: [245, 236, 231],
      ink2: [208, 190, 182],
      ink3: [160, 142, 134],
      ink4: [112, 97, 90],
      blue: [255, 146, 74],
      yellow: [248, 176, 44],
      red: [255, 128, 124],
      green: [110, 198, 184],
      blueStrong: [194, 72, 10],
      redStrong: [190, 46, 60],
      greenStrong: [14, 114, 108],
      yellowInk: [246, 198, 96],
      blueVivid: [255, 160, 88],
      yellowVivid: [252, 190, 58],
      redVivid: [255, 142, 138],
      greenVivid: [130, 214, 200],
    },
  ),
  theme(
    'rose',
    'Rose',
    'Blush pink and deep berry with sage green.',
    {
      bg: [253, 248, 250],
      surface: [255, 255, 255],
      surfaceMuted: [250, 242, 246],
      ink: [40, 20, 32],
      ink2: [86, 58, 74],
      ink3: [128, 100, 116],
      ink4: [172, 150, 162],
      blue: [182, 48, 96],
      yellow: [240, 160, 76],
      red: [186, 24, 92],
      green: [48, 108, 74],
      blueStrong: [182, 48, 96],
      redStrong: [186, 24, 92],
      greenStrong: [48, 108, 74],
      yellowInk: [126, 80, 22],
      blueVivid: [222, 72, 124],
      yellowVivid: [248, 172, 88],
      redVivid: [208, 36, 108],
      greenVivid: [78, 152, 106],
    },
    {
      bg: [26, 15, 23],
      surface: [32, 19, 28],
      surfaceMuted: [41, 25, 36],
      ink: [246, 237, 242],
      ink2: [209, 190, 200],
      ink3: [161, 142, 152],
      ink4: [113, 97, 106],
      blue: [244, 140, 184],
      yellow: [244, 178, 104],
      red: [255, 126, 160],
      green: [140, 200, 162],
      blueStrong: [194, 54, 104],
      redStrong: [184, 26, 92],
      greenStrong: [54, 120, 84],
      yellowInk: [246, 200, 122],
      blueVivid: [252, 158, 198],
      yellowVivid: [250, 192, 116],
      redVivid: [255, 142, 176],
      greenVivid: [158, 214, 178],
    },
  ),
  theme(
    'lavender',
    'Lavender',
    'Soft violet with gold, berry, and teal.',
    {
      bg: [250, 249, 253],
      surface: [255, 255, 255],
      surfaceMuted: [245, 243, 251],
      ink: [26, 22, 42],
      ink2: [64, 58, 88],
      ink3: [104, 98, 130],
      ink4: [152, 147, 173],
      blue: [116, 58, 226],
      yellow: [212, 156, 46],
      red: [188, 50, 80],
      green: [14, 110, 98],
      blueStrong: [116, 58, 226],
      redStrong: [188, 50, 80],
      greenStrong: [14, 110, 98],
      yellowInk: [116, 82, 18],
      blueVivid: [134, 74, 238],
      yellowVivid: [228, 172, 58],
      redVivid: [226, 76, 108],
      greenVivid: [36, 156, 138],
    },
    {
      bg: [19, 15, 30],
      surface: [25, 20, 38],
      surfaceMuted: [32, 26, 48],
      ink: [240, 237, 248],
      ink2: [199, 194, 216],
      ink3: [150, 144, 168],
      ink4: [104, 99, 120],
      blue: [178, 138, 250],
      yellow: [228, 178, 76],
      red: [255, 142, 168],
      green: [122, 205, 188],
      blueStrong: [116, 60, 218],
      redStrong: [203, 60, 92],
      greenStrong: [18, 122, 108],
      yellowInk: [242, 202, 108],
      blueVivid: [190, 152, 255],
      yellowVivid: [240, 192, 88],
      redVivid: [255, 156, 180],
      greenVivid: [140, 218, 202],
    },
  ),
  theme(
    'plum',
    'Plum',
    'Deep purple with antique gold and wine.',
    {
      bg: [250, 248, 253],
      surface: [255, 255, 255],
      surfaceMuted: [244, 241, 250],
      ink: [30, 22, 44],
      ink2: [66, 58, 90],
      ink3: [106, 98, 132],
      ink4: [154, 148, 174],
      blue: [100, 32, 160],
      yellow: [188, 148, 68],
      red: [156, 44, 60],
      green: [56, 108, 80],
      blueStrong: [100, 32, 160],
      redStrong: [156, 44, 60],
      greenStrong: [56, 108, 80],
      yellowInk: [106, 80, 22],
      blueVivid: [122, 44, 188],
      yellowVivid: [206, 164, 80],
      redVivid: [178, 56, 74],
      greenVivid: [76, 134, 100],
    },
    {
      bg: [22, 13, 30],
      surface: [28, 17, 38],
      surfaceMuted: [36, 23, 48],
      ink: [243, 238, 249],
      ink2: [203, 193, 218],
      ink3: [155, 144, 170],
      ink4: [108, 99, 122],
      blue: [186, 132, 246],
      yellow: [214, 174, 96],
      red: [255, 140, 150],
      green: [138, 196, 158],
      blueStrong: [104, 36, 164],
      redStrong: [158, 46, 62],
      greenStrong: [56, 108, 80],
      yellowInk: [238, 200, 112],
      blueVivid: [200, 148, 255],
      yellowVivid: [228, 188, 108],
      redVivid: [255, 154, 164],
      greenVivid: [156, 210, 174],
    },
  ),
  theme(
    'midnight',
    'Midnight',
    'Indigo night sky with star gold and aurora.',
    {
      bg: [248, 249, 253],
      surface: [255, 255, 255],
      surfaceMuted: [242, 244, 251],
      ink: [18, 20, 40],
      ink2: [56, 58, 88],
      ink3: [98, 100, 130],
      ink4: [146, 148, 173],
      blue: [59, 76, 190],
      yellow: [236, 192, 78],
      red: [192, 48, 70],
      green: [22, 124, 94],
      blueStrong: [59, 76, 190],
      redStrong: [192, 48, 70],
      greenStrong: [22, 124, 94],
      yellowInk: [126, 100, 24],
      blueVivid: [74, 92, 214],
      yellowVivid: [246, 204, 88],
      redVivid: [230, 72, 96],
      greenVivid: [54, 176, 134],
    },
    {
      bg: [12, 14, 30],
      surface: [17, 19, 38],
      surfaceMuted: [22, 25, 48],
      ink: [236, 238, 248],
      ink2: [194, 198, 216],
      ink3: [146, 150, 168],
      ink4: [102, 106, 120],
      blue: [146, 160, 240],
      yellow: [242, 204, 96],
      red: [255, 138, 152],
      green: [128, 212, 176],
      blueStrong: [60, 78, 188],
      redStrong: [210, 56, 80],
      greenStrong: [24, 120, 92],
      yellowInk: [246, 216, 118],
      blueVivid: [162, 174, 248],
      yellowVivid: [250, 216, 108],
      redVivid: [255, 152, 166],
      greenVivid: [146, 226, 190],
    },
  ),
  theme(
    'sky',
    'Sky',
    'Airy daylight blue with sun and sea.',
    {
      bg: [245, 250, 254],
      surface: [255, 255, 255],
      surfaceMuted: [239, 247, 252],
      ink: [14, 26, 38],
      ink2: [52, 72, 90],
      ink3: [86, 108, 126],
      ink4: [144, 162, 176],
      blue: [0, 108, 172],
      yellow: [236, 180, 50],
      red: [190, 62, 66],
      green: [10, 110, 78],
      blueStrong: [0, 108, 172],
      redStrong: [190, 62, 66],
      greenStrong: [10, 110, 78],
      yellowInk: [124, 92, 20],
      blueVivid: [14, 146, 216],
      yellowVivid: [244, 192, 60],
      redVivid: [228, 88, 92],
      greenVivid: [32, 156, 112],
    },
    {
      bg: [9, 19, 29],
      surface: [13, 25, 37],
      surfaceMuted: [17, 32, 46],
      ink: [235, 243, 249],
      ink2: [190, 205, 216],
      ink3: [142, 158, 170],
      ink4: [98, 113, 124],
      blue: [116, 192, 236],
      yellow: [240, 190, 66],
      red: [255, 142, 144],
      green: [118, 204, 166],
      blueStrong: [6, 122, 184],
      redStrong: [206, 70, 76],
      greenStrong: [12, 124, 90],
      yellowInk: [244, 208, 92],
      blueVivid: [132, 204, 244],
      yellowVivid: [248, 204, 78],
      redVivid: [255, 156, 158],
      greenVivid: [136, 218, 180],
    },
  ),
  theme(
    'ice',
    'Glacier',
    'Icy cyan with arctic gold — crisp and cold.',
    {
      bg: [245, 251, 252],
      surface: [255, 255, 255],
      surfaceMuted: [239, 248, 250],
      ink: [12, 30, 36],
      ink2: [52, 76, 84],
      ink3: [86, 112, 120],
      ink4: [144, 164, 171],
      blue: [6, 118, 148],
      yellow: [218, 176, 74],
      red: [182, 58, 76],
      green: [10, 114, 100],
      blueStrong: [6, 118, 148],
      redStrong: [182, 58, 76],
      greenStrong: [10, 114, 100],
      yellowInk: [118, 92, 22],
      blueVivid: [16, 144, 180],
      yellowVivid: [232, 190, 86],
      redVivid: [220, 86, 104],
      greenVivid: [32, 162, 142],
    },
    {
      bg: [9, 22, 27],
      surface: [13, 29, 35],
      surfaceMuted: [17, 37, 44],
      ink: [234, 244, 247],
      ink2: [188, 207, 213],
      ink3: [140, 161, 168],
      ink4: [96, 115, 122],
      blue: [108, 196, 222],
      yellow: [228, 190, 92],
      red: [255, 144, 156],
      green: [112, 206, 186],
      blueStrong: [8, 116, 146],
      redStrong: [196, 68, 88],
      greenStrong: [14, 128, 112],
      yellowInk: [242, 210, 114],
      blueVivid: [126, 210, 234],
      yellowVivid: [240, 204, 104],
      redVivid: [255, 158, 170],
      greenVivid: [130, 220, 200],
    },
  ),
  theme(
    'mint',
    'Mint',
    'Fresh mint and citrus — bright and clean.',
    {
      bg: [245, 252, 249],
      surface: [255, 255, 255],
      surfaceMuted: [239, 249, 245],
      ink: [14, 30, 24],
      ink2: [54, 76, 66],
      ink3: [88, 114, 102],
      ink4: [146, 168, 158],
      blue: [10, 116, 84],
      yellow: [228, 182, 54],
      red: [188, 48, 78],
      green: [64, 116, 74],
      blueStrong: [10, 116, 84],
      redStrong: [188, 48, 78],
      greenStrong: [64, 116, 74],
      yellowInk: [122, 96, 20],
      blueVivid: [24, 158, 114],
      yellowVivid: [240, 196, 64],
      redVivid: [226, 74, 106],
      greenVivid: [92, 152, 102],
    },
    {
      bg: [11, 24, 20],
      surface: [15, 30, 25],
      surfaceMuted: [20, 38, 32],
      ink: [235, 245, 241],
      ink2: [189, 208, 199],
      ink3: [141, 162, 152],
      ink4: [97, 116, 107],
      blue: [110, 208, 168],
      yellow: [234, 192, 72],
      red: [255, 142, 164],
      green: [156, 204, 164],
      blueStrong: [12, 128, 94],
      redStrong: [202, 56, 88],
      greenStrong: [70, 124, 80],
      yellowInk: [242, 210, 96],
      blueVivid: [128, 222, 182],
      yellowVivid: [244, 206, 84],
      redVivid: [255, 156, 176],
      greenVivid: [172, 216, 178],
    },
  ),
  theme(
    'amber',
    'Amber',
    'Golden warmth with honey and rust.',
    {
      bg: [253, 250, 244],
      surface: [255, 255, 255],
      surfaceMuted: [250, 245, 236],
      ink: [36, 26, 12],
      ink2: [82, 64, 42],
      ink3: [124, 106, 82],
      ink4: [168, 152, 130],
      blue: [156, 90, 18],
      yellow: [236, 184, 66],
      red: [184, 58, 38],
      green: [92, 114, 42],
      blueStrong: [156, 90, 18],
      redStrong: [184, 58, 38],
      greenStrong: [92, 114, 42],
      yellowInk: [118, 90, 20],
      blueVivid: [194, 122, 30],
      yellowVivid: [244, 196, 76],
      redVivid: [216, 82, 56],
      greenVivid: [112, 138, 54],
    },
    {
      bg: [26, 19, 11],
      surface: [32, 24, 15],
      surfaceMuted: [41, 32, 20],
      ink: [245, 238, 229],
      ink2: [208, 194, 178],
      ink3: [160, 146, 130],
      ink4: [112, 100, 87],
      blue: [242, 178, 96],
      yellow: [240, 196, 84],
      red: [255, 146, 124],
      green: [178, 194, 118],
      blueStrong: [170, 102, 22],
      redStrong: [194, 64, 44],
      greenStrong: [88, 110, 40],
      yellowInk: [244, 210, 106],
      blueVivid: [250, 192, 108],
      yellowVivid: [248, 208, 96],
      redVivid: [255, 160, 138],
      greenVivid: [194, 208, 132],
    },
  ),
  theme(
    'sand',
    'Dune',
    'Warm sand neutrals with dusty blue and clay.',
    {
      bg: [251, 248, 242],
      surface: [255, 253, 249],
      surfaceMuted: [245, 240, 231],
      ink: [40, 34, 26],
      ink2: [84, 74, 60],
      ink3: [118, 106, 90],
      ink4: [170, 158, 142],
      blue: [56, 112, 112],
      yellow: [196, 156, 88],
      red: [168, 62, 48],
      green: [84, 106, 62],
      blueStrong: [56, 112, 112],
      redStrong: [168, 62, 48],
      greenStrong: [84, 106, 62],
      yellowInk: [110, 84, 30],
      blueVivid: [72, 136, 136],
      yellowVivid: [212, 170, 98],
      redVivid: [206, 88, 70],
      greenVivid: [120, 146, 92],
    },
    {
      bg: [26, 22, 16],
      surface: [32, 28, 21],
      surfaceMuted: [41, 36, 28],
      ink: [244, 239, 230],
      ink2: [206, 196, 181],
      ink3: [158, 148, 132],
      ink4: [110, 102, 89],
      blue: [138, 192, 190],
      yellow: [214, 176, 110],
      red: [255, 156, 140],
      green: [172, 194, 148],
      blueStrong: [54, 108, 108],
      redStrong: [182, 72, 58],
      greenStrong: [96, 120, 74],
      yellowInk: [238, 204, 128],
      blueVivid: [156, 206, 204],
      yellowVivid: [228, 190, 122],
      redVivid: [255, 170, 154],
      greenVivid: [188, 208, 162],
    },
  ),
  theme(
    'terracotta',
    'Terracotta',
    'Baked clay, ochre, and eucalyptus.',
    {
      bg: [252, 248, 245],
      surface: [255, 255, 255],
      surfaceMuted: [249, 242, 237],
      ink: [40, 24, 18],
      ink2: [86, 62, 52],
      ink3: [128, 102, 90],
      ink4: [172, 150, 140],
      blue: [176, 70, 36],
      yellow: [212, 164, 68],
      red: [160, 50, 48],
      green: [74, 118, 82],
      blueStrong: [176, 70, 36],
      redStrong: [160, 50, 48],
      greenStrong: [74, 118, 82],
      yellowInk: [116, 86, 22],
      blueVivid: [212, 94, 50],
      yellowVivid: [228, 178, 78],
      redVivid: [182, 62, 58],
      greenVivid: [94, 142, 100],
    },
    {
      bg: [28, 17, 12],
      surface: [34, 21, 16],
      surfaceMuted: [44, 28, 21],
      ink: [246, 237, 232],
      ink2: [209, 190, 180],
      ink3: [161, 142, 132],
      ink4: [113, 97, 89],
      blue: [242, 140, 98],
      yellow: [228, 178, 86],
      red: [255, 140, 132],
      green: [156, 196, 160],
      blueStrong: [188, 78, 42],
      redStrong: [158, 48, 48],
      greenStrong: [72, 114, 80],
      yellowInk: [242, 202, 108],
      blueVivid: [250, 154, 110],
      yellowVivid: [240, 192, 98],
      redVivid: [255, 154, 146],
      greenVivid: [172, 210, 176],
    },
  ),
  theme(
    'olive',
    'Olive',
    'Field olive and khaki with russet.',
    {
      bg: [249, 250, 244],
      surface: [255, 255, 255],
      surfaceMuted: [243, 245, 236],
      ink: [28, 32, 18],
      ink2: [70, 78, 56],
      ink3: [104, 112, 90],
      ink4: [160, 166, 148],
      blue: [86, 104, 42],
      yellow: [192, 172, 92],
      red: [172, 64, 54],
      green: [54, 104, 64],
      blueStrong: [86, 104, 42],
      redStrong: [172, 64, 54],
      greenStrong: [54, 104, 64],
      yellowInk: [108, 94, 30],
      blueVivid: [106, 126, 52],
      yellowVivid: [208, 186, 102],
      redVivid: [194, 78, 66],
      greenVivid: [72, 128, 80],
    },
    {
      bg: [22, 24, 13],
      surface: [28, 30, 18],
      surfaceMuted: [36, 38, 24],
      ink: [240, 242, 233],
      ink2: [198, 202, 186],
      ink3: [150, 155, 137],
      ink4: [104, 108, 94],
      blue: [178, 194, 128],
      yellow: [210, 190, 110],
      red: [255, 150, 138],
      green: [148, 190, 152],
      blueStrong: [84, 102, 40],
      redStrong: [168, 62, 54],
      greenStrong: [52, 100, 62],
      yellowInk: [232, 212, 128],
      blueVivid: [194, 208, 142],
      yellowVivid: [224, 204, 122],
      redVivid: [255, 164, 152],
      greenVivid: [164, 204, 168],
    },
  ),
  theme(
    'slate',
    'Slate',
    'Cool gray stone with ochre and sage.',
    {
      bg: [248, 250, 252],
      surface: [255, 255, 255],
      surfaceMuted: [242, 245, 248],
      ink: [16, 24, 32],
      ink2: [56, 68, 80],
      ink3: [98, 112, 126],
      ink4: [146, 158, 170],
      blue: [67, 81, 101],
      yellow: [212, 164, 56],
      red: [174, 62, 54],
      green: [68, 100, 72],
      blueStrong: [67, 81, 101],
      redStrong: [174, 62, 54],
      greenStrong: [68, 100, 72],
      yellowInk: [114, 86, 20],
      blueVivid: [84, 100, 124],
      yellowVivid: [228, 178, 66],
      redVivid: [214, 90, 78],
      greenVivid: [100, 140, 102],
    },
    {
      bg: [16, 20, 26],
      surface: [21, 26, 33],
      surfaceMuted: [27, 33, 42],
      ink: [238, 242, 246],
      ink2: [195, 203, 211],
      ink3: [147, 156, 165],
      ink4: [102, 110, 118],
      blue: [158, 174, 192],
      yellow: [226, 182, 78],
      red: [255, 152, 142],
      green: [160, 194, 164],
      blueStrong: [64, 78, 98],
      redStrong: [190, 74, 66],
      greenStrong: [76, 112, 82],
      yellowInk: [240, 204, 102],
      blueVivid: [174, 190, 208],
      yellowVivid: [238, 196, 90],
      redVivid: [255, 166, 156],
      greenVivid: [176, 208, 180],
    },
  ),
  theme(
    'graphite',
    'Graphite',
    'Near-monochrome studio gray with pencil gold.',
    {
      bg: [249, 249, 250],
      surface: [255, 255, 255],
      surfaceMuted: [243, 243, 245],
      ink: [24, 26, 30],
      ink2: [64, 68, 74],
      ink3: [106, 110, 118],
      ink4: [154, 158, 165],
      blue: [58, 66, 78],
      yellow: [198, 174, 108],
      red: [160, 62, 60],
      green: [70, 98, 80],
      blueStrong: [58, 66, 78],
      redStrong: [160, 62, 60],
      greenStrong: [70, 98, 80],
      yellowInk: [112, 96, 44],
      blueVivid: [72, 82, 96],
      yellowVivid: [214, 188, 118],
      redVivid: [198, 88, 86],
      greenVivid: [112, 142, 120],
    },
    {
      bg: [18, 19, 21],
      surface: [23, 24, 27],
      surfaceMuted: [29, 31, 34],
      ink: [240, 241, 243],
      ink2: [196, 199, 204],
      ink3: [148, 152, 157],
      ink4: [103, 106, 111],
      blue: [168, 178, 190],
      yellow: [212, 190, 128],
      red: [255, 158, 152],
      green: [166, 192, 172],
      blueStrong: [56, 64, 76],
      redStrong: [174, 74, 74],
      greenStrong: [88, 116, 98],
      yellowInk: [236, 216, 148],
      blueVivid: [184, 194, 206],
      yellowVivid: [226, 204, 140],
      redVivid: [255, 172, 166],
      greenVivid: [182, 206, 188],
    },
  ),
  theme(
    'steel',
    'Steel',
    'Industrial steel blue with signal accents.',
    {
      bg: [246, 249, 252],
      surface: [255, 255, 255],
      surfaceMuted: [240, 245, 250],
      ink: [18, 26, 38],
      ink2: [56, 68, 86],
      ink3: [98, 112, 130],
      ink4: [146, 158, 172],
      blue: [37, 99, 168],
      yellow: [224, 172, 58],
      red: [182, 50, 50],
      green: [34, 104, 74],
      blueStrong: [37, 99, 168],
      redStrong: [182, 50, 50],
      greenStrong: [34, 104, 74],
      yellowInk: [120, 90, 20],
      blueVivid: [48, 118, 192],
      yellowVivid: [236, 184, 68],
      redVivid: [220, 72, 72],
      greenVivid: [58, 148, 106],
    },
    {
      bg: [14, 19, 27],
      surface: [19, 25, 35],
      surfaceMuted: [24, 32, 44],
      ink: [237, 242, 248],
      ink2: [193, 202, 214],
      ink3: [145, 155, 168],
      ink4: [101, 110, 121],
      blue: [134, 172, 214],
      yellow: [234, 186, 76],
      red: [255, 144, 140],
      green: [130, 198, 160],
      blueStrong: [36, 96, 164],
      redStrong: [198, 56, 56],
      greenStrong: [40, 118, 86],
      yellowInk: [242, 204, 100],
      blueVivid: [150, 186, 226],
      yellowVivid: [244, 198, 88],
      redVivid: [255, 158, 154],
      greenVivid: [146, 212, 174],
    },
  ),
  theme(
    'cobalt',
    'Cobalt',
    'Electric cobalt with neon-leaning accents.',
    {
      bg: [248, 249, 253],
      surface: [255, 255, 255],
      surfaceMuted: [242, 244, 251],
      ink: [16, 18, 38],
      ink2: [54, 58, 86],
      ink3: [96, 100, 128],
      ink4: [144, 148, 171],
      blue: [30, 66, 190],
      yellow: [242, 190, 62],
      red: [196, 40, 76],
      green: [11, 122, 102],
      blueStrong: [30, 66, 190],
      redStrong: [196, 40, 76],
      greenStrong: [11, 122, 102],
      yellowInk: [126, 96, 20],
      blueVivid: [44, 82, 214],
      yellowVivid: [250, 202, 72],
      redVivid: [234, 60, 100],
      greenVivid: [34, 168, 142],
    },
    {
      bg: [10, 13, 32],
      surface: [14, 18, 41],
      surfaceMuted: [18, 23, 51],
      ink: [236, 239, 250],
      ink2: [193, 199, 220],
      ink3: [145, 152, 172],
      ink4: [101, 107, 124],
      blue: [128, 152, 236],
      yellow: [246, 200, 76],
      red: [255, 132, 158],
      green: [122, 208, 182],
      blueStrong: [34, 70, 188],
      redStrong: [210, 46, 84],
      greenStrong: [10, 120, 100],
      yellowInk: [248, 214, 98],
      blueVivid: [144, 166, 244],
      yellowVivid: [252, 212, 88],
      redVivid: [255, 146, 172],
      greenVivid: [140, 222, 196],
    },
  ),
  theme(
    'ember',
    'Ember',
    'Glowing embers over cooling ash.',
    {
      bg: [253, 249, 246],
      surface: [255, 255, 255],
      surfaceMuted: [250, 243, 239],
      ink: [40, 24, 16],
      ink2: [86, 62, 48],
      ink3: [128, 104, 88],
      ink4: [172, 152, 138],
      blue: [172, 70, 22],
      yellow: [236, 168, 56],
      red: [164, 38, 40],
      green: [84, 114, 82],
      blueStrong: [172, 70, 22],
      redStrong: [164, 38, 40],
      greenStrong: [84, 114, 82],
      yellowInk: [124, 86, 20],
      blueVivid: [220, 96, 34],
      yellowVivid: [244, 182, 66],
      redVivid: [188, 48, 50],
      greenVivid: [104, 138, 100],
    },
    {
      bg: [28, 13, 9],
      surface: [34, 17, 12],
      surfaceMuted: [44, 22, 16],
      ink: [246, 237, 231],
      ink2: [209, 190, 178],
      ink3: [161, 142, 129],
      ink4: [113, 97, 86],
      blue: [248, 142, 86],
      yellow: [242, 182, 74],
      red: [255, 128, 118],
      green: [162, 192, 156],
      blueStrong: [194, 80, 28],
      redStrong: [162, 38, 40],
      greenStrong: [80, 110, 80],
      yellowInk: [244, 202, 96],
      blueVivid: [255, 156, 98],
      yellowVivid: [250, 196, 86],
      redVivid: [255, 142, 132],
      greenVivid: [178, 206, 172],
    },
  ),
  theme(
    'sakura',
    'Sakura',
    'Cherry blossom pink over soft paper.',
    {
      bg: [253, 248, 250],
      surface: [255, 254, 255],
      surfaceMuted: [250, 242, 247],
      ink: [42, 20, 32],
      ink2: [88, 56, 72],
      ink3: [130, 98, 114],
      ink4: [174, 148, 160],
      blue: [172, 60, 96],
      yellow: [238, 172, 92],
      red: [172, 50, 82],
      green: [64, 110, 64],
      blueStrong: [172, 60, 96],
      redStrong: [172, 50, 82],
      greenStrong: [64, 110, 64],
      yellowInk: [124, 86, 26],
      blueVivid: [208, 86, 124],
      yellowVivid: [246, 184, 102],
      redVivid: [192, 62, 96],
      greenVivid: [112, 160, 106],
    },
    {
      bg: [28, 14, 21],
      surface: [34, 18, 26],
      surfaceMuted: [44, 24, 34],
      ink: [247, 237, 242],
      ink2: [210, 190, 200],
      ink3: [162, 142, 152],
      ink4: [114, 97, 106],
      blue: [248, 148, 184],
      yellow: [244, 184, 110],
      red: [255, 132, 166],
      green: [160, 200, 156],
      blueStrong: [186, 70, 106],
      redStrong: [170, 48, 82],
      greenStrong: [68, 114, 68],
      yellowInk: [246, 206, 126],
      blueVivid: [255, 162, 196],
      yellowVivid: [250, 198, 122],
      redVivid: [255, 146, 178],
      greenVivid: [176, 214, 172],
    },
  ),
  theme(
    'noir',
    'Noir',
    'Permanent dark — an AMOLED-first palette in both modes.',
    {
      bg: [8, 9, 12],
      surface: [14, 16, 20],
      surfaceMuted: [20, 23, 28],
      surfaceInverse: [45, 49, 58],
      ink: [238, 240, 243],
      ink2: [194, 198, 205],
      ink3: [147, 152, 160],
      ink4: [102, 106, 113],
      blue: [148, 168, 196],
      yellow: [224, 190, 96],
      red: [255, 148, 142],
      green: [140, 196, 168],
      blueStrong: [74, 94, 120],
      redStrong: [196, 66, 60],
      greenStrong: [34, 116, 84],
      yellowInk: [242, 212, 118],
      blueVivid: [164, 184, 210],
      yellowVivid: [238, 204, 108],
      redVivid: [255, 162, 156],
      greenVivid: [158, 210, 182],
    },
    {
      bg: [0, 0, 0],
      surface: [10, 11, 13],
      surfaceMuted: [16, 18, 21],
      ink: [241, 243, 245],
      ink2: [197, 201, 207],
      ink3: [150, 155, 162],
      ink4: [105, 109, 115],
      blue: [150, 170, 198],
      yellow: [226, 192, 98],
      red: [255, 150, 144],
      green: [142, 198, 170],
      blueStrong: [76, 96, 122],
      redStrong: [198, 68, 62],
      greenStrong: [36, 118, 86],
      yellowInk: [244, 214, 120],
      blueVivid: [166, 186, 212],
      yellowVivid: [240, 206, 110],
      redVivid: [255, 164, 158],
      greenVivid: [160, 212, 184],
    },
  ),
  theme(
    'paper',
    'Paper',
    'Warm paper and sepia ink — easy on the eyes.',
    {
      bg: [250, 246, 236],
      surface: [253, 250, 243],
      surfaceMuted: [243, 237, 224],
      ink: [42, 36, 28],
      ink2: [84, 72, 56],
      ink3: [112, 100, 82],
      ink4: [168, 156, 138],
      blue: [60, 88, 128],
      yellow: [198, 152, 46],
      red: [176, 62, 46],
      green: [74, 98, 56],
      blueStrong: [60, 88, 128],
      redStrong: [176, 62, 46],
      greenStrong: [74, 98, 56],
      yellowInk: [110, 82, 22],
      blueVivid: [76, 108, 152],
      yellowVivid: [214, 166, 56],
      redVivid: [196, 74, 56],
      greenVivid: [110, 136, 84],
    },
    {
      bg: [28, 24, 18],
      surface: [34, 30, 23],
      surfaceMuted: [44, 39, 31],
      ink: [244, 239, 228],
      ink2: [207, 197, 179],
      ink3: [159, 149, 130],
      ink4: [111, 103, 88],
      blue: [142, 170, 208],
      yellow: [216, 174, 74],
      red: [255, 148, 132],
      green: [168, 190, 144],
      blueStrong: [56, 84, 124],
      redStrong: [172, 60, 46],
      greenStrong: [86, 110, 66],
      yellowInk: [240, 202, 96],
      blueVivid: [158, 184, 220],
      yellowVivid: [230, 188, 86],
      redVivid: [255, 162, 146],
      greenVivid: [184, 204, 158],
    },
  ),
];

/** Index for O(1) lookups; catalog order is the gallery order. */
export const THEME_MAP: ReadonlyMap<string, ThemeDefinition> = new Map(
  THEMES.map((t) => [t.id, t]),
);

export function getTheme(id: string | null | undefined): ThemeDefinition {
  return THEME_MAP.get(id ?? '') ?? THEME_MAP.get(DEFAULT_THEME_ID)!;
}

export function isThemeId(value: unknown): value is string {
  return typeof value === 'string' && THEME_MAP.has(value);
}

export function themeName(id: string | null | undefined): string {
  return getTheme(id).name;
}
