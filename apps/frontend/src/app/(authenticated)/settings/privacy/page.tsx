'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { ExternalLink, FileText, LoaderCircle, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api/client';
import { apiPaths } from '@/lib/api/paths';
import { queryKeys } from '@/lib/api/queries';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import type { PublicConfig } from '@/lib/types';
import { usePageTitle } from '@/lib/page-title';

interface MeConsent {
  consentAcceptedAt: string | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export default function PrivacySettingsPage() {
  usePageTitle('Privacy & data');
  const { show } = useToast();
  const queryClient = useQueryClient();

  const { data: me } = useQuery({
    queryKey: queryKeys.me,
    queryFn: () => api<MeConsent>(apiPaths.me()),
  });
  const { data: config } = useQuery({
    queryKey: ['public-config'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}${apiPaths.publicConfig()}`);
      if (!res.ok) throw new Error('Could not load instance policies.');
      return res.json() as Promise<PublicConfig>;
    },
  });

  const accept = useMutation({
    mutationFn: () =>
      api<{ acceptedAt: string }>(apiPaths.meConsent(), {
        method: 'POST',
        body: JSON.stringify({ accepted: true }),
      }),
    onSuccess: (data: { acceptedAt: string }) => {
      queryClient.setQueryData<Record<string, unknown>>(queryKeys.me, (old) => ({
        ...(old ?? {}),
        consentAcceptedAt: data.acceptedAt,
      }));
      show({ title: 'Consent recorded', tone: 'success' });
    },
    onError: (err) =>
      show({
        title: 'Could not record consent',
        description: err instanceof Error ? err.message : 'Unknown error.',
        tone: 'danger',
      }),
  });

  const hasTerms = config?.legal.terms ?? false;
  const hasPrivacy = config?.legal.privacy ?? false;

  return (
    <div className="flex max-w-[640px] flex-col gap-6">
      <Card>
        <CardBody>
          <CardTitle>Instance policies</CardTitle>
          <div className="mt-4 flex flex-col gap-2">
            {hasTerms ? (
              <Link
                href={'/legal/terms' as never}
                className="flex items-center gap-3 rounded border border-line px-4 py-3 text-[14px] text-ink transition-colors duration-120 hover:bg-surface-muted"
              >
                <FileText className="h-4 w-4 text-ink-3" strokeWidth={2.25} />
                Terms of service
                <ExternalLink className="ml-auto h-3.5 w-3.5 text-ink-4" strokeWidth={2.25} />
              </Link>
            ) : (
              <p className="rounded border border-line bg-surface-muted px-4 py-3 text-[13px] text-ink-3">
                No terms of service published on this instance.
              </p>
            )}
            {hasPrivacy ? (
              <Link
                href={'/legal/privacy' as never}
                className="flex items-center gap-3 rounded border border-line px-4 py-3 text-[14px] text-ink transition-colors duration-120 hover:bg-surface-muted"
              >
                <ShieldCheck className="h-4 w-4 text-ink-3" strokeWidth={2.25} />
                Privacy policy
                <ExternalLink className="ml-auto h-3.5 w-3.5 text-ink-4" strokeWidth={2.25} />
              </Link>
            ) : (
              <p className="rounded border border-line bg-surface-muted px-4 py-3 text-[13px] text-ink-3">
                No privacy policy published on this instance.
              </p>
            )}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <CardTitle>Consent</CardTitle>
          <div className="mt-4 flex items-center justify-between gap-4">
            <div>
              {me?.consentAcceptedAt ? (
                <Badge tone="success">accepted</Badge>
              ) : (
                <Badge tone="warning">not accepted</Badge>
              )}
              <p className="mt-2 text-[13px] text-ink-3">
                {me?.consentAcceptedAt
                  ? `Accepted ${new Date(me.consentAcceptedAt).toLocaleDateString()}.`
                  : 'Accept the current terms to continue using the instance.'}
              </p>
            </div>
            {!me?.consentAcceptedAt ? (
              <Button size="sm" onClick={() => accept.mutate()} disabled={accept.isPending}>
                {accept.isPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2.25} />
                ) : null}
                Accept
              </Button>
            ) : null}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
