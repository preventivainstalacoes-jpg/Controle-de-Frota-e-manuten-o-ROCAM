import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserProfile, UserRole } from '../types';
import {
  X,
  Users,
  UserPlus,
  Shield,
  ClipboardCheck,
  KeyRound,
  Trash2,
  Power,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'list' | 'create';
}

const MILITARY_RANKS = [
  'SD PM',
  'CB PM',
  '3º SGT PM',
  '2º SGT PM',
  '1º SGT PM',
  'SUBTEN PM',
  '2º TEN PM',
  '1º TEN PM',
  'CAP PM',
  'MAJ PM',
  'TEN CEL PM',
  'CEL PM',
];

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'list',
}) => {
  const {
    users,
    currentUser,
    createUser,
    deleteUser,
    changePassword,
    toggleUserActive,
    resetUsersToDefault,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'list' | 'create'>(initialTab);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // New user form state
  const [formName, setFormName] = useState('');
  const [formGraduacao, setFormGraduacao] = useState('CB PM');
  const [formRE, setFormRE] = useState('');
  const [formPelotao, setFormPelotao] = useState('1º Pelotão ROCAM');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('OPERADOR');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password reset dialog state
  const [userForPassChange, setUserForPassChange] = useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Delete User Confirmation Modal state (requires Admin Password)
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [deleteAdminPassword, setDeleteAdminPassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Restore Default Users Modal state (requires Admin Password)
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetAdminPassword, setResetAdminPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetError, setResetError] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  if (!isOpen) return null;

  const showToast = (text: string, type: 'success' | 'error') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formRE.trim() || !formUsername.trim() || !formPassword.trim()) {
      showToast('Preencha todos os campos obrigatórios.', 'error');
      return;
    }

    setIsSubmitting(true);
    const res = await createUser({
      name: `${formGraduacao} ${formName.trim()}`,
      graduacao: formGraduacao,
      re: formRE.trim(),
      pelotao: formPelotao.trim(),
      username: formUsername.trim(),
      password: formPassword.trim(),
      role: formRole,
    });
    setIsSubmitting(false);

    if (res.success) {
      showToast('Policial cadastrado e ativado com sucesso!', 'success');
      setFormName('');
      setFormRE('');
      setFormUsername('');
      setFormPassword('');
      setFormRole('OPERADOR');
      setActiveTab('list');
    } else {
      showToast(res.error || 'Erro ao cadastrar usuário.', 'error');
    }
  };

  const handleOpenDeleteModal = (user: UserProfile) => {
    setUserToDelete(user);
    setDeleteAdminPassword('');
    setDeleteError('');
    setShowDeletePassword(false);
    setIsDeleting(false);
  };

  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToDelete) return;

    if (!deleteAdminPassword.trim()) {
      setDeleteError('Digite sua senha de administrador para autorizar a exclusão.');
      return;
    }

    setIsDeleting(true);
    setDeleteError('');
    const res = await deleteUser(userToDelete.id, deleteAdminPassword);
    setIsDeleting(false);

    if (res.success) {
      showToast(`Usuário ${userToDelete.name} excluído do sistema com sucesso.`, 'success');
      setUserToDelete(null);
      setDeleteAdminPassword('');
      setDeleteError('');
    } else {
      setDeleteError(res.error || 'Falha ao autorizar exclusão.');
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetAdminPassword.trim()) {
      setResetError('Digite sua senha de administrador para autorizar a restauração.');
      return;
    }

    setIsResetting(true);
    setResetError('');
    const res = await resetUsersToDefault(resetAdminPassword);
    setIsResetting(false);

    if (res.success) {
      showToast('Usuários restaurados para o padrão com sucesso!', 'success');
      setIsResetModalOpen(false);
      setResetAdminPassword('');
      setResetError('');
    } else {
      setResetError(res.error || 'Falha ao autorizar restauração.');
    }
  };

  const handleToggleActive = async (user: UserProfile) => {
    const res = await toggleUserActive(user.id);
    if (res.success) {
      showToast(`Usuário ${user.isActive ? 'desativado' : 'ativado'}.`, 'success');
    } else {
      showToast(res.error || 'Falha ao alterar status.', 'error');
    }
  };

  const handleChangePassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForPassChange) return;
    if (newPassword.trim().length < 4) {
      showToast('A senha deve possuir pelo menos 4 caracteres.', 'error');
      return;
    }

    const res = await changePassword(userForPassChange.id, newPassword);
    if (res.success) {
      showToast(`Senha de ${userForPassChange.username} alterada com sucesso!`, 'success');
      setUserForPassChange(null);
      setNewPassword('');
    } else {
      showToast(res.error || 'Falha ao alterar senha.', 'error');
    }
  };

  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase();
    return (
      u.name.toLowerCase().includes(term) ||
      u.username.toLowerCase().includes(term) ||
      u.re.toLowerCase().includes(term) ||
      u.pelotao.toLowerCase().includes(term)
    );
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-zinc-900 border border-zinc-750 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/70">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Gestão de Usuários & Controle de Acesso
              </h2>
              <p className="text-xs text-zinc-400">
                Cadastro imediato, níveis de privilégio (Admin vs Operador), alteração de senhas e exclusão segura
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast Alert */}
        {toast && (
          <div
            className={`px-4 py-2.5 text-xs font-semibold flex items-center justify-between border-b ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-800'
                : 'bg-rose-950/90 text-rose-200 border-rose-800'
            }`}
          >
            <div className="flex items-center space-x-2">
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              )}
              <span>{toast.text}</span>
            </div>
            <button onClick={() => setToast(null)} className="cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/40 px-5 pt-2 overflow-x-auto no-scrollbar">
          {/* Tab 1: Policiais Cadastrados */}
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center space-x-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'list'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Policiais Cadastrados ({users.length})</span>
          </button>

          {/* Tab 2: Novo Usuário */}
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center space-x-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'create'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Novo Usuário</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* TAB: POLICIAIS CADASTRADOS */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              {/* Search Bar & Reset */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por nome, RE ou usuário..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
                {/* Restaurar Padrão (Requer Senha do Admin) */}
                <button
                  type="button"
                  onClick={() => {
                    setIsResetModalOpen(true);
                    setResetAdminPassword('');
                    setResetError('');
                    setShowResetPassword(false);
                  }}
                  className="text-xs text-zinc-400 hover:text-amber-400 flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 transition cursor-pointer self-end sm:self-auto"
                  title="Restaurar contas originais pré-configuradas mediante senha de administrador"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restaurar Padrão</span>
                </button>
              </div>

              {/* Roles explanation card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25">
                  <div className="flex items-center space-x-2 text-amber-400 font-bold mb-1">
                    <Shield className="w-4 h-4" />
                    <span>Perfil Admin (Acesso Total)</span>
                  </div>
                  <p className="text-zinc-300 text-[11px] leading-relaxed">
                    Autorização para realizar todas as ações: frota, O.S., manutenções, banco de dados, relatórios e gestão de usuários.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold mb-1">
                    <ClipboardCheck className="w-4 h-4" />
                    <span>Perfil Operador (Acesso Específico)</span>
                  </div>
                  <p className="text-zinc-300 text-[11px] leading-relaxed">
                    Acesso limitado a: cautela de viaturas, registro das suas cautelas e registro detalhado de avarias com fotos.
                  </p>
                </div>
              </div>

              {/* Users Table / List */}
              <div className="divide-y divide-zinc-800 border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/60">
                {filteredUsers.length === 0 ? (
                  <div className="p-6 text-center text-xs text-zinc-500">
                    Nenhum policial ou usuário localizado.
                  </div>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelf = currentUser?.id === u.id;
                    return (
                      <div
                        key={u.id}
                        className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-900/50 transition"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                              u.role === 'ADMIN'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {u.role === 'ADMIN' ? (
                              <Shield className="w-4 h-4" />
                            ) : (
                              <ClipboardCheck className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-bold text-zinc-100">{u.name}</span>
                              {isSelf && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                                  Você
                                </span>
                              )}
                              {!u.isActive && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                                  Inativo
                                </span>
                              )}
                              {u.status === 'REJEITADO' && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-400 border border-rose-800 font-semibold">
                                  Recusado
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-zinc-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                              <span className="font-mono text-zinc-300">@{u.username}</span>
                              <span>•</span>
                              <span>RE: {u.re}</span>
                              <span>•</span>
                              <span>{u.pelotao}</span>
                            </div>
                          </div>
                        </div>

                        {/* Badges & Actions */}
                        <div className="flex items-center space-x-2 self-end sm:self-auto">
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                              u.role === 'ADMIN'
                                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            }`}
                          >
                            {u.role === 'ADMIN' ? '👑 ADMIN' : '🛡️ OPERADOR'}
                          </span>

                          {/* Change Password Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setUserForPassChange(u);
                              setNewPassword('');
                            }}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-amber-400 transition cursor-pointer"
                            title="Alterar senha deste militar"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Active Status */}
                          <button
                            type="button"
                            onClick={() => handleToggleActive(u)}
                            disabled={isSelf}
                            className={`p-1.5 rounded-lg transition cursor-pointer ${
                              u.isActive
                                ? 'bg-zinc-800 hover:bg-zinc-700 text-emerald-400'
                                : 'bg-rose-950/50 hover:bg-rose-900/60 text-rose-400'
                            } disabled:opacity-40 disabled:cursor-not-allowed`}
                            title={u.isActive ? 'Desativar usuário' : 'Ativar usuário'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>

                          {/* Opção do Admin Excluir Usuário (Requer Senha do Admin) */}
                          <button
                            type="button"
                            onClick={() => handleOpenDeleteModal(u)}
                            disabled={isSelf}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-900/60 text-zinc-400 hover:text-rose-400 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            title={
                              isSelf
                                ? 'Você não pode excluir sua própria conta através desta listagem'
                                : `Excluir usuário ${u.name}`
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB: CADASTRAR NOVO USUÁRIO (DIRETO PELO ADMIN) */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>
                  Cadastros realizados pelo Administrador nesta tela são <strong>pré-autorizados e ativados imediatamente</strong>.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Posto / Graduação */}
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Posto / Graduação *
                  </label>
                  <select
                    value={formGraduacao}
                    onChange={(e) => setFormGraduacao(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                  >
                    {MILITARY_RANKS.map((rank) => (
                      <option key={rank} value={rank}>
                        {rank}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Nome de Guerra */}
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Nome de Guerra *
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex: Oliveira, Silva, Costa..."
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Matrícula RE */}
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Matrícula RE *
                  </label>
                  <input
                    type="text"
                    value={formRE}
                    onChange={(e) => setFormRE(e.target.value)}
                    placeholder="Ex: 145.892-0"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-amber-500 font-mono"
                    required
                  />
                </div>

                {/* Pelotão / Seção */}
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Pelotão / Seção
                  </label>
                  <input
                    type="text"
                    value={formPelotao}
                    onChange={(e) => setFormPelotao(e.target.value)}
                    placeholder="Ex: 1º Pelotão ROCAM"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Login / Usuário */}
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Nome de Usuário (Login) *
                  </label>
                  <input
                    type="text"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="Ex: cb.oliveira ou 145892"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-amber-500 font-mono"
                    required
                  />
                </div>

                {/* Senha */}
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Senha de Acesso *
                  </label>
                  <input
                    type="password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-amber-500 font-mono"
                    required
                  />
                </div>
              </div>

              {/* Nível de Acesso (RBAC) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Perfil de Acesso & Autorização *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`p-3 rounded-xl border flex items-start space-x-3 cursor-pointer transition ${
                      formRole === 'OPERADOR'
                        ? 'bg-emerald-500/15 border-emerald-500 text-white'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="OPERADOR"
                      checked={formRole === 'OPERADOR'}
                      onChange={() => setFormRole('OPERADOR')}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-bold text-xs text-emerald-400 flex items-center gap-1.5">
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        <span>Operador (Acesso Limitado)</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
                        Limitado a cautela de viaturas, acompanhamento de suas cautelas e registro detalhado de avarias.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-xl border flex items-start space-x-3 cursor-pointer transition ${
                      formRole === 'ADMIN'
                        ? 'bg-amber-500/15 border-amber-500 text-white'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="ADMIN"
                      checked={formRole === 'ADMIN'}
                      onChange={() => setFormRole('ADMIN')}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-bold text-xs text-amber-400 flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5" />
                        <span>Administrador (Acesso Total)</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
                        Autorizado a realizar todas as ações: frota, O.S., preventivas, banco de dados e usuários.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Botões do Formulário */}
              <div className="pt-3 border-t border-zinc-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 transition cursor-pointer flex items-center space-x-2 shadow-lg shadow-amber-500/20"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isSubmitting ? 'Salvando...' : 'Cadastrar e Ativar Policial'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal de Exclusão de Usuário (Exige Senha do Admin) */}
        {userToDelete && (
          <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
            <form
              onSubmit={handleConfirmDelete}
              className="bg-zinc-900 border border-zinc-750 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="flex items-center space-x-3 text-rose-400">
                <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-400">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Excluir Usuário do Sistema?</h3>
                  <p className="text-xs text-zinc-400">Autorização obrigatória por senha</p>
                </div>
              </div>

              {deleteError && (
                <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-700 text-rose-200 text-xs flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1 text-xs font-mono">
                <div>• <strong>Policial:</strong> {userToDelete.name}</div>
                <div>• <strong>RE:</strong> {userToDelete.re}</div>
                <div>• <strong>Login:</strong> @{userToDelete.username}</div>
                <div>• <strong>Perfil:</strong> {userToDelete.role}</div>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed">
                As credenciais deste militar serão excluídas. Registros históricos de cautelas e vistorias permanecerão preservados.
              </p>

              {/* Password Input Required */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Digite sua Senha de Administrador *</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowDeletePassword(!showDeletePassword)}
                    className="text-[11px] text-zinc-400 hover:text-amber-400 cursor-pointer flex items-center gap-1"
                  >
                    {showDeletePassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showDeletePassword ? 'Ocultar' : 'Exibir'}</span>
                  </button>
                </div>
                <input
                  type={showDeletePassword ? 'text' : 'password'}
                  value={deleteAdminPassword}
                  onChange={(e) => setDeleteAdminPassword(e.target.value)}
                  placeholder="Sua senha de administrador..."
                  className="w-full px-3 py-2 bg-zinc-950 border border-amber-500/50 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  autoFocus
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  className="px-3.5 py-2 text-xs text-zinc-400 hover:text-zinc-200 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isDeleting}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-md cursor-pointer disabled:opacity-50 transition"
                >
                  {isDeleting ? 'Verificando...' : 'Confirmar Exclusão com Senha'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal de Restauração Padrão (Exige Senha do Admin) */}
        {isResetModalOpen && (
          <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
            <form
              onSubmit={handleConfirmReset}
              className="bg-zinc-900 border border-zinc-750 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="flex items-center space-x-3 text-amber-400">
                <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Restaurar Usuários para o Padrão?</h3>
                  <p className="text-xs text-zinc-400">Autorização obrigatória por senha</p>
                </div>
              </div>

              {resetError && (
                <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-700 text-rose-200 text-xs flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-1.5">
                <span className="font-bold text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  Atenção: Ação Crítica
                </span>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Esta ação redefinirá a base de usuários para as contas padrão de fábrica (<strong>04 Administradores ROCAM</strong> e operadores). Usuários adicionais criados serão removidos.
                </p>
              </div>

              {/* Password Input Required */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Digite sua Senha de Administrador *</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="text-[11px] text-zinc-400 hover:text-amber-400 cursor-pointer flex items-center gap-1"
                  >
                    {showResetPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showResetPassword ? 'Ocultar' : 'Exibir'}</span>
                  </button>
                </div>
                <input
                  type={showResetPassword ? 'text' : 'password'}
                  value={resetAdminPassword}
                  onChange={(e) => setResetAdminPassword(e.target.value)}
                  placeholder="Sua senha de administrador..."
                  className="w-full px-3 py-2 bg-zinc-950 border border-amber-500/50 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  autoFocus
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-3.5 py-2 text-xs text-zinc-400 hover:text-zinc-200 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md cursor-pointer disabled:opacity-50 transition"
                >
                  {isResetting ? 'Verificando...' : 'Confirmar Restauração com Senha'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Change Password Sub-Modal */}
        {userForPassChange && (
          <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
                  <KeyRound className="w-4 h-4" />
                  <span>Redefinir Senha</span>
                </div>
                <button
                  onClick={() => setUserForPassChange(null)}
                  className="text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-zinc-300">
                Digite a nova senha para o policial{' '}
                <strong className="text-white">{userForPassChange.name}</strong> (@
                {userForPassChange.username}):
              </p>
              <form onSubmit={handleChangePassSubmit} className="space-y-3">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nova senha (mínimo 4 caracteres)..."
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-750 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  autoFocus
                  required
                />
                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setUserForPassChange(null)}
                    className="px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 rounded-lg cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-bold rounded-lg bg-amber-500 text-zinc-950 hover:bg-amber-400 cursor-pointer"
                  >
                    Atualizar Senha
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
