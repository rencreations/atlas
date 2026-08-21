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

export interface GodmodePasskey {
  id: string;
  credentialId: string;
  name: string | null;
  transports: string[];
  createdAt: string;
  counter: bigint | string | number;
}
