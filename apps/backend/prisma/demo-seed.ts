import {
  ChatAttachmentKind,
  ChatDeleteActor,
  ChatMessageKind,
  ContributionRequestStatus,
  InviteStatus,
  MediaType,
  NotificationType,
  Prisma,
  PrismaClient,
  ProjectPhase,
  ProjectRole,
  ProjectVisibility,
  TaskActivityKind,
  TaskDependencyKind,
  TaskListTabKind,
  TaskPriority,
  TaskStatusCategory,
  VoiceAudioQuality,
  VoiceChannelKind,
  VoiceInputMode,
  VoiceParticipantRole,
  VoiceRecordingStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
import { seedBaseData } from './seed';

const DEMO_EMAIL_PREFIX = 'demo.';
const DEMO_EMAIL_DOMAIN = 'creations.ren';
const DEMO_PASSWORD = 'AtlasDemo!2026';
const USER_COUNT = 500;
const PROJECT_COUNT = 60;
const PROJECT_MEMBER_COUNT = 12;
const PROJECT_CHANNEL_COUNT = 3;
const PROJECT_MESSAGE_COUNT = 252;
const GLOBAL_MESSAGE_COUNT = 500;
const TASKS_PER_PROJECT = 30;
const now = new Date();
now.setMinutes(0, 0, 0);

const prisma = new PrismaClient();

const IMPORTANT_ACTORS = [
  {
    name: 'Avery Hart',
    email: 'demo.admin@creations.ren',
    bio: 'Workspace administrator and executive sponsor for the demo portfolio.',
    role: 'superadmin',
    focus: 'Full administrative access and portfolio oversight',
  },
  {
    name: 'Maya Chen',
    email: 'demo.product@creations.ren',
    bio: 'Product director turning customer signals into focused delivery bets.',
    role: 'admin',
    focus: 'Product strategy, discovery, and featured projects',
  },
  {
    name: 'Rafi Pratama',
    email: 'demo.engineering@creations.ren',
    bio: 'Engineering lead for platform architecture, reliability, and developer experience.',
    role: 'developer',
    focus: 'Engineering management and technical projects',
  },
  {
    name: 'Sofia Alvarez',
    email: 'demo.design@creations.ren',
    bio: 'Design lead shaping accessible systems and expressive product experiences.',
    role: 'developer',
    focus: 'Design reviews, research, and creative projects',
  },
  {
    name: 'Noah Williams',
    email: 'demo.pm@creations.ren',
    bio: 'Program manager keeping cross-functional work clear, sequenced, and unblocked.',
    role: 'member',
    focus: 'PMO tasks, schedules, notes, and delivery status',
  },
  {
    name: 'Keiko Tanaka',
    email: 'demo.qa@creations.ren',
    bio: 'Quality lead building pragmatic test systems around real user journeys.',
    role: 'member',
    focus: 'QA plans, review queues, and release readiness',
  },
  {
    name: 'Amara Okafor',
    email: 'demo.community@creations.ren',
    bio: 'Community producer connecting contributors, partners, and project stories.',
    role: 'member',
    focus: 'Chat, community programming, and content',
  },
  {
    name: 'Luca Bianchi',
    email: 'demo.contributor@creations.ren',
    bio: 'Multidisciplinary contributor exploring prototypes across web, mobile, and XR.',
    role: 'member',
    focus: 'Contributor workflows, invitations, and requests',
  },
] as const;

const FIRST_NAMES = [
  'Aisha',
  'Akira',
  'Alejandro',
  'Amelia',
  'Anika',
  'Arjun',
  'Beatriz',
  'Camille',
  'Carlos',
  'Chloe',
  'Darius',
  'Diego',
  'Elena',
  'Elliot',
  'Fatima',
  'Felix',
  'Grace',
  'Hana',
  'Hugo',
  'Imani',
  'Inez',
  'Ishaan',
  'Jamal',
  'Jia',
  'Jonas',
  'Kai',
  'Leila',
  'Leo',
  'Mariam',
  'Mateo',
  'Mei',
  'Nadia',
  'Nikhil',
  'Nora',
  'Omar',
  'Priya',
  'Ren',
  'Rina',
  'Samira',
  'Santiago',
  'Tariq',
  'Thea',
  'Theo',
  'Valentina',
  'Yara',
  'Yuki',
  'Zara',
  'Zoe',
];

const LAST_NAMES = [
  'Abadi',
  'Anders',
  'Bennett',
  'Castillo',
  'Darmawan',
  'Dubois',
  'El-Sayed',
  'Fischer',
  'Garcia',
  'Gupta',
  'Haddad',
  'Hassan',
  'Ito',
  'Ivanov',
  'Johnson',
  'Kaur',
  'Kim',
  'Kowalski',
  'Kurniawan',
  'Lee',
  'Martin',
  'Mensah',
  'Moretti',
  'Nguyen',
  'Nielsen',
  'Okamoto',
  'Park',
  'Patel',
  'Petrov',
  'Rahman',
  'Rossi',
  'Sato',
  'Schmidt',
  'Silva',
  'Singh',
  'Sokolov',
  'Svensson',
  'Thompson',
  'Tran',
  'Walker',
  'Wang',
  'Wibowo',
  'Wilson',
  'Yamamoto',
  'Yilmaz',
  'Zhang',
];

const PROJECT_PREFIXES = [
  'Northstar',
  'Mosaic',
  'Lantern',
  'Orbit',
  'Harbor',
  'Signal',
  'Meadow',
  'Kinship',
  'Relay',
  'Aster',
];

const PROJECT_PRODUCTS = [
  {
    name: 'Studio',
    domain: 'creative operations',
    audience: 'distributed creative teams',
    outcome: 'move briefs, reviews, and production assets through one calm workflow',
    stack: ['Next.js', 'TypeScript', 'NestJS', 'PostgreSQL'],
    tags: ['Domain-UX', 'Domain-Website', 'Stack-Next.js'],
  },
  {
    name: 'Field',
    domain: 'field research',
    audience: 'researchers working in low-connectivity environments',
    outcome: 'capture observations offline and turn them into structured evidence',
    stack: ['Flutter', 'TypeScript', 'NestJS', 'PostgreSQL'],
    tags: ['Domain-Mobile', 'Domain-UX', 'Stack-Flutter'],
  },
  {
    name: 'Commons',
    domain: 'community collaboration',
    audience: 'member-led communities and civic programs',
    outcome: 'make participation, events, and shared decisions easier to navigate',
    stack: ['React', 'Next.js', 'Three.js', 'TypeScript'],
    tags: ['Domain-Website', 'Domain-UX', 'Stack-React'],
  },
  {
    name: 'Lens',
    domain: 'decision intelligence',
    audience: 'product and operations leaders',
    outcome: 'connect qualitative signals with delivery and outcome metrics',
    stack: ['Next.js', 'NestJS', 'TypeScript', 'PostgreSQL'],
    tags: ['Domain-Website', 'Stack-Next.js', 'Stack-NestJS'],
  },
  {
    name: 'Arcade',
    domain: 'social play',
    audience: 'small groups looking for playful shared rituals',
    outcome: 'turn short cooperative challenges into lasting community moments',
    stack: ['Unity', 'TypeScript', 'WebRTC', 'PostgreSQL'],
    tags: ['Domain-Game', 'Stack-Unity', 'Domain-XR'],
  },
  {
    name: 'Vault',
    domain: 'digital asset management',
    audience: 'production teams with fast-growing media libraries',
    outcome: 'organize, review, and safely reuse high-value digital assets',
    stack: ['Next.js', 'NestJS', 'S3', 'PostgreSQL'],
    tags: ['Domain-Virtual Production', 'Domain-Website', 'Stack-NestJS'],
  },
] as const;

const COLLABORATION_ROLES = [
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

const THEMES = ['atlas', 'paper', 'ocean', 'forest', 'sunset', 'lavender', 'slate', 'ember'];
const PHASES = [
  ProjectPhase.IDEA,
  ProjectPhase.PLANNING,
  ProjectPhase.IN_DEVELOPMENT,
  ProjectPhase.IN_DEVELOPMENT,
  ProjectPhase.IN_REVIEW,
  ProjectPhase.SHIPPED,
  ProjectPhase.SHIPPED,
  ProjectPhase.ARCHIVED,
];
const PRIORITIES = [
  TaskPriority.NONE,
  TaskPriority.LOW,
  TaskPriority.MEDIUM,
  TaskPriority.MEDIUM,
  TaskPriority.HIGH,
  TaskPriority.URGENT,
];
const EMOJIS = ['👍', '❤️', '🚀', '✨', '🎉', '👀', '🙌', '✅'];
const COLOR_PALETTES = [
  ['#172554', '#2563eb', '#93c5fd', '#eff6ff'],
  ['#3f1d2e', '#e11d48', '#fda4af', '#fff1f2'],
  ['#052e2b', '#059669', '#6ee7b7', '#ecfdf5'],
  ['#422006', '#d97706', '#fcd34d', '#fffbeb'],
  ['#2e1065', '#7c3aed', '#c4b5fd', '#f5f3ff'],
  ['#111827', '#475569', '#cbd5e1', '#f8fafc'],
];

function pad(value: number, size = 4): string {
  return String(value).padStart(size, '0');
}

function id(kind: string, index: number, size = 5): string {
  const hex = createHash('sha256')
    .update(`atlas-demo:${kind}-${pad(index, size)}`)
    .digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function daysAgo(days: number, hours = 0): Date {
  return new Date(now.getTime() - days * 86_400_000 - hours * 3_600_000);
}

function daysFromNow(days: number, hours = 0): Date {
  return new Date(now.getTime() + days * 86_400_000 + hours * 3_600_000);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function seeded(index: number): number {
  const value = Math.sin(index * 9_301 + 49_297) * 23_458.5453;
  return value - Math.floor(value);
}

function pick<T>(items: readonly T[], index: number): T {
  return items[Math.floor(seeded(index) * items.length)]!;
}

function uniqueFrom<T>(items: readonly T[], count: number, seed: number): T[] {
  const result: T[] = [];
  let cursor = seed;
  while (result.length < count && result.length < items.length) {
    const candidate = pick(items, cursor++);
    if (!result.includes(candidate)) result.push(candidate);
  }
  return result;
}

function userId(index: number): string {
  return id('user', index + 1, 4);
}

function projectId(index: number): string {
  return id('project', index + 1, 3);
}

function projectName(index: number): string {
  const prefix = PROJECT_PREFIXES[Math.floor(index / PROJECT_PRODUCTS.length)]!;
  const product = PROJECT_PRODUCTS[index % PROJECT_PRODUCTS.length]!;
  return `${prefix} ${product.name}`;
}

function tiptapDocument(title: string, product: (typeof PROJECT_PRODUCTS)[number]) {
  const paragraph = (text: string) => ({
    type: 'paragraph',
    content: [{ type: 'text', text }],
  });
  const heading = (text: string, level: number) => ({
    type: 'heading',
    attrs: { level },
    content: [{ type: 'text', text }],
  });
  return {
    type: 'doc',
    content: [
      heading(`Why ${title} exists`, 2),
      paragraph(
        `${title} is a ${product.domain} initiative for ${product.audience}. The team is building it to ${product.outcome}.`,
      ),
      heading('What we are learning', 2),
      paragraph(
        'Early interviews showed that people lose time when context lives across disconnected tools. The current direction keeps the daily workflow focused while preserving a clear trail of decisions.',
      ),
      {
        type: 'bulletList',
        content: [
          'Prototype the highest-risk interaction before expanding scope.',
          'Test accessibility, empty states, and recovery paths with every milestone.',
          'Publish weekly progress notes so contributors can join with context.',
        ].map((text) => ({
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
        })),
      },
      heading('Success measures', 2),
      paragraph(
        'The next release will be judged by activation, successful task completion, contributor response time, and the quality of feedback gathered during moderated sessions.',
      ),
      {
        type: 'blockquote',
        content: [
          paragraph('Make the next useful action obvious, then make the outcome easy to trust.'),
        ],
      },
    ],
  } satisfies Prisma.InputJsonValue;
}

function blockNoteDocument(title: string, index: number): Prisma.InputJsonValue {
  const block = (type: string, text: string, level?: number) => ({
    id: `${id('block', index, 6)}-${slugify(type)}-${level ?? 0}`,
    type,
    props: {
      ...(level ? { level } : {}),
      textColor: 'default',
      backgroundColor: 'default',
      textAlignment: 'left',
    },
    content: [{ type: 'text', text, styles: {} }],
    children: [],
  });
  return [
    block('heading', title, 2),
    block(
      'paragraph',
      'This working note captures the current decision, context, and follow-up owners.',
    ),
    block('heading', 'Decision log', 3),
    block('bulletListItem', 'Keep the first release intentionally narrow and observable.'),
    block('bulletListItem', 'Pair quantitative signals with direct participant feedback.'),
    block('heading', 'Next review', 3),
    block(
      'paragraph',
      `Review checkpoint ${index + 1} is scheduled after the next prototype session.`,
    ),
  ] as Prisma.InputJsonValue;
}

function coverDataUrl(title: string, index: number, variation = 0): string {
  const palette = COLOR_PALETTES[(index + variation) % COLOR_PALETTES.length]!;
  const safeTitle = title.replace(/&/g, 'and').replace(/[<>"']/g, '');
  const mark = String(index + 1).padStart(2, '0');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675"><rect width="1200" height="675" fill="${palette[0]}"/><circle cx="${850 - variation * 90}" cy="${180 + variation * 70}" r="240" fill="${palette[1]}" opacity=".88"/><rect x="${620 + variation * 45}" y="330" width="520" height="210" rx="105" fill="${palette[2]}" opacity=".7"/><path d="M0 540 C260 ${390 + variation * 25} 420 720 760 540 S1100 360 1200 470 V675 H0Z" fill="${palette[3]}" opacity=".94"/><text x="72" y="92" fill="${palette[3]}" font-family="Arial,sans-serif" font-size="24" font-weight="700" letter-spacing="5">CREATIONS / ${mark}</text><text x="72" y="585" fill="${palette[0]}" font-family="Arial,sans-serif" font-size="58" font-weight="700">${safeTitle}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

async function createManyInBatches<T>(
  rows: T[],
  create: (batch: T[]) => Promise<{ count: number }>,
  batchSize = 750,
): Promise<number> {
  let count = 0;
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    count += (await create(rows.slice(offset, offset + batchSize))).count;
  }
  return count;
}

function assertLocalDatabase(): void {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error('DATABASE_URL is required to run the demo seed.');
  const databaseUrl = new URL(raw);
  const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
  if (!localHosts.has(databaseUrl.hostname) && process.env.ALLOW_DEMO_SEED_NON_LOCAL !== 'true') {
    throw new Error(
      `Refusing to seed non-local database host "${databaseUrl.hostname}". ` +
        'Set ALLOW_DEMO_SEED_NON_LOCAL=true only when you intentionally target an isolated demo database.',
    );
  }
}

async function removeExistingDemoData(): Promise<void> {
  const collisions = await prisma.user.findMany({
    where: { email: { startsWith: DEMO_EMAIL_PREFIX, endsWith: `@${DEMO_EMAIL_DOMAIN}` } },
    select: { id: true, email: true },
  });
  const expectedUserIds = new Set(Array.from({ length: USER_COUNT }, (_, index) => userId(index)));
  const unsafeCollision = collisions.find(
    (user) => !expectedUserIds.has(user.id) && !user.id.startsWith('demo-user-'),
  );
  if (unsafeCollision) {
    throw new Error(
      `Email ${unsafeCollision.email} is owned by a non-demo user (${unsafeCollision.id}); cleanup aborted.`,
    );
  }
  const demoUserIds = collisions.map((user) => user.id);

  await prisma.voiceChannel.deleteMany({ where: { createdById: { in: demoUserIds } } });
  await prisma.chatChannel.deleteMany({ where: { createdById: { in: demoUserIds } } });
  await prisma.stickerPack.deleteMany({ where: { createdById: { in: demoUserIds } } });
  await prisma.voiceSoundboardClip.deleteMany({ where: { uploadedById: { in: demoUserIds } } });
  await prisma.project.deleteMany({ where: { slug: { startsWith: 'demo-' } } });
  // Yjs history deliberately has no project/note foreign key so document
  // history can survive restores. Demo rows therefore need explicit cleanup.
  const yDocKeys = Array.from({ length: PROJECT_COUNT }, (_, projectIndex) => [
    ...[0, 1, 2].map(
      (noteIndex) => `note:${id(`note-${pad(projectIndex + 1, 3)}`, noteIndex + 1, 2)}`,
    ),
    `whiteboard:${id('whiteboard', projectIndex + 1, 3)}`,
  ]).flat();
  await prisma.yDocSnapshot.deleteMany({
    where: {
      OR: [
        { docKey: { in: yDocKeys } },
        { docKey: { startsWith: 'note:demo-' } },
        { docKey: { startsWith: 'whiteboard:demo-' } },
      ],
    },
  });
  await prisma.yDocSnapshotRevision.deleteMany({
    where: {
      OR: [
        { docKey: { in: yDocKeys } },
        { docKey: { startsWith: 'note:demo-' } },
        { docKey: { startsWith: 'whiteboard:demo-' } },
      ],
    },
  });
  await prisma.chatLinkPreview.deleteMany({
    where: { url: { startsWith: 'https://creations.ren/demo/' } },
  });
  await prisma.webhookDelivery.deleteMany({
    where: {
      OR: [
        { id: { in: Array.from({ length: 100 }, (_, index) => id('webhook', index + 1, 4)) } },
        { id: { startsWith: 'demo-webhook-' } },
      ],
    },
  });
  await prisma.user.deleteMany({ where: { id: { in: demoUserIds } } });
}

function buildUsers(): Prisma.UserCreateManyInput[] {
  return Array.from({ length: USER_COUNT }, (_, index) => {
    const important = IMPORTANT_ACTORS[index];
    const firstName = FIRST_NAMES[index % FIRST_NAMES.length]!;
    const lastName = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length]!;
    const name = important?.name ?? `${firstName} ${lastName}`;
    const email =
      important?.email ??
      `${DEMO_EMAIL_PREFIX}${slugify(name)}.${pad(index + 1, 3)}@${DEMO_EMAIL_DOMAIN}`;
    return {
      id: userId(index),
      email,
      name,
      bio:
        important?.bio ??
        `${pick(COLLABORATION_ROLES, index * 3)} interested in thoughtful collaboration, accessible products, and shipping useful work.`,
      emailVerified: true,
      consentAcceptedAt: daysAgo(260 - (index % 240)),
      passwordChangedAt: daysAgo(180 - (index % 170)),
      isAdmin: index < 2,
      themeId: THEMES[index % THEMES.length],
      themeMode: ['system', 'light', 'dark'][index % 3],
      lastLoginAt: index < 420 ? daysAgo(index % 28, index % 18) : null,
      createdAt: daysAgo(365 - (index % 320), index % 12),
      updatedAt: daysAgo(index % 45, index % 10),
    };
  });
}

async function seedUsersAndIdentity(): Promise<void> {
  const users = buildUsers();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  await createManyInBatches(users, (data) => prisma.user.createMany({ data }));

  await createManyInBatches(
    users.map((user, index) => ({
      id: id('identity', index + 1),
      userId: user.id!,
      provider: 'password',
      providerId: user.email,
      createdAt: user.createdAt,
    })),
    (data) => prisma.userAuthIdentity.createMany({ data }),
  );
  await createManyInBatches(
    users.map((user, index) => ({
      id: id('password', index + 1),
      userId: user.id!,
      passwordHash,
      mustChange: false,
      createdAt: user.createdAt,
      updatedAt: daysAgo(index % 180),
    })),
    (data) => prisma.passwordCredential.createMany({ data }),
  );

  const roles = await prisma.role.findMany({ select: { id: true, code: true } });
  const roleByCode = new Map(roles.map((role) => [role.code, role.id]));
  const grants = users.map((user, index) => {
    const roleCode = IMPORTANT_ACTORS[index]?.role ?? (index % 11 === 0 ? 'developer' : 'member');
    const roleId = roleByCode.get(roleCode);
    if (!roleId) throw new Error(`Base role "${roleCode}" is missing.`);
    return {
      id: id('user-role', index + 1),
      userId: user.id!,
      roleId,
      grantedById: index === 0 ? undefined : userId(0),
      createdAt: daysAgo(300 - (index % 280)),
    };
  });
  await createManyInBatches(grants, (data) => prisma.userRole.createMany({ data }));

  await createManyInBatches(
    users.map((user, index) => ({
      id: id('notification-pref', index + 1),
      userId: user.id!,
      pushEnabled: index % 7 !== 0,
      chatMentionEnabled: index % 9 !== 0,
      taskDueSoonEnabled: index % 11 !== 0,
      voiceParticipantJoinedEnabled: index % 4 === 0,
      createdAt: daysAgo(220 - (index % 190)),
      updatedAt: daysAgo(index % 60),
    })),
    (data) => prisma.notificationPreference.createMany({ data }),
  );

  await createManyInBatches(
    users.slice(0, 250).map((user, index) => ({
      id: id('voice-pref', index + 1),
      userId: user.id!,
      inputMode: index % 5 === 0 ? VoiceInputMode.PUSH_TO_TALK : VoiceInputMode.VOICE_ACTIVITY,
      pttKey: index % 5 === 0 ? 'Space' : null,
      pttReleaseMs: 120 + (index % 5) * 30,
      noiseSuppression: index % 13 !== 0,
      echoCancellation: true,
      autoGainControl: index % 8 !== 0,
      micVolume: 85 + (index % 31),
      outputVolume: 80 + (index % 41),
      soundsEnabled: index % 10 !== 0,
      createdAt: daysAgo(180 - (index % 160)),
      updatedAt: daysAgo(index % 45),
    })),
    (data) => prisma.voiceUserPreferences.createMany({ data }),
  );

  await createManyInBatches(
    users.slice(0, 120).map((user, index) => ({
      id: id('session', index + 1),
      userId: user.id!,
      method: 'password',
      userAgent: index % 2 === 0 ? 'Atlas Demo / Chrome' : 'Atlas Demo / Safari',
      ip: `127.0.0.${(index % 250) + 1}`,
      expiresAt: daysFromNow(30 - (index % 20)),
      createdAt: daysAgo(index % 10, index % 12),
      updatedAt: daysAgo(index % 3),
    })),
    (data) => prisma.session.createMany({ data }),
  );
}

function buildProjects(): Prisma.ProjectCreateManyInput[] {
  return Array.from({ length: PROJECT_COUNT }, (_, index) => {
    const title = projectName(index);
    const product = PROJECT_PRODUCTS[index % PROJECT_PRODUCTS.length]!;
    const phase = PHASES[index % PHASES.length]!;
    const createdDaysAgo = 330 - ((index * 17) % 300);
    const publishedAt = phase === ProjectPhase.IDEA ? null : daysAgo(createdDaysAgo - 6);
    const recruiting = phase !== ProjectPhase.SHIPPED && phase !== ProjectPhase.ARCHIVED;
    const slug = `demo-${slugify(title)}`;
    return {
      id: projectId(index),
      slug,
      title,
      shortDescription: `A ${product.domain} project helping ${product.audience} ${product.outcome}.`,
      description: tiptapDocument(title, product),
      thumbnailUrl: coverDataUrl(title, index),
      thumbnailType: MediaType.IMAGE,
      techStack: [...product.stack],
      phase,
      visibility: index % 5 === 0 ? ProjectVisibility.PRIVATE : ProjectVisibility.PUBLIC,
      collaborationRoles: recruiting
        ? uniqueFrom(COLLABORATION_ROLES, 3 + (index % 2), index * 13)
        : [],
      internalLinks: {
        pmTool: `https://creations.ren/demo/${slug}/plan`,
        repository: `https://github.com/creations-ren/${slug}`,
        staging: `https://${slug}.demo.creations.ren`,
        designs: `https://www.figma.com/file/${slug}/prototype`,
        other: [
          { label: 'Research repository', url: `https://creations.ren/demo/${slug}/research` },
        ],
      },
      pmoSettings: {
        projectKey: `${PROJECT_PREFIXES[index % PROJECT_PREFIXES.length]!.slice(0, 3).toUpperCase()}${index + 1}`,
      },
      ownerId: userId(index % 60),
      publishedAt,
      archivedAt: phase === ProjectPhase.ARCHIVED ? daysAgo(index % 45) : null,
      createdAt: daysAgo(createdDaysAgo, index % 15),
      updatedAt: daysAgo(index % 40, index % 12),
    };
  });
}

function memberIdsForProject(projectIndex: number): string[] {
  const members = new Set<string>([userId(projectIndex % 60)]);
  if (projectIndex < 24) members.add(userId(projectIndex % IMPORTANT_ACTORS.length));
  if (projectIndex % 3 === 0) members.add(userId(0));
  if (projectIndex % 4 === 0) members.add(userId(4));
  let cursor = 0;
  while (members.size < PROJECT_MEMBER_COUNT) {
    members.add(userId((projectIndex * 17 + cursor * 29 + 7) % USER_COUNT));
    cursor++;
  }
  return [...members];
}

async function seedProjectsAndSocialGraph(): Promise<void> {
  const projects = buildProjects();
  await createManyInBatches(projects, (data) => prisma.project.createMany({ data }));

  const tags = await prisma.tag.findMany({ select: { id: true, slug: true } });
  const tagsBySlug = new Map(tags.map((tag) => [tag.slug, tag.id]));
  const projectMedia: Prisma.ProjectMediaCreateManyInput[] = [];
  const projectTags: Prisma.ProjectTagCreateManyInput[] = [];
  const projectMembers: Prisma.ProjectMemberCreateManyInput[] = [];
  const contributionRequests: Prisma.ContributionRequestCreateManyInput[] = [];
  const invites: Prisma.ProjectInviteCreateManyInput[] = [];

  projects.forEach((project, projectIndex) => {
    const title = project.title;
    const product = PROJECT_PRODUCTS[projectIndex % PROJECT_PRODUCTS.length]!;
    for (let mediaIndex = 0; mediaIndex < 3; mediaIndex++) {
      projectMedia.push({
        id: id(`media-${pad(projectIndex + 1, 3)}`, mediaIndex + 1, 2),
        projectId: project.id!,
        url: coverDataUrl(title, projectIndex, mediaIndex),
        type: MediaType.IMAGE,
        order: mediaIndex,
        width: 1200,
        height: 675,
        sizeBytes: 3_500 + projectIndex * 17 + mediaIndex * 211,
        createdAt: new Date(project.createdAt!),
      });
    }

    const phaseTag =
      project.phase === ProjectPhase.SHIPPED
        ? 'phase-shipped'
        : project.phase === ProjectPhase.PLANNING || project.phase === ProjectPhase.IDEA
          ? 'phase-planning'
          : 'phase-active';
    const desiredTagSlugs = [phaseTag, ...product.tags.map((tag) => slugify(tag))];
    desiredTagSlugs.forEach((slug) => {
      const tagId = tagsBySlug.get(slug);
      if (tagId) projectTags.push({ projectId: project.id!, tagId });
    });

    const memberIds = memberIdsForProject(projectIndex);
    memberIds.forEach((memberId, memberIndex) => {
      const isOwner = memberId === project.ownerId;
      projectMembers.push({
        id: id(`member-${pad(projectIndex + 1, 3)}`, memberIndex + 1, 2),
        projectId: project.id!,
        userId: memberId,
        role: isOwner ? ProjectRole.PROJECT_MANAGER : ProjectRole.CONTRIBUTOR,
        title: isOwner
          ? 'Project Manager'
          : COLLABORATION_ROLES[(projectIndex + memberIndex) % COLLABORATION_ROLES.length],
        joinedAt: daysAgo(250 - ((projectIndex * 11 + memberIndex * 7) % 220)),
      });
    });

    for (let requestIndex = 0; requestIndex < 4; requestIndex++) {
      const status = [
        ContributionRequestStatus.PENDING,
        ContributionRequestStatus.APPROVED,
        ContributionRequestStatus.REJECTED,
        ContributionRequestStatus.WITHDRAWN,
      ][(projectIndex + requestIndex) % 4]!;
      const applicantId = userId((projectIndex * 31 + requestIndex * 43 + 160) % USER_COUNT);
      contributionRequests.push({
        id: id(`request-${pad(projectIndex + 1, 3)}`, requestIndex + 1, 2),
        projectId: project.id!,
        userId: applicantId,
        role: COLLABORATION_ROLES[(projectIndex + requestIndex * 2) % COLLABORATION_ROLES.length],
        message: `I have been following ${title} and would love to contribute. I can help with the next milestone, document decisions clearly, and commit time each week.`,
        status,
        resolvedAt:
          status === ContributionRequestStatus.PENDING
            ? null
            : daysAgo((projectIndex + requestIndex) % 25),
        resolvedById: status === ContributionRequestStatus.PENDING ? null : project.ownerId,
        resolutionNote:
          status === ContributionRequestStatus.APPROVED
            ? 'Great fit for the current milestone. Welcome to the team!'
            : status === ContributionRequestStatus.REJECTED
              ? 'Thank you for reaching out. The current role needs a different availability window.'
              : null,
        createdAt: daysAgo(42 - ((projectIndex + requestIndex) % 36)),
        updatedAt: daysAgo((projectIndex + requestIndex) % 20),
      });
    }

    for (let inviteIndex = 0; inviteIndex < 3; inviteIndex++) {
      const status = [InviteStatus.PENDING, InviteStatus.ACCEPTED, InviteStatus.DECLINED][
        (projectIndex + inviteIndex) % 3
      ]!;
      invites.push({
        id: id(`invite-${pad(projectIndex + 1, 3)}`, inviteIndex + 1, 2),
        projectId: project.id!,
        invitedUserId: userId((projectIndex * 19 + inviteIndex * 47 + 260) % USER_COUNT),
        invitedById: project.ownerId,
        role: ProjectRole.CONTRIBUTOR,
        title: COLLABORATION_ROLES[(projectIndex + inviteIndex + 4) % COLLABORATION_ROLES.length],
        status,
        createdAt: daysAgo(24 - ((projectIndex + inviteIndex) % 20)),
        updatedAt: daysAgo((projectIndex + inviteIndex) % 12),
      });
    }
  });

  await createManyInBatches(projectMedia, (data) => prisma.projectMedia.createMany({ data }));
  await createManyInBatches(projectTags, (data) =>
    prisma.projectTag.createMany({ data, skipDuplicates: true }),
  );
  await createManyInBatches(projectMembers, (data) => prisma.projectMember.createMany({ data }));
  await createManyInBatches(contributionRequests, (data) =>
    prisma.contributionRequest.createMany({ data }),
  );
  await createManyInBatches(invites, (data) => prisma.projectInvite.createMany({ data }));

  await prisma.featuredProject.createMany({
    data: projects
      .filter((project) => !project.archivedAt)
      .slice(0, 8)
      .map((project, index) => ({
        projectId: project.id!,
        setById: userId(index % 2),
        order: index,
        setAt: daysAgo(10 - index),
      })),
  });

  const bookmarks: Prisma.BookmarkCreateManyInput[] = [];
  for (let index = 0; index < USER_COUNT; index++) {
    const bookmarked = new Set<number>();
    let cursor = 0;
    while (bookmarked.size < 6) {
      bookmarked.add((index * 13 + cursor * 17 + 3) % PROJECT_COUNT);
      cursor++;
    }
    [...bookmarked].forEach((projectIndex, bookmarkIndex) => {
      bookmarks.push({
        userId: userId(index),
        projectId: projectId(projectIndex),
        createdAt: daysAgo((index + projectIndex + bookmarkIndex) % 90),
      });
    });
  }
  await createManyInBatches(bookmarks, (data) => prisma.bookmark.createMany({ data }));
}

type SeedChannel = {
  id: string;
  projectIndex: number | null;
  projectId: string | null;
  name: string;
  slug: string;
  topic: string;
  isGeneral: boolean;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  memberIds: string[];
  messageCount: number;
};

function buildChatChannels(): SeedChannel[] {
  const globalNames = [
    ['community', 'Workspace-wide updates, introductions, and shared wins.'],
    ['showcase', 'Share prototypes, shipped work, and useful experiments.'],
    ['help-desk', 'Ask for help and leave answers that others can find later.'],
    ['watercooler', 'Informal conversation, links, music, and weekend plans.'],
  ] as const;
  const channels: SeedChannel[] = globalNames.map(([name, topic], index) => ({
    id: id('global-channel', index + 1, 2),
    projectIndex: null,
    projectId: null,
    name,
    slug: name,
    topic,
    isGeneral: index === 0,
    createdById: userId(index % 2),
    createdAt: daysAgo(330 - index * 15),
    updatedAt: daysAgo(index % 3),
    memberIds: Array.from({ length: USER_COUNT }, (_, userIndex) => userId(userIndex)),
    messageCount: GLOBAL_MESSAGE_COUNT,
  }));
  const perProject = [
    ['general', 'Daily coordination, decisions, and team updates.'],
    ['design-review', 'Research findings, prototypes, and critique.'],
    ['release-room', 'Quality checks, launch notes, and release follow-through.'],
  ] as const;
  for (let projectIndex = 0; projectIndex < PROJECT_COUNT; projectIndex++) {
    perProject.forEach(([name, topic], channelIndex) => {
      channels.push({
        id: id(`channel-${pad(projectIndex + 1, 3)}`, channelIndex + 1, 2),
        projectIndex,
        projectId: projectId(projectIndex),
        name,
        slug: name,
        topic,
        isGeneral: channelIndex === 0,
        createdById: userId(projectIndex % 60),
        createdAt: daysAgo(300 - ((projectIndex * 7 + channelIndex) % 270)),
        updatedAt: daysAgo((projectIndex + channelIndex) % 12),
        memberIds: memberIdsForProject(projectIndex),
        messageCount: PROJECT_MESSAGE_COUNT / PROJECT_CHANNEL_COUNT,
      });
    });
  }
  return channels;
}

const CHAT_TEMPLATES = [
  'Morning! I updated the brief with the decisions from yesterday. The open questions are grouped at the top.',
  'The prototype is ready for another pass. Please focus on the first-run experience and recovery states.',
  'I can take this. I will share a small implementation note before the end of the day.',
  'Great catch. That edge case also affects keyboard users, so I added it to the acceptance criteria.',
  'The latest customer session was encouraging. Three people completed the core flow without prompting.',
  'Can we keep this milestone narrow and move the optional polish into the following iteration?',
  'I posted the test plan and assigned owners. The remaining risk is the slow-network path.',
  'This is looking strong. The hierarchy reads much more clearly at a glance now.',
  'I have a small concern about the empty state. It explains the feature, but not the next useful action.',
  'Build is green again. The failure was a stale fixture, and the replacement now covers both variants.',
  'Let us document that decision so the next contributor does not have to rediscover the tradeoff.',
  'The mobile layout needs another 24 pixels of breathing room around the primary action.',
  'I reviewed the metrics. Activation improved, but the second-session return rate is still flat.',
  'Could someone pair with me on this after stand-up? I have the behavior isolated but not the root cause.',
  'Release notes are drafted. Please add anything user-visible before tomorrow morning.',
  'The research clip at 12:40 is worth watching. It shows exactly where the current wording breaks down.',
  'I pushed a smaller version of the change. It keeps the same outcome with less state to maintain.',
  'Nice work everyone. This was a complicated handoff, and the final result feels coherent.',
  'Reminder: demo review starts in thirty minutes. The agenda and links are pinned above.',
  'I checked this against the original success measure. We are solving the right problem, not just the loudest request.',
  'The API shape is stable now. I included a migration note and examples for the client team.',
  'Accessibility review is complete. Two high-priority issues remain, both already assigned.',
  'I would like one more content pass before we call this ready. The interaction is clear; the tone is not quite there.',
  'We can ship behind the existing flag and gather evidence without exposing unfinished paths broadly.',
] as const;

async function seedChat(): Promise<void> {
  const channels = buildChatChannels();
  await createManyInBatches(
    channels.map((channel) => ({
      id: channel.id,
      projectId: channel.projectId,
      name: channel.name,
      slug: channel.slug,
      topic: channel.topic,
      isGeneral: channel.isGeneral,
      isArchived: false,
      isVoiceThread: false,
      createdById: channel.createdById,
      createdAt: channel.createdAt,
      updatedAt: channel.updatedAt,
    })),
    (data) => prisma.chatChannel.createMany({ data }),
  );

  const messages: Prisma.ChatMessageCreateManyInput[] = [];
  const attachments: Prisma.ChatAttachmentCreateManyInput[] = [];
  const reactions: Prisma.ChatReactionCreateManyInput[] = [];
  const pins: Prisma.ChatPinnedCreateManyInput[] = [];
  const members: Prisma.ChatChannelMemberCreateManyInput[] = [];
  let messageSequence = 0;
  let attachmentSequence = 0;
  let reactionSequence = 0;
  let pinSequence = 0;
  let memberSequence = 0;

  channels.forEach((channel, channelIndex) => {
    const channelMessageIds: string[] = [];
    const historyDays = channel.projectId ? 150 - (channelIndex % 45) : 210 - channelIndex * 12;
    const interval = (historyDays * 86_400_000) / channel.messageCount;
    for (let messageIndex = 0; messageIndex < channel.messageCount; messageIndex++) {
      messageSequence++;
      const messageId = id('message', messageSequence, 6);
      const authorId =
        channel.memberIds[(messageIndex * 7 + channelIndex * 3) % channel.memberIds.length]!;
      const projectIndex = channel.projectIndex ?? channelIndex % PROJECT_COUNT;
      const title = channel.projectId ? projectName(projectIndex) : 'Atlas community';
      const template = CHAT_TEMPLATES[(messageIndex + channelIndex * 5) % CHAT_TEMPLATES.length]!;
      const createdAt = new Date(
        now.getTime() - historyDays * 86_400_000 + interval * messageIndex,
      );
      const isSystem = messageIndex === 0;
      const deleted = messageIndex > 0 && messageIndex % 197 === 0;
      messages.push({
        id: messageId,
        channelId: channel.id,
        authorId,
        kind: isSystem ? ChatMessageKind.SYSTEM_CHANNEL_CREATED : ChatMessageKind.TEXT,
        markdown: isSystem
          ? `#${channel.name} was created for ${title}. Introduce yourself and keep useful context here.`
          : messageIndex % 19 === 0
            ? `${template}\n\n**Context:** this came up while reviewing ${title}.`
            : template,
        replyToId:
          messageIndex > 4 && messageIndex % 11 === 0 ? channelMessageIds[messageIndex - 3] : null,
        forwardedFromId:
          messageIndex > 10 && messageIndex % 47 === 0 ? channelMessageIds[messageIndex - 9] : null,
        editedAt:
          messageIndex > 0 && messageIndex % 29 === 0
            ? new Date(createdAt.getTime() + 900_000)
            : null,
        deletedAt: deleted ? new Date(createdAt.getTime() + 3_600_000) : null,
        deletedByUserId: deleted ? authorId : null,
        deletedActor: deleted ? ChatDeleteActor.SELF : null,
        metadata:
          messageIndex > 0 && messageIndex % 53 === 0
            ? {
                linkPreviews: [
                  {
                    url: `https://creations.ren/demo/${channel.projectId ?? 'community'}/update-${messageIndex}`,
                    title: `${title} progress update`,
                    description: 'A concise review of decisions, open questions, and next actions.',
                    siteName: 'Creations',
                    kind: 'link',
                  },
                ],
              }
            : undefined,
        createdAt,
      });
      channelMessageIds.push(messageId);

      if (messageIndex > 0 && messageIndex % 60 === 0) {
        attachmentSequence++;
        attachments.push({
          id: id('chat-attachment', attachmentSequence, 6),
          messageId,
          kind: ChatAttachmentKind.IMAGE,
          url: coverDataUrl(`${title} review`, projectIndex, messageIndex % 3),
          s3Key: `demo/chat/${channel.id}/${messageId}.svg`,
          mime: 'image/svg+xml',
          bytes: 4_200 + messageIndex * 13,
          width: 1200,
          height: 675,
          createdAt,
        });
      }

      if (messageIndex > 0 && messageIndex % 2 === 0) {
        for (let reactionIndex = 0; reactionIndex < 2; reactionIndex++) {
          reactionSequence++;
          const reactor =
            channel.memberIds[
              (messageIndex + reactionIndex * 11 + channelIndex) % channel.memberIds.length
            ]!;
          reactions.push({
            id: id('reaction', reactionSequence, 6),
            messageId,
            userId: reactor,
            emoji: EMOJIS[(messageIndex + reactionIndex + channelIndex) % EMOJIS.length]!,
            createdAt: new Date(createdAt.getTime() + (reactionIndex + 1) * 1_800_000),
          });
        }
      }

      if (messageIndex > 0 && messageIndex % 28 === 0) {
        pinSequence++;
        pins.push({
          id: id('pin', pinSequence, 5),
          channelId: channel.id,
          messageId,
          pinnedById: channel.createdById,
          position: Math.floor(messageIndex / 28),
          pinnedAt: new Date(createdAt.getTime() + 7_200_000),
          note: ['Decision to preserve', 'Reference for the next review', 'Release coordination'][
            Math.floor(messageIndex / 28) % 3
          ],
        });
      }
    }

    channel.memberIds.forEach((memberId, memberIndex) => {
      memberSequence++;
      const readIndex = Math.max(
        0,
        channelMessageIds.length - 1 - ((memberIndex + channelIndex) % 18),
      );
      members.push({
        id: id('channel-member', memberSequence, 6),
        channelId: channel.id,
        userId: memberId,
        lastReadAt: daysAgo((memberIndex + channelIndex) % 5, memberIndex % 12),
        lastReadMessageId: channelMessageIds[readIndex],
        muted: (memberIndex + channelIndex) % 37 === 0,
        joinedAt: channel.createdAt,
      });
    });
  });

  await createManyInBatches(messages, (data) => prisma.chatMessage.createMany({ data }), 500);
  await createManyInBatches(attachments, (data) => prisma.chatAttachment.createMany({ data }));
  await createManyInBatches(reactions, (data) => prisma.chatReaction.createMany({ data }), 750);
  await createManyInBatches(pins, (data) => prisma.chatPinned.createMany({ data }));
  await createManyInBatches(members, (data) => prisma.chatChannelMember.createMany({ data }));

  const linkPreviews = Array.from({ length: 16 }, (_, index) => ({
    id: id('link-preview', index + 1, 3),
    urlHash: `demo${pad(index + 1, 60)}`,
    url: `https://creations.ren/demo/resources/${index + 1}`,
    title: [
      'Research synthesis',
      'Design critique checklist',
      'Release readiness guide',
      'API decision record',
    ][index % 4],
    description: 'Shared demo reference used across active project conversations.',
    imageUrl: coverDataUrl('Shared reference', index),
    siteName: 'Creations',
    kind: index % 5 === 0 ? 'video' : 'link',
    fetchedAt: daysAgo(index % 12),
    expiresAt: daysFromNow(30 + index),
  }));
  await prisma.chatLinkPreview.createMany({ data: linkPreviews });

  const stickerPacks = [
    ['Project Pulse', 'Small reactions for planning and delivery moments.'],
    ['Studio Friends', 'Friendly characters for feedback, focus, and celebration.'],
    ['Launch Crew', 'Release-day stickers for checks, countdowns, and wins.'],
  ] as const;
  await prisma.stickerPack.createMany({
    data: stickerPacks.map(([name, description], index) => ({
      id: id('sticker-pack', index + 1, 2),
      name,
      slug: `demo-${slugify(name)}`,
      description,
      createdById: userId(index),
      createdAt: daysAgo(150 - index * 20),
      updatedAt: daysAgo(index * 4),
    })),
  });
  const stickerNames = [
    'Nice',
    'Reviewing',
    'Ship It',
    'Good Catch',
    'On It',
    'Celebrate',
    'Focus',
    'Thanks',
  ];
  const stickers: Prisma.StickerCreateManyInput[] = [];
  stickerPacks.forEach((_, packIndex) => {
    stickerNames.forEach((name, stickerIndex) => {
      const stickerId = id(`sticker-${packIndex + 1}`, stickerIndex + 1, 2);
      stickers.push({
        id: stickerId,
        packId: id('sticker-pack', packIndex + 1, 2),
        name,
        keywords: [slugify(name), packIndex === 2 ? 'launch' : 'team'],
        s3Key: `demo/stickers/${stickerId}.svg`,
        url: coverDataUrl(name, packIndex * 8 + stickerIndex, 2),
        mime: 'image/svg+xml',
        width: 512,
        height: 512,
        position: stickerIndex,
        createdAt: daysAgo(120 - stickerIndex),
      });
    });
  });
  await prisma.sticker.createMany({ data: stickers });
}

const TASK_TITLES = [
  'Synthesize the latest research interviews',
  'Prototype the first-run experience',
  'Define analytics events for the core journey',
  'Audit keyboard and screen-reader behavior',
  'Implement optimistic updates and recovery',
  'Review empty, loading, and error states',
  'Prepare the moderated usability test script',
  'Document the API contract and examples',
  'Reduce the initial route bundle',
  'Create the release readiness checklist',
  'Validate behavior on slow connections',
  'Draft onboarding and in-product guidance',
  'Run a cross-functional design critique',
  'Add monitoring for the critical workflow',
  'Resolve visual regression findings',
  'Plan the staged rollout and guardrails',
  'Migrate the remaining legacy fixtures',
  'Review privacy and retention assumptions',
  'Prepare a stakeholder demo narrative',
  'Measure activation against the baseline',
  'Refine responsive layout behavior',
  'Test timezone and localization edge cases',
  'Create reusable content patterns',
  'Triage feedback from the pilot group',
  'Verify data export completeness',
  'Improve contributor setup documentation',
  'Close the release-blocking accessibility gaps',
  'Rehearse incident response for launch day',
  'Publish the milestone decision log',
  'Run post-release outcome review',
] as const;

const TASK_COMMENT_TEMPLATES = [
  'I tested the latest change and the primary path now behaves as expected.',
  'Could we add the decision and its tradeoff to the task description before closing this?',
  'I attached a reference from the research session. The pattern is consistent across three participants.',
  'The implementation looks good. I left one small suggestion about the fallback state.',
  'I can take the follow-up. It should be a separate task so this review stays focused.',
  'Verified on desktop and mobile widths. Keyboard navigation also passes the current checklist.',
  'This is ready for review once the fixture and release note are included.',
  'The metric moved in the right direction, although we should keep watching it through the rollout.',
  'I reproduced the issue with a throttled connection and added exact steps above.',
  'Thanks for tightening the scope. The smaller version is clearer and easier to validate.',
] as const;

function taskDescription(title: string, projectTitle: string): Prisma.InputJsonValue {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: `${title} for ${projectTitle}. Keep the change observable and document any decision that affects later work.`,
          },
        ],
      },
      {
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: 'Acceptance criteria' }],
      },
      {
        type: 'bulletList',
        content: [
          'The primary journey is covered by a repeatable test.',
          'Loading, empty, and recovery states have been reviewed.',
          'User-visible behavior is captured in the release notes.',
        ].map((text) => ({
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
        })),
      },
    ],
  };
}

