'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle, Upload } from 'lucide-react';
import { api, apiBeacon, uploadToPresigned } from '@/lib/api/client';
import { apiPaths } from '@/lib/api/paths';
import { queryKeys } from '@/lib/api/queries';
import { useSaveSurface } from '@/lib/save-coordinator';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import type { SessionUser } from '@/lib/types';

interface MeProfile extends SessionUser {
  bio: string | null;
  lastLoginAt: string | null;
  emailVerified: boolean;
}

export default function ProfileSettingsPage() {
  const { show } = useToast();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);

  const { data: me, isLoading } = useQuery({
    queryKey: queryKeys.me,
    queryFn: () => api<MeProfile>(apiPaths.me()),
  });

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  useEffect(() => {
    if (me && hydratedFor !== me.id) {
      setName(me.name);
      setBio(me.bio ?? '');
      setHydratedFor(me.id);
    }
  }, [me, hydratedFor]);

  // ─── SaveCoordinator: warn + flush on tab close / route change ───
  const dirty = me ? name !== me.name || bio !== (me.bio ?? '') : false;
  const flushNow = useCallback(() => {
    if (me && (name !== me.name || bio !== (me.bio ?? ''))) {
      apiBeacon(apiPaths.me(), { name, bio }, 'PATCH');
    }
  }, [me, name, bio]);
  const saveSurface = useSaveSurface({ surfaceId: 'settings-profile', flushNow });
  useEffect(() => {
    if (!me) return;
    if (dirty) saveSurface.markDirty();
    else saveSurface.markSaved();
  }, [me, dirty, saveSurface]);

  const save = useMutation({
    mutationFn: () =>
      api<MeProfile>(apiPaths.me(), {
        method: 'PATCH',
        body: { name, bio },
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.me, updated);
      saveSurface.markSaved();
      show({ title: 'Profile saved', tone: 'success' });
    },
    onError: (err) => {
      saveSurface.markError(err instanceof Error ? err.message : 'Save failed');
      show({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Unknown error.',
        tone: 'danger',
      });
    },
  });

  const uploadAvatar = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const presign = await api<{ uploadUrl: string; expiresIn: number }>(
          apiPaths.meAvatarPresign(),
          {
            method: 'POST',
            body: JSON.stringify({ contentType: file.type, contentLength: file.size }),
          },
        );
        const key = new URL(presign.uploadUrl).pathname.split('/').slice(2).join('/');
        await uploadToPresigned(presign.uploadUrl, file);
        const updated = await api<MeProfile>(apiPaths.me(), {
          method: 'PATCH',
          body: JSON.stringify({ avatarS3Key: key }),
        });
        queryClient.setQueryData(queryKeys.me, updated);
        show({ title: 'Avatar updated', tone: 'success' });
      } catch (err) {
        show({
          title: 'Upload failed',
          description:
            err instanceof Error ? err.message : 'Check the storage configuration in godmode.',
          tone: 'danger',
        });
      } finally {
        setUploading(false);
      }
    },
    [queryClient, show],
  );

  if (isLoading || !me) {
    return (
      <div className="flex justify-center py-12">
        <LoaderCircle className="h-5 w-5 animate-spin text-ink-3" strokeWidth={2.25} />
      </div>
    );
  }

  return (
    <div className="flex max-w-[640px] flex-col gap-6">
      <Card>
        <CardBody>
          <CardTitle>Profile picture</CardTitle>
          <div className="mt-4 flex items-center gap-5">
            <Avatar src={me.avatarUrl ?? undefined} name={me.name} size={64} />
            <div className="flex flex-col gap-2">
              <p className="text-[13px] text-ink-3">
                SSO profiles sync automatically. Without SSO, Atlas falls back to Gravatar —
                upload a picture to override both.
              </p>
              <div>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadAvatar(file);
                    e.target.value = '';
                  }}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInput.current?.click()}
                  disabled={uploading}
                  loading={uploading}
                >
                  <Upload className="h-4 w-4" strokeWidth={2.25} />
                  {uploading ? 'Uploading…' : 'Upload picture'}
                </Button>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <CardTitle>About you</CardTitle>
          <form
            className="mt-4 flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pf-name">Display name</Label>
              <Input id="pf-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pf-bio">Bio</Label>
              <Textarea
                id="pf-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                maxLength={280}
              />
              <span className="text-[12px] text-ink-4">{bio.length}/280</span>
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                loading={save.isPending}
                disabled={name === me.name && bio === (me.bio ?? '')}
              >
                Save profile
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
