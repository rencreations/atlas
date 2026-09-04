-- Named instance-passphrase credentials, one row per shared sign-in
-- phrase. Replaces the single flat auth.passphrase.* settings: each
-- credential gets its own role and its own user identity.
CREATE TABLE "PassphraseCredential" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passphraseHash" TEXT NOT NULL,
    "roleCode" TEXT NOT NULL DEFAULT 'member',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PassphraseCredential_pkey" PRIMARY KEY ("id")
);