async function seedPmo(): Promise<void> {
  const taskLists: Prisma.TaskListCreateManyInput[] = [];
  const statuses: Prisma.TaskStatusCreateManyInput[] = [];
  const tabs: Prisma.TaskListTabCreateManyInput[] = [];
  const tasks: Prisma.TaskCreateManyInput[] = [];
  const assignees: Prisma.TaskAssigneeCreateManyInput[] = [];
  const dependencies: Prisma.TaskDependencyCreateManyInput[] = [];
  const comments: Prisma.TaskCommentCreateManyInput[] = [];
  const taskAttachments: Prisma.TaskAttachmentCreateManyInput[] = [];
  const commentAttachments: Prisma.TaskCommentAttachmentCreateManyInput[] = [];
  const activities: Prisma.TaskActivityCreateManyInput[] = [];
  const listDefinitions = [
    ['Product Delivery', 'rocket', 'blue'],
    ['Research and Content', 'notebook-pen', 'yellow'],
  ] as const;
  const statusDefinitions = [
    ['Backlog', 'neutral', TaskStatusCategory.TODO, true],
    ['In Progress', 'blue', TaskStatusCategory.IN_PROGRESS, false],
    ['In Review', 'yellow', TaskStatusCategory.IN_PROGRESS, false],
    ['Done', 'green', TaskStatusCategory.DONE, false],
  ] as const;
  const tabDefinitions = [
    [TaskListTabKind.OVERVIEW, 'gauge'],
    [TaskListTabKind.LIST, 'list-todo'],
    [TaskListTabKind.KANBAN, 'kanban-square'],
    [TaskListTabKind.GANTT, 'gantt-chart'],
    [TaskListTabKind.TEAM, 'users-round'],
    [TaskListTabKind.FILES, 'folder'],
    [TaskListTabKind.NOTES, 'notebook-pen'],
    [TaskListTabKind.WHITEBOARDS, 'pencil-ruler'],
  ] as const;
  let taskSequence = 0;
  let assigneeSequence = 0;
  let dependencySequence = 0;
  let commentSequence = 0;
  let taskAttachmentSequence = 0;
  let commentAttachmentSequence = 0;
  let activitySequence = 0;

  for (let projectIndex = 0; projectIndex < PROJECT_COUNT; projectIndex++) {
    const projectTitle = projectName(projectIndex);
    const memberIds = memberIdsForProject(projectIndex);
    const projectTaskIds: string[] = [];
    listDefinitions.forEach(([name, iconName, iconColor], listIndex) => {
      const listId = id(`task-list-${pad(projectIndex + 1, 3)}`, listIndex + 1, 2);
      const projectKey = `${PROJECT_PREFIXES[projectIndex % PROJECT_PREFIXES.length]!.slice(0, 2).toUpperCase()}${(projectIndex % 90) + 10}`;
      taskLists.push({
        id: listId,
        projectId: projectId(projectIndex),
        name,
        iconName,
        iconColor,
        order: listIndex,
        contributorsCanCreateTasks: projectIndex % 7 !== 0,
        projectKey,
        taskCounter: TASKS_PER_PROJECT / 2,
        createdAt: daysAgo(220 - ((projectIndex * 5 + listIndex) % 190)),
        updatedAt: daysAgo((projectIndex + listIndex) % 18),
      });

      const statusIds: string[] = [];
      statusDefinitions.forEach(([statusName, color, category, isDefault], statusIndex) => {
        const statusId = id(
          `status-${pad(projectIndex + 1, 3)}-${listIndex + 1}`,
          statusIndex + 1,
          2,
        );
        statusIds.push(statusId);
        statuses.push({
          id: statusId,
          taskListId: listId,
          name: statusName,
          color,
          category,
          order: statusIndex,
          isDefault,
        });
      });

      tabDefinitions.forEach(([kind, tabIcon], tabIndex) => {
        tabs.push({
          id: id(`tab-${pad(projectIndex + 1, 3)}-${listIndex + 1}`, tabIndex + 1, 2),
          taskListId: listId,
          kind,
          iconName: tabIcon,
          order: tabIndex,
          hidden: kind === TaskListTabKind.GANTT && projectIndex % 8 === 0,
          createdAt: daysAgo(190 - ((projectIndex + tabIndex) % 160)),
        });
      });
      tabs.push({
        id: id(`tab-${pad(projectIndex + 1, 3)}-${listIndex + 1}`, 9, 2),
        taskListId: listId,
        kind: TaskListTabKind.EMBED,
        label: listIndex === 0 ? 'Product prototype' : 'Research repository',
        iconName: listIndex === 0 ? 'figma' : 'book-open',
        url:
          listIndex === 0
            ? `https://www.figma.com/file/demo-${projectIndex + 1}/prototype`
            : `https://creations.ren/demo/research/${projectIndex + 1}`,
        embedPreset: listIndex === 0 ? 'figma' : 'custom',
        order: 8,
        hidden: false,
        createdAt: daysAgo(120 - (projectIndex % 100)),
      });

      for (let localTaskIndex = 0; localTaskIndex < TASKS_PER_PROJECT / 2; localTaskIndex++) {
        taskSequence++;
        const taskId = id('task', taskSequence, 6);
        const taskIndex = listIndex * (TASKS_PER_PROJECT / 2) + localTaskIndex;
        const statusIndex = (taskIndex + projectIndex) % statusDefinitions.length;
        const statusCategory = statusDefinitions[statusIndex]![2];
        const createdAt = daysAgo(160 - ((projectIndex * 7 + taskIndex * 3) % 145));
        const dueDate = daysFromNow(((projectIndex * 3 + taskIndex * 5) % 75) - 28);
        const completedAt =
          statusCategory === TaskStatusCategory.DONE
            ? daysAgo((projectIndex + taskIndex) % 30)
            : null;
        const creatorId = memberIds[(taskIndex + projectIndex) % memberIds.length]!;
        projectTaskIds.push(taskId);
        tasks.push({
          id: taskId,
          taskListId: listId,
          projectId: projectId(projectIndex),
          key: `${projectKey}-${localTaskIndex + 1 + listIndex * 15}`,
          title: TASK_TITLES[taskIndex % TASK_TITLES.length]!,
          description: taskDescription(TASK_TITLES[taskIndex % TASK_TITLES.length]!, projectTitle),
          statusId: statusIds[statusIndex]!,
          priority: PRIORITIES[(taskIndex + projectIndex) % PRIORITIES.length]!,
          storyPoints: [1, 2, 3, 5, 8, null][(taskIndex + projectIndex) % 6],
          startDate: statusIndex > 0 ? new Date(createdAt.getTime() + 2 * 86_400_000) : null,
          dueDate,
          completedAt,
          positionInStatus: new Prisma.Decimal(localTaskIndex * 1_000 + projectIndex),
          createdById: creatorId,
          archivedAt: taskIndex === 29 && projectIndex % 9 === 0 ? daysAgo(5) : null,
          createdAt,
          updatedAt: completedAt ?? daysAgo((projectIndex + taskIndex) % 14),
        });

        const assigneeCount = taskIndex % 4 === 0 ? 2 : 1;
        for (let assigneeIndex = 0; assigneeIndex < assigneeCount; assigneeIndex++) {
          assigneeSequence++;
          assignees.push({
            id: id('assignee', assigneeSequence, 6),
            taskId,
            userId: memberIds[(taskIndex * 3 + assigneeIndex * 5) % memberIds.length]!,
            assignedAt: new Date(createdAt.getTime() + (assigneeIndex + 1) * 86_400_000),
          });
        }

        const taskCommentIds: string[] = [];
        for (let commentIndex = 0; commentIndex < 3; commentIndex++) {
          commentSequence++;
          const commentId = id('task-comment', commentSequence, 6);
          const commentCreatedAt = new Date(
            createdAt.getTime() + (commentIndex + 2) * 2 * 86_400_000,
          );
          taskCommentIds.push(commentId);
          comments.push({
            id: commentId,
            taskId,
            authorId: memberIds[(taskIndex + commentIndex * 3 + 2) % memberIds.length]!,
            markdown:
              TASK_COMMENT_TEMPLATES[
                (taskIndex + commentIndex + projectIndex) % TASK_COMMENT_TEMPLATES.length
              ]!,
            replyToId: commentIndex === 2 ? taskCommentIds[0] : null,
            editedAt:
              commentIndex === 1 && taskIndex % 7 === 0
                ? new Date(commentCreatedAt.getTime() + 600_000)
                : null,
            createdAt: commentCreatedAt,
          });
          if (commentIndex === 1 && taskIndex % 10 === 0) {
            commentAttachmentSequence++;
            commentAttachments.push({
              id: id('comment-attachment', commentAttachmentSequence, 5),
              commentId,
              kind: ChatAttachmentKind.IMAGE,
              url: coverDataUrl(`${projectTitle} evidence`, projectIndex, commentIndex),
              s3Key: `demo/tasks/${taskId}/comments/${commentId}.svg`,
              mime: 'image/svg+xml',
              bytes: 4_800 + taskIndex * 31,
              width: 1200,
              height: 675,
              uploadedById: memberIds[(taskIndex + commentIndex + 1) % memberIds.length]!,
              createdAt: commentCreatedAt,
            });
          }
        }

        const activityKinds = [
          TaskActivityKind.CREATED,
          TaskActivityKind.ASSIGNED,
          statusCategory === TaskStatusCategory.DONE
            ? TaskActivityKind.COMPLETED
            : TaskActivityKind.STATUS_CHANGED,
          TaskActivityKind.COMMENT_ADDED,
        ];
        activityKinds.forEach((kind, activityIndex) => {
          activitySequence++;
          activities.push({
            id: id('activity', activitySequence, 6),
            taskId,
            actorId:
              activityIndex === 2 && taskIndex % 17 === 0
                ? null
                : memberIds[(taskIndex + activityIndex) % memberIds.length]!,
            kind,
            payload:
              kind === TaskActivityKind.STATUS_CHANGED
                ? { field: 'status', before: 'Backlog', after: statusDefinitions[statusIndex]![0] }
                : kind === TaskActivityKind.ASSIGNED
                  ? { userId: memberIds[(taskIndex * 3) % memberIds.length] }
                  : { source: 'demo-seed' },
            createdAt: new Date(createdAt.getTime() + activityIndex * 2 * 86_400_000),
          });
        });

        if (taskIndex % 5 === 0) {
          taskAttachmentSequence++;
          taskAttachments.push({
            id: id('task-attachment', taskAttachmentSequence, 5),
            taskId,
            kind: ChatAttachmentKind.IMAGE,
            url: coverDataUrl(`${projectTitle} task`, projectIndex, taskIndex % 3),
            s3Key: `demo/tasks/${taskId}/reference.svg`,
            mime: 'image/svg+xml',
            bytes: 5_200 + taskIndex * 43,
            width: 1200,
            height: 675,
            uploadedById: creatorId,
            createdAt: new Date(createdAt.getTime() + 3_600_000),
          });
        }
      }
    });

    for (let taskIndex = 1; taskIndex < projectTaskIds.length; taskIndex++) {
      dependencySequence++;
      dependencies.push({
        id: id('dependency', dependencySequence, 5),
        fromTaskId: projectTaskIds[taskIndex]!,
        toTaskId: projectTaskIds[taskIndex - 1]!,
        kind:
          taskIndex % 7 === 0
            ? TaskDependencyKind.START_TO_START
            : TaskDependencyKind.FINISH_TO_START,
        createdAt: daysAgo(90 - ((projectIndex + taskIndex) % 80)),
      });
    }
  }

  await createManyInBatches(taskLists, (data) => prisma.taskList.createMany({ data }));
  await createManyInBatches(statuses, (data) => prisma.taskStatus.createMany({ data }));
  await createManyInBatches(tabs, (data) => prisma.taskListTab.createMany({ data }));
  await createManyInBatches(tasks, (data) => prisma.task.createMany({ data }), 500);
  await createManyInBatches(assignees, (data) => prisma.taskAssignee.createMany({ data }));
  await createManyInBatches(dependencies, (data) => prisma.taskDependency.createMany({ data }));
  await createManyInBatches(comments, (data) => prisma.taskComment.createMany({ data }), 600);
  await createManyInBatches(taskAttachments, (data) => prisma.taskAttachment.createMany({ data }));
  await createManyInBatches(commentAttachments, (data) =>
    prisma.taskCommentAttachment.createMany({ data }),
  );
  await createManyInBatches(activities, (data) => prisma.taskActivity.createMany({ data }), 600);

  await seedProjectKnowledge();
}

