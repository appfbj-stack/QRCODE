export type ViewMode =
  | 'dashboard'
  | 'membros'
  | 'celulas'
  | 'congregacoes'
  | 'ministerios'
  | 'eventos'
  | 'financas'
  | 'oracao'
  | 'sermoes'
  | 'voluntarios'
  | 'mural'
  | 'chat'
  | 'usuarios'
  | 'documentos'
  | 'billing'
  | 'super-admin'
  | 'obpc';

export type DocumentType = 'BATISMO' | 'OBREIRO' | 'CRACHA' | 'EQUIPAMENTO' | 'OUTRO';

export interface KairosDocument {
  id: string;
  title: string;
  description?: string;
  type: DocumentType;
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  active: boolean;
  memberId: string | null;
  memberName: string | null;
  uploadedById: string;
  uploadedByName: string | null;
  createdAt: string;
}

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'GERENTE' | 'OPERADOR' | 'USUARIO';

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  congregationId: string | null;
  congregationName: string | null;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export type MemberStatus = 'membro' | 'visitante' | 'lider' | 'discipulado' | 'inativo';

export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: MemberStatus;
  role?: string; // Função / Cargo Eclesiástico (ex: Pastor, Diácono, Presbítero, Líder, etc.)
  celulaId?: string;
  congregationId: string;
  ministries: string[];
  baptismDate?: string;
  birthDate?: string;
  address?: string;
  filiation?: string;
  cpf?: string;
  cardValidity?: string;
  photoUrl?: string;
  joinedAt: string;
}

export interface Celula {
  id: string;
  name: string;
  leaderName: string;
  leaderPhone: string;
  hostName: string;
  address: string;
  neighborhood: string;
  dayOfWeek: string;
  time: string;
  congregationId: string;
  membersCount: number;
  category: 'Jovens' | 'Casais' | 'Mista' | 'Mulheres' | 'Homens' | 'Kids';
}

export interface Congregation {
  id: string;
  name: string;
  isHeadquarters: boolean;
  leadPastor: string;
  address: string;
  city: string;
  phone: string;
  membersCount: number;
  celulasCount: number;
  servicesSchedule: string[];
}

export interface Asset {
  id: string;
  name: string;
  category: 'Equipamento de Som' | 'Instrumento Musical' | 'Mobiliário' | 'Mídia/TI' | 'Imóvel/Estrutura' | 'Outros';
  quantity: number;
  estimatedValue?: number;
  condition: 'Excelente' | 'Bom' | 'Necessita Reparo' | 'Danificado';
  congregationId: string;
  locationDetails?: string;
  acquisitionDate?: string;
  notes?: string;
}

export interface Ministry {
  id: string;
  name: string;
  description: string;
  leaderName: string;
  membersCount: number;
  color: string;
  iconName: string;
  activeTasks: number;
}

export interface EventItem {
  id: string;
  title: string;
  type: 'Culto' | 'Conferência' | 'Batismo' | 'Retiro' | 'Treinamento' | 'Social';
  date: string;
  time: string;
  location: string;
  congregationId: string;
  description: string;
  registeredCount: number;
  capacity?: number;
  speaker?: string;
  bannerUrl?: string;
}

export interface FinancialTransaction {
  id: string;
  type: 'receita' | 'despesa';
  category: 'Dízimo' | 'Oferta' | 'Missões' | 'Evento' | 'Aluguel/Contas' | 'Manutenção' | 'Ação Social' | 'Outros';
  amount: number;
  description: string;
  date: string;
  congregationId: string;
  paymentMethod: 'Pix' | 'Cartão' | 'Dinheiro' | 'Transferência';
  donorName?: string;
}

export interface PrayerRequest {
  id: string;
  authorName: string;
  isAnonymous: boolean;
  category: 'Saúde' | 'Família' | 'Finanças' | 'Espiritual' | 'Trabalho' | 'Outro';
  title: string;
  description: string;
  date: string;
  prayedCount: number;
  status: 'pendente' | 'em_oracao' | 'atendido';
  testimony?: string;
}

export interface Sermon {
  id: string;
  title: string;
  preacher: string;
  series?: string;
  date: string;
  biblePassage: string;
  summary: string;
  videoUrl?: string;
  audioUrl?: string;
  outlinePdfUrl?: string;
  tags: string[];
  viewsCount: number;
}

export interface VolunteerRoster {
  id: string;
  date: string;
  serviceName: string;
  ministryId: string;
  ministryName: string;
  volunteerName: string;
  role: string;
  status: 'confirmado' | 'pendente' | 'recusado';
  notes?: string;
}

export interface MuralNotice {
  id: string;
  title: string;
  content: string;
  authorName: string;
  authorRole: string;
  date: string;
  isPinned: boolean;
  category: 'Pastoral' | 'Aviso Geral' | 'Jovens' | 'Urgente' | 'Eventos';
  likesCount: number;
  commentsCount: number;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  senderName: string;
  senderRole: string;
  senderAvatar?: string;
  text: string;
  timestamp: string;
  isStaff?: boolean;
}

export interface ChatChannel {
  id: string;
  name: string;
  description: string;
  category: 'Geral' | 'Ministérios' | 'Liderança';
  unreadCount?: number;
}
