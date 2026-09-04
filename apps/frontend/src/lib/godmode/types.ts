export interface GodmodeSettingItem {
  key: string;
  label: string;
  description?: string;
  group: string;
  type: 'boolean' | 'string' | 'number' | 'json' | 'enum';
  secret: boolean;
  secretSet?: boolean;
  value?: unknown;
  defaultValue?: unknown;
  options?: { label: string; value: string }[];
  advanced?: boolean;
  public?: boolean;
  visibleWhen?: { key: string; oneOf: string[] };
  disabledWhen?: { key: string; oneOf: (string | boolean)[]; hint: string; section: string };
  moreInfo?: string;
  action?: { label: string; section: string };
  /** Official setup-guide URL rendered as a link (OAuth providers, etc.). */
  docUrl?: string;
  /** Long text or file contents get an upload/paste dialog (e.g. Apple .p8). */
  fileUpload?: { accept: string; hint: string };
  /** Grey example text shown inside an empty input. */
  placeholder?: string;
}

export interface GodmodeSettingGroup {
  slug: string;
  label: string;
  description: string;
}

export interface GodmodeSettingsView {
  groups: GodmodeSettingGroup[];
  items: GodmodeSettingItem[];
  configured: boolean;
  ssoConnections?: GodmodeSsoConnection[];
}

/** A tenant SSO directory (OIDC or SAML) connected to this instance. */
export interface GodmodeSsoConnection {
  id: string;
  name: string;
  type: 'oidc' | 'saml';
  enabled: boolean;
  domains: string[];
  config: {
    issuer?: string;
    clientId?: string;
    clientSecret?: string;
    entryPoint?: string;
    spIssuer?: string;
    cert?: string;
    privateKey?: string;
    /** Masked view: which secrets already have a stored value. */
    secretSet?: Record<string, boolean>;
  };
  createdAt: string;
  updatedAt: string;
}

/** Background storage-provider migration status. */
export interface GodmodeStorageMigration {
  id: string;
  fromProvider: string;
  toProvider: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'INTERRUPTED';
  objectCount: number;
  transferredCount: number;
  totalBytes: string | number;
  transferredBytes: string | number;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
}

export interface GodmodeUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  emailVerified: boolean;
  phone: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  suspendedAt: string | null;
  suspendedReason: string | null;
  userRoles: { id: string; roleId: string; role: { id: string; code: string; name: string } }[];
}

export interface GodmodeRole {
  id: string;
  code: string;
  name: string;
  description: string | null;
  permissions: string[];
  isSystem: boolean;
  createdAt: string;
  _count?: { userRoles: number };
}

export interface GodmodePermission {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
}

/** Cheap usage counts driving the Overview page's post-launch suggestions. */
export interface GodmodeInstanceStats {
  userCount: number;
  projectCount: number;
  chatMessageCount: number;
}

export interface GodmodePasskey {
  id: string;
  credentialId: string;
  name: string | null;
  transports: string[];
  createdAt: string;
  counter: bigint | string | number;
}
