import { Injectable } from '@nestjs/common';
import { FormInstanceStatus, Prisma, StandardFormCode } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { TenantScopeService } from '../../common/services/tenant-scope.service';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { buildPaginatedResult } from '../../common/dto/pagination.dto';
import { SearchQueryDto } from './dto/search.dto';

interface SearchRow {
  id: string;
  project_id: string;
  reference_number: string | null;
  status: FormInstanceStatus;
  comments: string;
  template_code: StandardFormCode;
  template_name: string;
  organization_id: string;
  updated_at: Date;
  rank: number;
}

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantScope: TenantScopeService,
  ) {}

  async searchForms(user: AuthenticatedUser, query: SearchQueryDto) {
    const projectIds = await this.tenantScope.getClientOwnedProjectIds(user);

    if (projectIds.length === 0) {
      return buildPaginatedResult([], 0, query.page ?? 1, query.limit ?? 20);
    }

    const scopedProjectIds = query.projectId
      ? projectIds.filter((id) => id === query.projectId)
      : projectIds;

    if (scopedProjectIds.length === 0) {
      return buildPaginatedResult([], 0, query.page ?? 1, query.limit ?? 20);
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;
    const pattern = `%${this.escapeLike(query.q)}%`;

    const statusFilter = query.status ?? null;
    const codeFilter = query.formCode ?? null;

    const [rows, countResult] = await Promise.all([
      this.prisma.$queryRaw<SearchRow[]>`
        SELECT
          fi.id,
          fi.project_id,
          fi.reference_number,
          fi.status,
          fi.comments,
          ft.code AS template_code,
          ft.name AS template_name,
          fi.organization_id,
          fi.updated_at,
          (
            CASE WHEN fi.reference_number ILIKE ${pattern} THEN 5 ELSE 0 END +
            CASE WHEN ft.code::text ILIKE ${pattern} THEN 4 ELSE 0 END +
            CASE WHEN ft.name ILIKE ${pattern} THEN 3 ELSE 0 END +
            CASE WHEN fi.comments ILIKE ${pattern} THEN 2 ELSE 0 END +
            CASE WHEN fi.data::text ILIKE ${pattern} THEN 1 ELSE 0 END
          ) AS rank
        FROM form_instances fi
        INNER JOIN form_templates ft ON ft.id = fi.template_id
        WHERE fi.project_id = ANY(${scopedProjectIds}::uuid[])
          AND fi.deleted_at IS NULL
          AND (${statusFilter}::"FormInstanceStatus" IS NULL OR fi.status = ${statusFilter}::"FormInstanceStatus")
          AND (${codeFilter}::"StandardFormCode" IS NULL OR ft.code = ${codeFilter}::"StandardFormCode")
          AND (
            fi.reference_number ILIKE ${pattern}
            OR fi.comments ILIKE ${pattern}
            OR ft.code::text ILIKE ${pattern}
            OR ft.name ILIKE ${pattern}
            OR fi.data::text ILIKE ${pattern}
          )
        ORDER BY rank DESC, fi.updated_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `,
      this.prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint AS count
        FROM form_instances fi
        INNER JOIN form_templates ft ON ft.id = fi.template_id
        WHERE fi.project_id = ANY(${scopedProjectIds}::uuid[])
          AND fi.deleted_at IS NULL
          AND (${statusFilter}::"FormInstanceStatus" IS NULL OR fi.status = ${statusFilter}::"FormInstanceStatus")
          AND (${codeFilter}::"StandardFormCode" IS NULL OR ft.code = ${codeFilter}::"StandardFormCode")
          AND (
            fi.reference_number ILIKE ${pattern}
            OR fi.comments ILIKE ${pattern}
            OR ft.code::text ILIKE ${pattern}
            OR ft.name ILIKE ${pattern}
            OR fi.data::text ILIKE ${pattern}
          )
      `,
    ]);

    const total = Number(countResult[0]?.count ?? 0);

    const data = rows.map((row) => ({
      id: row.id,
      projectId: row.project_id,
      referenceNumber: row.reference_number,
      status: row.status,
      comments: row.comments,
      formCode: row.template_code,
      formName: row.template_name,
      organizationId: row.organization_id,
      updatedAt: row.updated_at,
      relevanceScore: row.rank,
    }));

    return buildPaginatedResult(data, total, page, limit);
  }

  private escapeLike(input: string): string {
    return input.replace(/[%_\\]/g, '\\$&');
  }
}
