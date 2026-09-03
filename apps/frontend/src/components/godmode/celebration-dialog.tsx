'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { PartyPopperIcon } from '@/components/icons/animated/party-popper';
import { ConfettiBurst } from './confetti-burst';

/**
 * Shown once setup completes: confetti, a short congratulations, and a
 * CTA to the live site at the URL the deployer configured
 * (system.instanceUrl).
 */
export function CelebrationDialog({
  liveUrl,
  onClose,
}: {
  liveUrl: string;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="sm" className="text-center">
        <ConfettiBurst className="absolute inset-0 h-full w-full rounded-xl" />
        <div className="relative flex flex-col items-center gap-3">
          <span className="inline-grid h-14 w-14 place-items-center rounded-full bg-brand-green-50 text-brand-green-strong">
            <PartyPopperIcon size={28} className="flex items-center justify-center" />
          </span>
          <DialogTitle>Atlas is live</DialogTitle>
          <DialogDescription>
            Setup is complete and people can sign in. Here is your site:
          </DialogDescription>
          <a
            href={liveUrl}
            target="_blank"
            rel="noreferrer"
            className="max-w-full truncate rounded border border-line bg-surface-muted px-3 py-2 font-mono text-[13px] text-brand-blue underline-offset-2 hover:underline"
          >
            {liveUrl}
          </a>
          <DialogFooter className="mt-2 w-full flex-col gap-2 sm:flex-row sm:justify-center">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Stay in godmode
            </Button>
            <Button size="sm" asChild>
              <a href={liveUrl} target="_blank" rel="noreferrer">
                See the live site
              </a>
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
