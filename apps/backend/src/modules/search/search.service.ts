import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { PrismaService } from '@/prisma/prisma.service';
import { ProjectAccessService } from '@/modules/projects/project-access.service';
import { ProjectsService } from '@/modules/projects/projects.service';
import type { ListProjectsDto } from '@/modules/projects/dto/list-projects.dto';
import { ChatSearchService } from '@/modules/chat/services/chat-search.service';

const PROJECT_SELECT = { slug: true, title: true } as const;

/** First non-archived task list, used to build a "…/lists/:listId/…" href for a hit. */
const LIST_SELECT = {
  taskLists: {
    where: { deletedAt: null, archivedAt: null },
    orderBy: [{ order: 'asc' as const }, { createdAt: 'asc' as const }],
    take: 1,
    select: { id: true },
  },
};

/**
 * Fans one query out across every content type with a title/name to
 * match on. Projects and chat already have real search (visibility-aware
 * listing, Postgres full-text respectively) and are reused as-is; the
 * PMO content types get a simple case-insensitive `contains` match since
 * none of them have search today.
 */
@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly projectAccess: ProjectAccessService,
    private readonly projects: ProjectsService,
    private readonly chatSearch: ChatSearchService,
  ) {}

  async run(user: AuthenticatedUser, q: string, limit = 8) {
    const term = q.trim();
    const cappedLimit = Math.min(Math.max(limit, 1), 20);
    const empty = {
      query: term,
      projects: [],
      chat: [],
      notes: [],
      files: [],
      tasks: [],
      whiteboards: [],
    };
    if (!term) return empty;

    const accessibleProjectIds = await this.projectAccess.accessibleProjectIds(user);
    const pmoOn = this.config.get<boolean>('pmo.enabled', false);
    const pmoScoped = pmoOn && accessibleProjectIds.length > 0;

    const [projectsResult, chatResult, notes, files, tasks, whiteboards] = await Promise.all([
      this.projects.list(user, {
        q: term,
        page: 1,
        pageSize: cappedLimit,
        sort: 'recently-updated',
      } as ListProjectsDto),
      this.chatSearch.search({ user, scope: 'global', q: term, limit: 20 }),
      pmoScoped ? this.searchNotes(term, accessibleProjectIds, cappedLimit) : [],
      pmoScoped ? this.searchFiles(term, accessibleProjectIds, cappedLimit) : [],
      pmoScoped ? this.searchTasks(term, accessibleProjectIds, cappedLimit) : [],
      pmoScoped ? this.searchWhiteboards(term, accessibleProjectIds, cappedLimit) : [],
    ]);

    return {
      query: term,
      projects: projectsResult.items.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        thumbnailUrl: p.thumbnailUrl,
      })),
      chat: chatResult.hits,
      notes,
      files,
      tasks,
      whiteboards,
    };
  }

  private async searchNotes(term: string, projectIds: string[], take: number) {
    const rows = await this.prisma.projectNote.findMany({
      where: {
        projectId: { in: projectIds },
        deletedAt: null,
        archivedAt: null,
        title: { contains: term, mode: 'insensitive' },
      },
      orderBy: { updatedAt: 'desc' },
      take,
      select: {
        id: true,
        title: true,
        projectId: true,
        project: { select: { ...PROJECT_SELECT, ...LIST_SELECT } },
      },
    });
    return rows.map((n) => ({
      id: n.id,
      title: n.title,
      projectId: n.projectId,
      projectSlug: n.project.slug,
      projectTitle: n.project.title,
      listId: n.project.taskLists[0]?.id ?? null,
    }));
  }

  private async searchFiles(term: string, projectIds: string[], take: number) {
    const rows = await this.prisma.projectFile.findMany({
      where: {
        projectId: { in: projectIds },
        deletedAt: null,
        isFolder: false,
        name: { contains: term, mode: 'insensitive' },
      },
      orderBy: { updatedAt: 'desc' },
      take,
      select: {
        id: true,
        name: true,
        mime: true,
        parentFolderId: true,
        projectId: true,
        project: { select: { ...PROJECT_SELECT, ...LIST_SELECT } },
      },
    });
    return rows.map((f) => ({
      id: f.id,
      name: f.name,
      mime: f.mime,
      parentFolderId: f.parentFolderId,
      projectId: f.projectId,
      projectSlug: f.project.slug,
      projectTitle: f.project.title,
      listId: f.project.taskLists[0]?.id ?? null,
    }));
  }

  private async searchTasks(term: string, projectIds: string[], take: number) {
    const rows = await this.prisma.task.findMany({
      where: {
        projectId: { in: projectIds },
        deletedAt: null,
        archivedAt: null,
        title: { contains: term, mode: 'insensitive' },
      },
      orderBy: { updatedAt: 'desc' },
      take,
      select: {
        id: true,
        key: true,
        title: true,
        taskListId: true,
        projectId: true,
        project: { select: PROJECT_SELECT },
      },
    });
    return rows.map((t) => ({
      id: t.id,
      key: t.key,
      title: t.title,
      taskListId: t.taskListId,
      projectId: t.projectId,
      projectSlug: t.project.slug,
      projectTitle: t.project.title,
    }));
  }

  private async searchWhiteboards(term: string, projectIds: string[], take: number) {
    const rows = await this.prisma.whiteboard.findMany({
      where: {
        projectId: { in: projectIds },
        deletedAt: null,
        archivedAt: null,
        OR: [
          { title: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take,
      select: {
        id: true,
        title: true,
        projectId: true,
        project: { select: { ...PROJECT_SELECT, ...LIST_SELECT } },
      },
    });
    return rows.map((w) => ({
      id: w.id,
      title: w.title,
      projectId: w.projectId,
      projectSlug: w.project.slug,
      projectTitle: w.project.title,
      listId: w.project.taskLists[0]?.id ?? null,
    }));
  }
}