function whiteboardScene(projectIndex: number, revision = 0): Prisma.InputJsonValue {
  const projectTitle = projectName(projectIndex);
  return {
    type: 'excalidraw',
    version: 2,
    source: 'atlas-demo',
    elements: [
      {
        id: `frame-${projectIndex}-${revision}`,
        type: 'rectangle',
        x: 80,
        y: 90,
        width: 420,
        height: 240,
        angle: 0,
        strokeColor: '#2563eb',
        backgroundColor: '#dbeafe',
        fillStyle: 'solid',
        strokeWidth: 2,
        roughness: 1,
        opacity: 100,
      },
      {
        id: `title-${projectIndex}-${revision}`,
        type: 'text',
        x: 120,
        y: 140,
        width: 330,
        height: 80,
        angle: 0,
        strokeColor: '#172554',
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 1,
        roughness: 1,
        opacity: 100,
        text: `${projectTitle}\nJourney map v${revision + 1}`,
        fontSize: 28,
        fontFamily: 1,
        textAlign: 'center',
        verticalAlign: 'middle',
      },
    ],
    appState: { viewBackgroundColor: '#f8fafc', zoom: { value: 1 } },
    files: {},
  };
}

async function seedProjectKnowledge(): Promise<void> {
  const folders: Prisma.ProjectFileCreateManyInput[] = [];
  const files: Prisma.ProjectFileCreateManyInput[] = [];
  const rootNotes: Prisma.ProjectNoteCreateManyInput[] = [];
  const childNotes: Prisma.ProjectNoteCreateManyInput[] = [];
  const noteRevisions: Prisma.NoteRevisionCreateManyInput[] = [];
  const whiteboards: Prisma.WhiteboardCreateManyInput[] = [];
  const whiteboardRevisions: Prisma.WhiteboardRevisionCreateManyInput[] = [];
  const snapshots: Prisma.YDocSnapshotCreateManyInput[] = [];
  const snapshotRevisions: Prisma.YDocSnapshotRevisionCreateManyInput[] = [];
  const undoEntries: Prisma.UndoEntryCreateManyInput[] = [];
  let fileSequence = 0;
  let noteRevisionSequence = 0;
  let whiteboardRevisionSequence = 0;
  let snapshotSequence = 0;
  let snapshotRevisionSequence = 0;
  let undoSequence = 0;

  for (let projectIndex = 0; projectIndex < PROJECT_COUNT; projectIndex++) {
    const project = projectId(projectIndex);
    const projectTitle = projectName(projectIndex);
    const members = memberIdsForProject(projectIndex);
    const researchFolderId = id(`folder-${pad(projectIndex + 1, 3)}`, 1, 2);
    const deliveryFolderId = id(`folder-${pad(projectIndex + 1, 3)}`, 2, 2);
    folders.push(
      {
        id: researchFolderId,
        projectId: project,
        name: 'Research',
        isFolder: true,
        uploadedById: members[0],
        createdAt: daysAgo(180 - (projectIndex % 150)),
        updatedAt: daysAgo(projectIndex % 30),
      },
      {
        id: deliveryFolderId,
        projectId: project,
        name: 'Delivery',
        isFolder: true,
        uploadedById: members[1],
        createdAt: daysAgo(170 - (projectIndex % 145)),
        updatedAt: daysAgo(projectIndex % 25),
      },
    );
    const fileDefinitions = [
      ['interview-synthesis.pdf', 'application/pdf', researchFolderId],
      ['journey-map.png', 'image/png', researchFolderId],
      ['pilot-feedback.csv', 'text/csv', researchFolderId],
      ['accessibility-notes.md', 'text/markdown', researchFolderId],
      ['release-checklist.pdf', 'application/pdf', deliveryFolderId],
      ['demo-script.md', 'text/markdown', deliveryFolderId],
      ['metrics-baseline.csv', 'text/csv', deliveryFolderId],
      ['architecture-overview.pdf', 'application/pdf', deliveryFolderId],
    ] as const;
    fileDefinitions.forEach(([name, mime, parentFolderId], index) => {
      fileSequence++;
      files.push({
        id: id('file', fileSequence, 5),
        projectId: project,
        parentFolderId,
        name,
        isFolder: false,
        url: `https://creations.ren/demo/files/${projectIndex + 1}/${name}`,
        s3Key: `demo/projects/${project}/files/${name}`,
        mime,
        bytes: 24_000 + ((projectIndex * 8 + index) % 30) * 31_500,
        uploadedById: members[(index + 2) % members.length],
        createdAt: daysAgo(120 - ((projectIndex + index) % 105)),
        updatedAt: daysAgo((projectIndex + index) % 28),
      });
    });

    const noteIds = [0, 1, 2].map((index) => id(`note-${pad(projectIndex + 1, 3)}`, index + 1, 2));
    const noteTitles = ['Project home', 'Research synthesis', 'Weekly decision log'];
    noteIds.forEach((noteId, noteIndex) => {
      const yDocKey = `note:${noteId}`;
      const document = blockNoteDocument(
        `${projectTitle}: ${noteTitles[noteIndex]}`,
        projectIndex * 3 + noteIndex,
      );
      const row: Prisma.ProjectNoteCreateManyInput = {
        id: noteId,
        projectId: project,
        parentNoteId: noteIndex === 0 ? null : noteIds[0],
        title: noteTitles[noteIndex]!,
        iconName: ['home', 'search', 'list-checks'][noteIndex],
        contentSnapshot: document,
        yDocKey,
        createdById: members[noteIndex % members.length]!,
        order: noteIndex,
        createdAt: daysAgo(150 - ((projectIndex + noteIndex) % 130)),
        updatedAt: daysAgo((projectIndex + noteIndex) % 20),
      };
      if (noteIndex === 0) rootNotes.push(row);
      else childNotes.push(row);

      for (let revision = 0; revision < 3; revision++) {
        noteRevisionSequence++;
        const revisionDocument = blockNoteDocument(
          `${projectTitle}: ${noteTitles[noteIndex]} (revision ${revision + 1})`,
          projectIndex * 9 + noteIndex * 3 + revision,
        );
        noteRevisions.push({
          id: id('note-revision', noteRevisionSequence, 5),
          noteId,
          contentSnapshot: revisionDocument,
          size: Buffer.byteLength(JSON.stringify(revisionDocument)),
          authorId: members[(noteIndex + revision) % members.length]!,
          isCheckpoint: revision === 2,
          createdAt: daysAgo(30 - revision * 7 + (projectIndex % 5)),
        });
      }

      snapshotSequence++;
      const state = Buffer.from(JSON.stringify({ demo: true, docKey: yDocKey, version: 3 }));
      snapshots.push({
        id: id('snapshot', snapshotSequence, 5),
        docKey: yDocKey,
        state,
        size: state.byteLength,
        version: 3,
        createdAt: daysAgo(80 - (projectIndex % 60)),
        updatedAt: daysAgo((projectIndex + noteIndex) % 14),
      });
      for (let revision = 0; revision < 2; revision++) {
        snapshotRevisionSequence++;
        const revisionState = Buffer.from(
          JSON.stringify({ demo: true, docKey: yDocKey, version: revision + 1 }),
        );
        snapshotRevisions.push({
          id: id('snapshot-revision', snapshotRevisionSequence, 5),
          docKey: yDocKey,
          state: revisionState,
          size: revisionState.byteLength,
          authorId: members[(noteIndex + revision + 1) % members.length]!,
          isCheckpoint: revision === 1,
          createdAt: daysAgo(28 - revision * 12 + (projectIndex % 5)),
        });
      }
    });

    const whiteboardId = id('whiteboard', projectIndex + 1, 3);
    const whiteboardDocKey = `whiteboard:${whiteboardId}`;
    const currentScene = whiteboardScene(projectIndex, 2);
    whiteboards.push({
      id: whiteboardId,
      projectId: project,
      title: `${projectTitle} journey map`,
      description: 'Shared map of the main journey, evidence, risks, and release checkpoints.',
      yDocKey: whiteboardDocKey,
      sceneSnapshot: currentScene,
      thumbnailUrl: coverDataUrl(`${projectTitle} map`, projectIndex, 1),
      createdById: members[3]!,
      createdAt: daysAgo(110 - (projectIndex % 90)),
      updatedAt: daysAgo(projectIndex % 16),
    });
    for (let revision = 0; revision < 3; revision++) {
      whiteboardRevisionSequence++;
      const scene = whiteboardScene(projectIndex, revision);
      whiteboardRevisions.push({
        id: id('whiteboard-revision', whiteboardRevisionSequence, 5),
        whiteboardId,
        sceneSnapshot: scene,
        size: Buffer.byteLength(JSON.stringify(scene)),
        authorId: members[(revision + 3) % members.length]!,
        isCheckpoint: revision === 2,
        createdAt: daysAgo(36 - revision * 11 + (projectIndex % 6)),
      });
    }
    snapshotSequence++;
    const whiteboardState = Buffer.from(
      JSON.stringify({ demo: true, docKey: whiteboardDocKey, version: 3 }),
    );
    snapshots.push({
      id: id('snapshot', snapshotSequence, 5),
      docKey: whiteboardDocKey,
      state: whiteboardState,
      size: whiteboardState.byteLength,
      version: 3,
      createdAt: daysAgo(70 - (projectIndex % 50)),
      updatedAt: daysAgo(projectIndex % 12),
    });
    for (let revision = 0; revision < 2; revision++) {
      snapshotRevisionSequence++;
      const revisionState = Buffer.from(
        JSON.stringify({ demo: true, docKey: whiteboardDocKey, version: revision + 1 }),
      );
      snapshotRevisions.push({
        id: id('snapshot-revision', snapshotRevisionSequence, 5),
        docKey: whiteboardDocKey,
        state: revisionState,
        size: revisionState.byteLength,
        authorId: members[(revision + 5) % members.length]!,
        isCheckpoint: revision === 1,
        createdAt: daysAgo(24 - revision * 10 + (projectIndex % 5)),
      });
    }

    for (let undoIndex = 0; undoIndex < 5; undoIndex++) {
      undoSequence++;
      const taskNumber = projectIndex * TASKS_PER_PROJECT + (undoIndex * 5 + 1);
      const taskId = id('task', taskNumber, 6);
      undoEntries.push({
        id: id('undo', undoSequence, 5),
        actorId: members[undoIndex % members.length]!,
        scope: `project:${project}`,
        kind: undoIndex % 2 === 0 ? 'task.move' : 'task.priority.update',
        taskId,
        forwardOp:
          undoIndex % 2 === 0
            ? { taskId, toStatus: 'In Progress', position: undoIndex * 1000 }
            : { taskId, priority: 'HIGH' },
        inverseOp:
          undoIndex % 2 === 0
            ? { taskId, toStatus: 'Backlog', position: undoIndex * 900 }
            : { taskId, priority: 'MEDIUM' },
        appliedAt: daysAgo(undoIndex + (projectIndex % 8)),
        undoneAt: undoIndex === 3 ? daysAgo(1) : null,
        redoneAt: undoIndex === 3 && projectIndex % 2 === 0 ? daysAgo(0, 8) : null,
      });
    }
  }

  await createManyInBatches(folders, (data) => prisma.projectFile.createMany({ data }));
  await createManyInBatches(files, (data) => prisma.projectFile.createMany({ data }));
  await createManyInBatches(rootNotes, (data) => prisma.projectNote.createMany({ data }));
  await createManyInBatches(childNotes, (data) => prisma.projectNote.createMany({ data }));
  await createManyInBatches(noteRevisions, (data) => prisma.noteRevision.createMany({ data }));
  await createManyInBatches(whiteboards, (data) => prisma.whiteboard.createMany({ data }));
  await createManyInBatches(whiteboardRevisions, (data) =>
    prisma.whiteboardRevision.createMany({ data }),
  );
  await createManyInBatches(snapshots, (data) => prisma.yDocSnapshot.createMany({ data }));
  await createManyInBatches(snapshotRevisions, (data) =>
    prisma.yDocSnapshotRevision.createMany({ data }),
  );
  await createManyInBatches(undoEntries, (data) => prisma.undoEntry.createMany({ data }));
}

