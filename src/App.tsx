/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { QuickActionModal } from './components/QuickActionModal';
import { Login } from './components/Login';
import { AuthProvider, useAuth } from './context/AuthContext';

// Views
import { DashboardView } from './components/views/DashboardView';
import { MembrosView } from './components/views/MembrosView';
import { CelulasView } from './components/views/CelulasView';
import { CongregacoesView } from './components/views/CongregacoesView';
import { MinisteriosView } from './components/views/MinisteriosView';
import { EventosView } from './components/views/EventosView';
import { FinancasView } from './components/views/FinancasView';
import { OracaoView } from './components/views/OracaoView';
import { SermoesView } from './components/views/SermoesView';
import { VoluntariosView } from './components/views/VoluntariosView';
import { MuralView } from './components/views/MuralView';
import { ChatView } from './components/views/ChatView';
import { UsuariosView } from './components/views/UsuariosView';
import { DocumentosView } from './components/views/DocumentosView';
import { BillingView } from './components/views/BillingView';
import { SuperAdminView } from './components/views/SuperAdminView';
import { PrivacyView } from './components/views/PrivacyView';
import { ObpcAdminView } from './components/views/ObpcAdminView';
import { ObpcTelaoView } from './components/views/ObpcTelaoView';
import { ObpcCheckinView } from './components/views/ObpcCheckinView';

import { MemberModal } from './components/MemberModal';

// Services
import { dataService } from './services/dataService';

import {
  ViewMode,
  Member,
  Celula,
  Congregation,
  Asset,
  Ministry,
  EventItem,
  FinancialTransaction,
  PrayerRequest,
  Sermon,
  VolunteerRoster,
  MuralNotice,
  SystemUser,
  KairosDocument,
} from './types';

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

