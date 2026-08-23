import { prisma } from "../config/database";

export class MemberRepository {
  constructor(private tenantId: string) {}

  private baseFilter() {
    return { tenantId: this.tenantId, deletedAt: null };
  }

  async findAll(search?: string, page = 1, limit = 20) {
    const where = { ...this.baseFilter() } as any;
    if (search) where.name = { contains: search };

    const [data, total] = await Promise.all([
      prisma.member.findMany({
        where,
        include: { congregation: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: "asc" },
      }),
      prisma.member.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string) {
    return prisma.member.findFirst({
      where: { id, ...this.baseFilter() },
      include: { congregation: true },
    });
  }

  async create(data: {
    name: string;
    email?: string;
    phone?: string;
    birthDate?: Date;
    address?: string;
    congregationId?: string;
    photoUrl?: string;
    notes?: string;
  }) {
    return prisma.member.create({
      data: { ...data, tenantId: this.tenantId },
    });
  }

  async update(id: string, data: Record<string, any>) {
    return prisma.member.updateMany({
      where: { id, ...this.baseFilter() },
      data,
    });
  }

  async softDelete(id: string) {
    return prisma.member.updateMany({
      where: { id, ...this.baseFilter() },
      data: { deletedAt: new Date() },
    });
  }
}