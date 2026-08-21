'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';
import { ShapeSignature } from '@/components/brand/shape-signature';
import { Wordmark } from '@/components/brand/wordmark';
import { apiPaths } from '@/lib/api/paths';

interface PublicConfig {
  configured: boolean;
}

const EXEMPT_PATHS = ['/godmode', '/health', '/login'];

/**
 * First-run gate: while the instance is unconfigured, every page renders
 * a setup screen with a CTA to /godmode. Fetched once per session; the
 * backend never reveals WHICH settings are missing — just that setup
 * hasn't finished.
 */
export function ConfiguredGate({ children }: { children: React.ReactNode }) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';
    fetch(`${base}${apiPaths.publicConfig()}`)
      .then((r) => (r.ok ? (r.json() as Promise<PublicConfig>) : Promise.resolve({ configured: true })))
      .then((cfg) => setConfigured(cfg.configured))
      .catch(() => setConfigured(true));
  }, []);

  const exempt = EXEMPT_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (configured === null) return null; // resolve fast; never flash a wrong state
  if (configured || exempt) return <>{children}</>;

  return (
    <div className="grid min-h-svh place-items-center bg-surface px-6">
      <div className="w-full max-w-[480px] text-center">
        <div className="mb-6 flex items-center justify-center gap-3">
          <ShapeSignature size={36} />
          <Wordmark withSignature={false} className="text-[24px]" />
        </div>
        <h1 className="font-display text-display-lg tracking-[-0.02em] text-ink">
          Almost ready
        </h1>
        <p className="mt-3 text-body-sm text-ink-2">
          This Atlas instance hasn&apos;t been configured yet. The person who deployed it
          (or anyone with the passphrase) can finish the setup in godmode.
        </p>
        <a
          href="/godmode"
          className="mt-6 inline-flex h-10 items-center gap-2 rounded bg-brand-blue-strong px-5 text-[14px] font-medium text-white transition-opacity duration-120 hover:opacity-90"
        >
          <LoaderCircle className="h-4 w-4" strokeWidth={2.25} />
          Open godmode setup
        </a>
        <p className="mt-4 text-[13px] text-ink-3">
          The passphrase lives in the deploy host&apos;s <span className="font-mono">.env</span>{' '}
          as <span className="font-mono">GODMODE_PASSPHRASE</span>.
        </p>
      </div>
    </div>
  );
}