async function seedVoice(): Promise<void> {
  const channels: Prisma.VoiceChannelCreateManyInput[] = [];
  const threadChannels: Prisma.ChatChannelCreateManyInput[] = [];
  const threadMembers: Prisma.ChatChannelMemberCreateManyInput[] = [];
  const threadMessages: Prisma.ChatMessageCreateManyInput[] = [];
  const participants: Prisma.VoiceParticipantCreateManyInput[] = [];
  const recordings: Prisma.VoiceRecordingCreateManyInput[] = [];
  let channelSequence = 0;
  let threadMemberSequence = 0;
  let threadMessageSequence = 17_120;
  let participantSequence = 0;
  let recordingSequence = 0;

  const addVoiceChannel = (
    projectIndex: number | null,
    name: string,
    topic: string,
    kind: VoiceChannelKind,
    sortIndex: number,
    memberIds: string[],
  ) => {
    channelSequence++;
    const channelId = id('voice-channel', channelSequence, 4);
    const threadId = id('voice-thread', channelSequence, 4);
    const createdById = projectIndex === null ? userId(sortIndex % 2) : userId(projectIndex % 60);
    const project = projectIndex === null ? null : projectId(projectIndex);
    threadChannels.push({
      id: threadId,
      projectId: project,
      name: `voice-${slugify(name)}-${channelSequence}`,
      slug: `voice-${slugify(name)}-${channelSequence}`,
      topic: `Text thread for ${name}.`,
      isGeneral: false,
      isVoiceThread: true,
      createdById,
      createdAt: daysAgo(120 - (channelSequence % 100)),
      updatedAt: daysAgo(channelSequence % 10),
    });
    channels.push({
      id: channelId,
      projectId: project,
      name,
      topic,
      userLimit: kind === VoiceChannelKind.STAGE ? 250 : 16,
      audioQuality: sortIndex % 3 === 0 ? VoiceAudioQuality.HIGH : VoiceAudioQuality.STANDARD,
      kind,
      isDefault: sortIndex === 0,
      sortIndex,
      permissions: {
        PROJECT_MANAGER: {
          connect: true,
          speak: true,
          video: true,
          screen: true,
          soundboard: true,
        },
        CONTRIBUTOR: {
          connect: true,
          speak: kind === VoiceChannelKind.STANDARD,
          video: true,
          screen: true,
          soundboard: false,
        },
      },
      textThreadId: threadId,
      createdById,
      createdAt: daysAgo(120 - (channelSequence % 100)),
      updatedAt: daysAgo(channelSequence % 8),
    });

    const threadMessageIds: string[] = [];
    for (let messageIndex = 0; messageIndex < 5; messageIndex++) {
      threadMessageSequence++;
      const messageId = id('message', threadMessageSequence, 6);
      threadMessageIds.push(messageId);
      threadMessages.push({
        id: messageId,
        channelId: threadId,
        authorId: memberIds[(messageIndex + channelSequence) % memberIds.length]!,
        kind: ChatMessageKind.TEXT,
        markdown: [
          `I added the agenda for today's ${name} session.`,
          'The recording summary and decisions will be posted here after the call.',
          'I can facilitate the first half and hand over for the prototype review.',
          'Please add questions in this thread so we can keep the live discussion focused.',
          'Thanks everyone. Action items are assigned and the next checkpoint is on the calendar.',
        ][messageIndex]!,
        replyToId: messageIndex === 4 ? threadMessageIds[1] : null,
        createdAt: daysAgo(12 - messageIndex * 2 + (channelSequence % 4)),
      });
    }
    memberIds.forEach((memberId, memberIndex) => {
      threadMemberSequence++;
      threadMembers.push({
        id: id('voice-thread-member', threadMemberSequence, 6),
        channelId: threadId,
        userId: memberId,
        lastReadAt: daysAgo(memberIndex % 3),
        lastReadMessageId: threadMessageIds[Math.max(0, 4 - (memberIndex % 3))],
        muted: memberIndex % 19 === 0,
        joinedAt: daysAgo(100 - (memberIndex % 80)),
      });
    });

    const participantCount = projectIndex === null ? 20 : 8;
    for (let participantIndex = 0; participantIndex < participantCount; participantIndex++) {
      participantSequence++;
      const active = participantIndex < 2 + (channelSequence % 3);
      const joinedAt = active
        ? new Date(now.getTime() - (participantIndex + 1) * 1_200_000)
        : daysAgo((participantIndex + channelSequence) % 45, participantIndex % 12);
      const stageAudience = kind === VoiceChannelKind.STAGE && participantIndex > 1;
      participants.push({
        id: id('voice-participant', participantSequence, 6),
        channelId,
        userId: memberIds[participantIndex % memberIds.length]!,
        joinedAt,
        leftAt: active ? null : new Date(joinedAt.getTime() + (18 + participantIndex * 4) * 60_000),
        livekitSid: active ? `PA_demo_${pad(participantSequence, 6)}` : null,
        mutedByMod: active && participantIndex === 3 && channelSequence % 9 === 0,
        role: stageAudience ? VoiceParticipantRole.AUDIENCE : VoiceParticipantRole.SPEAKER,
        handRaisedAt:
          active && stageAudience && participantIndex % 3 === 0
            ? new Date(now.getTime() - participantIndex * 180_000)
            : null,
      });
    }

    recordingSequence++;
    const status = [
      VoiceRecordingStatus.COMPLETED,
      VoiceRecordingStatus.COMPLETED,
      VoiceRecordingStatus.FAILED,
      VoiceRecordingStatus.PENDING,
    ][channelSequence % 4]!;
    const startedAt = daysAgo(channelSequence % 50, channelSequence % 8);
    recordings.push({
      id: id('voice-recording', recordingSequence, 4),
      channelId,
      startedByUserId: createdById,
      egressId: `EG_demo_${pad(recordingSequence, 5)}`,
      status,
      startedAt,
      endedAt:
        status === VoiceRecordingStatus.COMPLETED || status === VoiceRecordingStatus.FAILED
          ? new Date(startedAt.getTime() + 3_600_000)
          : null,
      s3Key:
        status === VoiceRecordingStatus.COMPLETED
          ? `demo/recordings/${channelId}/${recordingSequence}.mp4`
          : null,
      durationSec:
        status === VoiceRecordingStatus.COMPLETED ? 2_100 + (channelSequence % 900) : null,
      retentionUntil: status === VoiceRecordingStatus.COMPLETED ? daysFromNow(60) : null,
      errorMessage:
        status === VoiceRecordingStatus.FAILED ? 'Demo egress worker lost connection.' : null,
    });
  };

  const globalVoice = [
    ['Community Lounge', 'Open workspace conversation and coworking.', VoiceChannelKind.STANDARD],
    ['Town Hall Stage', 'Company updates, demos, and audience questions.', VoiceChannelKind.STAGE],
    ['Focus Room', 'Quiet coworking with optional check-ins.', VoiceChannelKind.STANDARD],
  ] as const;
  globalVoice.forEach(([name, topic, kind], index) =>
    addVoiceChannel(
      null,
      name,
      topic,
      kind,
      index,
      Array.from({ length: 40 }, (_, userIndex) => userId(userIndex)),
    ),
  );
  for (let projectIndex = 0; projectIndex < PROJECT_COUNT; projectIndex++) {
    const members = memberIdsForProject(projectIndex);
    addVoiceChannel(
      projectIndex,
      'Team Room',
      `Daily collaboration for ${projectName(projectIndex)}.`,
      VoiceChannelKind.STANDARD,
      0,
      members,
    );
    addVoiceChannel(
      projectIndex,
      'Weekly Review Stage',
      'Structured demos, decisions, and contributor questions.',
      VoiceChannelKind.STAGE,
      1,
      members,
    );
  }

  await createManyInBatches(threadChannels, (data) => prisma.chatChannel.createMany({ data }));
  await createManyInBatches(channels, (data) => prisma.voiceChannel.createMany({ data }));
  await createManyInBatches(threadMessages, (data) => prisma.chatMessage.createMany({ data }));
  await createManyInBatches(threadMembers, (data) => prisma.chatChannelMember.createMany({ data }));
  await createManyInBatches(participants, (data) => prisma.voiceParticipant.createMany({ data }));
  await createManyInBatches(recordings, (data) => prisma.voiceRecording.createMany({ data }));

  const silentWav =
    'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAIA+AAABAAgAZGF0YQAAAAA=';
  const clipNames = [
    'Tiny Applause',
    'Milestone Bell',
    'Soft Success',
    'Review Ready',
    'Ship Horn',
    'Good Catch',
    'Focus Chime',
    'Countdown',
    'Welcome In',
    'Coffee Break',
    'Demo Time',
    'All Clear',
    'One Moment',
    'Idea Spark',
    'Nice Work',
    'Wrap Up',
  ];
  await prisma.voiceSoundboardClip.createMany({
    data: clipNames.map((name, index) => ({
      id: id('soundboard', index + 1, 3),
      name,
      s3Key: `demo/soundboard/${slugify(name)}.wav`,
      url: silentWav,
      durationMs: 600 + index * 75,
      uploadedById: userId(index % IMPORTANT_ACTORS.length),
      createdAt: daysAgo(90 - index * 3),
    })),
  });
}

