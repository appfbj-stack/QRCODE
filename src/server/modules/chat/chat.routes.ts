import { Router, Request, Response } from "express";
import { authMiddleware } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/asyncHandler";
import { AuthRequest } from "../../types";
import { prisma } from "../../config/database";
import type { Response as ExpressResponse } from "express";

const router = Router();

// Helpers — ordena par de IDs para garantir @@unique consistente
function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

// ============================================================
// GET /api/chat/conversations
// Lista conversas do usuário logado, com última mensagem + unread
// ============================================================
router.get(
  "/conversations",
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const meId = req.user!.userId;
    const tenantId = req.user!.tenantId;

    const convs = await prisma.chatConversation.findMany({
      where: {
        tenantId,
        OR: [{ userAId: meId }, { userBId: meId }],
      },
      include: {
        userA: { select: { id: true, name: true, email: true, role: true } },
        userB: { select: { id: true, name: true, email: true, role: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true, createdAt: true, senderId: true },
        },
      },
      orderBy: { lastMessageAt: "desc" },
    });

    const data = convs.map((c) => {
      const other = c.userAId === meId ? c.userB : c.userA;
      const last = c.messages[0];
      return {
        id: c.id,
        otherUserId: other.id,
        otherUserName: other.name,
        otherUserRole: other.role,
        lastMessage: last?.content ?? null,
        lastMessageAt: c.lastMessageAt,
      };
    });

    res.json({ success: true, data });
  })
);

// ============================================================
// GET /api/chat/users
// Lista usuários disponíveis para conversar (mesmo tenant, exceto eu).
// Filtra só liderança (GERENTE/ADMIN/SUPER_ADMIN) — "rede pastoral".
// Retorna também congregação pra UI mostrar quem é de onde.
// ============================================================
router.get(
  "/users",
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const meId = req.user!.userId;
    const tenantId = req.user!.tenantId;

    const users = await prisma.user.findMany({
      where: {
        tenantId,
        id: { not: meId },
        deletedAt: null,
        active: true,
        role: { in: ["GERENTE", "ADMIN", "SUPER_ADMIN"] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        congregationId: true,
        congregation: { select: { name: true } },
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });

    const data = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      congregationId: u.congregationId,
      congregationName: u.congregation?.name ?? null,
    }));

    res.json({ success: true, data });
  })
);

// ============================================================
// POST /api/chat/conversations
// Cria (ou retorna existente) conversa 1:1 com outro usuário
// Body: { otherUserId }
// ============================================================
router.post(
  "/conversations",
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const meId = req.user!.userId;
    const tenantId = req.user!.tenantId;
    const { otherUserId } = req.body || {};

    if (!otherUserId) {
      res.status(400).json({ success: false, error: "otherUserId obrigatório" });
      return;
    }

    if (otherUserId === meId) {
      res.status(400).json({ success: false, error: "Você não pode conversar consigo mesmo" });
      return;
    }

    // valida que o outro existe e é do mesmo tenant
    const other = await prisma.user.findFirst({
      where: { id: otherUserId, tenantId, deletedAt: null, active: true },
    });
    if (!other) {
      res.status(404).json({ success: false, error: "Usuário não encontrado" });
      return;
    }

    const [aId, bId] = orderedPair(meId, otherUserId);

    let conv = await prisma.chatConversation.findUnique({
      where: { userAId_userBId: { userAId: aId, userBId: bId } },
    });

    if (!conv) {
      conv = await prisma.chatConversation.create({
        data: { tenantId, userAId: aId, userBId: bId },
      });
    }

    res.json({ success: true, data: { id: conv.id } });
  })
);

// ============================================================
// GET /api/chat/messages/:conversationId?before=ISO
// Lista mensagens de uma conversa (50 por página, antes do cursor)
// ============================================================
router.get(
  "/messages/:conversationId",
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const meId = req.user!.userId;
    const tenantId = req.user!.tenantId;
    const { conversationId } = req.params;
    const before = req.query.before ? new Date(req.query.before as string) : new Date();

    const conv = await prisma.chatConversation.findFirst({
      where: { id: conversationId, tenantId, OR: [{ userAId: meId }, { userBId: meId }] },
    });
    if (!conv) {
      res.status(404).json({ success: false, error: "Conversa não encontrada" });
      return;
    }

    const messages = await prisma.chatMessage.findMany({
      where: { conversationId, createdAt: { lt: before } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        senderId: true,
        content: true,
        createdAt: true,
        readByReceiver: true,
      },
    });

    // marca como lidas as recebidas
    await prisma.chatMessage.updateMany({
      where: { conversationId, senderId: { not: meId }, readByReceiver: false },
      data: { readByReceiver: true },
    });

    res.json({ success: true, data: messages.reverse() });
  })
);

// ============================================================
// POST /api/chat/messages
// Envia mensagem. Body: { conversationId, content }
// ============================================================
router.post(
  "/messages",
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const meId = req.user!.userId;
    const tenantId = req.user!.tenantId;
    const { conversationId, content } = req.body || {};

    if (!conversationId || !content || !content.trim()) {
      res.status(400).json({ success: false, error: "conversationId e content obrigatórios" });
      return;
    }

    const conv = await prisma.chatConversation.findFirst({
      where: { id: conversationId, tenantId, OR: [{ userAId: meId }, { userBId: meId }] },
    });
    if (!conv) {
      res.status(404).json({ success: false, error: "Conversa não encontrada" });
      return;
    }

    const msg = await prisma.chatMessage.create({
      data: { tenantId, conversationId, senderId: meId, content: content.trim() },
    });

    await prisma.chatConversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    // notifica via SSE aos listeners ativos desta conversa
    pushSse(conversationId, {
      id: msg.id,
      conversationId,
      senderId: meId,
      content: msg.content,
      createdAt: msg.createdAt.toISOString(),
      readByReceiver: false,
    });

    res.json({ success: true, data: msg });
  })
);

// ============================================================
// GET /api/chat/stream?conversationId=...
// SSE — eventos ao vivo das mensagens da conversa
// ============================================================
type SseClient = { res: ExpressResponse; conversationId: string; userId: string };
const sseClients = new Set<SseClient>();

function pushSse(conversationId: string, payload: any) {
  for (const client of sseClients) {
    if (client.conversationId === conversationId && client.userId !== payload.senderId) {
      client.res.write(`event: message\ndata: ${JSON.stringify(payload)}\n\n`);
    }
  }
}

router.get(
  "/stream",
  authMiddleware,
  (req: AuthRequest, res: Response) => {
    const meId = req.user!.userId;
    const conversationId = req.query.conversationId as string;
    if (!conversationId) {
      res.status(400).json({ success: false, error: "conversationId obrigatório" });
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.write(": connected\n\n");

    const client: SseClient = { res, conversationId, userId: meId };
    sseClients.add(client);

    // keep-alive heartbeat
    const hb = setInterval(() => {
      try { res.write(": ping\n\n"); } catch { /* ignore */ }
    }, 25000);

    req.on("close", () => {
      clearInterval(hb);
      sseClients.delete(client);
    });
  }
);

export const chatRoutes = router;