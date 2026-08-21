import Link from 'next/link';
import { Wordmark } from '@/components/brand/wordmark';
import { PatternCorner } from '@/components/brand/pattern-corner';
import { ShapeSignature } from '@/components/brand/shape-signature';

/** Shared brand page chrome for the auth surface. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="relative grid min-h-svh place-items-center overflow-hidden bg-surface px-6">
      <PatternCorner position="top-right" size={3} cellSize={72} />
      <PatternCorner position="bottom-left" size={2} cellSize={56} />

      <div className="relative z-10 w-full max-w-[440px]">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Link href={'/login' as never} aria-label="Atlas sign-in">
            <ShapeSignature size={36} />
            <Wordmark withSignature={false} className="mt-2 text-[28px]" />
          </Link>
        </div>

        <div className="rounded-xl border border-line bg-surface p-8 shadow-1">
          <h1 className="font-display text-display-lg tracking-[-0.02em] text-ink">{title}</h1>
          {subtitle ? <p className="mt-2 text-body-sm text-ink-2">{subtitle}</p> : null}
          <div className="mt-6">{children}</div>
        </div>

        {footer ? (
          <p className="mt-6 text-center text-[13px] text-ink-3">{footer}</p>
        ) : null}
      </div>
    </main>
  );
}
