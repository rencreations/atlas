# Atlas design system

The visual identity is locked into design tokens. Components consume
tokens — never literals. This page is the human-readable reference.

## The five laws

1. **Tokens, not literals.** No hand-rolled hex values, no custom
   `transition-duration`, no arbitrary shadows. If a value isn't a token,
   it doesn't ship.
2. **One primary color for all branding.** The wordmark, the shape
   signature, and the corner pattern render exclusively in the theme's
   primary brand color (`--brand-blue`) — one hue per theme, so every
   brand element stays in sync automatically. Yellow/red/green remain
   strictly semantic: warnings, destructive actions, success, and
   user-defined status colors.
3. **Stroke icons only.** Lucide with `strokeWidth={2.25}`. No filled
   variants, no mixed icon sets.
4. **Restrained motion.** Compose from the duration + easing tokens;
   `prefers-reduced-motion` is honored globally via `globals.css`.
5. **Pattern as accent, never wallpaper.** Corners and dadoes only — the
   pattern is a signature, not a texture.

## Themes

Atlas ships **24 themes, each with a light and a dark palette** (48
palettes). A theme is a full token set defined once in
`src/lib/themes/registry.ts` — the single source of truth. Generated CSS
(`src/app/themes.generated.css`, emitted by `pnpm themes:generate`) maps
each palette onto `html[data-theme="<id>"]` and
`html[data-theme="<id>"].dark`, so switching themes re-skins the entire
app — surfaces, ink, brand accents, the wordmark, the shape signature,
and the corner patterns — without touching component code.

How a visitor's theme resolves:

1. Godmode setting `appearance.defaultTheme` (superadmin-chosen) applies
   to anonymous visitors and users who have not picked a theme.
2. Signed-in users pick a theme in **Settings → Appearance**; the choice
   is stored on their user record (`themeId` / `themeMode`) and mirrored
   in localStorage so the next page load paints before hydration.
3. `appearance.allowUserThemes = off` in godmode locks everyone to the
   instance default.
4. An inline bootstrap script in the root layout applies the mirrored
   theme before first paint (no flash).

The catalog ids must stay in sync with the backend contract at
`apps/backend/src/modules/settings/theme-ids.ts` (godmode enum +
`GET /public-config`), which owns the labels; the frontend owns the
palettes and falls back to `atlas` for unknown ids.

### Token contract

Each palette defines, per mode:

| Tier | Tokens | Role |
|---|---|---|
| Core | `--bg`, `--surface`, `--surface-muted`, `--surface-inverse` | Page, cards, muted fills, inverse chips (always dark chips with white text — used by tooltips and inverse buttons) |
| Ink | `--ink`, `--ink-2`, `--ink-3`, `--ink-4` | Text ramp, darkest → lightest (light mode) / lightest → darkest (dark mode). Every tier holds **4.5:1** on every surface it renders on |
| Brand text | `--brand-blue/yellow/red/green` | Links, icons, text accents — 4.5:1 on the surfaces they sit on. `brand-blue` is the single primary color every brand element (wordmark, mark, pattern) renders in |
| Brand fills | `--brand-*-strong` | Filled buttons/badges — must hold **white text at 4.5:1 in both modes** (equal to the brand color in light mode; a deeper shade in dark mode) |
| Yellow text | `--brand-yellow-fg` | Text on yellow fills (yellow is bright in both modes) |
| Tints | `--brand-*-50`, `--brand-yellow-ink` | Pastel chips (light) / deep chips (dark); brand text and ink-3 both hold 4.5:1 on them |
| Support | `--line`, `--line-strong`, `--focus`, `--shimmer`, `--shadow-1…3` | Hairlines, focus ring (3:1), skeleton shimmer, elevation |

The atlas palette is also emitted onto bare `:root` / `.dark` as the
no-JS fallback.

### Compliance

Two gates enforce contrast:

- `pnpm themes:check` — a static WCAG 2.1 audit of every palette pair
  (text ≥ 4.5:1, UI ≥ 3:1, fills ≥ 4.5:1). Fails the build on any
  violation.
- `pnpm test --project=themes` (Playwright) — applies every theme × mode,
  asserts the computed colors match the registry and the wordmark
  re-skins, and runs **axe-core** scans (including color-contrast) on the
  login surface for all 48 palettes plus authenticated scans of the
  for-me, appearance, and chat pages.

### Adding a theme

1. Add a `theme(...)` entry to `src/lib/themes/registry.ts` with the
   light and dark seeds (the builder derives tints, lines, shadows,
   ink-4, and yellow-fg).
2. Mirror the id + label in `apps/backend/src/modules/settings/theme-ids.ts`.
3. `pnpm themes:generate && pnpm themes:check` — fix any flagged pairs
   (darken the brand color or the ink tier; do not lower the thresholds).
4. Run the Playwright theme matrix.

## Typography

Fonts load via `next/font` and are exposed as CSS variables:
`--font-bricolage` (display), `--font-geist` (sans), `--font-geist-mono` (mono).

Type ramp (each step defines size, line-height, letter-spacing):

| Token | Shape |
|---|---|
| `display-2xl` | `clamp(2.5rem → 4.5rem)`, weight 600, −0.03em |
| `display-xl` / `display-lg` | Hero and section displays |
| `h1` … `h4` | Headings |
| `body-lg` / `body` / `body-sm` | Copy sizes |
| `caption` | Metadata |
| `eyebrow` | Small caps labels above titles |

## Radii & elevation

| Token | Value |
|---|---|
| `rounded-sm` | 8 px |
| `rounded` (default) | 12 px |
| `rounded-lg` | 20 px |
| `rounded-xl` | 28 px |
| `shadow-1` → `shadow-3` | Three elevation steps — nothing beyond `3` |

## Motion

| Token | Value |
|---|---|
| Durations | `120` · `200` · `320` · `520` · `800` (ms) |
| `out-soft` | `cubic-bezier(0.22, 1, 0.36, 1)` |
| `in-out-soft` | Symmetric soft ease |
| `spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| Keyframes | `fade-up` · `fade-in` · `modal-in` · `shimmer` · `spin-slow` |

Micro-interactions use `120–200`; entrances `320`; celebratory moments `520+`.

## Components

- **Primitives** (`src/components/ui/`) — Radix wrapped with CVA variants:
  avatar, badge, button, card, checkbox, dialog, dropdown-menu, empty-state,
  input, label, popover, scroll-row, select, skeleton, switch, tabs,
  textarea, toast, tooltip. Build features by composing these; never reach
  for raw Radix in feature code.
- **Brand** (`src/components/brand/`) — `Wordmark`, `ShapeSignature`,
  `PatternCorner` — all render in the single primary brand color, so the
  brand re-skins with the active theme as one hue. The static favicon and
  metadata images (`icon.svg`, `brand-logo.ts`) keep the default atlas
  primary: they are instance identity, not user preference.
- **Footer** (`src/components/layout/footer.tsx`) — an oversized ATLAS
  wordmark whose letters emerge one by one on scroll, followed by the
  essential links only (GitHub, Terms, Privacy, Status). No columns, no
  rainbow strip.

## Voice & tone in UI copy

Short, confident, lowercase-friendly. Empty states explain the next action
("Start a project", "Invite your first contributor") rather than apologize.
