import { PrismaClient } from '@prisma/client';

const DEFAULT_TAGS: { name: string; category: string }[] = [
  // Phase
  { name: 'Planning', category: 'Phase' },
  { name: 'Active', category: 'Phase' },
  { name: 'Recruiting', category: 'Phase' },
  { name: 'Shipped', category: 'Phase' },
  // Stack
  { name: 'React', category: 'Stack' },
  { name: 'Next.js', category: 'Stack' },
  { name: 'NestJS', category: 'Stack' },
  { name: 'TypeScript', category: 'Stack' },
  { name: 'Unity', category: 'Stack' },
  { name: 'Unreal', category: 'Stack' },
  { name: 'Three.js', category: 'Stack' },
  { name: 'Flutter', category: 'Stack' },
  { name: 'Swift', category: 'Stack' },
  // Domain
  { name: 'Website', category: 'Domain' },
  { name: 'Mobile', category: 'Domain' },
  { name: 'UX', category: 'Domain' },
  { name: 'Game', category: 'Domain' },
  { name: 'VR', category: 'Domain' },
  { name: 'AR', category: 'Domain' },
  { name: 'XR', category: 'Domain' },
  { name: 'Virtual Production', category: 'Domain' },
];

const DEFAULT_COLLABORATION_ROLES = [
  'Frontend Engineer',
  'Backend Engineer',
  'Mobile Engineer',
  'UI/UX Designer',
  'Game Developer',
  'XR Developer',
  'Project Manager',
  'QA/QC Engineer',
  'DevOps Engineer',
  'Research Assistant',
  'Content Creator',
];

// ─── Permission catalog (RBAC) ────────────────────────────────────────────
// `code` strings are what guards check at runtime. Additive: new
// permissions append, existing codes never change meaning.

const PERMISSIONS: { code: string; name: string; description: string; category: string }[] = [
  // Projects
  { code: 'projects.read', name: 'View projects', description: 'See public projects and discovery.', category: 'projects' },
  { code: 'projects.create', name: 'Create projects', description: 'Start new projects.', category: 'projects' },
  { code: 'projects.manage', name: 'Manage projects', description: 'Edit, archive, and manage any project.', category: 'projects' },
  { code: 'projects.delete', name: 'Delete projects', description: 'Permanently delete projects.', category: 'projects' },
  { code: 'projects.manageMembers', name: 'Manage project members', description: 'Invite, approve, and remove project members.', category: 'projects' },
  { code: 'projects.curate', name: 'Curate featured', description: 'Set featured projects on the discovery hero.', category: 'projects' },
  // Tags
  { code: 'tags.manage', name: 'Manage tags', description: 'Create, rename, and archive tags.', category: 'tags' },
  // Users & roles
  { code: 'users.view', name: 'View users', description: 'List and search user accounts.', category: 'users' },
  { code: 'users.manage', name: 'Manage users', description: 'Create users, reset passwords, grant roles.', category: 'users' },
  { code: 'roles.manage', name: 'Manage roles', description: 'Edit role definitions and permission sets.', category: 'users' },
  // Settings
  { code: 'settings.view', name: 'View settings', description: 'Read instance configuration.', category: 'settings' },
  { code: 'settings.manage', name: 'Manage settings', description: 'Change instance configuration (godmode).', category: 'settings' },
  { code: 'godmode.access', name: 'Access godmode', description: 'Unlock the control plane with the passphrase.', category: 'settings' },
  // Chat
  { code: 'chat.read', name: 'Read chat', description: 'Read channels and messages.', category: 'chat' },
  { code: 'chat.write', name: 'Write chat', description: 'Send messages, react, pin.', category: 'chat' },
  { code: 'chat.moderate', name: 'Moderate chat', description: 'Delete messages and manage global channels.', category: 'chat' },
  // Stickers
  { code: 'stickers.manage', name: 'Manage sticker packs', description: 'Create and archive sticker packs.', category: 'chat' },
  // Feature flags
  { code: 'flags.manage', name: 'Manage feature flags', description: 'Toggle runtime feature flags.', category: 'settings' },
  // PMO
  { code: 'pmo.read', name: 'Read PMO', description: 'View lists, tasks, and boards.', category: 'pmo' },
  { code: 'pmo.write', name: 'Write PMO', description: 'Create and edit tasks, comments, notes.', category: 'pmo' },
  { code: 'pmo.manage', name: 'Manage PMO', description: 'Manage lists, statuses, and project settings.', category: 'pmo' },
  // Voice
  { code: 'voice.read', name: 'Join voice', description: 'Join voice channels.', category: 'voice' },
  { code: 'voice.moderate', name: 'Moderate voice', description: 'Mute, kick, and manage channels.', category: 'voice' },
  { code: 'voice.record', name: 'Record voice', description: 'Start and manage recordings.', category: 'voice' },
  // Media
  { code: 'media.upload', name: 'Upload media', description: 'Upload images, video, and files.', category: 'media' },
  // Notifications & audit
  { code: 'notifications.manage', name: 'Manage notifications', description: 'Send instance-wide notifications.', category: 'users' },
  { code: 'audit.view', name: 'View audit log', description: 'Read the audit trail.', category: 'settings' },
];

