/**
 * The instance-side theme catalog: ids and labels used by the godmode
 * enum, UpdateMeDto validation, and GET /public-config.
 *
 * The palettes themselves live in the frontend at
 * `apps/frontend/src/lib/themes/registry.ts` — keep this list in sync
 * with that file (the frontend owns the tokens; the backend owns the
 * contract). The frontend falls back to `atlas` for unknown ids.
 */
export const THEME_OPTIONS: { label: string; value: string }[] = [
  { label: 'Atlas Blue', value: 'atlas' },
  { label: 'Deep Ocean', value: 'ocean' },
  { label: 'Forest', value: 'forest' },
  { label: 'Meadow', value: 'meadow' },
  { label: 'Sunset', value: 'sunset' },
  { label: 'Rose', value: 'rose' },
  { label: 'Lavender', value: 'lavender' },
  { label: 'Plum', value: 'plum' },
  { label: 'Midnight', value: 'midnight' },
  { label: 'Sky', value: 'sky' },
  { label: 'Glacier', value: 'ice' },
  { label: 'Mint', value: 'mint' },
  { label: 'Amber', value: 'amber' },
  { label: 'Dune', value: 'sand' },
  { label: 'Terracotta', value: 'terracotta' },
  { label: 'Olive', value: 'olive' },
  { label: 'Slate', value: 'slate' },
  { label: 'Graphite', value: 'graphite' },
  { label: 'Steel', value: 'steel' },
  { label: 'Cobalt', value: 'cobalt' },
  { label: 'Ember', value: 'ember' },
  { label: 'Sakura', value: 'sakura' },
  { label: 'Noir', value: 'noir' },
  { label: 'Paper', value: 'paper' },
];

export const THEME_IDS: string[] = THEME_OPTIONS.map((t) => t.value);

export const DEFAULT_THEME_ID = 'atlas';