function AppInner() {
  // ==========================================
  // Rota publica /privacidade (LGPD) - nao requer login
  // ==========================================
  if (typeof window !== 'undefined') {
    const path = window.location.pathname;
    if (path === '/privacidade') return <PrivacyView />;
    // OBPC — Painel Telão (público, projetado em TV/Computador)
    if (path.startsWith('/telao/')) {
      const token = path.replace('/telao/', '').split('/')[0];
      return <ObpcTelaoView token={token} />;
    }
    // OBPC — Check-in (público, mobile)
    if (path.startsWith('/checkin/')) {
      const token = path.replace('/checkin/', '').split('/')[0];
      return <ObpcCheckinView token={token} />;
    }
  }

  const { user, logout } = useAuth();
  if (!user) return <Login />;

  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedCongregationId, setSelectedCongregationId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isQuickModalOpen, setIsQuickModalOpen] = useState(false);
  const [quickModalTab, setQuickModalTab] = useState('membro');
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  // Loading e erro
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // Estados — alimentados pela API
  const [congregations, setCongregations] = useState<Congregation[]>([]);
  const [celulas, setCelulas] = useState<Celula[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [finances, setFinances] = useState<FinancialTransaction[]>([]);
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [rosters, setRosters] = useState<VolunteerRoster[]>([]);
  const [murals, setMurals] = useState<MuralNotice[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [documents, setDocuments] = useState<KairosDocument[]>([]);

  /**
   * Carrega tudo em paralelo. Se QUALQUER falhar (ex.: token expirou), aborta.
   */
  const loadAll = useCallback(async () => {
    setLoadingData(true);
    setDataError(null);
    try {
      const [
        congregationsRes,
        celulasRes,
        membersRes,
        assetsRes,
        ministriesRes,
        eventsRes,
        financesRes,
        prayersRes,
        sermonsRes,
        rostersRes,
        muralsRes,
        usersRes,
        documentsRes,
      ] = await Promise.all([
        dataService.list<any>('congregations', { limit: 200 }),
        dataService.list<any>('celulas', { limit: 200 }),
        dataService.list<any>('members', { limit: 200 }),
        dataService.list<any>('assets', { limit: 200 }),
        dataService.list<any>('ministries', { limit: 200 }),
        dataService.list<any>('events', { limit: 200 }),
        dataService.list<any>('finances', { limit: 200 }),
        dataService.list<any>('prayers', { limit: 200 }),
        dataService.list<any>('sermons', { limit: 200 }),
        dataService.list<any>('volunteers', { limit: 200 }),
        dataService.list<any>('murals', { limit: 200 }),
        dataService.list<any>('users', { limit: 200 }).catch(() => ({ data: [] as any[] })), // silencioso: só ADMIN recebe
        dataService.list<any>('documents', { limit: 200 }).catch(() => ({ data: [] as any[] })),
      ]);

      // Hidrata campos ricos do frontend a partir do JSON
      const toMember = (m: any): Member => ({
        ...m,
        ministries: m.ministries ? safeParseArray(m.ministries) : [],
        // Defaults visuais quando o backend não tem o campo
        status: m.status ?? 'membro',
        joinedAt: m.joinedAt ? String(m.joinedAt).split('T')[0] : new Date().toISOString().split('T')[0],
        congregationId: m.congregationId ?? '',
      });

      const toCelula = (c: any): Celula => ({
        id: c.id,
        name: c.name,
        leaderName: c.leaderName ?? '',
        leaderPhone: c.leaderPhone ?? '',
        hostName: c.hostName ?? '',
        address: c.address ?? '',
        neighborhood: c.neighborhood ?? '',
        dayOfWeek: c.meetingDay ?? '',
        time: c.meetingTime ?? '',
        congregationId: c.congregationId ?? '',
        membersCount: c.membersCount ?? 0,
        category: c.category ?? 'Mista',
      });

      const toCongregation = (c: any): Congregation => ({
        id: c.id,
        name: c.name,
        isHeadquarters: c.isHeadquarters ?? false,
        leadPastor: c.pastorName ?? '',
        address: c.address ?? '',
        city: c.city ?? '',
        phone: c.phone ?? '',
        membersCount: c.membersCount ?? 0,
        celulasCount: c.celulasCount ?? 0,
        servicesSchedule: safeParseArray(c.servicesSchedule),
      });

      const toAsset = (a: any): Asset => ({
        id: a.id,
        name: a.name,
        category: a.category ?? 'Outros',
        quantity: a.quantity ?? 1,
        estimatedValue: a.estimatedValue,
        condition: a.condition ?? 'Bom',
        congregationId: a.congregationId ?? '',
        locationDetails: a.locationDetails,
        acquisitionDate: a.acquisitionDate,
        notes: a.notes,
      });

      const toMinistry = (m: any): Ministry => ({
        id: m.id,
        name: m.name,
        description: m.description ?? '',
        leaderName: m.leaderName ?? '',
        membersCount: m.membersCount ?? 0,
        color: m.color ?? '#5a5a40',
        iconName: m.iconName ?? 'users',
        activeTasks: m.activeTasks ?? 0,
      });

      const toEvent = (e: any): EventItem => ({
        id: e.id,
        title: e.title,
        type: e.type ?? 'Culto',
        date: e.date ? String(e.date).split('T')[0] : '',
        time: e.time ?? '',
        location: e.location ?? '',
        congregationId: e.congregationId ?? '',
        description: e.description ?? '',
        registeredCount: e.registeredCount ?? 0,
        capacity: e.capacity,
        speaker: e.speaker,
        bannerUrl: e.bannerUrl,
      });

      const toFinance = (f: any): FinancialTransaction => {
        // No schema: type = ENTRADA | SAIDA. No front: 'receita' | 'despesa'
        const t = String(f.type).toUpperCase() === 'ENTRADA' ? 'receita' : 'despesa';
        return {
          id: f.id,
          type: t as 'receita' | 'despesa',
          category: f.category ?? 'Outros',
          amount: Number(f.amount ?? 0),
          description: f.description ?? '',
          date: f.date ? String(f.date).split('T')[0] : '',
          congregationId: f.congregationId ?? '',
          paymentMethod: f.paymentMethod ?? 'Pix',
          donorName: f.donorName,
        };
      };

      const toPrayer = (p: any): PrayerRequest => ({
        id: p.id,
        authorName: p.name ?? p.authorName ?? 'Anônimo',
        isAnonymous: p.isAnonymous ?? false,
        category: p.category ?? 'Outro',
        title: p.title ?? 'Pedido de Oração',
        description: p.request ?? p.description ?? '',
        date: p.createdAt ? String(p.createdAt).split('T')[0] : '',
        prayedCount: p.prayedCount ?? 0,
        status: p.answered ? 'atendido' : (p.status ?? 'em_oracao'),
        testimony: p.testimony,
      });

      const toSermon = (s: any): Sermon => ({
        id: s.id,
        title: s.title,
        preacher: s.preacher ?? 'Pr. Lucas Andrade',
        series: s.series,
        date: s.createdAt ? String(s.createdAt).split('T')[0] : '',
        biblePassage: s.passage ?? '',
        summary: s.introduction ?? '',
        videoUrl: s.videoUrl,
        audioUrl: s.audioUrl,
        outlinePdfUrl: s.outlinePdfUrl,
        tags: s.tags ? safeParseArray(s.tags) : [],
        viewsCount: s.viewsCount ?? 0,
      });

      const toRoster = (r: any): VolunteerRoster => ({
        id: r.id,
        date: r.date ?? '',
        serviceName: r.serviceName ?? '',
        ministryId: r.ministryId ?? '',
        ministryName: r.ministry ?? '',
        volunteerName: r.name ?? '',
        role: r.role ?? '',
        status: r.status ?? 'pendente',
        notes: r.notes,
      });

      const toMural = (m: any): MuralNotice => ({
        id: m.id,
        title: m.title,
        content: m.content,
        authorName: m.authorName ?? 'Liderança',
        authorRole: m.authorRole ?? 'Pastor',
        date: m.createdAt ? String(m.createdAt).split('T')[0] : '',
        isPinned: m.isPinned ?? false,
        category: m.category ?? 'Aviso Geral',
        likesCount: m.likesCount ?? 0,
        commentsCount: m.commentsCount ?? 0,
      });

      setCongregations(congregationsRes.data.map(toCongregation));
      setCelulas(celulasRes.data.map(toCelula));
      setMembers(membersRes.data.map(toMember));
      setAssets(assetsRes.data.map(toAsset));
      setMinistries(ministriesRes.data.map(toMinistry));
      setEvents(eventsRes.data.map(toEvent));
      setFinances(financesRes.data.map(toFinance));
      setPrayers(prayersRes.data.map(toPrayer));
      setSermons(sermonsRes.data.map(toSermon));
      setRosters(rostersRes.data.map(toRoster));
      setMurals(muralsRes.data.map(toMural));
      setUsers((usersRes.data || []).map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        congregationId: u.congregationId ?? null,
        congregationName: u.congregationName ?? null,
        active: u.active,
        lastLoginAt: u.lastLoginAt ?? null,
        createdAt: u.createdAt,
      })));
      setDocuments((documentsRes.data || []).map((d: any) => ({
        id: d.id,
        title: d.title,
        description: d.description ?? null,
        type: d.type,
        url: d.url,
        fileName: d.fileName,
        fileSize: d.fileSize,
        mimeType: d.mimeType,
        active: d.active,
        memberId: d.memberId ?? null,
        memberName: d.memberName ?? null,
        uploadedById: d.uploadedById,
        uploadedByName: d.uploadedByName ?? null,
        createdAt: d.createdAt,
      })));
    } catch (e: any) {
      console.error('Falha ao carregar dados:', e);
      setDataError(e.message || 'Erro ao carregar dados');
      // Se 401, força logout
      if (String(e.message).toLowerCase().includes('token')) {
        logout();
      }
    } finally {
      setLoadingData(false);
    }
  }, [logout]);

  useEffect(() => {
    if (user) loadAll();
  }, [user, loadAll]);

  // Escuta bloqueio por billing expirado
  useEffect(() => {
    function onBlocked(e: Event) {
      const detail = (e as CustomEvent).detail;
      console.warn('[subscription] bloqueado:', detail);
      setCurrentView('billing');
    }
    window.addEventListener('kairos:subscription-blocked', onBlocked);
    return () => window.removeEventListener('kairos:subscription-blocked', onBlocked);
  }, []);

  // ======================================================
  // Handlers — Congregações
  // ======================================================
  const handleAddCongregation = async (newCong: Omit<Congregation, 'id'>) => {
    const created = await dataService.create<any>('congregations', {
      name: newCong.name,
      address: newCong.address,
      phone: newCong.phone,
      pastorName: newCong.leadPastor,
      isHeadquarters: newCong.isHeadquarters,
    });
    const item: Congregation = {
      ...newCong,
      id: created.id,
    };
    let updated = [...congregations];
    if (item.isHeadquarters) {
      updated = updated.map((c) => ({ ...c, isHeadquarters: false }));
      // se houver mais congregações, também desmarcá-las no backend
      for (const c of updated) {
        if (c.id !== item.id) {
          try { await dataService.update('congregations', c.id, { isHeadquarters: false }); } catch {}
        }
      }
    }
    updated.push(item);
    setCongregations(updated);
  };

  const handleUpdateCongregation = async (updatedCong: Congregation) => {
    await dataService.update('congregations', updatedCong.id, {
      name: updatedCong.name,
      address: updatedCong.address,
      phone: updatedCong.phone,
      pastorName: updatedCong.leadPastor,
      isHeadquarters: updatedCong.isHeadquarters,
    });
    let updated = congregations.map((c) => {
      if (updatedCong.isHeadquarters && c.id !== updatedCong.id) {
        return { ...c, isHeadquarters: false };
      }
      return c.id === updatedCong.id ? updatedCong : c;
    });
    // se desmarcou outra, propaga
    for (const c of updated) {
      if (c.id !== updatedCong.id && c.isHeadquarters) {
        try { await dataService.update('congregations', c.id, { isHeadquarters: false }); } catch {}
      }
    }
    setCongregations(updated);
  };

  const handleDeleteCongregation = async (id: string) => {
    if (congregations.length <= 1) {
      alert('Você precisa ter pelo menos uma congregação cadastrada no sistema.');
      return;
    }
    await dataService.remove('congregations', id);
    setCongregations(congregations.filter((c) => c.id !== id));
    if (selectedCongregationId === id) setSelectedCongregationId('all');
  };

  // ======================================================
  // Handlers — Assets
  // ======================================================
  const handleAddAsset = async (newAst: Partial<Asset>) => {
    const created = await dataService.create<any>('assets', {
      name: newAst.name || 'Novo Item de Patrimônio',
      category: newAst.category || 'Equipamento de Som',
      quantity: newAst.quantity || 1,
      estimatedValue: newAst.estimatedValue,
      condition: newAst.condition || 'Excelente',
      congregationId: newAst.congregationId || congregations[0]?.id,
      locationDetails: newAst.locationDetails,
      acquisitionDate: newAst.acquisitionDate,
      notes: newAst.notes,
      type: 'outros',
    });
    const item: Asset = {
      id: created.id,
      name: newAst.name || 'Novo Item de Patrimônio',
      category: (newAst.category as any) || 'Equipamento de Som',
      quantity: newAst.quantity || 1,
      estimatedValue: newAst.estimatedValue,
      condition: (newAst.condition as any) || 'Excelente',
      congregationId: newAst.congregationId || congregations[0]?.id || '',
      locationDetails: newAst.locationDetails,
      acquisitionDate: newAst.acquisitionDate,
      notes: newAst.notes,
    };
    setAssets([item, ...assets]);
  };

  const handleUpdateAsset = async (updatedAst: Asset) => {
    await dataService.update('assets', updatedAst.id, updatedAst);
    setAssets(assets.map((a) => (a.id === updatedAst.id ? updatedAst : a)));
  };

  const handleDeleteAsset = async (id: string) => {
    await dataService.remove('assets', id);
    setAssets(assets.filter((a) => a.id !== id));
  };

  // ======================================================
  // Handlers — Members
  // ======================================================
  const handleSaveMember = async (memberData: Omit<Member, 'id'> | Member) => {
    if ('id' in memberData && memberData.id) {
      // UPDATE
      const payload = serializeMember(memberData);
      await dataService.update('members', memberData.id, payload);
      setMembers(members.map((m) => (m.id === memberData.id ? (memberData as Member) : m)));
    } else {
      // CREATE
      const payload = serializeMember(memberData);
      const created = await dataService.create<any>('members', payload);
      const newMember: Member = {
        ...(memberData as Omit<Member, 'id'>),
        id: created.id,
        joinedAt: (memberData as any).joinedAt || new Date().toISOString().split('T')[0],
      };
      setMembers([newMember, ...members]);
    }
  };

  const handleAddMember = async (newMem: Partial<Member>) => {
    const payload = serializeMember({
      ...newMem,
      name: newMem.name || 'Novo Membro',
      email: newMem.email || '',
      phone: newMem.phone || '',
      status: newMem.status || 'membro',
      congregationId: newMem.congregationId || congregations[0]?.id || '',
      ministries: newMem.ministries || [],
      joinedAt: new Date().toISOString().split('T')[0],
    });
    const created = await dataService.create<any>('members', payload);
    const item: Member = {
      id: created.id,
      name: newMem.name || 'Novo Membro',
      email: newMem.email || '',
      phone: newMem.phone || '',
      status: (newMem.status as any) || 'membro',
      congregationId: newMem.congregationId || congregations[0]?.id || '',
      celulaId: newMem.celulaId,
      address: newMem.address,
      birthDate: newMem.birthDate,
      baptismDate: newMem.baptismDate,
      filiation: newMem.filiation,
      cpf: newMem.cpf,
      cardValidity: newMem.cardValidity,
      photoUrl: newMem.photoUrl,
      ministries: newMem.ministries || [],
      role: newMem.role,
      joinedAt: new Date().toISOString().split('T')[0],
    };
    setMembers([item, ...members]);
  };

  const handleDeleteMember = async (id: string) => {
    await dataService.remove('members', id);
    setMembers(members.filter((m) => m.id !== id));
  };

  const handleBatchAddMembers = async (newMembers: Member[]) => {
    const created: Member[] = [];
    for (const m of newMembers) {
      try {
        const payload = serializeMember(m);
        const c = await dataService.create<any>('members', payload);
        created.push({ ...m, id: c.id });
      } catch (e) {
        console.error('Falha ao criar membro do batch:', m.name, e);
      }
    }
    setMembers([...created, ...members]);
  };

  // ======================================================
  // Handlers — Células
  // ======================================================
  const handleAddCelula = async (newCel: Partial<Celula>) => {
    const payload = {
      name: newCel.name || 'Nova Célula',
      leaderName: newCel.leaderName,
      meetingDay: newCel.dayOfWeek,
      meetingTime: newCel.time,
      address: newCel.address,
      congregationId: newCel.congregationId || congregations[0]?.id,
      category: newCel.category,
    };
    const created = await dataService.create<any>('celulas', payload);
    const item: Celula = {
      id: created.id,
      name: newCel.name || 'Nova Célula',
      leaderName: newCel.leaderName || '',
      leaderPhone: (newCel as any).leaderPhone || '',
      hostName: (newCel as any).hostName || '',
      address: newCel.address || '',
      neighborhood: (newCel as any).neighborhood || '',
      dayOfWeek: newCel.dayOfWeek || 'Quinta-feira',
      time: newCel.time || '20:00h',
      congregationId: newCel.congregationId || congregations[0]?.id || '',
      membersCount: (newCel as any).membersCount ?? 1,
      category: (newCel.category as any) || 'Mista',
    };
    setCelulas([item, ...celulas]);
  };

  const handleUpdateCelula = async (updatedCel: Celula) => {
    await dataService.update('celulas', updatedCel.id, {
      name: updatedCel.name,
      leaderName: updatedCel.leaderName,
      meetingDay: updatedCel.dayOfWeek,
      meetingTime: updatedCel.time,
      address: updatedCel.address,
      congregationId: updatedCel.congregationId,
    });
    setCelulas(celulas.map((c) => (c.id === updatedCel.id ? updatedCel : c)));
  };

  const handleDeleteCelula = async (id: string) => {
    await dataService.remove('celulas', id);
    setCelulas(celulas.filter((c) => c.id !== id));
  };

  // ======================================================
  // Handlers — Finanças
  // ======================================================
  const handleAddFinance = async (newFin: Partial<FinancialTransaction>) => {
    const payload = {
      type: newFin.type === 'despesa' ? 'SAIDA' : 'ENTRADA',
      description: newFin.description || 'Lançamento',
      amount: newFin.amount || 0,
      category: newFin.category || 'Outros',
      date: newFin.date ? new Date(newFin.date) : new Date(),
      congregationId: congregations[0]?.id,
    };
    const created = await dataService.create<any>('finances', payload);
    const item: FinancialTransaction = {
      id: created.id,
      type: (newFin.type as any) || 'receita',
      category: (newFin.category as any) || 'Dízimo',
      amount: newFin.amount || 0,
      description: newFin.description || 'Lançamento',
      date: newFin.date || new Date().toISOString().split('T')[0],
      congregationId: congregations[0]?.id || '',
      paymentMethod: 'Pix',
    };
    setFinances([item, ...finances]);
  };

  // ======================================================
  // Handlers — Oração
  // ======================================================
  const handleAddPrayer = async (newPrayer: Partial<PrayerRequest>) => {
    const payload = {
      name: newPrayer.authorName || 'Anônimo',
      request: newPrayer.description || newPrayer.title || '',
      category: newPrayer.category,
      title: newPrayer.title,
    };
    const created = await dataService.create<any>('prayers', payload);
    const item: PrayerRequest = {
      id: created.id,
      authorName: newPrayer.authorName || 'Anônimo',
      isAnonymous: newPrayer.isAnonymous || false,
      category: (newPrayer.category as any) || 'Saúde',
      title: newPrayer.title || 'Pedido de Oração',
      description: newPrayer.description || '',
      date: newPrayer.date || new Date().toISOString().split('T')[0],
      prayedCount: 1,
      status: 'em_oracao',
    };
    setPrayers([item, ...prayers]);
  };

  const handlePrayForRequest = async (id: string) => {
    const current = prayers.find((p) => p.id === id);
    if (!current) return;
    const next = (current.prayedCount ?? 0) + 1;
    try {
      await dataService.update('prayers', id, { prayedCount: next });
    } catch {
      // backend não tem coluna de counter? tudo bem, atualiza local
    }
    setPrayers(prayers.map((p) => (p.id === id ? { ...p, prayedCount: next } : p)));
  };

  // ======================================================
  // Handlers — Mural
  // ======================================================
  const handleAddMural = async (newMural: Partial<MuralNotice>) => {
    const payload = {
      title: newMural.title,
      content: newMural.content,
      category: newMural.category,
      priority: newMural.priority,
      expiresAt: newMural.expiresAt,
      authorName: newMural.authorName,
      authorRole: newMural.authorRole,
      isPinned: newMural.isPinned,
    };
    const created = await dataService.create<any>('murals', payload);
    const item: MuralNotice = {
      id: created.id,
      title: newMural.title || '',
      content: newMural.content || '',
      authorName: newMural.authorName || 'Liderança',
      authorRole: newMural.authorRole || 'Pastor',
      date: new Date().toISOString().split('T')[0],
      isPinned: newMural.isPinned || false,
      category: (newMural.category as any) || 'Aviso Geral',
      likesCount: 0,
      commentsCount: 0,
    };
    setMurals([item, ...murals]);
  };

  // ======================================================
  // Handlers — Voluntários (Escala)
  // ======================================================
  const handleAddRoster = async (newRoster: Partial<VolunteerRoster>) => {
    const payload = {
      name: newRoster.volunteerName || newRoster.name,
      ministry: newRoster.ministryName || newRoster.ministry,
      role: newRoster.role,
      date: newRoster.date,
      serviceName: newRoster.serviceName,
      status: newRoster.status || 'pendente',
      notes: newRoster.notes,
      congregationId: congregations[0]?.id,
    };
    const created = await dataService.create<any>('volunteers', payload);
    const item: VolunteerRoster = {
      id: created.id,
      date: newRoster.date || new Date().toISOString().split('T')[0],
      serviceName: newRoster.serviceName || '',
      ministryId: '',
      ministryName: newRoster.ministryName || newRoster.ministry || '',
      volunteerName: newRoster.volunteerName || newRoster.name || '',
      role: newRoster.role || '',
      status: (newRoster.status as any) || 'pendente',
      notes: newRoster.notes,
    };
    setRosters([item, ...rosters]);
  };

  // ======================================================
  // Handlers — Eventos
  // ======================================================
  const handleRegisterEvent = async (eventId: string) => {
    const ev = events.find((e) => e.id === eventId);
    if (!ev) return;
    const next = (ev.registeredCount ?? 0) + 1;
    setEvents(events.map((e) => (e.id === eventId ? { ...e, registeredCount: next } : e)));
  };

  // ======================================================
  // Handlers — Voluntários
  // ======================================================
  const handleUpdateRosterStatus = async (
    id: string,
    status: 'confirmado' | 'pendente' | 'recusado'
  ) => {
    setRosters(rosters.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  // ======================================================
  // Handlers — Mural
  // ======================================================
  const handleLikeMural = async (id: string) => {
    setMurals(murals.map((m) => (m.id === id ? { ...m, likesCount: m.likesCount + 1 } : m)));
  };

  // ======================================================
  // Handlers — Sermões
  // ======================================================
  const handleAddSermon = async (newSermon: Sermon) => {
    const payload = {
      title: newSermon.title,
      preacher: newSermon.preacher,
      passage: newSermon.biblePassage,
      introduction: newSermon.summary,
    };
    try {
      const created = await dataService.create<any>('sermons', payload);
      setSermons([{ ...newSermon, id: created.id }, ...sermons]);
    } catch (e) {
      console.error('Falha ao criar sermão:', e);
    }
  };

  const handleUpdateSermon = async (updatedSermon: Sermon) => {
    await dataService.update('sermons', updatedSermon.id, {
      title: updatedSermon.title,
      preacher: updatedSermon.preacher,
      passage: updatedSermon.biblePassage,
      introduction: updatedSermon.summary,
    });
    setSermons(sermons.map((s) => (s.id === updatedSermon.id ? updatedSermon : s)));
  };

  const handleDeleteSermon = async (id: string) => {
    await dataService.remove('sermons', id);
    setSermons(sermons.filter((s) => s.id !== id));
  };

  // ======================================================
  // UI Helpers
  // ======================================================
  const openQuickAction = (tabName: string) => {
    setQuickModalTab(tabName);
    setIsQuickModalOpen(true);
  };

  if (loadingData) {
    return (
      <div className="min-h-screen bg-[#f5f5f0] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-[#5a5a40] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-sm text-[#5a5a40] font-medium">Carregando dados do servidor…</p>
        </div>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="min-h-screen bg-[#f5f5f0] flex items-center justify-center p-4">
        <div className="max-w-md bg-white rounded-2xl shadow-lg p-8 text-center">
          <h2 className="text-lg font-bold text-red-600 mb-2">Erro ao carregar dados</h2>
          <p className="text-sm text-[#2a2a20] mb-4">{dataError}</p>
          <button
            onClick={loadAll}
            className="px-4 py-2 rounded-xl bg-[#5a5a40] text-white text-sm font-bold"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f0] text-[#2a2a20] font-sans antialiased flex">
      <Sidebar
        currentView={currentView}
        onSelectView={setCurrentView}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        unreadChatCount={3}
        prayersCount={prayers.filter((p) => p.status === 'em_oracao').length}
        isAdmin={user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'}
        user={user}
      />

      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <Header
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          congregations={congregations}
          selectedCongregationId={selectedCongregationId}
          onSelectCongregation={setSelectedCongregationId}
          onOpenQuickModal={() => openQuickAction('membro')}
          onResetData={async () => {
            if (confirm('Tem certeza? Esta ação vai recarregar todos os dados do servidor.')) {
              await loadAll();
            }
          }}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          currentUser={user}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentView === 'dashboard' && (
            <DashboardView
              members={members}
              celulas={celulas}
              events={events}
              finances={finances}
              prayers={prayers}
              sermons={sermons}
              congregations={congregations}
              onNavigate={setCurrentView}
              onQuickAction={openQuickAction}
              onPrayForRequest={handlePrayForRequest}
            />
          )}

          {currentView === 'membros' && (
            <MembrosView
              members={members}
              celulas={celulas}
              congregations={congregations}
              onAddMember={() => {
                setEditingMember(null);
                setIsMemberModalOpen(true);
              }}
              onEditMember={(m) => {
                setEditingMember(m);
                setIsMemberModalOpen(true);
              }}
              onDeleteMember={handleDeleteMember}
              onBatchAddMembers={handleBatchAddMembers}
            />
          )}

          {currentView === 'celulas' && (
            <CelulasView
              celulas={celulas}
              congregations={congregations}
              onAddCelula={handleAddCelula}
              onUpdateCelula={handleUpdateCelula}
              onDeleteCelula={handleDeleteCelula}
            />
          )}

          {currentView === 'congregacoes' && (
            <CongregacoesView
              congregations={congregations}
              members={members}
              assets={assets}
              events={events}
              onAddCongregation={handleAddCongregation}
              onUpdateCongregation={handleUpdateCongregation}
              onDeleteCongregation={handleDeleteCongregation}
              onAddAsset={handleAddAsset}
              onUpdateAsset={handleUpdateAsset}
              onDeleteAsset={handleDeleteAsset}
              onAddEvent={() => openQuickAction('membro')}
            />
          )}

          {currentView === 'ministerios' && (
            <MinisteriosView
              ministries={ministries}
              onAddMinistry={() => openQuickAction('membro')}
            />
          )}

          {currentView === 'eventos' && (
            <EventosView
              events={events}
              congregations={congregations}
              onAddEvent={() => openQuickAction('membro')}
              onRegisterEvent={handleRegisterEvent}
              onReload={loadAll}
            />
          )}

          {currentView === 'financas' && (
            <FinancasView
              finances={finances}
              congregations={congregations}
              onAddTransaction={() => openQuickAction('financas')}
            />
          )}

          {currentView === 'oracao' && (
            <OracaoView
              prayers={prayers}
              onAddPrayer={() => openQuickAction('oracao')}
              onPrayForRequest={handlePrayForRequest}
            />
          )}

          {currentView === 'sermoes' && (
            <SermoesView
              sermons={sermons}
              onAddSermon={handleAddSermon}
              onUpdateSermon={handleUpdateSermon}
              onDeleteSermon={handleDeleteSermon}
            />
          )}

          {currentView === 'voluntarios' && (
            <VoluntariosView
              rosters={rosters}
              onAddRoster={() => openQuickAction('voluntario')}
              onUpdateStatus={handleUpdateRosterStatus}
            />
          )}

          {currentView === 'mural' && (
            <MuralView
              murals={murals}
              onAddMural={() => openQuickAction('mural')}
              onLikeMural={handleLikeMural}
            />
          )}

          {currentView === 'chat' && <ChatView />}

          {currentView === 'usuarios' && (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
            <UsuariosView
              users={users}
              congregations={congregations}
              currentUserId={user.id}
              onReload={loadAll}
            />
          )}

          {currentView === 'documentos' && (
            <DocumentosView
              documents={documents}
              members={members}
              onReload={loadAll}
            />
          )}

          {currentView === 'billing' && (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
            <BillingView
              onLogout={() => {
                logout();
                setCurrentView('dashboard');
              }}
            />
          )}

          {currentView === 'obpc' && (user?.role === 'ADMIN' || user?.role === 'GERENTE' || user?.role === 'SUPER_ADMIN') && (
            <ObpcAdminView />
          )}

          {currentView === 'super-admin' && user?.role === 'SUPER_ADMIN' && (
            <SuperAdminView />
          )}
        </main>
      </div>

      <QuickActionModal
        isOpen={isQuickModalOpen}
        onClose={() => setIsQuickModalOpen(false)}
        initialTab={quickModalTab}
        congregations={congregations}
        onSaveMember={handleAddMember}
        onSaveCelula={handleAddCelula}
        onSaveFinance={handleAddFinance}
        onSavePrayer={handleAddPrayer}
        onSaveMural={handleAddMural}
        onSaveVolunteer={handleAddRoster}
      />

      <MemberModal
        isOpen={isMemberModalOpen}
        onClose={() => {
          setIsMemberModalOpen(false);
          setEditingMember(null);
        }}
        onSave={handleSaveMember}
        initialData={editingMember}
        congregations={congregations}
        celulas={celulas}
        onOpenBatchImport={() => setCurrentView('membros')}
      />
    </div>
  );
}

// ======================================================
// Helpers
// ======================================================
function safeParseArray(json: any): any[] {
  if (Array.isArray(json)) return json;
  if (typeof json === 'string') {
    try {
      const parsed = JSON.parse(json);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function serializeMember(m: Partial<Member>): Record<string, any> {
  const out: Record<string, any> = {};
  if (m.name !== undefined) out.name = m.name;
  if (m.email !== undefined) out.email = m.email;
  if (m.phone !== undefined) out.phone = m.phone;
  if (m.address !== undefined) out.address = m.address;
  if (m.notes !== undefined) out.notes = m.notes;
  if (m.photoUrl !== undefined) out.photoUrl = m.photoUrl;
  if (m.cpf !== undefined) out.cpf = m.cpf;
  if (m.filiation !== undefined) out.filiation = m.filiation;
  if (m.role !== undefined) out.role = m.role;
  if (m.status !== undefined) out.status = m.status;
  if (m.congregationId !== undefined) out.congregationId = m.congregationId;
  if (m.celulaId !== undefined) out.celulaId = m.celulaId;
  if (m.maritalStatus !== undefined) out.maritalStatus = m.maritalStatus;
  if (m.ministries !== undefined) out.ministries = JSON.stringify(m.ministries ?? []);
  if (m.baptized !== undefined) out.baptized = !!m.baptized;
  if (m.birthDate) out.birthDate = new Date(m.birthDate);
  if (m.baptismDate) out.baptismDate = new Date(m.baptismDate);
  if (m.cardValidity) out.cardValidity = new Date(m.cardValidity);
  if (m.memberSince) out.memberSince = new Date(m.memberSince);
  if (m.joinedAt) out.joinedAt = new Date(m.joinedAt);
  return out;
}
