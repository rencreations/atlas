'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AtSign, LoaderCircle, Trash2, Upload } from 'lucide-react';
import { api, apiBeacon, uploadToPresigned } from '@/lib/api/client';
import { apiPaths } from '@/lib/api/paths';
import { queryKeys } from '@/lib/api/queries';
import { useSaveSurface } from '@/lib/save-coordinator';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { AvatarCropDialog } from '@/components/settings/avatar-crop-dialog';
import type { SessionUser } from '@/lib/types';
import { usePageTitle } from '@/lib/page-title';

interface MeProfile extends SessionUser {
  bio: string | null;
  lastLoginAt: string | null;
  emailVerified: boolean;
}

function extensionFor(mime: string): string {
  switch (mime) {
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/gif':
      return '.gif';
    default:
      return '.jpg';
  }
}

export default function ProfileSettingsPage() {
  usePageTitle('Profile');
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
  const [cropFile, setCropFile] = useState<File | null>(null);
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
    async (blob: Blob) => {
      setUploading(true);
      try {
        const contentType = blob.type || 'image/jpeg';
        const presign = await api<{ uploadUrl: string; expiresIn: number; objectKey: string }>(
          apiPaths.meAvatarPresign(),
          {
            method: 'POST',
            body: { contentType, contentLength: blob.size },
          },
        );
        // uploadToPresigned expects a File; wrap the cropped Blob rather
        // than loosening that shared upload helper's type for one caller.
        const file = new File([blob], `avatar${extensionFor(contentType)}`, { type: contentType });
        await uploadToPresigned(presign.uploadUrl, file);
        const updated = await api<MeProfile>(apiPaths.me(), {
          method: 'PATCH',
          body: { avatarS3Key: presign.objectKey },
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
        setCropFile(null);
      }
    },
    [queryClient, show],
  );

  const removeAvatar = useMutation({
    mutationFn: () => api<MeProfile>(apiPaths.meAvatarRemove(), { method: 'DELETE' }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.me, updated);
      show({ title: 'Picture removed', tone: 'success' });
    },
    onError: (err) =>
      show({
        title: 'Could not remove picture',
        description: err instanceof Error ? err.message : 'Unknown error.',
        tone: 'danger',
      }),
  });

  // "Use Gravatar" checks the account's own email first; if that has no
  // custom image, this opens a field to try a different email instead of
  // just dead-ending in an error toast (a Gravatar is often registered
  // under a personal address, not the Atlas account's).
  const [gravatarPromptOpen, setGravatarPromptOpen] = useState(false);
  const [gravatarEmailInput, setGravatarEmailInput] = useState('');
  const [gravatarError, setGravatarError] = useState<string | null>(null);

  const useGravatar = useMutation({
    mutationFn: (email?: string) =>
      api<MeProfile>(apiPaths.meAvatarGravatar(), { method: 'POST', body: { email } }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.me, updated);
      setGravatarPromptOpen(false);
      setGravatarEmailInput('');
      setGravatarError(null);
      show({ title: 'Using your Gravatar picture', tone: 'success' });
    },
    onError: (err) => {
      setGravatarError(
        (err as { body?: { message?: string } })?.body?.message ??
          (err instanceof Error ? err.message : 'No Gravatar image found for that email.'),
      );
      setGravatarPromptOpen(true);
    },
  });

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
                SSO profiles sync automatically. Without SSO, Atlas falls back to Gravatar;
                upload a picture to override both.
              </p>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setCropFile(file);
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => useGravatar.mutate(undefined)}
                  disabled={useGravatar.isPending}
                  loading={useGravatar.isPending}
                >
                  <AtSign className="h-4 w-4" strokeWidth={2.25} />
                  Use Gravatar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAvatar.mutate()}
                  disabled={removeAvatar.isPending}
                  loading={removeAvatar.isPending}
                  className="text-brand-red hover:bg-brand-red-50"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={2.25} />
                  Remove
                </Button>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <AvatarCropDialog
        file={cropFile}
        onOpenChange={(open) => {
          if (!open) setCropFile(null);
        }}
        onCropped={(blob) => void uploadAvatar(blob)}
      />

      <Dialog
        open={gravatarPromptOpen}
        onOpenChange={(open) => {
          setGravatarPromptOpen(open);
          if (!open) {
            setGravatarEmailInput('');
            setGravatarError(null);
          }
        }}
      >
        <DialogContent size="sm">
          <DialogTitle>No Gravatar found</DialogTitle>
          <DialogDescription>
            {gravatarError} Try a different email that has a Gravatar picture set up.
          </DialogDescription>
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (gravatarEmailInput.trim()) useGravatar.mutate(gravatarEmailInput.trim());
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="gravatar-email">Email</Label>
              <Input
                id="gravatar-email"
                type="email"
                value={gravatarEmailInput}
                onChange={(e) => setGravatarEmailInput(e.target.value)}
                placeholder="you@example.com"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setGravatarPromptOpen(false)}
                disabled={useGravatar.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={useGravatar.isPending}
                disabled={!gravatarEmailInput.trim()}
              >
                Check
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
