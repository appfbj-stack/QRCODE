import { PrismaClient } from "../../../generated/prisma/client";
import { PaginationParams, PaginatedResult } from "../types";

/**
 * Base Repository — todas as queries herdam filtro tenantId
 * e suporte a soft delete (deletedAt IS NULL)
 */
export class BaseRepository {
  protected prisma: PrismaClient;
  protected tenantId: string;

  constructor(prisma: PrismaClient, tenantId: string) {
    this.prisma = prisma;
    this.tenantId = tenantId;
  }

  /** Garante que tenantId sempre seja incluído */
  protected tenantFilter() {
    return { tenantId: this.tenantId, deletedAt: null };
  }

  /** Paginação padrão */
  protected paginate<T>(
    data: T[],
    total: number,
    params: PaginationParams = {}
  ): PaginatedResult<T> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}