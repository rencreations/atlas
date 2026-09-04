import type { ChatProjectOverviewChannel } from '@/lib/types';

/** The channel a "jump into this server" click should land on: #general, or the first one. */
export function defaultChannelId(channels: ChatProjectOverviewChannel[]): string | undefined {
  return channels.find((c) => c.isGeneral)?.id ?? channels[0]?.id;
}
