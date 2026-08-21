'use client';

import { useEffect, useState } from 'react';
import { ShapeSignature } from '@/components/brand/shape-signature';
import { UnlockForm } from '@/components/godmode/unlock-form';
import { GodmodeShell } from '@/components/godmode/godmode-shell';
import { getGodmodeToken } from '@/lib/godmode/client';

export default function GodmodePage() {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setToken(getGodmodeToken());
    setReady(true);
  }, []);

  if (!ready) return null;

  // The unlocked dashboard is a full-bleed control surface; the gate is
  // a centered card.
  if (token) {
    return <GodmodeShell token={token} onExpired={() => setToken(null)} />;
  }

  return (
    <main className="relative grid min-h-svh place-items-center overflow-hidden px-6">
      <div className="relative z-10 w-full max-w-[480px]">
        <div className="mb-6 flex items-center justify-center gap-3">
          <ShapeSignature size={28} />
          <div className="flex items-baseline gap-2">
            <span className="font-display text-[22px] font-semibold tracking-[-0.02em] text-ink">
              Godmode
            </span>
            <span className="text-eyebrow uppercase text-brand-blue">control plane</span>
          </div>
        </div>
        <UnlockForm onUnlocked={(t) => setToken(t)} />
      </div>
    </main>
  );
}
