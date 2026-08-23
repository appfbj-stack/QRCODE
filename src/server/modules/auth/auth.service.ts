import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/database";
import { env } from "../../config/env";
import { AuthPayload } from "../../types";

export class AuthService {
  static async login(email: string, password: string) {
    const user = await prisma.user.findFirst({
      where: { email, deletedAt: null, active: true },
      include: { tenant: true, congregation: true },
    });

    if (!user) throw new Error("Email ou senha inválidos");

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new Error("Email ou senha inválidos");

    const payload: AuthPayload = {
      userId: user.id,
      tenantId: user.tenantId,
      congregationId: user.congregationId ?? null,
      role: user.role as AuthPayload["role"],
      email: user.email,
      name: user.name,
    };

    const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as any });

    // Salva sessão
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Atualiza último login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        congregationId: user.congregationId ?? null,
        congregationName: user.congregation?.name ?? null,
        tenant: {
          id: user.tenant.id,
          name: user.tenant.name,
          slug: user.tenant.slug,
          subscriptionStatus: user.tenant.subscriptionStatus,
          trialEndsAt: user.tenant.trialEndsAt,
          subscriptionEndsAt: user.tenant.subscriptionEndsAt,
        },
      },
    };
  }

  static async register(data: {
    tenantName: string;
    tenantSlug: string;
    name: string;
    email: string;
    password: string;
  }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new Error("Email já cadastrado");

    const hash = await bcrypt.hash(data.password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: data.tenantName,
          slug: data.tenantSlug,
          // Trial de 10 dias a partir de agora
          trialEndsAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          subscriptionStatus: "TRIAL",
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          name: data.name,
          email: data.email,
          passwordHash: hash,
          role: "ADMIN",
        },
      });

      return { tenant, user };
    });

    return { tenantId: result.tenant.id, message: "Igreja e administrador criados com sucesso" };
  }

  static async logout(userId: string, token: string) {
    await prisma.session.deleteMany({ where: { userId, token } });
  }

  static async me(userId: string) {
    return prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        tenant: { select: { id: true, name: true, slug: true, logo: true } },
      },
    });
  }
}