async function seedNotificationsAndOperations(): Promise<void> {
  const notificationTypes = [
    NotificationType.CONTRIBUTION_REQUEST_SUBMITTED,
    NotificationType.CONTRIBUTION_REQUEST_APPROVED,
    NotificationType.PROJECT_INVITED,
    NotificationType.PROJECT_ROLE_CHANGED,
    NotificationType.CHAT_MENTION,
    NotificationType.TASK_ASSIGNED,
    NotificationType.TASK_MENTIONED,
    NotificationType.TASK_DUE_SOON,
    NotificationType.TASK_OVERDUE,
    NotificationType.TASK_COMMENT_REPLY,
    NotificationType.TASK_STATUS_CHANGED,
    NotificationType.NOTE_MENTIONED,
    NotificationType.WHITEBOARD_MENTIONED,
    NotificationType.VOICE_MENTIONED,
  ] as const;
  const titleByType: Record<(typeof notificationTypes)[number], string> = {
    CONTRIBUTION_REQUEST_SUBMITTED: 'New contribution request',
    CONTRIBUTION_REQUEST_APPROVED: 'Contribution request approved',
    PROJECT_INVITED: 'You were invited to a project',
    PROJECT_ROLE_CHANGED: 'Your project role changed',
    CHAT_MENTION: 'You were mentioned in chat',
    TASK_ASSIGNED: 'A task was assigned to you',
    TASK_MENTIONED: 'You were mentioned in a task',
    TASK_DUE_SOON: 'A task is due soon',
    TASK_OVERDUE: 'A task is overdue',
    TASK_COMMENT_REPLY: 'New reply on your task comment',
    TASK_STATUS_CHANGED: 'Task status changed',
    NOTE_MENTIONED: 'You were mentioned in a note',
    WHITEBOARD_MENTIONED: 'You were mentioned on a whiteboard',
    VOICE_MENTIONED: 'You were invited to a voice room',
  };
  const notifications: Prisma.NotificationCreateManyInput[] = [];
  let notificationSequence = 0;
  for (let userIndex = 0; userIndex < USER_COUNT; userIndex++) {
    for (let localIndex = 0; localIndex < 12; localIndex++) {
      notificationSequence++;
      const type = notificationTypes[(userIndex + localIndex * 3) % notificationTypes.length]!;
      const projectIndex = (userIndex * 7 + localIndex * 11) % PROJECT_COUNT;
      const projectSlug = `demo-${slugify(projectName(projectIndex))}`;
      notifications.push({
        id: id('notification', notificationSequence, 6),
        userId: userId(userIndex),
        type,
        title: titleByType[type],
        body: `${projectName(projectIndex)} has an update that may need your attention. Open it for the latest context and next action.`,
        link: `/projects/${projectSlug}`,
        metadata: {
          projectId: projectId(projectIndex),
          actorId: userId((userIndex + localIndex + 1) % USER_COUNT),
          source: 'demo-seed',
        },
        readAt: localIndex < 7 ? daysAgo(localIndex % 6, localIndex) : null,
        createdAt: daysAgo(localIndex * 2 + (userIndex % 7), localIndex % 10),
      });
    }
  }
  await createManyInBatches(notifications, (data) => prisma.notification.createMany({ data }), 750);

  const webhookEvents = [
    'project.created',
    'project.updated',
    'contribution.submitted',
    'task.completed',
    'chat.message.created',
    'voice.recording.completed',
  ];
  await prisma.webhookDelivery.createMany({
    data: Array.from({ length: 100 }, (_, index) => {
      const succeeded = index % 9 !== 0;
      const event = webhookEvents[index % webhookEvents.length]!;
      const createdAt = daysAgo(index % 60, index % 18);
      return {
        id: id('webhook', index + 1, 4),
        event,
        payload: {
          event,
          projectId: projectId(index % PROJECT_COUNT),
          actorId: userId(index % USER_COUNT),
          demo: true,
        },
        status: succeeded ? 200 : index % 2 === 0 ? 429 : 503,
        responseBody: succeeded ? '{"accepted":true}' : '{"error":"temporary demo failure"}',
        attempt: succeeded ? 1 : 1 + (index % 3),
        succeeded,
        createdAt,
        completedAt: new Date(createdAt.getTime() + 300 + index * 2),
      };
    }),
  });
}

