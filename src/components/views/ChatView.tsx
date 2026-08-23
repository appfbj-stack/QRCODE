import React, { useState, useEffect, useRef, useCallback } from "react";
import { MessageSquare, Send, Search, ArrowLeft, UserCircle } from "lucide-react";
import { api, getToken } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

interface Conversation {
  id: string;
  otherUserId: string;
  otherUserName: string;
  otherUserRole: string;
  lastMessage: string | null;
  lastMessageAt: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  congregationId: string | null;
  congregationName: string | null;
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  readByReceiver: boolean;
}

function roleLabel(role: string) {
  const map: Record<string, string> = {
    SUPER_ADMIN: "Super Admin",
    ADMIN: "Admin",
    GERENTE: "Gerente",
    OPERADOR: "Operador",
    USUARIO: "Membro",
  };
  return map[role] || role;
}

export const ChatView: React.FC = () => {
  const { user } = useAuth();
  const meId = user?.id;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeConvName, setActiveConvName] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [search, setSearch] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sseRef = useRef<EventSource | null>(null);

  // Carrega conversas
  const loadConversations = useCallback(async () => {
    try {
      const data = await api<Conversation[]>("/chat/conversations");
      setConversations(data);
    } catch (e) { console.warn("Conv load:", e); }
  }, []);

  // Carrega usuários disponíveis
  const loadUsers = useCallback(async () => {
    try {
      const data = await api<User[]>("/chat/users");
      setUsers(data);
    } catch (e) { console.warn("Users load:", e); }
  }, []);

  useEffect(() => {
    loadConversations();
    loadUsers();
  }, [loadConversations, loadUsers]);

  // SSE para conversa ativa
  useEffect(() => {
    if (!activeConvId) return;
    if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }

    const token = getToken();
    const src = new EventSource(`/api/chat/stream?conversationId=${activeConvId}&token=${token}`);
    sseRef.current = src;
    src.addEventListener("message", (ev) => {
      try {
        const msg: Message = JSON.parse((ev as MessageEvent).data);
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        loadConversations();
      } catch { /* ignore */ }
    });
    src.onerror = () => { /* silent */ };
    return () => { src.close(); sseRef.current = null; };
  }, [activeConvId, loadConversations]);

  // Carrega mensagens da conversa selecionada
  const openConversation = useCallback(async (convId: string, otherName: string) => {
    setActiveConvId(convId);
    setActiveConvName(otherName);
    try {
      const data = await api<Message[]>(`/chat/messages/${convId}`);
      setMessages(data);
    } catch (e) { console.warn("Msg load:", e); }
  }, []);

  // Inicia conversa nova com usuário
  const startConversation = useCallback(async (userId: string, userName: string) => {
    try {
      const data = await api<{ id: string }>("/chat/conversations", {
        method: "POST",
        body: JSON.stringify({ otherUserId: userId }),
      });
      setSearch("");
      await openConversation(data.id, userName);
      await loadConversations();
    } catch (e: any) { alert(e.message); }
  }, [openConversation, loadConversations]);

  // Envia mensagem
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConvId) return;
    const text = inputText.trim();
    setInputText("");
    try {
      await msgApi(text);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        senderId: meId!,
        content: text,
        createdAt: new Date().toISOString(),
        readByReceiver: false,
      }]);
      loadConversations();
    } catch (e: any) {
      alert(e.message);
      setInputText(text);
    }
  };

  const msgApi = async (content: string) => {
    return api("/chat/messages", {
      method: "POST",
      body: JSON.stringify({ conversationId: activeConvId, content }),
    });
  };

  // Filtra usuários na busca de nova conversa
  const filteredUsers = search
    ? users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()))
    : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString([], { day: "2-digit", month: "2-digit" }) + " " +
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="h-[calc(100vh-120px)] flex bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden animate-in fade-in duration-200">

      {/* Coluna esquerda: lista conversas */}
      <div className={`w-full md:w-80 ${activeConvId && "hidden md:flex"} flex-col border-r border-slate-200`}>
        <div className="p-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <MessageSquare className="w-5 h-5 text-indigo-400" />
            <span className="font-bold font-serif text-base">Conversas</span>
          </div>
          <div className="relative mt-3">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar para iniciar conversa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Resultado de busca: usuários para iniciar conversa */}
          {search && (
            <div className="py-1">
              <p className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase">Usuários</p>
              {filteredUsers.length === 0 && (
                <p className="px-4 py-3 text-xs text-slate-400">Nenhum encontrado</p>
              )}
              {filteredUsers.map(u => (
                <button
                  key={u.id}
                  onClick={() => startConversation(u.id, u.name)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <UserCircle className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-slate-900 truncate">{u.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {roleLabel(u.role)}{u.congregationName ? ` • ${u.congregationName}` : ''}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!search && (
            <>
              {conversations.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-400">
                  Nenhuma conversa ainda.<br />Busque um usuário acima para iniciar.
                </div>
              )}
              {conversations.map(c => {
                const isActive = c.id === activeConvId;
                return (
                  <button
                    key={c.id}
                    onClick={() => openConversation(c.id, c.otherUserName)}
                    className={`w-full flex items-center gap-3 px-4 py-3 border-l-2 transition-colors text-left ${
                      isActive ? "bg-indigo-50 border-indigo-500" : "hover:bg-slate-50 border-transparent"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                      <UserCircle className="w-6 h-6 text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="font-bold text-xs text-slate-900 truncate">{c.otherUserName}</p>
                        <span className="text-[10px] text-slate-400 shrink-0">{formatTime(c.lastMessageAt)}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{c.lastMessage || "Iniciar conversa"}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">{roleLabel(c.otherUserRole)}</p>
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Coluna direita: conversa aberta */}
      <div className={`flex-1 flex flex-col ${!activeConvId && "hidden md:flex"} bg-slate-50`}>
        {activeConvId ? (
          <>
            <div className="p-4 bg-white border-b border-slate-200 flex items-center gap-3">
              <button
                onClick={() => setActiveConvId(null)}
                className="md:hidden p-1 rounded-lg hover:bg-slate-100"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                <UserCircle className="w-6 h-6 text-slate-600" />
              </div>
              <div>
                <h2 className="font-bold text-sm text-slate-900">{activeConvName}</h2>
                <p className="text-[10px] text-slate-500">
                  Conversa privada · estilo WhatsApp · ninguém mais vê
                </p>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-2 custom-scrollbar">
              {messages.length === 0 && (
                <div className="py-12 text-center text-xs text-slate-400">
                  Sem mensagens ainda. Envie a primeira!
                </div>
              )}
              {messages.map(m => {
                const mine = m.senderId === meId;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed ${
                      mine
                        ? "bg-indigo-600 text-white rounded-br-sm"
                        : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm"
                    }`}>
                      <p>{m.content}</p>
                      <p className={`text-[9px] mt-0.5 ${mine ? "text-indigo-200" : "text-slate-400"} text-right`}>
                        {formatTime(m.createdAt)} {mine && (m.readByReceiver ? "✓✓" : "✓")}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={send} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Mensagem..."
                className="flex-1 px-4 py-2.5 text-xs rounded-xl bg-slate-100 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white text-slate-800"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all active:scale-95 disabled:opacity-40"
                aria-label="Enviar"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div>
              <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500 font-medium">Selecione uma conversa</p>
              <p className="text-xs text-slate-400 mt-1">ou busque um usuário para iniciar conversa privada</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};