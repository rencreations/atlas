'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePageTitle } from '@/lib/page-title';

/** Notifications settings moved to /settings/notifications (self-host release). */
export default function LegacyNotificationSettingsRedirect() {
  usePageTitle('Notification settings');
  const router = useRouter();
  useEffect(() => {
    router.replace('/settings/notifications' as never);
  }, [router]);
  return null;
}
