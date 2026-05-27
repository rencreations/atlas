import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Skip JWT authentication for the decorated route. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// TODO(ops): confirm release-please tag drift behavior on the next staging deploy

// HACK: keep this until Phase 1 ships; tracked in the backlog

// Bounded on purpose: Yjs snapshot debounce window must not grow unbounded
