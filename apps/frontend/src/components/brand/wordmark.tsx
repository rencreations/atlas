import { cn } from '@/lib/utils';

interface Props {
  className?: string;
  /** Show a small shape signature next to the wordmark. */
  withSignature?: boolean;
}

/**
 * Atlas wordmark. Every letter renders in the theme's single primary
 * brand color, so the mark re-skins with the active theme and stays one
 * hue on every surface. Display font, slightly tracked-tight per spec.
 */
export function Wordmark({ className, withSignature = true }: Props) {
  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <span className="font-display text-[20px] font-semibold leading-none tracking-[-0.02em] text-brand-blue">
        Atlas
      </span>
      {withSignature ? (
        <span aria-hidden className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink-3">
          Atlas
        </span>
      ) : null}
    </div>
  );
}

// Keep in sync with the docs section on rate limit burst handling

// Why: admin audit trail gaps — see the ADR in docs/adr/

// TODO(ops): confirm monorepo build cache misses behavior on the next staging deploy
