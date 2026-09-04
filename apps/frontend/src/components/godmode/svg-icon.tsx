'use client';

import { useId, useMemo } from 'react';
import { cn } from '@/lib/utils';

export interface LogoProps {
  className?: string;
  size?: number;
}

/**
 * Brand marks embedded as raw SVG strings (sourced from svgl.app and
 * official press kits) rather than hand-converted to JSX: several of
 * these carry `<linearGradient>`/`<clipPath>` defs referenced by id, and
 * a byte-for-byte string is safer than retyping hundreds of path/stop
 * coordinates by hand. The strings are fixed, locally-sourced assets,
 * never user input, so `dangerouslySetInnerHTML` is safe here.
 */

function withScalableRoot(svg: string): { svg: string; hasIds: boolean } {
  const scaled = svg.replace(/<svg\b([^>]*)>/, (_m, attrs: string) => {
    const withoutFixedSize = attrs.replace(/\s(width|height)="[^"]*"/g, '');
    return `<svg${withoutFixedSize} style="width:100%;height:100%;display:block">`;
  });
  return { svg: scaled, hasIds: /\bid="/.test(scaled) };
}

/** Namespace every `id="x"` and its `url(#x)` / `href="#x"` references so
 *  two simultaneous instances of the same icon never fight over defs. */
function namespaceIds(svg: string, uid: string): string {
  const ids = Array.from(new Set(Array.from(svg.matchAll(/\bid="([^"]+)"/g), (m) => m[1])));
  let out = svg;
  for (const id of ids) {
    const esc = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out
      .replace(new RegExp(`id="${esc}"`, 'g'), `id="${uid}-${id}"`)
      .replace(new RegExp(`url\\(#${esc}\\)`, 'g'), `url(#${uid}-${id})`)
      .replace(new RegExp(`(xlink:href|href)="#${esc}"`, 'g'), `$1="#${uid}-${id}"`);
  }
  return out;
}

/** One SVG string that already looks right in both themes (a colorful
 *  brand mark, or one with no light/dark split published for it). */
export function rawSvgIcon(svg: string): React.ComponentType<LogoProps> {
  const { svg: prepared, hasIds } = withScalableRoot(svg);
  function RawSvgIcon({ className, size = 20 }: LogoProps) {
    const rid = useId();
    const html = useMemo(() => {
      if (!hasIds) return prepared;
      return namespaceIds(prepared, rid.replace(/[^a-zA-Z0-9]/g, ''));
    }, [rid]);
    return (
      <span
        aria-hidden
        role="presentation"
        // `display` lives in the className, not the style attribute: an
        // inline style always beats a class regardless of specificity, so
        // a hardcoded `display: inline-block` here silently defeated the
        // `dark:hidden` class themedSvgIcon relies on below, both the
        // light and dark copies stayed visible (and, stacked as two
        // siblings, pushed each other off-center) in every theme.
        className={cn('inline-block', className)}
        style={{ width: size, height: size, lineHeight: 0 }}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  return RawSvgIcon;
}

/** A light-mode SVG and a dark-mode SVG; only the active one renders,
 *  toggled by the `.dark` class the same way the rest of the app themes.
 *  Both copies live inside one wrapper span (rather than as two siblings
 *  in whatever grid/flex the caller centers icons with) so there is only
 *  ever one box for the parent to lay out and center, regardless of
 *  which copy is the hidden one. */
export function themedSvgIcon(lightSvg: string, darkSvg: string): React.ComponentType<LogoProps> {
  const Light = rawSvgIcon(lightSvg);
  const Dark = rawSvgIcon(darkSvg);
  function ThemedSvgIcon({ className, size = 20 }: LogoProps) {
    return (
      <span
        aria-hidden
        role="presentation"
        className={cn('inline-grid place-items-center', className)}
        style={{ width: size, height: size }}
      >
        <Light className="col-start-1 row-start-1 dark:hidden" size={size} />
        <Dark className="col-start-1 row-start-1 hidden dark:inline-block" size={size} />
      </span>
    );
  }
  return ThemedSvgIcon;
}

/** A raster logo (no vector source available) on a small always-white
 *  chip, so it stays legible regardless of the surrounding theme. */
export function imgChipIcon(dataUri: string): React.ComponentType<LogoProps> {
  function ImgChipIcon({ className, size = 20 }: LogoProps) {
    return (
      <span
        aria-hidden
        role="presentation"
        className={cn('inline-block', className)}
        style={{ width: size, height: size, lineHeight: 0 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={dataUri}
          alt=""
          width={size}
          height={size}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </span>
    );
  }
  return ImgChipIcon;
}
