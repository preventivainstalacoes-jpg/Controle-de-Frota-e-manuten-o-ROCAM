import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  TeamNotice,
  TeamMessage,
  TeamActivityLog,
  TeamMemberPresence,
  NoticeAcknowledgement,
  TeamNoticeCategory,
  TeamNoticePriority,
  Vehicle,
  CautelaRecord
} from '../types';
import {
  INITIAL_TEAM_NOTICES,
  INITIAL_TEAM_MESSAGES,
  INITIAL_TEAM_ACTIVITIES
} from '../data/teamMockData';
import { useAuth } from './AuthContext';

interface TeamContextType {
  notices: TeamNotice[];
  messages: TeamMessage[];
  activityLogs: TeamActivityLog[];
  unreadNoticesCount: number;
  isOnlineSync: boolean;
  lastSyncTime: Date;

  // Actions - Notices
  addNotice: (data: {
    titulo: string;
    conteudo: string;
    categoria: TeamNoticeCategory;
    prioridade: TeamNoticePriority;
    fixado?: boolean;
    viaturaRelacionadaId?: string;
    viaturaRelacionadaPrefixo?: string;
  }) => TeamNotice;
  updateNotice: (id: string, updates: Partial<TeamNotice>) => void;
  deleteNotice: (id: string) => void;
  togglePinNotice: (id: string) => void;
  acknowledgeNotice: (noticeId: string) => void;

  // Actions - Messages
  sendMessage: (texto: string, viaturaId?: string, viaturaPrefixo?: string) => void;

  // Actions - Activity Logs
  logActivity: (entry: Omit<TeamActivityLog, 'id' | 'dataHora'>) => void;

  // Roster / Presence
  getTeamMembersPresence: (vehicles: Vehicle[], activeCautelas: CautelaRecord[]) => TeamMemberPresence[];

  // Sharing & Export
  generateShiftSummaryText: (vehicles: Vehicle[], activeCautelas: CautelaRecord[]) => string;
  shareWhatsApp: (type: 'PASSAGEM' | 'FROTA' | 'ALERTAS', vehicles: Vehicle[], activeCautelas: CautelaRecord[], criticalAlertsCount?: number) => void;
  forceSync: () => Promise<void>;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

const STORAGE_KEY_NOTICES = 'rocam_team_notices_v2';
const STORAGE_KEY_MESSAGES = 'rocam_team_messages_v2';
const STORAGE_KEY_ACTIVITIES = 'rocam_team_activities_v2';

export const TeamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();

