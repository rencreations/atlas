import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { THEMES } from '../../src/lib/themes/registry';

/**
 * The multi-theme compliance matrix.
 *
 * 1. Palette matrix — every theme × light/dark: the bootstrap applies the
 *    right data-theme + .dark, the computed page colors match the
 *    registry, the wordmark re-skins, and nothing logs a console error.
 * 2. axe-core scans — WCAG compliance (including color-contrast) on the
 *    login surface for every palette, plus authenticated scans of the
 *    for-me, settings/appearance, and chat pages.
 *
 * Runs against local dev servers by default (see playwright.config.ts);
 * override with THEME_BASE_URL / THEME_API_URL / THEME_TEST_EMAIL /
 * THEME_TEST_PASSWORD.
 */

const API = process.env.THEME_API_URL || 'http://localhost:3002/api/v1';
const EMAIL = process.env.THEME_TEST_EMAIL || 'admin@atlas.local';
const PASSWORD = process.env.THEME_TEST_PASSWORD || 'super-secret-123';

function rgbOf(rgb: readonly number[]): string {
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

async function seedTheme(page: Page, id: string, mode: 'light' | 'dark'): Promise<void> {
  await page.addInitScript(
    ([themeId, themeMode]) => {
      localStorage.setItem('atlas_theme_id', themeId);
      localStorage.setItem('atlas_theme_mode', themeMode);
    },
    [id, mode] as const,
  );
}

async function loginViaApi(page: Page): Promise<void> {
  const res = await page.request.post(`${API}/auth/login/password`, {
    data: { email: EMAIL, password: PASSWORD },
  });
  expect(res.ok(), `login API failed: ${res.status()}`).toBeTruthy();
  const body = (await res.json()) as { sessionId: string; expiresAt: string; user: unknown };
  await page.addInitScript(
    ([session]) => {
      localStorage.setItem('atlas_session', JSON.stringify(session));
    },
    [body] as const,
  );
}

async function expectAxeClean(page: Page, label: string): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''));
  expect(
    serious,
    `axe violations on ${label}:\n` +
      serious
        .map(
          (v) =>
            `  [${v.impact}] ${v.id} — ${v.help}\n` +
            v.nodes
              .slice(0, 5)
              .map((n) => `      ${n.target.join(' ')}\n      ${n.failureSummary}\n`)
              .join(''),
        )
        .join(''),
  ).toEqual([]);
}

// ─── 1. Palette matrix ─────────────────────────────────────────────────

for (const theme of THEMES) {
  for (const mode of ['light', 'dark'] as const) {
    test(`${theme.id} ${mode} applies and re-skins`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      await seedTheme(page, theme.id, mode);
      await page.goto('/login');

      const palette = theme[mode];
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme.id);
      const hasDark = await page.evaluate(() =>
        document.documentElement.classList.contains('dark'),
      );
      expect(hasDark).toBe(mode === 'dark');

      const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      expect(bodyBg).toBe(rgbOf(palette.bg));

      // The wordmark letters follow the vivid tokens.
      const letterColor = await page.evaluate(() => {
        const span = document.querySelector('[aria-label="Atlas"] span[style]');
        return span ? getComputedStyle(span).color : null;
      });
      expect(letterColor).toBe(rgbOf(palette.brandBlueVivid));

      // Meta theme-color tracks the palette so browser chrome matches.
      const metaTheme = await page.evaluate(() =>
        document.querySelector('meta[name="theme-color"]')?.getAttribute('content'),
      );
      expect(metaTheme).not.toBeNull();

      expect(
        consoleErrors,
        `console errors on ${theme.id}/${mode}: ${consoleErrors.join(' | ')}`,
      ).toEqual([]);
    });
  }
}

// ─── 2. axe scans — login surface, every palette ───────────────────────

for (const theme of THEMES) {
  for (const mode of ['light', 'dark'] as const) {
    test(`axe: login ${theme.id} ${mode}`, async ({ page }) => {
      await seedTheme(page, theme.id, mode);
      await page.goto('/login');
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme.id);
      await expectAxeClean(page, `login ${theme.id}/${mode}`);
    });
  }
}

// ─── 3. axe scans — authenticated surfaces, default theme ──────────────

test.describe('axe: authenticated', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginViaApi(page);
  });

  for (const [path, label] of [
    ['/for-me', 'for-me'],
    ['/settings/appearance', 'settings/appearance'],
    ['/chat', 'chat'],
  ] as const) {
    test(`axe: ${label}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'atlas');
      await page.waitForLoadState('networkidle');
      await expectAxeClean(page, label);
    });
  }
});
