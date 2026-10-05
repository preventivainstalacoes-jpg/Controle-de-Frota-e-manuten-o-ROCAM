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
import { supabase } from '../lib/supabase';

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
  const [notices, setNotices] = useState<TeamNotice[]>([]);
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [activityLogs, setActivityLogs] = useState<TeamActivityLog[]>([]);
  const [isOnlineSync, setIsOnlineSync] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());


  // Supabase is the shared source of truth. These helpers replace the old
  // browser-only broadcast/storage layer so every device reads the same data.
  const notifyBroadcast = useCallback((_event: string, _payload: unknown) => {
    // Realtime subscriptions below provide cross-device synchronization.
  }, []);

  const syncWithServer = useCallback(async () => {
    await loadTeamData();
  }, [loadTeamData]);

  const pushToServer = useCallback(async (kind: 'notice' | 'message' | 'activity', item: any) => {
    try {
      if (kind === 'notice') {
        const { error } = await supabase.from('team_notices').upsert({
          id: item.id,
          titulo: item.titulo,
          conteudo: item.conteudo,
          categoria: item.categoria,
          prioridade: item.prioridade,
          fixado: !!item.fixado,
          viatura_relacionada_id: item.viaturaRelacionadaId || null,
          viatura_relacionada_prefixo: item.viaturaRelacionadaPrefixo || null,
          autor_id: item.autorId || null,
          autor_nome: item.autorNome,
          autor_re: item.autorRE || null,
          autor_graduacao: item.autorGraduacao || null,
          criado_em: item.criadoEm,
          atualizado_em: item.atualizadoEm || null,
          confirmacoes: item.confirmacoes || [],
        });
        if (error) console.error('Erro ao sincronizar comunicado:', error);
      } else if (kind === 'message') {
        const { error } = await supabase.from('team_messages').upsert({
          id: item.id,
          remetente_id: item.remetenteId || null,
          remetente_nome: item.remetenteNome,
          remetente_re: item.remetenteRE || null,
          remetente_graduacao: item.remetenteGraduacao || null,
          remetente_role: item.remetenteRole || null,
          texto: item.texto,
          viatura_id: item.viaturaId || null,
          viatura_prefixo: item.viaturaPrefixo || null,
          criado_em: item.criadoEm,
          tipo: item.tipo || 'TEXTO',
        });
        if (error) console.error('Erro ao sincronizar mensagem:', error);
      } else {
        const { error } = await supabase.from('team_activity_logs').upsert({
          id: item.id,
          tipo: item.tipo,
          titulo: item.titulo,
          descricao: item.descricao,
          usuario_id: item.usuarioId || currentUser?.id || null,
          usuario_nome: item.usuarioNome,
          usuario_re: item.usuarioRE || null,
          usuario_role: item.usuarioRole || null,
          data_hora: item.dataHora,
          badge: item.badge || null,
          link_tab: item.linkTab || null,
        });
        if (error) console.error('Erro ao sincronizar atividade:', error);
      }
    } catch (error) {
      console.error('Erro inesperado na sincronização da equipe:', error);
    }
  }, [currentUser]);

  const loadTeamData = useCallback(async () => {
    const [n, m, a] = await Promise.all([
      supabase.from('team_notices').select('*').order('criado_em', { ascending: false }).limit(200),
      supabase.from('team_messages').select('*').order('criado_em', { ascending: true }).limit(500),
      supabase.from('team_activity_logs').select('*').order('data_hora', { ascending: false }).limit(200),
    ]);
    if (n.error || m.error || a.error) {
      console.error('Erro ao carregar dados da equipe no Supabase:', n.error || m.error || a.error);
      setIsOnlineSync(false);
      return;
    }
    setNotices((n.data || []).map((x:any) => ({
      id:x.id,titulo:x.titulo,conteudo:x.conteudo,categoria:x.categoria,prioridade:x.prioridade,fixado:!!x.fixado,
      viaturaRelacionadaId:x.viatura_relacionada_id,viaturaRelacionadaPrefixo:x.viatura_relacionada_prefixo,
      autorId:x.autor_id || '',autorNome:x.autor_nome,autorRE:x.autor_re || '',autorGraduacao:x.autor_graduacao || '',
      criadoEm:x.criado_em,atualizadoEm:x.atualizado_em,confirmacoes:Array.isArray(x.confirmacoes)?x.confirmacoes:[]
    })));
    setMessages((m.data || []).map((x:any) => ({
      id:x.id,remetenteId:x.remetente_id || '',remetenteNome:x.remetente_nome,remetenteRE:x.remetente_re || '',
      remetenteGraduacao:x.remetente_graduacao || '',remetenteRole:x.remetente_role || 'OPERADOR',texto:x.texto,
      viaturaId:x.viatura_id,viaturaPrefixo:x.viatura_prefixo,criadoEm:x.criado_em,tipo:x.tipo || 'TEXTO'
    })));
    setActivityLogs((a.data || []).map((x:any) => ({
      id:x.id,tipo:x.tipo,titulo:x.titulo,descricao:x.descricao,usuarioNome:x.usuario_nome,usuarioRE:x.usuario_re || '',
      usuarioRole:x.usuario_role || 'OPERADOR',dataHora:x.data_hora,badge:x.badge,linkTab:x.link_tab
    })));
    setIsOnlineSync(true);
    setLastSyncTime(new Date());
  }, []);

  useEffect(() => {
    void loadTeamData();
    const channel = supabase.channel('rocam-team-shared')
      .on('postgres_changes',{event:'*',schema:'public',table:'team_notices'},()=>void loadTeamData())
      .on('postgres_changes',{event:'*',schema:'public',table:'team_messages'},()=>void loadTeamData())
      .on('postgres_changes',{event:'*',schema:'public',table:'team_activity_logs'},()=>void loadTeamData())
      .subscribe();
    const timer = setInterval(() => void loadTeamData(), 30000);
    return () => { clearInterval(timer); void supabase.removeChannel(channel); };
  }, [loadTeamData]);

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

      void pushToServer('activity', logEntry);
      void pushToServer('notice', newNotice);
      return newNotice;
    },
    [currentUser, notifyBroadcast, pushToServer]
  );

  const updateNotice = useCallback(
    (id: string, updates: Partial<TeamNotice>) => {
      const dbUpdates:any = { atualizado_em: new Date().toISOString() };
      if (updates.titulo !== undefined) dbUpdates.titulo = updates.titulo;
      if (updates.conteudo !== undefined) dbUpdates.conteudo = updates.conteudo;
      if (updates.categoria !== undefined) dbUpdates.categoria = updates.categoria;
      if (updates.prioridade !== undefined) dbUpdates.prioridade = updates.prioridade;
      if (updates.fixado !== undefined) dbUpdates.fixado = updates.fixado;
      if (updates.confirmacoes !== undefined) dbUpdates.confirmacoes = updates.confirmacoes;
      if (updates.viaturaRelacionadaId !== undefined) dbUpdates.viatura_relacionada_id = updates.viaturaRelacionadaId || null;
      if (updates.viaturaRelacionadaPrefixo !== undefined) dbUpdates.viatura_relacionada_prefixo = updates.viaturaRelacionadaPrefixo || null;
      void supabase.from('team_notices').update(dbUpdates).eq('id', id);
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
      void supabase.from('team_notices').delete().eq('id', id);
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
      const target = notices.find((n) => n.id === id);
      if (target) void supabase.from('team_notices').update({fixado:!target.fixado,atualizado_em:new Date().toISOString()}).eq('id',id);
      setNotices((prev) => {
        const next = prev.map((n) => (n.id === id ? { ...n, fixado: !n.fixado } : n));
        notifyBroadcast('SYNC_NOTICES', next);
        return next;
      });
    },
    [notifyBroadcast, notices]
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

          const updatedConfirmacoes = [...n.confirmacoes, ack];
          void supabase.from('team_notices').update({confirmacoes:updatedConfirmacoes,atualizado_em:new Date().toISOString()}).eq('id',noticeId);
          return { ...n, confirmacoes: updatedConfirmacoes };
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
