// chatService — conversas 1:1 + SSE para tempo real.

import { api } from "./api";

export interface Conversation {
  id: string;
  otherUserId: string;
  otherUserName: string;
  otherUserRole: string;
  lastMessage: string | null;
  lastMessageAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  readByReceiver: boolean;
}

export interface ChatUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

const TOKEN_KEY = "kairos_token";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const chatService = {
  async listConversations(): Promise<Conversation[]> {
    return api<Conversation[]>("/chat/conversations");
  },

  async listUsers(): Promise<ChatUser[]> {
    return api<ChatUser[]>("/chat/users");
  },

  async openConversation(otherUserId: string): Promise<{ id: string }> {
    return api<{ id: string }>("/chat/conversations", {
      method: "POST",
      body: JSON.stringify({ otherUserId }),
    });
  },

  async listMessages(conversationId: string): Promise<ChatMessage[]> {
    return api<ChatMessage[]>(`/chat/messages/${conversationId}`);
  },

  async sendMessage(conversationId: string, content: string): Promise<ChatMessage> {
    return api<ChatMessage>("/chat/messages", {
      method: "POST",
      body: JSON.stringify({ conversationId, content }),
    });
  },

  /**
   * Abre um EventSource (SSE) para receber novas mensagens da conversa.
   * EventSource não permite Authorization header, então passamos o token via query.
   * Retorna uma função de cleanup.
   */
  subscribe(conversationId: string, onMessage: (m: ChatMessage) => void): () => void {
    const token = localStorage.getItem(TOKEN_KEY);
    const url = `/api/chat/stream?conversationId=${encodeURIComponent(conversationId)}&token=${encodeURIComponent(token || "")}`;
    const es = new EventSource(url);

    const handler = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as ChatMessage;
        onMessage(data);
      } catch {
        // ignora payloads não-JSON
      }
    };

    es.addEventListener("message", handler);

    return () => {
      es.removeEventListener("message", handler);
      es.close();
    };
  },

  // authHeaders exposto pra casos especiais
  _authHeaders: authHeaders,
};
