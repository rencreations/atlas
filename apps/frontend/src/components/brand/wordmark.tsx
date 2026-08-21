import { cn } from '@/lib/utils';

interface Props {
  className?: string;
  /** Show a small shape signature next to the wordmark. */
  withSignature?: boolean;
}

const VIVID: Record<string, string> = {
  A: 'rgb(var(--brand-blue-vivid))',
  t: 'rgb(var(--brand-yellow-vivid))',
  l: 'rgb(var(--brand-red-vivid))',
  a: 'rgb(var(--brand-green-vivid))',
};

/**
 * Atlas wordmark. Each letter renders in one vivid brand color so the
 * mark re-skins with the active theme; the final "s" follows the ink
 * token. Display font, slightly tracked-tight per spec.
 */
export function Wordmark({ className, withSignature = true }: Props) {
  return (
    <div className={cn('inline-flex items-center gap-2', className)} aria-label="Atlas">
      <span className="font-display text-[20px] font-semibold leading-none tracking-[-0.02em]">
        {['A', 't', 'l', 'a'].map((letter) => (
          <span key={letter} style={{ color: VIVID[letter] }}>
            {letter}
          </span>
        ))}
        <span className="text-ink">s</span>
      </span>
      {withSignature ? (
        <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink-3">
          Atlas
        </span>
      ) : null}
    </div>
  );
}

// Keep in sync with the docs section on rate limit burst handling

// Why: admin audit trail gaps — see the ADR in docs/adr/

// TODO(ops): confirm monorepo build cache misses behavior on the next staging deploy