async function demoCounts() {
  const [
    users,
    projects,
    projectMembers,
    chatChannels,
    chatMessages,
    chatReactions,
    tasks,
    taskComments,
    notifications,
    projectFiles,
    projectNotes,
    whiteboards,
    voiceChannels,
    voiceParticipants,
  ] = await Promise.all([
    prisma.user.count({
      where: { email: { startsWith: DEMO_EMAIL_PREFIX, endsWith: `@${DEMO_EMAIL_DOMAIN}` } },
    }),
    prisma.project.count({ where: { slug: { startsWith: 'demo-' } } }),
    prisma.projectMember.count({ where: { project: { slug: { startsWith: 'demo-' } } } }),
    prisma.chatChannel.count({
      where: {
        createdBy: {
          email: { startsWith: DEMO_EMAIL_PREFIX, endsWith: `@${DEMO_EMAIL_DOMAIN}` },
        },
      },
    }),
    prisma.chatMessage.count({
      where: {
        author: {
          email: { startsWith: DEMO_EMAIL_PREFIX, endsWith: `@${DEMO_EMAIL_DOMAIN}` },
        },
      },
    }),
    prisma.chatReaction.count({
      where: {
        user: {
          email: { startsWith: DEMO_EMAIL_PREFIX, endsWith: `@${DEMO_EMAIL_DOMAIN}` },
        },
      },
    }),
    prisma.task.count({ where: { project: { slug: { startsWith: 'demo-' } } } }),
    prisma.taskComment.count({
      where: { task: { project: { slug: { startsWith: 'demo-' } } } },
    }),
    prisma.notification.count({
      where: {
        user: {
          email: { startsWith: DEMO_EMAIL_PREFIX, endsWith: `@${DEMO_EMAIL_DOMAIN}` },
        },
      },
    }),
    prisma.projectFile.count({ where: { project: { slug: { startsWith: 'demo-' } } } }),
    prisma.projectNote.count({ where: { project: { slug: { startsWith: 'demo-' } } } }),
    prisma.whiteboard.count({ where: { project: { slug: { startsWith: 'demo-' } } } }),
    prisma.voiceChannel.count({
      where: {
        createdBy: {
          email: { startsWith: DEMO_EMAIL_PREFIX, endsWith: `@${DEMO_EMAIL_DOMAIN}` },
        },
      },
    }),
    prisma.voiceParticipant.count({
      where: {
        user: {
          email: { startsWith: DEMO_EMAIL_PREFIX, endsWith: `@${DEMO_EMAIL_DOMAIN}` },
        },
      },
    }),
  ]);
  return {
    users,
    projects,
    projectMembers,
    chatChannels,
    chatMessages,
    chatReactions,
    tasks,
    taskComments,
    notifications,
    projectFiles,
    projectNotes,
    whiteboards,
    voiceChannels,
    voiceParticipants,
  };
}

