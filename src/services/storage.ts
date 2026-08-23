import {
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
  ChatMessage,
} from '../types';

import {
  INITIAL_CONGREGATIONS,
  INITIAL_CELULAS,
  INITIAL_MEMBERS,
  INITIAL_ASSETS,
  INITIAL_MINISTRIES,
  INITIAL_EVENTS,
  INITIAL_FINANCES,
  INITIAL_PRAYERS,
  INITIAL_SERMONS,
  INITIAL_ROSTERS,
  INITIAL_MURALS,
  INITIAL_CHAT_MESSAGES,
} from '../data/mockData';

const KEYS = {
  CONGREGATIONS: 'kairos_congregations_v1',
  CELULAS: 'kairos_celulas_v1',
  MEMBERS: 'kairos_members_v1',
  ASSETS: 'kairos_assets_v1',
  MINISTRIES: 'kairos_ministries_v1',
  EVENTS: 'kairos_events_v1',
  FINANCES: 'kairos_finances_v1',
  PRAYERS: 'kairos_prayers_v1',
  SERMONS: 'kairos_sermons_v1',
  ROSTERS: 'kairos_rosters_v1',
  MURALS: 'kairos_murals_v1',
  CHAT_MESSAGES: 'kairos_chat_messages_v1',
};

function getStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.warn(`Error reading localStorage key "${key}":`, e);
    return defaultValue;
  }
}

function setStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Error setting localStorage key "${key}":`, e);
  }
}

export const StorageService = {
  getCongregations: () => getStorage<Congregation[]>(KEYS.CONGREGATIONS, INITIAL_CONGREGATIONS),
  setCongregations: (data: Congregation[]) => setStorage(KEYS.CONGREGATIONS, data),

  getCelulas: () => getStorage<Celula[]>(KEYS.CELULAS, INITIAL_CELULAS),
  setCelulas: (data: Celula[]) => setStorage(KEYS.CELULAS, data),

  getMembers: () => getStorage<Member[]>(KEYS.MEMBERS, INITIAL_MEMBERS),
  setMembers: (data: Member[]) => setStorage(KEYS.MEMBERS, data),

  getAssets: () => getStorage<Asset[]>(KEYS.ASSETS, INITIAL_ASSETS),
  setAssets: (data: Asset[]) => setStorage(KEYS.ASSETS, data),

  getMinistries: () => getStorage<Ministry[]>(KEYS.MINISTRIES, INITIAL_MINISTRIES),
  setMinistries: (data: Ministry[]) => setStorage(KEYS.MINISTRIES, data),

  getEvents: () => getStorage<EventItem[]>(KEYS.EVENTS, INITIAL_EVENTS),
  setEvents: (data: EventItem[]) => setStorage(KEYS.EVENTS, data),

  getFinances: () => getStorage<FinancialTransaction[]>(KEYS.FINANCES, INITIAL_FINANCES),
  setFinances: (data: FinancialTransaction[]) => setStorage(KEYS.FINANCES, data),

  getPrayers: () => getStorage<PrayerRequest[]>(KEYS.PRAYERS, INITIAL_PRAYERS),
  setPrayers: (data: PrayerRequest[]) => setStorage(KEYS.PRAYERS, data),

  getSermons: () => getStorage<Sermon[]>(KEYS.SERMONS, INITIAL_SERMONS),
  setSermons: (data: Sermon[]) => setStorage(KEYS.SERMONS, data),

  getRosters: () => getStorage<VolunteerRoster[]>(KEYS.ROSTERS, INITIAL_ROSTERS),
  setRosters: (data: VolunteerRoster[]) => setStorage(KEYS.ROSTERS, data),

  getMurals: () => getStorage<MuralNotice[]>(KEYS.MURALS, INITIAL_MURALS),
  setMurals: (data: MuralNotice[]) => setStorage(KEYS.MURALS, data),

  getChatMessages: () => getStorage<ChatMessage[]>(KEYS.CHAT_MESSAGES, INITIAL_CHAT_MESSAGES),
  setChatMessages: (data: ChatMessage[]) => setStorage(KEYS.CHAT_MESSAGES, data),

  resetAllData: () => {
    localStorage.clear();
    window.location.reload();
  },
};
