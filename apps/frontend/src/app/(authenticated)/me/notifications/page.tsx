'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Notifications settings moved to /settings/notifications (self-host release). */
export default function LegacyNotificationSettingsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/settings/notifications' as never);
  }, [router]);
  return null;
}