async function verifyDemoData(): Promise<void> {
  const counts = await demoCounts();
  const invalidEmails = await prisma.user.count({
    where: {
      email: { startsWith: DEMO_EMAIL_PREFIX },
      NOT: { email: { endsWith: `@${DEMO_EMAIL_DOMAIN}` } },
    },
  });
  const ownersWithoutMembership = await prisma.project.count({
    where: {
      slug: { startsWith: 'demo-' },
      members: { none: { role: ProjectRole.PROJECT_MANAGER } },
    },
  });
  const expectedMinimums = {
    users: USER_COUNT,
    projects: PROJECT_COUNT,
    chatMessages: 17_000,
    tasks: PROJECT_COUNT * TASKS_PER_PROJECT,
    taskComments: PROJECT_COUNT * TASKS_PER_PROJECT * 3,
    notifications: USER_COUNT * 12,
  };
  for (const [key, minimum] of Object.entries(expectedMinimums)) {
    const actual = counts[key as keyof typeof counts];
    if (actual < minimum)
      throw new Error(`Verification failed: ${key}=${actual}, expected >= ${minimum}.`);
  }
  if (invalidEmails > 0)
    throw new Error(`Verification failed: ${invalidEmails} demo emails use another domain.`);
  if (ownersWithoutMembership > 0) {
    throw new Error(
      `Verification failed: ${ownersWithoutMembership} projects have no manager membership.`,
    );
  }
  // eslint-disable-next-line no-console
  console.log(`Demo verification passed:\n${JSON.stringify(counts, null, 2)}`);
}

async function main(): Promise<void> {
  assertLocalDatabase();
  // eslint-disable-next-line no-console
  console.log('Preparing base catalogs and replacing the isolated demo namespace...');
  await seedBaseData(prisma);
  await removeExistingDemoData();

  // eslint-disable-next-line no-console
  console.log(`Creating ${USER_COUNT} users and local demo identities...`);
  await seedUsersAndIdentity();
  // eslint-disable-next-line no-console
  console.log(`Creating ${PROJECT_COUNT} projects and the collaboration graph...`);
  await seedProjectsAndSocialGraph();
  // eslint-disable-next-line no-console
  console.log('Creating channel history, messages, reactions, pins, and stickers...');
  await seedChat();
  // eslint-disable-next-line no-console
  console.log('Creating PMO tasks, comments, files, notes, whiteboards, and revision history...');
  await seedPmo();
  // eslint-disable-next-line no-console
  console.log('Creating voice rooms, participant history, recordings, and soundboard clips...');
  await seedVoice();
  // eslint-disable-next-line no-console
  console.log('Creating notifications and operational history...');
  await seedNotificationsAndOperations();
  await verifyDemoData();
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
