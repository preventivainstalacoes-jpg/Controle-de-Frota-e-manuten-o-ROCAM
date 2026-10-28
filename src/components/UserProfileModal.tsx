import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  X,
  User,
  Shield,
  ClipboardCheck,
  KeyRound,
  LogOut,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Calendar,
  Building2,
  FileBadge
} from 'lucide-react';
import { formatDate } from '../utils/formatters';
import { supabase } from '../lib/supabase';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentUser, isAdmin, isOperator, logout, deleteOwnAccount } = useAuth();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  if (!isOpen || !currentUser) return null;

  const handleLogout = () => {
    logout();
    onClose();
  };

  const handleChangeOwnPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (newPassword.length < 8) {
      setErrorMessage('A nova senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMessage('A confirmação da nova senha não confere.');
      return;
    }
    if (!currentUser.email) {
      setErrorMessage('Não foi possível localizar o e-mail de autenticação desta conta. Solicite apoio ao administrador.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: currentPassword,
      });
      if (verifyError) throw new Error('Senha atual incorreta.');

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setSuccessMessage('Senha alterada com sucesso.');
    } catch (error: any) {
      setErrorMessage(error?.message || 'Não foi possível alterar a senha.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleConfirmDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!deletePassword) {
      setErrorMessage('Digite sua senha para confirmar a exclusão da conta.');
      return;
    }

    setIsDeleting(true);
    try {
      const res = await deleteOwnAccount(deletePassword);
      if (!res.success) {
        setErrorMessage(res.error || 'Erro ao excluir conta.');
        setIsDeleting(false);
        return;
      }

      setSuccessMessage('Conta excluída com sucesso. Redirecionando...');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch {
      setErrorMessage('Erro inesperado ao excluir conta.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-zinc-900 border border-zinc-750 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 space-y-0">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/70">
          <div className="flex items-center space-x-3">
            <div
              className={`p-2.5 rounded-xl border ${
                isAdmin
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}
            >
              {isAdmin ? <Shield className="w-6 h-6" /> : <ClipboardCheck className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Meu Perfil & Configurações de Acesso
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                @{currentUser.username} • {currentUser.pelotao}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-200 text-xs flex items-center space-x-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-200 text-xs flex items-center space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* User Details Card */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-850">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
                  Identificação Policial
                </span>
                <span className="text-base font-extrabold text-white">{currentUser.name}</span>
              </div>
              <span
                className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border ${
                  isAdmin
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                }`}
              >
                {isAdmin ? '👑 ADMINISTRADOR' : '🛡️ OPERADOR'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-zinc-500 block">Matrícula RE:</span>
                <span className="font-mono text-zinc-200 font-bold">{currentUser.re}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Nome de Usuário:</span>
                <span className="font-mono text-zinc-200">@{currentUser.username}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Pelotão / Unidade:</span>
                <span className="text-zinc-200">{currentUser.pelotao}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Status da Conta:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ativo & Homologado
                </span>
              </div>
            </div>
          </div>

          {/* Alteração de senha disponível para todos os perfis */}
          <form onSubmit={handleChangeOwnPassword} className="rounded-xl border border-amber-500/30 bg-zinc-950 p-4 space-y-3">
            <div className="flex items-center gap-2 text-amber-300">
              <KeyRound className="w-4 h-4" />
              <h3 className="text-sm font-bold">Alterar minha senha</h3>
            </div>
            <p className="text-[11px] text-zinc-400">Disponível para todos os usuários. A alteração afeta somente sua própria conta.</p>
            <div>
              <label className="block text-xs text-zinc-300 mb-1">Senha atual</label>
              <input type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-500" placeholder="Digite sua senha atual" />
            </div>
            <div>
              <label className="block text-xs text-zinc-300 mb-1">Nova senha (mínimo 8 caracteres)</label>
              <input type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-500" placeholder="Digite a nova senha" />
            </div>
            <div>
              <label className="block text-xs text-zinc-300 mb-1">Confirmar nova senha</label>
              <input type="password" autoComplete="new-password" minLength={8} value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} required className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-500" placeholder="Repita a nova senha" />
            </div>
            <button type="submit" disabled={isChangingPassword} className="w-full rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-zinc-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60">
              {isChangingPassword ? 'Alterando senha...' : 'Salvar nova senha'}
            </button>
          </form>

          {/* Actions List */}
          <div className="space-y-2">
            {/* Sair do Sistema */}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition cursor-pointer text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-zinc-800 text-rose-400">
                  <LogOut className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-100">Sair do Sistema (Logout)</div>
                  <div className="text-[11px] text-zinc-400">Encerra com segurança a sessão no dispositivo</div>
                </div>
              </div>
              <span className="text-xs text-rose-400 font-bold">Desconectar</span>
            </button>
          </div>

          {/* Zona de Perigo: Excluir Conta */}
          <div className="pt-2 border-t border-zinc-800">
            {!showDeleteConfirm ? (
              <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-900/40 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir Minha Conta</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    Remoção definitiva das credenciais deste militar
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 text-xs font-semibold transition cursor-pointer"
                >
                  Excluir Conta
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleConfirmDeleteAccount}
                className="p-4 rounded-xl bg-rose-950/30 border border-rose-700/60 space-y-3 animate-in fade-in"
              >
                <div className="flex items-center space-x-2 text-rose-400 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Confirmação de Exclusão Permanente de Conta</span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Ao confirmar, seu login <strong>@{currentUser.username}</strong> será excluído.
                  Suas cautelas e registros operacionais permanecerão no histórico da unidade.
                </p>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Digite sua senha atual para confirmar:
                  </label>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Sua senha..."
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-750 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500 font-mono"
                    autoFocus
                    required
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeletePassword('');
                      setErrorMessage('');
                    }}
                    className="px-3 py-1.5 text-xs rounded-lg text-zinc-400 hover:text-zinc-200 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isDeleting}
                    className="px-4 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-md transition cursor-pointer disabled:opacity-50"
                  >
                    {isDeleting ? 'Excluindo...' : 'Confirmar Exclusão de Conta'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