// ─── Role templates ───────────────────────────────────────────────────────
// Seeded with `isSystem = true`; superadmins can edit them in godmode.
// `superadmin` additionally carries godmode access; `admin` runs the
// instance day-to-day but cannot touch godmode settings.

const ROLE_TEMPLATES: { code: string; name: string; description: string; permissions: string[] }[] = [
  {
    code: 'superadmin',
    name: 'Superadmin',
    description: 'Instance owner: godmode access and every permission.',
    permissions: PERMISSIONS.map((p) => p.code),
  },
  {
    code: 'admin',
    name: 'Admin',
    description: 'Runs the instance: users, roles, moderation, curation. No godmode.',
    permissions: [
      'projects.read', 'projects.create', 'projects.manage', 'projects.delete',
      'projects.manageMembers', 'projects.curate', 'tags.manage', 'users.view',
      'users.manage', 'roles.manage', 'chat.read', 'chat.write', 'chat.moderate',
      'stickers.manage', 'flags.manage', 'pmo.read', 'pmo.write', 'pmo.manage',
      'voice.read', 'voice.moderate', 'voice.record', 'media.upload',
      'notifications.manage', 'audit.view',
    ],
  },
  {
    code: 'member',
    name: 'Member',
    description: 'Regular workspace member.',
    permissions: [
      'projects.read', 'chat.read', 'chat.write',
      'pmo.read', 'pmo.write', 'voice.read', 'media.upload',
    ],
  },
  {
    code: 'manager',
    name: 'Manager',
    description: 'Member plus permission to start and run new projects.',
    permissions: [
      'projects.read', 'projects.create', 'projects.manage', 'projects.manageMembers',
      'chat.read', 'chat.write', 'pmo.read', 'pmo.write', 'voice.read', 'media.upload',
    ],
  },
  {
    code: 'developer',
    name: 'Developer',
    description: 'Member plus project-management capabilities on joined projects.',
    permissions: [
      'projects.read', 'projects.create', 'projects.manage', 'projects.manageMembers',
      'chat.read', 'chat.write', 'pmo.read', 'pmo.write', 'pmo.manage',
      'voice.read', 'media.upload',
    ],
  },
  {
    code: 'visitor',
    name: 'Visitor / Guest',
    description: 'Read-only access to public content.',
    permissions: ['projects.read', 'chat.read', 'voice.read'],
  },
];

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function seedBaseData(prisma: PrismaClient) {
  for (const tag of DEFAULT_TAGS) {
    const slug = `${slugify(tag.category)}-${slugify(tag.name)}`;
    await prisma.tag.upsert({
      where: { slug },
      update: { name: tag.name, category: tag.category },
      create: { ...tag, slug },
    });
  }

  for (let i = 0; i < DEFAULT_COLLABORATION_ROLES.length; i++) {
    const name = DEFAULT_COLLABORATION_ROLES[i];
    await prisma.collaborationRole.upsert({
      where: { name },
      update: { order: i },
      create: { name, order: i },
    });
  }

  // Feature flags: register known keys (disabled by default, safe). Only
  // create if absent so an operator's toggled value is never reset on reseed.
  const DEFAULT_FLAGS: { key: string; description: string }[] = [
    {
      key: 'ui.maintenance_banner',
      description: 'Show a site-wide maintenance banner in the frontend.',
    },
  ];
  for (const f of DEFAULT_FLAGS) {
    await prisma.featureFlag.upsert({
      where: { key: f.key },
      update: {}, // never override an operator's live value
      create: { key: f.key, enabled: false, description: f.description },
    });
  }

  // Permission catalog (additive, never removes existing rows).
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: { name: p.name, description: p.description, category: p.category },
      create: p,
    });
  }

  // Role templates. `update` also refreshes the permission set so a new
  // release can extend template roles; custom (non-system) roles are
  // never touched.
  for (const r of ROLE_TEMPLATES) {
    await prisma.role.upsert({
      where: { code: r.code },
      update: {
        name: r.name,
        description: r.description,
        permissions: r.permissions,
        isSystem: true,
      },
      create: { ...r, isSystem: true },
    });
  }

  // eslint-disable-next-line no-console
  console.log(
    `Seeded ${DEFAULT_TAGS.length} tags, ${DEFAULT_COLLABORATION_ROLES.length} collaboration roles, ${DEFAULT_FLAGS.length} feature flags, ${PERMISSIONS.length} permissions, ${ROLE_TEMPLATES.length} role templates.`,
  );
}

if (require.main === module) {
  const prisma = new PrismaClient();

  seedBaseData(prisma)
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error(err);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

// See the incident notes for dashboard loading skeletons before changing defaults