  // Notices
  const [notices, setNotices] = useState<TeamNotice[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_NOTICES);
      return saved ? JSON.parse(saved) : INITIAL_TEAM_NOTICES;
    } catch {
      return INITIAL_TEAM_NOTICES;
    }
  });

  // Internal Team Messages
  const [messages, setMessages] = useState<TeamMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MESSAGES);
      return saved ? JSON.parse(saved) : INITIAL_TEAM_MESSAGES;
    } catch {
      return INITIAL_TEAM_MESSAGES;
    }
  });

  // Activity stream
  const [activityLogs, setActivityLogs] = useState<TeamActivityLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACTIVITIES);
      return saved ? JSON.parse(saved) : INITIAL_TEAM_ACTIVITIES;
    } catch {
      return INITIAL_TEAM_ACTIVITIES;
    }
  });

  const [isOnlineSync, setIsOnlineSync] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  // Broadcast channel for instantaneous cross-tab synchronization
  const broadcastChannel = useMemo(() => {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        return new BroadcastChannel('rocam_team_sync_channel');
      }
    } catch {
      // ignore
    }
    return null;
  }, []);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_NOTICES, JSON.stringify(notices));
    } catch (e) {
      console.warn('Could not save notices to localStorage', e);
    }
  }, [notices]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages));
    } catch (e) {
      console.warn('Could not save messages to localStorage', e);
    }
  }, [messages]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVITIES, JSON.stringify(activityLogs));
    } catch (e) {
      console.warn('Could not save activities to localStorage', e);
    }
  }, [activityLogs]);

  // Broadcast listeners
  useEffect(() => {
    if (!broadcastChannel) return;

    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || !data.type) return;

      if (data.type === 'SYNC_NOTICES' && Array.isArray(data.payload)) {
        setNotices(data.payload);
        setLastSyncTime(new Date());
      } else if (data.type === 'SYNC_MESSAGES' && Array.isArray(data.payload)) {
        setMessages(data.payload);
        setLastSyncTime(new Date());
      } else if (data.type === 'SYNC_ACTIVITIES' && Array.isArray(data.payload)) {
        setActivityLogs(data.payload);
        setLastSyncTime(new Date());
      }
    };

    broadcastChannel.onmessage = handleMessage;
    return () => {
      broadcastChannel.onmessage = null;
    };
  }, [broadcastChannel]);

  // Server-Sent Events listener for real-time multi-device sync
  useEffect(() => {
    if (typeof window === 'undefined' || !('EventSource' in window)) return;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/stream');

      eventSource.addEventListener('SYNC_NOTICES', (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (Array.isArray(payload) && payload.length > 0) {
            setNotices(payload);
            setLastSyncTime(new Date());
          }
        } catch {}
      });

      eventSource.addEventListener('SYNC_MESSAGES', (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (Array.isArray(payload) && payload.length > 0) {
            setMessages(payload);
            setLastSyncTime(new Date());
          }
        } catch {}
      });

      eventSource.addEventListener('SYNC_ACTIVITIES', (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (Array.isArray(payload) && payload.length > 0) {
            setActivityLogs(payload);
            setLastSyncTime(new Date());
          }
        } catch {}
      });

      eventSource.onerror = () => {
        // SSE error or endpoint not reachable in standalone Vite dev mode; local-first BroadcastChannel continues uninterrupted
      };
    } catch {
      // ignore
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  // Fallback storage event listener for cross-tab updates
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_NOTICES && e.newValue) {
        try {
          setNotices(JSON.parse(e.newValue));
          setLastSyncTime(new Date());
        } catch {}
      }
      if (e.key === STORAGE_KEY_MESSAGES && e.newValue) {
        try {
          setMessages(JSON.parse(e.newValue));
          setLastSyncTime(new Date());
        } catch {}
      }
      if (e.key === STORAGE_KEY_ACTIVITIES && e.newValue) {
        try {
          setActivityLogs(JSON.parse(e.newValue));
          setLastSyncTime(new Date());
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Broadcast helper
  const notifyBroadcast = useCallback((type: string, payload: any) => {
    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage({ type, payload });
      } catch (e) {
        console.warn('Broadcast failed', e);
      }
    }
  }, [broadcastChannel]);

  // Server sync attempt (non-blocking)
  const syncWithServer = useCallback(async () => {
    try {
      const response = await fetch('/api/team/sync', {
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.notices && Array.isArray(data.notices)) {
          setNotices(data.notices);
        }
        if (data.messages && Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
        if (data.activities && Array.isArray(data.activities)) {
          setActivityLogs(data.activities);
        }
        setIsOnlineSync(true);
        setLastSyncTime(new Date());
      }
    } catch {
      // Server routes might not be active, local-first mode remains intact
      setIsOnlineSync(true);
    }
  }, []);

  // Initial and periodic sync
  useEffect(() => {
    syncWithServer();
    const interval = setInterval(syncWithServer, 30000);
    return () => clearInterval(interval);
  }, [syncWithServer]);

  // Push update to server in background
  const pushToServer = useCallback(async (type: 'notice' | 'message' | 'activity', payload: any) => {
    try {
      await fetch(`/api/team/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      // Local-first maintains persistence
    }
  }, []);

  // Unread notices count for current user
  const unreadNoticesCount = useMemo(() => {
    if (!currentUser) return 0;
    return notices.filter(
      (n) => !n.confirmacoes.some((c) => c.userId === currentUser.id)
    ).length;
  }, [notices, currentUser]);

  // Notice Actions
  const addNotice = useCallback(
    (data: {
      titulo: string;
      conteudo: string;
      categoria: TeamNoticeCategory;
      prioridade: TeamNoticePriority;
      fixado?: boolean;
      viaturaRelacionadaId?: string;
      viaturaRelacionadaPrefixo?: string;
    }) => {
      const autor = currentUser || {
        id: 'usr-admin-01',
        name: 'Oficial de Dia',
        re: '000.001-0',
        graduacao: 'CAP PM',
        role: 'ADMIN',
      };

      const newNotice: TeamNotice = {
        id: `aviso-${Date.now()}`,
        titulo: data.titulo,
        conteudo: data.conteudo,
        categoria: data.categoria,
        prioridade: data.prioridade,
        fixado: !!data.fixado,
        viaturaRelacionadaId: data.viaturaRelacionadaId,
        viaturaRelacionadaPrefixo: data.viaturaRelacionadaPrefixo,
        autorId: autor.id,
        autorNome: autor.name,
        autorRE: autor.re,
        autorGraduacao: autor.graduacao || 'POLICIAL MILITAR',
        criadoEm: new Date().toISOString(),
        confirmacoes: [
          {
            userId: autor.id,
            userName: autor.name,
            userRE: autor.re,
            userGraduacao: autor.graduacao || 'PM',
            acknowledgedAt: new Date().toISOString(),
          },
        ],
      };

      setNotices((prev) => {
        const next = [newNotice, ...prev];
        notifyBroadcast('SYNC_NOTICES', next);
        return next;
      });

      // Log activity
      const logEntry: TeamActivityLog = {
        id: `act-${Date.now()}`,
        tipo: 'COMUNICADO',
        titulo: `Novo Comunicado: ${data.titulo}`,
        descricao: `${autor.graduacao || ''} ${autor.name} publicou na categoria ${data.categoria.replace('_', ' ')}.`,
        usuarioNome: autor.name,
        usuarioRE: autor.re,
        usuarioRole: (autor.role as any) || 'ADMIN',
        dataHora: new Date().toISOString(),
        badge: data.prioridade,
        linkTab: 'equipe',
      };

      setActivityLogs((prev) => {
        const next = [logEntry, ...prev.slice(0, 99)];
        notifyBroadcast('SYNC_ACTIVITIES', next);
        return next;
      });

      pushToServer('notice', newNotice);
      return newNotice;
    },
    [currentUser, notifyBroadcast, pushToServer]
  );

  const updateNotice = useCallback(
    (id: string, updates: Partial<TeamNotice>) => {
      setNotices((prev) => {
        const next = prev.map((n) =>
          n.id === id ? { ...n, ...updates, atualizadoEm: new Date().toISOString() } : n
        );
        notifyBroadcast('SYNC_NOTICES', next);
        return next;
      });
    },
    [notifyBroadcast]
  );

  const deleteNotice = useCallback(
    (id: string) => {
      setNotices((prev) => {
        const next = prev.filter((n) => n.id !== id);
        notifyBroadcast('SYNC_NOTICES', next);
        return next;
      });
    },
    [notifyBroadcast]
  );

  const togglePinNotice = useCallback(
    (id: string) => {
      setNotices((prev) => {
        const next = prev.map((n) => (n.id === id ? { ...n, fixado: !n.fixado } : n));
        notifyBroadcast('SYNC_NOTICES', next);
        return next;
      });
    },
    [notifyBroadcast]
  );

  const acknowledgeNotice = useCallback(
    (noticeId: string) => {
      if (!currentUser) return;

      setNotices((prev) => {
        const next = prev.map((n) => {
          if (n.id !== noticeId) return n;
          const alreadyAck = n.confirmacoes.some((c) => c.userId === currentUser.id);
          if (alreadyAck) return n;

          const ack: NoticeAcknowledgement = {
            userId: currentUser.id,
            userName: currentUser.name,
            userRE: currentUser.re,
            userGraduacao: currentUser.graduacao || 'PM',
            acknowledgedAt: new Date().toISOString(),
          };

          return {
            ...n,
            confirmacoes: [...n.confirmacoes, ack],
          };
        });

        notifyBroadcast('SYNC_NOTICES', next);
        return next;
      });

      // Quick dispatch in messages indicating QSL
      const notice = notices.find((n) => n.id === noticeId);
      if (notice) {
        const ackMsg: TeamMessage = {
          id: `msg-${Date.now()}`,
          remetenteId: currentUser.id,
          remetenteNome: currentUser.name,
          remetenteRE: currentUser.re,
          remetenteGraduacao: currentUser.graduacao || 'PM',
          remetenteRole: currentUser.role,
          texto: `QSL confirmado para o comunicado: "${notice.titulo}"`,
          criadoEm: new Date().toISOString(),
          tipo: 'TEXTO',
        };

        setMessages((prev) => {
          const next = [...prev, ackMsg];
          notifyBroadcast('SYNC_MESSAGES', next);
          return next;
        });
      }
    },
    [currentUser, notices, notifyBroadcast]
  );

  // Message Actions
  const sendMessage = useCallback(
    (texto: string, viaturaId?: string, viaturaPrefixo?: string) => {
      if (!currentUser || !texto.trim()) return;

      const newMsg: TeamMessage = {
        id: `msg-${Date.now()}`,
        remetenteId: currentUser.id,
        remetenteNome: currentUser.name,
        remetenteRE: currentUser.re,
        remetenteGraduacao: currentUser.graduacao || 'PM',
        remetenteRole: currentUser.role,
        texto: texto.trim(),
        viaturaId,
        viaturaPrefixo,
        criadoEm: new Date().toISOString(),
        tipo: 'TEXTO',
      };

      setMessages((prev) => {
        const next = [...prev, newMsg];
        notifyBroadcast('SYNC_MESSAGES', next);
        return next;
      });

      pushToServer('message', newMsg);
    },
    [currentUser, notifyBroadcast, pushToServer]
  );

  // Activity Log
  const logActivity = useCallback(
    (entry: Omit<TeamActivityLog, 'id' | 'dataHora'>) => {
      const newEntry: TeamActivityLog = {
        ...entry,
        id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        dataHora: new Date().toISOString(),
      };

      setActivityLogs((prev) => {
        const next = [newEntry, ...prev.slice(0, 99)];
        notifyBroadcast('SYNC_ACTIVITIES', next);
        return next;
      });

      pushToServer('activity', newEntry);
    },
    [notifyBroadcast, pushToServer]
  );

  // Computed Team Presence from Registered Users & Active Cautelas
  const getTeamMembersPresence = useCallback(
    (vehicles: Vehicle[], activeCautelas: CautelaRecord[]): TeamMemberPresence[] => {
      // 04 Admins and active operators
      const baseRoster: {
        id: string;
        name: string;
        re: string;
        graduacao: string;
        role: 'ADMIN' | 'OPERADOR';
        pelotao: string;
      }[] = [
        {
          id: 'usr-admin-01',
          name: 'Cap PM Souza',
          re: '000.001-0',
          graduacao: 'CAP PM',
          role: 'ADMIN',
          pelotao: 'Comando & Logística ROCAM',
        },
        {
          id: 'usr-admin-02',
          name: 'Maj PM Costa',
          re: '000.002-1',
          graduacao: 'MAJ PM',
          role: 'ADMIN',
          pelotao: 'Subcomando & Gestão Operacional',
        },
        {
          id: 'usr-admin-03',
          name: 'Cap PM Almeida',
          re: '000.003-2',
          graduacao: 'CAP PM',
          role: 'ADMIN',
          pelotao: '1ª Cia ROCAM - Coordenação',
        },
        {
          id: 'usr-admin-04',
          name: '1º Ten PM Ribeiro',
          re: '000.004-3',
          graduacao: '1º TEN PM',
          role: 'ADMIN',
          pelotao: 'Seção de Motomecanização & Frota',
        },
        {
          id: 'usr-operador-01',
          name: 'Cb PM Oliveira',
          re: '145.892-0',
          graduacao: 'CB PM',
          role: 'OPERADOR',
          pelotao: '1º Pelotão ROCAM',
        },
        {
          id: 'usr-operador-02',
          name: 'Sd PM Silva',
          re: '158.421-3',
          graduacao: 'SD PM',
          role: 'OPERADOR',
          pelotao: '2º Pelotão ROCAM',
        },
      ];

      return baseRoster.map((member) => {
        // Check if member has an active cautela
        const cautela = activeCautelas.find(
          (c) =>
            c.status === 'EM_PATRULHAMENTO' &&
            (c.condutorRE === member.re ||
              c.condutorNome.toLowerCase().includes(member.name.toLowerCase()) ||
              member.name.toLowerCase().includes(c.condutorNome.toLowerCase()))
        );

        const isCurrentlyLoggedIn = currentUser?.id === member.id || currentUser?.re === member.re;

        return {
          userId: member.id,
          userName: member.name,
          userRE: member.re,
          graduacao: member.graduacao,
          role: member.role,
          pelotao: member.pelotao,
          isOnline: isCurrentlyLoggedIn || !!cautela,
          statusServico: cautela
            ? 'PATRULHAMENTO'
            : isCurrentlyLoggedIn
            ? 'EM_SERVICO'
            : member.role === 'ADMIN'
            ? 'BASE_LOGISTICA'
            : 'FOLGA',
          viaturaAtual: cautela
            ? {
                id: cautela.viaturaId,
                prefixo: cautela.prefixoViatura,
                modelo: cautela.modeloViatura,
              }
            : undefined,
          ultimoAcesso: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        };
      });
    },
    [currentUser]
  );

  // Generate tactical summary text for shift handover
  const generateShiftSummaryText = useCallback(
    (vehicles: Vehicle[], activeCautelas: CautelaRecord[]): string => {
      const now = new Date();
      const dataFormatada = now.toLocaleDateString('pt-BR');
      const horaFormatada = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      const total = vehicles.length;
      const motos = vehicles.filter((v) => v.tipo === 'MOTOCICLETA').length;
      const quatroRodas = vehicles.filter((v) => v.tipo === 'QUATRO_RODAS').length;
      const operacionais = vehicles.filter((v) => v.status === 'OPERACIONAL').length;
      const baixadas = vehicles.filter((v) => v.status === 'BAIXADA' || v.status === 'EM_MANUTENCAO').length;

      const cautelasAtivas = activeCautelas.filter((c) => c.status === 'EM_PATRULHAMENTO');

      let txt = `*ROCAM - POLÍCIA MILITAR DO ESTADO DE SÃO PAULO*\n`;
      txt += `*INFORMATIVO DE PASSAGEM DE SERVIÇO & FROTA*\n`;
      txt += `🗓️ Data/Hora: ${dataFormatada} às ${horaFormatada}\n`;
      txt += `👤 Oficial Responsável: ${currentUser?.graduacao || 'CAP PM'} ${currentUser?.name || 'Comando'} (RE ${currentUser?.re || '000.001-0'})\n`;
      txt += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      txt += `*1. SITUAÇÃO GERAL DA FROTA:*\n`;
      txt += `• Total de Viaturas: ${total} (${motos} Motocicletas / ${quatroRodas} 04 Rodas)\n`;
      txt += `• Viaturas Prontas/Operacionais: ${operacionais}\n`;
      txt += `• Viaturas Baixadas/Oficina: ${baixadas}\n`;
      txt += `• Viaturas em Patrulhamento no Momento: ${cautelasAtivas.length}\n\n`;

      if (cautelasAtivas.length > 0) {
        txt += `*2. EQUIPES EM PATRULHAMENTO AGORA:*\n`;
        cautelasAtivas.forEach((c) => {
          txt += `• Vtr ${c.prefixoViatura} (${c.modeloViatura}) -> ${c.condutorGraduacao} ${c.condutorNome} (RE ${c.condutorRE})\n`;
        });
        txt += `\n`;
      }

      const ultimosAvisos = notices.slice(0, 3);
      if (ultimosAvisos.length > 0) {
        txt += `*3. AVISOS DO COMANDO & INSTRUÇÕES:*\n`;
        ultimosAvisos.forEach((a) => {
          txt += `• [${a.prioridade}] ${a.titulo}\n  _${a.conteudo.slice(0, 140)}..._\n`;
        });
        txt += `\n`;
      }

      txt += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      txt += `_Mensagem gerada via ROCAM Frota & Manutenção - Trabalho em Equipe_\n`;
      txt += `_Todos os dados conferidos e prontos para o turno seguinte._`;

      return txt;
    },
    [currentUser, notices]
  );

  // Share to WhatsApp
  const shareWhatsApp = useCallback(
    (
      type: 'PASSAGEM' | 'FROTA' | 'ALERTAS',
      vehicles: Vehicle[],
      activeCautelas: CautelaRecord[],
      criticalAlertsCount = 0
    ) => {
      let text = '';
      if (type === 'PASSAGEM') {
        text = generateShiftSummaryText(vehicles, activeCautelas);
      } else if (type === 'FROTA') {
        const operacionais = vehicles.filter((v) => v.status === 'OPERACIONAL');
        const baixadas = vehicles.filter((v) => v.status === 'BAIXADA' || v.status === 'EM_MANUTENCAO');
        text = `*ROCAM - STATUS GERAL DA FROTA*\nData: ${new Date().toLocaleDateString('pt-BR')}\n\n`;
        text += `🟢 *Operacionais (${operacionais.length}):*\n`;
        operacionais.forEach((v) => {
          text += `• ${v.prefixo} (${v.modelo}) - ${v.kmAtual.toLocaleString('pt-BR')} km\n`;
        });
        if (baixadas.length > 0) {
          text += `\n🔴 *Baixadas/Oficina (${baixadas.length}):*\n`;
          baixadas.forEach((v) => {
            text += `• ${v.prefixo} (${v.modelo}) - Motivo: ${v.motivoBaixa || 'Em manutenção'}\n`;
          });
        }
      } else if (type === 'ALERTAS') {
        text = `*ROCAM - ALERTA DE MANUTENÇÃO PREVENTIVA*\n`;
        text += `Existem *${criticalAlertsCount}* viaturas com manutenções preventivas vencidas ou em nível crítico.\n`;
        text += `Favor verificar com urgência no painel do sistema para agendamento de oficina.\n`;
      }

      const encoded = encodeURIComponent(text);
      const url = `https://api.whatsapp.com/send?text=${encoded}`;
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    },
    [generateShiftSummaryText]
  );

  const forceSync = useCallback(async () => {
    await syncWithServer();
    notifyBroadcast('SYNC_NOTICES', notices);
    notifyBroadcast('SYNC_MESSAGES', messages);
    notifyBroadcast('SYNC_ACTIVITIES', activityLogs);
    setLastSyncTime(new Date());
  }, [syncWithServer, notifyBroadcast, notices, messages, activityLogs]);

  return (
    <TeamContext.Provider
      value={{
        notices,
        messages,
        activityLogs,
        unreadNoticesCount,
        isOnlineSync,
        lastSyncTime,
        addNotice,
        updateNotice,
        deleteNotice,
        togglePinNotice,
        acknowledgeNotice,
        sendMessage,
        logActivity,
        getTeamMembersPresence,
        generateShiftSummaryText,
        shareWhatsApp,
        forceSync,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
};

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
};
