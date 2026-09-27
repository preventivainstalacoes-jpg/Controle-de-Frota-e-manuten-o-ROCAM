import React, { useState, useMemo } from 'react';
import { useTeam } from '../context/TeamContext';
import { useFleet } from '../context/FleetContext';
import { useAuth } from '../context/AuthContext';
import {
  TeamNotice,
  TeamNoticeCategory,
  TeamNoticePriority
} from '../types';
import {
  Users,
  MessageSquare,
  Send,
  Pin,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Share2,
  Copy,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Shield,
  Bike,
  Car,
  Wrench,
  ClipboardCheck,
  Calendar,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Trash2,
  BookmarkCheck,
  CheckCheck,
  MessageCircle,
  PhoneCall,
  Activity,
  FileText
} from 'lucide-react';

export const TeamHub: React.FC = () => {
  const {
    notices,
    activityLogs,
    unreadNoticesCount,
    isOnlineSync,
    lastSyncTime,
    addNotice,
    deleteNotice,
    togglePinNotice,
    acknowledgeNotice,
    getTeamMembersPresence,
    generateShiftSummaryText,
    shareWhatsApp,
    forceSync
  } = useTeam();

  const { vehicles, cautelas, stats, criticalAlertCount } = useFleet();
  const { currentUser, isAdmin } = useAuth();

  // Active sub-tab
  const [activeSubTab, setActiveSubTab] = useState<'mural' | 'atividades' | 'efetivo'>('mural');

  // Filters for notices
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');
  const [onlyMyPendingQSL, setOnlyMyPendingQSL] = useState(false);

  // New Notice Modal state
  const [isNewNoticeOpen, setIsNewNoticeOpen] = useState(false);
  const [newNoticeTitle, setNewNoticeTitle] = useState('');
  const [newNoticeContent, setNewNoticeContent] = useState('');
  const [newNoticeCategory, setNewNoticeCategory] = useState<TeamNoticeCategory>('PASSAGEM_SERVICO');
  const [newNoticePriority, setNewNoticePriority] = useState<TeamNoticePriority>('NORMAL');
  const [newNoticeFixado, setNewNoticeFixado] = useState(false);
  const [newNoticeViaturaId, setNewNoticeViaturaId] = useState('');

  // Share Modal state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareTextPreview, setShareTextPreview] = useState('');
  const [copiedToast, setCopiedToast] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Presence list
  const teamPresence = useMemo(() => {
    return getTeamMembersPresence(vehicles, cautelas);
  }, [getTeamMembersPresence, vehicles, cautelas]);

  // Filtered notices
  const filteredNotices = useMemo(() => {
    return notices
      .filter((notice) => {
        // Category filter
        if (selectedCategory !== 'TODAS' && notice.categoria !== selectedCategory) {
          return false;
        }

        // QSL pending filter
        if (onlyMyPendingQSL && currentUser) {
          const hasAck = notice.confirmacoes.some((c) => c.userId === currentUser.id);
          if (hasAck) return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const matchTitle = notice.titulo.toLowerCase().includes(query);
          const matchContent = notice.conteudo.toLowerCase().includes(query);
          const matchAuthor = notice.autorNome.toLowerCase().includes(query) || notice.autorRE.includes(query);
          const matchVtr = notice.viaturaRelacionadaPrefixo?.toLowerCase().includes(query);
          return matchTitle || matchContent || matchAuthor || matchVtr;
        }

        return true;
      })
      .sort((a, b) => {
        // Pinned first
        if (a.fixado && !b.fixado) return -1;
        if (!a.fixado && b.fixado) return 1;
        // Then by date desc
        return new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime();
      });
  }, [notices, selectedCategory, onlyMyPendingQSL, currentUser, searchQuery]);

  // Handle manual sync
  const handleManualSync = async () => {
    setIsSyncing(true);
    await forceSync();
    setTimeout(() => setIsSyncing(false), 500);
  };

  // Handle open share modal
  const handleOpenShareModal = (type: 'PASSAGEM' | 'FROTA' | 'ALERTAS') => {
    if (type === 'PASSAGEM') {
      const txt = generateShiftSummaryText(vehicles, cautelas);
      setShareTextPreview(txt);
    } else if (type === 'FROTA') {
      const operacionais = vehicles.filter((v) => v.status === 'OPERACIONAL');
      const baixadas = vehicles.filter((v) => v.status === 'BAIXADA' || v.status === 'EM_MANUTENCAO');
      let txt = `*ROCAM - STATUS GERAL DA FROTA*\nData: ${new Date().toLocaleDateString('pt-BR')}\n\n`;
      txt += `🟢 *Operacionais (${operacionais.length}):*\n`;
      operacionais.forEach((v) => {
        txt += `• ${v.prefixo} (${v.modelo}) - ${v.kmAtual.toLocaleString('pt-BR')} km\n`;
      });
      if (baixadas.length > 0) {
        txt += `\n🔴 *Baixadas/Oficina (${baixadas.length}):*\n`;
        baixadas.forEach((v) => {
          txt += `• ${v.prefixo} (${v.modelo}) - Motivo: ${v.motivoBaixa || 'Em manutenção'}\n`;
        });
      }
      setShareTextPreview(txt);
    }
    setIsShareModalOpen(true);
  };

  // Copy to clipboard
  const handleCopyShareText = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareTextPreview);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 3000);
    }
  };

  // Submit new notice
  const handleCreateNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoticeTitle.trim() || !newNoticeContent.trim()) return;

    const viatura = vehicles.find((v) => v.id === newNoticeViaturaId);

    addNotice({
      titulo: newNoticeTitle.trim(),
      conteudo: newNoticeContent.trim(),
      categoria: newNoticeCategory,
      prioridade: newNoticePriority,
      fixado: newNoticeFixado,
      viaturaRelacionadaId: viatura?.id,
      viaturaRelacionadaPrefixo: viatura?.prefixo,
    });

    // Reset & close
    setNewNoticeTitle('');
    setNewNoticeContent('');
    setNewNoticeCategory('PASSAGEM_SERVICO');
    setNewNoticePriority('NORMAL');
    setNewNoticeFixado(false);
    setNewNoticeViaturaId('');
    setIsNewNoticeOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner / Actions Bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center gap-1.5">
                <Users className="w-3 h-3" />
                Módulo de Integração de Equipe
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Rede Sincronizada
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1.5 flex items-center gap-2">
              Trabalho em Equipe & Compartilhamento
            </h1>
            <p className="text-xs text-zinc-400 max-w-2xl mt-0.5">
              Quadro de avisos operacionais, passagem de serviço ROCAM, confirmações de leitura (QSL) e compartilhamento instantâneo via WhatsApp entre os 04 Administradores e Operadores.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsNewNoticeOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition flex items-center space-x-2 shadow-lg shadow-amber-500/10 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Novo Comunicado / Ordem</span>
            </button>

            <button
              onClick={() => handleOpenShareModal('PASSAGEM')}
              className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-medium transition flex items-center space-x-2 cursor-pointer shadow"
            >
              <Share2 className="w-4 h-4 text-emerald-400" />
              <span>Compartilhar (WhatsApp)</span>
            </button>

            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              title={`Última sincronização: ${lastSyncTime.toLocaleTimeString('pt-BR')}`}
              className="p-2 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-750 transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* 4 Mini KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-zinc-800/80">
          <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
            <div className="text-[11px] font-mono text-zinc-400 flex items-center justify-between">
              <span>EFETIVO CONECTADO</span>
              <Users className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-lg font-black text-white mt-1">
              {teamPresence.filter((p) => p.isOnline).length} / {teamPresence.length}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">
              {teamPresence.filter((p) => p.statusServico === 'PATRULHAMENTO').length} em patrulhamento agora
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
            <div className="text-[11px] font-mono text-zinc-400 flex items-center justify-between">
              <span>COMUNICADOS ATIVOS</span>
              <BookmarkCheck className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-lg font-black text-white mt-1">
              {notices.length}
            </div>
            <div className="text-[10px] text-amber-400 font-semibold mt-0.5">
              {unreadNoticesCount > 0 ? `⚠️ ${unreadNoticesCount} pendente(s) de seu QSL` : '✓ Todos com seu QSL dado'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
            <div className="text-[11px] font-mono text-zinc-400 flex items-center justify-between">
              <span>EVENTOS DA FROTA</span>
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-lg font-black text-white mt-1">
              {activityLogs.length}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">
              Ações e registros auditáveis
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
            <div className="text-[11px] font-mono text-zinc-400 flex items-center justify-between">
              <span>SINCRONIZAÇÃO</span>
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-sm font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Tempo Real
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">
              Multi-abas & Servidor ativos
            </div>
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex border-b border-zinc-800 gap-1 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveSubTab('mural')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeSubTab === 'mural'
              ? 'border-amber-500 text-amber-400 bg-amber-500/5'
              : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
          }`}
        >
          <BookmarkCheck className="w-4 h-4" />
          <span>Mural & Passagem de Serviço</span>
          {unreadNoticesCount > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-zinc-950">
              {unreadNoticesCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('atividades')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeSubTab === 'atividades'
              ? 'border-amber-500 text-amber-400 bg-amber-500/5'
              : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Feed de Atividades da Frota</span>
          <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-zinc-800 text-zinc-300">
            {activityLogs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('efetivo')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeSubTab === 'efetivo'
              ? 'border-amber-500 text-amber-400 bg-amber-500/5'
              : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Escala & Efetivo ROCAM</span>
          <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-zinc-800 text-zinc-300">
            {teamPresence.length}
          </span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* SUB-TAB 1: MURAL & PASSAGEM DE SERVIÇO                   */}
      {/* ======================================================== */}
      {activeSubTab === 'mural' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar comunicados por assunto, viatura ou oficial..."
                className="w-full pl-9 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-1 overflow-x-auto text-xs">
                {(
                  [
                    { id: 'TODAS', label: 'Todos' },
                    { id: 'PASSAGEM_SERVICO', label: 'Passagem Turno' },
                    { id: 'ALERTA_OPERACIONAL', label: 'Alertas Táticos' },
                    { id: 'LOGISTICA_OFICINA', label: 'Logística & Oficina' },
                    { id: 'ORDEM_DO_DIA', label: 'Ordem do Dia' },
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer whitespace-nowrap ${
                      selectedCategory === cat.id
                        ? 'bg-amber-500 text-zinc-950 font-bold'
                        : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-750'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {currentUser && (
                <button
                  onClick={() => setOnlyMyPendingQSL(!onlyMyPendingQSL)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer flex items-center space-x-1.5 ${
                    onlyMyPendingQSL
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>Pendentes de meu QSL</span>
                </button>
              )}
            </div>
          </div>

          {/* Notices Grid / List */}
          {filteredNotices.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-zinc-800 text-zinc-500 mx-auto flex items-center justify-center">
                <BookmarkCheck className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">Nenhum comunicado encontrado</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Não há ordens ou comunicados correspondentes aos filtros aplicados.
              </p>
              <button
                onClick={() => {
                  setSelectedCategory('TODAS');
                  setOnlyMyPendingQSL(false);
                  setSearchQuery('');
                }}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 rounded-lg cursor-pointer"
              >
                Limpar Filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredNotices.map((notice) => {
                const isAckedByMe = currentUser
                  ? notice.confirmacoes.some((c) => c.userId === currentUser.id)
                  : false;

                const categoryLabels: Record<TeamNoticeCategory, { label: string; bg: string; text: string }> = {
                  PASSAGEM_SERVICO: { label: 'Passagem de Serviço', bg: 'bg-blue-500/10 border-blue-500/30', text: 'text-blue-400' },
                  ALERTA_OPERACIONAL: { label: 'Alerta Tático', bg: 'bg-rose-500/10 border-rose-500/30', text: 'text-rose-400' },
                  LOGISTICA_OFICINA: { label: 'Logística & Oficina', bg: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-400' },
                  ORDEM_DO_DIA: { label: 'Ordem do Dia', bg: 'bg-purple-500/10 border-purple-500/30', text: 'text-purple-400' },
                  INFORMATIVO: { label: 'Informativo', bg: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-400' },
                };

                const priorityConfig: Record<TeamNoticePriority, { label: string; badge: string }> = {
                  URGENTE: { label: 'URGENTE', badge: 'bg-rose-600 text-white animate-pulse' },
                  ALTA: { label: 'PRIORIDADE ALTA', badge: 'bg-amber-500 text-zinc-950 font-bold' },
                  NORMAL: { label: 'NORMAL', badge: 'bg-zinc-800 text-zinc-300' },
                  INFORMATIVO: { label: 'INFORMATIVO', badge: 'bg-emerald-600 text-white' },
                };

                const catInfo = categoryLabels[notice.categoria] || categoryLabels.INFORMATIVO;
                const prioInfo = priorityConfig[notice.prioridade] || priorityConfig.NORMAL;

                return (
                  <div
                    key={notice.id}
                    className={`bg-zinc-900 border rounded-2xl p-5 shadow-lg transition relative overflow-hidden ${
                      notice.fixado
                        ? 'border-amber-500/50 bg-gradient-to-r from-zinc-900 via-zinc-900 to-amber-950/20 shadow-amber-500/5'
                        : 'border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    {/* Header Row of Notice */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {notice.fixado && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500 text-zinc-950 flex items-center gap-1">
                            <Pin className="w-2.5 h-2.5 fill-current" />
                            Fixado
                          </span>
                        )}

                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase border ${catInfo.bg} ${catInfo.text}`}>
                          {catInfo.label}
                        </span>

                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${prioInfo.badge}`}>
                          {prioInfo.label}
                        </span>

                        {notice.viaturaRelacionadaPrefixo && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1">
                            <Bike className="w-3 h-3 text-amber-400" />
                            Vtr: {notice.viaturaRelacionadaPrefixo}
                          </span>
                        )}
                      </div>

                      {/* Admin Controls */}
                      {isAdmin && (
                        <div className="flex items-center space-x-1.5 self-end sm:self-auto">
                          <button
                            onClick={() => togglePinNotice(notice.id)}
                            title={notice.fixado ? 'Desafixar comunicado' : 'Fixar comunicado no topo'}
                            className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${
                              notice.fixado
                                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                                : 'bg-zinc-800/80 border-zinc-750 text-zinc-400 hover:text-white'
                            }`}
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => deleteNotice(notice.id)}
                            title="Excluir comunicado"
                            className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-rose-950/60 border border-zinc-750 hover:border-rose-700 text-zinc-400 hover:text-rose-400 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Notice Title & Content */}
                    <div className="mt-3">
                      <h2 className="text-base font-bold text-white tracking-tight">
                        {notice.titulo}
                      </h2>
                      <p className="text-xs text-zinc-300 leading-relaxed mt-2 whitespace-pre-line bg-zinc-950/50 p-3.5 rounded-xl border border-zinc-850">
                        {notice.conteudo}
                      </p>
                    </div>

                    {/* Footer: Author Info & QSL Section */}
                    <div className="mt-4 pt-3.5 border-t border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                      {/* Author */}
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-[10px]">
                          <Shield className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-200">
                            {notice.autorGraduacao} {notice.autorNome}
                            <span className="font-mono text-zinc-500 text-[10px] ml-1.5">
                              (RE {notice.autorRE})
                            </span>
                          </div>
                          <div className="text-[10px] text-zinc-500 flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              {new Date(notice.criadoEm).toLocaleDateString('pt-BR')} às{' '}
                              {new Date(notice.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* QSL / Acknowledgement Controls */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* QSL Confirmations Badges */}
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[11px] font-mono text-zinc-400">
                            QSL ({notice.confirmacoes.length}):
                          </span>
                          <div className="flex -space-x-1.5 overflow-hidden">
                            {notice.confirmacoes.slice(0, 4).map((c, i) => (
                              <div
                                key={i}
                                title={`${c.userGraduacao} ${c.userName} às ${new Date(c.acknowledgedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                                className="w-6 h-6 rounded-full bg-emerald-950 border border-emerald-500/60 text-emerald-300 font-bold text-[9px] flex items-center justify-center shadow"
                              >
                                {c.userName.split(' ').pop()?.charAt(0) || 'P'}
                              </div>
                            ))}
                          </div>
                          {notice.confirmacoes.length > 4 && (
                            <span className="text-[10px] font-mono text-zinc-500">
                              +{notice.confirmacoes.length - 4}
                            </span>
                          )}
                        </div>

                        {/* Button to confirm QSL */}
                        {currentUser && (
                          <button
                            onClick={() => acknowledgeNotice(notice.id)}
                            disabled={isAckedByMe}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow ${
                              isAckedByMe
                                ? 'bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 cursor-default'
                                : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 animate-bounce'
                            }`}
                          >
                            {isAckedByMe ? (
                              <>
                                <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                                <span>QSL Confirmado</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Dar QSL / Ciente</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 2: FEED DE ATIVIDADES DA FROTA (AUDIT LOG)       */}
      {/* ======================================================== */}
      {activeSubTab === 'atividades' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-400" />
                Linha do Tempo de Ações da Equipe
              </h2>
              <p className="text-xs text-zinc-400">
                Histórico auditável de cautelas, descautelas, apontamento de avarias e manutenções registradas em tempo real.
              </p>
            </div>
            <span className="text-xs font-mono text-zinc-500">
              Total: {activityLogs.length} eventos registrados
            </span>
          </div>

          <div className="space-y-3">
            {activityLogs.map((act) => {
              const iconMap: Record<string, { icon: any; color: string }> = {
                CAUTELA: { icon: ClipboardCheck, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
                DESCAUTELA: { icon: CheckCircle2, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
                MANUTENCAO: { icon: Wrench, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
                HODOMETRO: { icon: Clock, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
                AVARIA: { icon: AlertTriangle, color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
                COMUNICADO: { icon: BookmarkCheck, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
                SISTEMA: { icon: Shield, color: 'text-zinc-400 bg-zinc-800 border-zinc-700' },
              };

              const currentConfig = iconMap[act.tipo] || iconMap.SISTEMA;
              const IconComp = currentConfig.icon;

              return (
                <div
                  key={act.id}
                  className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-start space-x-3 hover:border-zinc-700 transition"
                >
                  <div className={`p-2 rounded-lg border shrink-0 ${currentConfig.color}`}>
                    <IconComp className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-white">
                        {act.titulo}
                      </h4>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {new Date(act.dataHora).toLocaleDateString('pt-BR')} às{' '}
                        {new Date(act.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-300 mt-0.5">
                      {act.descricao}
                    </p>

                    <div className="mt-2 flex items-center space-x-2 text-[10px] text-zinc-400">
                      <span className="font-semibold text-zinc-300">
                        Policial: {act.usuarioNome} ({act.usuarioRole})
                      </span>
                      {act.badge && (
                        <span className="px-1.5 py-0.5 rounded bg-zinc-850 border border-zinc-750 text-amber-400 font-mono">
                          {act.badge}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 3: ESCALA & EFETIVO ROCAM                        */}
      {/* ======================================================== */}
      {activeSubTab === 'efetivo' && (
        <div className="space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-xl">
            <div className="border-b border-zinc-800 pb-3 mb-5">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" />
                Quadro de Oficiais & Efetivo Operacional ROCAM
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Visualização integrada dos 04 Administradores ROCAM e Operadores com status de serviço e viatura empenhada.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teamPresence.map((member) => {
                const statusStyles: Record<string, { label: string; badge: string }> = {
                  PATRULHAMENTO: { label: 'EM PATRULHAMENTO', badge: 'bg-emerald-500 text-zinc-950 font-bold' },
                  EM_SERVICO: { label: 'EM SERVIÇO', badge: 'bg-blue-600 text-white' },
                  BASE_LOGISTICA: { label: 'BASE / LOGÍSTICA', badge: 'bg-amber-500/20 border border-amber-500/40 text-amber-300' },
                  FOLGA: { label: 'DISPONÍVEL / FOLGA', badge: 'bg-zinc-800 text-zinc-400' },
                };

                const stat = statusStyles[member.statusServico] || statusStyles.FOLGA;

                return (
                  <div
                    key={member.userId}
                    className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3 relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-750 flex items-center justify-center text-amber-400 font-bold text-xs">
                          {member.graduacao.split(' ')[0]}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">
                            {member.graduacao} {member.userName}
                          </h4>
                          <span className="text-[10px] font-mono text-zinc-400">
                            RE: {member.userRE} • {member.role === 'ADMIN' ? 'Administrador' : 'Operador'}
                          </span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase ${stat.badge}`}>
                        {stat.label}
                      </span>
                    </div>

                    <div className="text-[11px] text-zinc-400 bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-850 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Lotação:</span>
                        <span className="text-zinc-300 font-medium">{member.pelotao}</span>
                      </div>

                      {member.viaturaAtual && (
                        <div className="flex justify-between text-amber-300 font-bold pt-1 border-t border-zinc-800">
                          <span className="flex items-center gap-1">
                            <Bike className="w-3 h-3" />
                            Viatura Cautelada:
                          </span>
                          <span>{member.viaturaAtual.prefixo} ({member.viaturaAtual.modelo})</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: NOVO COMUNICADO / PASSAGEM DE SERVIÇO             */}
      {/* ======================================================== */}
      {isNewNoticeOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BookmarkCheck className="w-5 h-5 text-amber-400" />
                Publicar Comunicado / Ordem de Serviço ROCAM
              </h3>
              <button
                onClick={() => setIsNewNoticeOpen(false)}
                className="text-zinc-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNotice} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">
                  Título do Comunicado *
                </label>
                <input
                  type="text"
                  required
                  value={newNoticeTitle}
                  onChange={(e) => setNewNoticeTitle(e.target.value)}
                  placeholder="Ex: Passagem de Serviço - 1º Turno para 2º Turno"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">
                    Categoria *
                  </label>
                  <select
                    value={newNoticeCategory}
                    onChange={(e) => setNewNoticeCategory(e.target.value as TeamNoticeCategory)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-xs"
                  >
                    <option value="PASSAGEM_SERVICO">Passagem de Serviço</option>
                    <option value="ALERTA_OPERACIONAL">Alerta Operacional / Tático</option>
                    <option value="LOGISTICA_OFICINA">Logística & Oficina</option>
                    <option value="ORDEM_DO_DIA">Ordem do Dia do Comando</option>
                    <option value="INFORMATIVO">Informativo Geral</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">
                    Prioridade *
                  </label>
                  <select
                    value={newNoticePriority}
                    onChange={(e) => setNewNoticePriority(e.target.value as TeamNoticePriority)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-xs"
                  >
                    <option value="URGENTE">Urgente (Destaque Vermelho Pulsante)</option>
                    <option value="ALTA">Alta (Atenção imediata)</option>
                    <option value="NORMAL">Normal</option>
                    <option value="INFORMATIVO">Informativo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">
                  Viatura Relacionada (Opcional)
                </label>
                <select
                  value={newNoticeViaturaId}
                  onChange={(e) => setNewNoticeViaturaId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-xs"
                >
                  <option value="">Nenhuma viatura específica</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.prefixo} - {v.modelo} ({v.tipo === 'MOTOCICLETA' ? 'Moto' : '4 Rodas'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">
                  Conteúdo / Descrição Detalhada *
                </label>
                <textarea
                  required
                  rows={5}
                  value={newNoticeContent}
                  onChange={(e) => setNewNoticeContent(e.target.value)}
                  placeholder="Descreva as orientações, condições das viaturas entregues, peças trocadas, ordens de patrulhamento..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>

              {isAdmin && (
                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="fixarAviso"
                    checked={newNoticeFixado}
                    onChange={(e) => setNewNoticeFixado(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-950 text-amber-500 focus:ring-0"
                  />
                  <label htmlFor="fixarAviso" className="text-zinc-300 font-medium cursor-pointer">
                    Fixar este comunicado no topo do mural da equipe
                  </label>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsNewNoticeOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold cursor-pointer shadow"
                >
                  Publicar Comunicado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: COMPARTILHAMENTO WHATSAPP & CÓPIA                 */}
      {/* ======================================================== */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Share2 className="w-5 h-5 text-emerald-400" />
                Compartilhamento Operacional da Frota
              </h3>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="text-zinc-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleOpenShareModal('PASSAGEM')}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 cursor-pointer"
              >
                Passagem de Turno
              </button>
              <button
                onClick={() => handleOpenShareModal('FROTA')}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 cursor-pointer"
              >
                Resumo Geral da Frota
              </button>
            </div>

            <div>
              <label className="block text-zinc-400 text-xs font-semibold mb-1">
                Texto Formatado para Grupos / Briefing:
              </label>
              <textarea
                readOnly
                rows={10}
                value={shareTextPreview}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white font-mono text-[11px] focus:outline-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-zinc-800">
              <div className="text-xs text-zinc-400">
                {copiedToast ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    ✓ Copiado para a área de transferência!
                  </span>
                ) : (
                  <span>Pronto para envio imediato.</span>
                )}
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={handleCopyShareText}
                  className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copiar Texto</span>
                </button>

                <button
                  onClick={() => {
                    const encoded = encodeURIComponent(shareTextPreview);
                    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-lg shadow-emerald-600/20"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Abrir no WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
