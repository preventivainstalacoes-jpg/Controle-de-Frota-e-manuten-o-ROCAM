import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { SEED_ADMINS, SEED_OPERATORS } from '../data/seedUsers';
import {
  Shield,
  Lock,
  User,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  KeyRound,
  Bike,
  Sparkles,
  ClipboardCheck,
  Wrench,
  Database,
  UserPlus,
  LogIn,
  Clock,
  Users,
  Search,
  ChevronDown,
  ChevronUp,
  X,
  Mail,
  Zap
} from 'lucide-react';

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

export const LoginScreen: React.FC = () => {
  const { login, quickLoginAs, registerUserRequest, isLoading, users } = useAuth();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Login form state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register form state
  const [regGraduacao, setRegGraduacao] = useState('CB PM');
  const [regName, setRegName] = useState('');
  const [regRE, setRegRE] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPelotao, setRegPelotao] = useState('1º Pelotão ROCAM');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('OPERADOR');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Status & Feedback
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Contingent modal and quick access state (20 admins & 300 operators)
  const [isContingentModalOpen, setIsContingentModalOpen] = useState(false);
  const [contingentTab, setContingentTab] = useState<'ADMIN' | 'OPERADOR'>('ADMIN');
  const [contingentSearch, setContingentSearch] = useState('');
  const [showAllAdmins, setShowAllAdmins] = useState(false);
  const [opNumberInput, setOpNumberInput] = useState('');

  const adminUsers = users.filter((u) => u.role === 'ADMIN' && u.isActive && u.status === 'ATIVO');
  const operatorUsers = users.filter((u) => u.role === 'OPERADOR' && u.isActive && u.status === 'ATIVO');

  const handleQuickOpSelect = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(opNumberInput.trim(), 10);
    if (isNaN(num) || num < 1 || num > 300) {
      setErrorMsg('Informe um número de operador válido entre 1 e 300.');
      return;
    }
    const targetId = `usr-operador-${String(num).padStart(3, '0')}`;
    const targetUser = users.find((u) => u.id === targetId || u.username === `op${String(num).padStart(3, '0')}`);
    if (targetUser) {
      handleQuickLogin('OPERADOR', targetUser.id);
    } else {
      handleQuickLogin('OPERADOR');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!identifier.trim()) {
      setErrorMsg('Por favor, informe seu usuário ou RE funcional.');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('Por favor, digite sua senha de acesso.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login(identifier, password);
      if (!res.success) {
        setErrorMsg(res.error || 'Credenciais inválidas. Tente novamente.');
      }
    } catch {
      setErrorMsg('Erro inesperado ao realizar autenticação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!regName.trim() || !regRE.trim() || !regUsername.trim() || !regPassword.trim()) {
      setErrorMsg('Preencha todos os campos obrigatórios (*).');
      return;
    }

    if (regPassword.length < 4) {
      setErrorMsg('A senha deve ter no mínimo 4 caracteres.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMsg('A confirmação da senha não confere.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await registerUserRequest({
        name: `${regGraduacao} ${regName.trim()}`,
        graduacao: regGraduacao,
        re: regRE.trim(),
        email: regEmail.trim().toLowerCase() || undefined,
        pelotao: regPelotao.trim(),
        username: regUsername.trim(),
        password: regPassword.trim(),
        role: regRole,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Erro ao realizar cadastro.');
        setIsSubmitting(false);
        return;
      }

      // Registration is pending admin approval
      setSuccessMsg(
        'Solicitação de cadastro enviada com sucesso! O cadastro de um novo usuário é concluído após confirmação de um Administrador. Assim que o comando homologar seu acesso, você poderá entrar no sistema.'
      );
      setActiveTab('login');
      setIdentifier(regUsername.trim());
      setPassword('');
      setRegName('');
      setRegRE('');
      setRegEmail('');
      setRegUsername('');
      setRegPassword('');
      setRegConfirmPassword('');
    } catch {
      setErrorMsg('Erro inesperado ao realizar cadastro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (role: 'ADMIN' | 'OPERADOR', specificUserId?: string) => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);
    try {
      const ok = await quickLoginAs(role, specificUserId);
      if (!ok) {
        await quickLoginAs(role);
      }
    } catch (err: any) {
      console.error('Quick login error:', err);
      // Fallback
      await quickLoginAs(role);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-center items-center px-4 py-8 sm:px-6 lg:px-8 selection:bg-amber-500 selection:text-black relative overflow-hidden">
      {/* Background Decorative Gradients & Tactical Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-zinc-950 to-zinc-950 pointer-events-none" />
      <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-lg z-10 space-y-5">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-zinc-900 border border-amber-500/30 shadow-2xl shadow-amber-500/10 ring-1 ring-amber-500/20">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-zinc-950">
              <Shield className="w-8 h-8 stroke-[2.5]" />
            </div>
          </div>

          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span>Polícia Militar</span>
              <span>•</span>
              <span>ROCAM</span>
              <span>•</span>
              <span className="font-mono text-zinc-300">rocammecanizacao.com.br</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              ROCAM Mecanização
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 font-medium mt-1">
              Controle Tático de Frota, Cautelas e Manutenção
            </p>
          </div>
        </div>

        {/* Box Card */}
        <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-2xl p-5 sm:p-7 shadow-2xl shadow-black/80 space-y-5">
          {/* Top Tabs: Login vs Register */}
          <div className="flex border-b border-zinc-800 pb-2 gap-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 pb-2 text-xs font-bold transition flex items-center justify-center space-x-1.5 border-b-2 cursor-pointer ${
                activeTab === 'login'
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Entrar</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 pb-2 text-xs font-bold transition flex items-center justify-center space-x-1.5 border-b-2 cursor-pointer ${
                activeTab === 'register'
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Solicitar Cadastro</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-700/70 text-rose-200 text-xs flex items-start space-x-2.5 animate-in fade-in duration-200">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-700/70 text-emerald-200 text-xs flex items-start space-x-2.5 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: LOGIN */}
          {activeTab === 'login' && (
            <div className="space-y-4">
              {/* BOTÃO EM DESTAQUE: ACESSO RÁPIDO DO 1º ADMINISTRADOR (1 CLIQUE) */}
              {(() => {
                const firstAdminUser = adminUsers[0] || SEED_ADMINS[0];
                return (
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-amber-500/25 via-amber-500/10 to-amber-600/25 border-2 border-amber-500/70 shadow-xl shadow-amber-500/20 space-y-3 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                    
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-2 rounded-xl bg-amber-500 text-zinc-950 font-black shadow-md shadow-amber-500/30">
                          <Shield className="w-5 h-5 stroke-[2.5]" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-xs sm:text-sm font-black text-amber-300 uppercase tracking-wide">
                              1º Administrador Master
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-amber-500/30 text-amber-200 border border-amber-500/50">
                              OFICIAL
                            </span>
                          </div>
                          <span className="text-xs text-zinc-200 font-bold block">
                            {firstAdminUser.name} • RE {firstAdminUser.re}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-400 text-zinc-950 uppercase tracking-wider font-mono shadow-sm flex items-center gap-1">
                        <Zap className="w-3 h-3 fill-zinc-950" />
                        1 Clique
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleQuickLogin('ADMIN', firstAdminUser.id)}
                      disabled={isSubmitting || isLoading}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-zinc-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-500/30 active:scale-[0.98] transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 ring-2 ring-amber-400/50 relative z-10"
                      title="Clique para entrar imediatamente como o 1º Administrador Master"
                    >
                      <Zap className="w-4 h-4 fill-zinc-950 stroke-zinc-950" />
                      <span>{isSubmitting ? 'Acessando...' : 'Acessar como 1º Administrador Master'}</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </button>

                    <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-amber-500/20">
                      <span className="text-amber-400/90 font-semibold">Login direto sem necessidade de senha</span>
                      <span className="font-mono text-zinc-400">@admin (Acesso Total)</span>
                    </div>
                  </div>
                );
              })()}

              {/* Divisor "OU ACESSO COM CREDENCIAIS" */}
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-800" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
                  <span className="bg-zinc-900 px-3 text-zinc-400">
                    Ou entrar manualmente com usuário e senha
                  </span>
                </div>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Usuário / RE */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                  <span>Usuário, E-mail ou RE Funcional</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Ex: admin, e-mail ou 145.892-0</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Usuário (@admin), e-mail ou RE..."
                    className="w-full pl-10 pr-3 py-2.5 bg-zinc-950/80 border border-zinc-750 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                    disabled={isSubmitting || isLoading}
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              </div>

              {/* Senha */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300">
                    Senha de Acesso
                  </label>
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[11px] text-zinc-400 hover:text-amber-400 transition cursor-pointer flex items-center gap-1"
                    >
                      {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showPassword ? 'Ocultar' : 'Exibir'}</span>
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-zinc-950/80 border border-zinc-750 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition font-mono"
                    disabled={isSubmitting || isLoading}
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {/* Botão Entrar */}
              <button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-sm shadow-lg shadow-amber-500/20 active:scale-[0.99] transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Verificando...' : 'Acessar Sistema'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Botão de Atalho para Cadastro */}
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    setErrorMsg('');
                  }}
                  className="text-xs text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-4 cursor-pointer"
                >
                  Não possui cadastro? Cadastre seu usuário aqui
                </button>
              </div>

              {/* Divisor */}
              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-800" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
                  <span className="bg-zinc-900 px-3 text-amber-400 flex items-center gap-1.5">
                    <Shield className="w-3 h-3" />
                    <span>Acesso Rápido — 1º Administrador Master</span>
                  </span>
                </div>
              </div>

              {/* Card do 1º Administrador Master */}
              {(() => {
                const firstAdminUser = adminUsers[0] || SEED_ADMINS[0];
                return (
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('ADMIN', firstAdminUser.id)}
                    disabled={isSubmitting || isLoading}
                    className="w-full text-left p-3 rounded-xl bg-zinc-950/80 hover:bg-zinc-900 border border-amber-500/40 hover:border-amber-400 transition group cursor-pointer flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 group-hover:bg-amber-500 group-hover:text-zinc-950 transition shrink-0">
                          <Shield className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs sm:text-sm font-bold text-zinc-100 truncate">
                              {firstAdminUser.name}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              1º ADMIN MASTER
                            </span>
                          </div>
                          <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                            RE {firstAdminUser.re} • @{firstAdminUser.username} • Senha: admin123
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-amber-400 group-hover:translate-x-0.5 transition font-semibold shrink-0">
                        Entrar &rarr;
                      </span>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px]">
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <span>👑 Acesso Total</span>
                        <span className="text-zinc-500">•</span>
                        <span className="text-zinc-400 font-normal">Frota, O.S., Relatórios, Banco de Dados e Usuários</span>
                      </span>
                      <span className="text-zinc-400 font-mono">1 de 20</span>
                    </div>
                  </button>
                );
              })()}

              {/* Operador Card ou Status de Operadores */}
              {operatorUsers.length > 0 ? (
                <button
                  type="button"
                  onClick={() => handleQuickLogin('OPERADOR', operatorUsers[0].id)}
                  disabled={isSubmitting || isLoading}
                  className="w-full text-left p-2.5 rounded-xl bg-zinc-950/70 hover:bg-zinc-900 border border-emerald-500/40 hover:border-emerald-400 transition group cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-zinc-950 transition shrink-0">
                        <ClipboardCheck className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-zinc-100 truncate">
                          {operatorUsers[0].name}
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono">
                          RE {operatorUsers[0].re} • @{operatorUsers[0].username} • Senha: operador123
                        </div>
                      </div>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                      OP 01
                    </span>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-zinc-800/60 flex items-center justify-between text-[10px]">
                    <span className="text-emerald-400 font-bold">Acesso Limitado (Cautelas & Avarias)</span>
                    <span className="text-emerald-400 font-semibold group-hover:translate-x-0.5 transition flex items-center gap-0.5">
                      Entrar &rarr;
                    </span>
                  </div>
                </button>
              ) : (
                <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-850 text-xs flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ClipboardCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div>
                      <span className="text-zinc-300 font-semibold block text-[11px]">
                        0 de 300 Operadores Cadastrados
                      </span>
                      <span className="text-zinc-500 text-[10px] block">
                        Novos operadores podem ser cadastrados na aba "+ Cadastrar Novo Usuário"
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('register');
                      setRegRole('OPERADOR');
                    }}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold underline underline-offset-2 shrink-0 cursor-pointer"
                  >
                    + Cadastrar
                  </button>
                </div>
              )}

              {/* Se houver outros administradores cadastrados (até 20) */}
              {adminUsers.length > 1 && (
                <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-400 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" />
                      <span>Demais Administradores ({adminUsers.length} de 20)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAllAdmins(!showAllAdmins)}
                      className="text-[11px] text-zinc-400 hover:text-amber-400 transition cursor-pointer flex items-center gap-0.5"
                    >
                      <span>{showAllAdmins ? 'Recolher' : 'Ver todos'}</span>
                      {showAllAdmins ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {adminUsers
                      .slice(1, showAllAdmins ? adminUsers.length : 5)
                      .map((adm, idx) => {
                        const num = idx + 2;
                        const numStr = String(num).padStart(2, '0');
                        return (
                          <button
                            key={adm.id}
                            type="button"
                            onClick={() => handleQuickLogin('ADMIN', adm.id)}
                            disabled={isSubmitting || isLoading}
                            className="px-2 py-1.5 rounded-lg bg-zinc-900 hover:bg-amber-500 hover:text-zinc-950 border border-amber-500/20 hover:border-amber-400 text-left transition group cursor-pointer flex items-center justify-between"
                            title={`Entrar como ${adm.name} (@${adm.username})`}
                          >
                            <div className="min-w-0 pr-1">
                              <span className="text-[10px] font-mono font-bold block text-amber-400 group-hover:text-zinc-950">
                                ADM {numStr}
                              </span>
                              <span className="text-[9px] text-zinc-400 group-hover:text-zinc-900 truncate block">
                                {adm.name.replace(/PM\s+/, '')}
                              </span>
                            </div>
                            <ArrowRight className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100 shrink-0" />
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Seletor Rápido: Se houver mais de 1 Operador */}
              {operatorUsers.length > 1 && (
                <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <ClipboardCheck className="w-3.5 h-3.5" />
                      <span>Operadores Cadastrados ({operatorUsers.length} de 300)</span>
                    </span>
                  </div>

                  {/* Input direto por número */}
                  <div className="flex items-center gap-1.5">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min={1}
                        max={300}
                        value={opNumberInput}
                        onChange={(e) => setOpNumberInput(e.target.value)}
                        placeholder="Nº do Operador (1 a 300)..."
                        className="w-full px-2.5 py-1.5 text-xs bg-zinc-900 border border-zinc-750 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleQuickOpSelect}
                      disabled={isSubmitting || isLoading || !opNumberInput.trim()}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-zinc-950 border border-emerald-500/40 text-xs font-bold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                    >
                      Acessar
                    </button>
                  </div>
                </div>
              )}

              <div className="text-center pt-1">
                <span className="text-[10px] text-zinc-400">
                  Senha padrão do 1º Administrador: <code className="text-amber-400 font-mono">admin123</code> | Operadores: <code className="text-emerald-400 font-mono">operador123</code>
                </span>
              </div>
            </form>
          </div>
          )}

          {/* TAB 2: CADASTRAR NOVO USUÁRIO */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              {/* Alerta Institucional: Confirmação de Admin Necessária */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start space-x-2.5">
                <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-white block">Confirmação de Admin Obrigatória</span>
                  <p className="text-zinc-300 text-[11px] leading-relaxed">
                    O cadastro de um novo usuário é concluído após confirmação de um Administrador da ROCAM. Seus dados serão enviados para análise do comando para homologação e liberação do acesso.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Posto / Graduação */}
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Graduação *
                  </label>
                  <select
                    value={regGraduacao}
                    onChange={(e) => setRegGraduacao(e.target.value)}
                    className="w-full px-2.5 py-2 bg-zinc-950 border border-zinc-750 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  >
                    {MILITARY_RANKS.map((r) => (
                      <option key={r} value={r}>
                        {r}
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
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Ex: Costa, Silva, Oliveira..."
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-750 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Matrícula RE */}
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Matrícula RE *
                  </label>
                  <input
                    type="text"
                    value={regRE}
                    onChange={(e) => setRegRE(e.target.value)}
                    placeholder="Ex: 145.892-0"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-750 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 font-mono"
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
                    value={regPelotao}
                    onChange={(e) => setRegPelotao(e.target.value)}
                    placeholder="Ex: 1º Pelotão ROCAM"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-750 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* E-mail Institucional ou Pessoal */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  E-mail do Militar (Institucional ou Pessoal)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="Ex: policial.nome@policiamilitar.sp.gov.br"
                    className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-750 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Login */}
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Nome de Usuário (Login) *
                  </label>
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="Ex: sd.silva ou 145892"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-750 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 font-mono"
                    required
                  />
                </div>

                {/* Senha */}
                <div>
                  <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between mb-1">
                    <span>Senha *</span>
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="text-[10px] text-zinc-400 hover:text-amber-400"
                    >
                      {showRegPassword ? 'Ocultar' : 'Exibir'}
                    </button>
                  </label>
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-750 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 font-mono"
                    required
                  />
                </div>
              </div>

              {/* Confirmar Senha */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Confirmar Senha *
                </label>
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="Repita a senha de acesso"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-750 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 font-mono"
                  required
                />
              </div>

              {/* Perfil de Acesso (RBAC) */}
              <div className="space-y-1 pt-1">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Perfil de Acesso & Autorização *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label
                    className={`p-2.5 rounded-xl border flex items-start space-x-2.5 cursor-pointer transition ${
                      regRole === 'OPERADOR'
                        ? 'bg-emerald-500/15 border-emerald-500 text-white'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-750'
                    }`}
                  >
                    <input
                      type="radio"
                      name="regRole"
                      value="OPERADOR"
                      checked={regRole === 'OPERADOR'}
                      onChange={() => setRegRole('OPERADOR')}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="font-bold text-xs text-emerald-400 flex items-center gap-1">
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        <span>Operador (Limitado)</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-0.5 leading-snug">
                        Cautela de viaturas, acompanhamento de suas cautelas e avarias.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`p-2.5 rounded-xl border flex items-start space-x-2.5 cursor-pointer transition ${
                      regRole === 'ADMIN'
                        ? 'bg-amber-500/15 border-amber-500 text-white'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-750'
                    }`}
                  >
                    <input
                      type="radio"
                      name="regRole"
                      value="ADMIN"
                      checked={regRole === 'ADMIN'}
                      onChange={() => setRegRole('ADMIN')}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="font-bold text-xs text-amber-400 flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5" />
                        <span>Admin (Acesso Total)</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-0.5 leading-snug">
                        Autorização para todas as ações, frota, O.S. e usuários.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Botão Cadastrar */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 active:scale-[0.99] transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isSubmitting ? 'Enviando solicitação...' : 'Enviar Solicitação de Cadastro'}</span>
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setErrorMsg('');
                  }}
                  className="text-xs text-zinc-400 hover:text-white transition cursor-pointer"
                >
                  Já possui login? Voltar para o acesso &rarr;
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Security badges info footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-500 gap-2 px-2 text-center sm:text-left">
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Sessão Local Criptografada e Segura (SHA-256)</span>
          </div>
          <div className="font-mono text-[10px]">
            ROCAM • 1º BPChq • Seção Logística
          </div>
        </div>
      </div>

      {/* MODAL: SELETOR DE CONTINGENTE (20 ADMINS & 300 OPERADORES) */}
      {isContingentModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-zinc-900 border border-zinc-750 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/80">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span>Contingente ROCAM Habilitado</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                      320 Militares
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400">
                    20 Administradores (Acesso Total) • 300 Operadores (Acesso Limitado)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsContingentModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs & Search */}
            <div className="p-3 border-b border-zinc-800 bg-zinc-950/40 space-y-2.5">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setContingentTab('ADMIN')}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                    contingentTab === 'ADMIN'
                      ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                      : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>20 Administradores (Total)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setContingentTab('OPERADOR')}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                    contingentTab === 'OPERADOR'
                      ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                      : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  <span>300 Operadores (Limitado)</span>
                </button>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
                <input
                  type="text"
                  value={contingentSearch}
                  onChange={(e) => setContingentSearch(e.target.value)}
                  placeholder={
                    contingentTab === 'ADMIN'
                      ? 'Buscar nos 20 Administradores (nome, RE, @login)...'
                      : 'Buscar nos 300 Operadores (nome, RE, @op)...'
                  }
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Users List */}
            <div className="flex-1 overflow-y-auto p-3 divide-y divide-zinc-800/80">
              {(() => {
                const baseList =
                  contingentTab === 'ADMIN'
                    ? adminUsers.length > 0
                      ? adminUsers
                      : SEED_ADMINS
                    : operatorUsers.length > 0
                    ? operatorUsers
                    : SEED_OPERATORS;

                const list = baseList.filter((u) => {
                  if (!contingentSearch.trim()) return true;
                  const term = contingentSearch.toLowerCase().trim();
                  return (
                    u.name.toLowerCase().includes(term) ||
                    u.username.toLowerCase().includes(term) ||
                    u.re.toLowerCase().includes(term) ||
                    u.pelotao.toLowerCase().includes(term)
                  );
                });

                if (list.length === 0) {
                  return (
                    <div className="p-8 text-center text-xs text-zinc-500">
                      Nenhum militar localizado na busca.
                    </div>
                  );
                }

                return list.map((user, idx) => (
                  <div
                    key={user.id}
                    className="py-2.5 px-2 flex items-center justify-between hover:bg-zinc-950/60 rounded-xl transition"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          user.role === 'ADMIN'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {user.role === 'ADMIN' ? (
                          <Shield className="w-3.5 h-3.5" />
                        ) : (
                          <ClipboardCheck className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-bold text-zinc-100 truncate">
                            {user.name}
                          </span>
                          <span
                            className={`text-[9px] px-1 py-0.2 rounded font-mono font-bold shrink-0 ${
                              user.role === 'ADMIN'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            {user.role === 'ADMIN' ? `ADM ${(idx + 1).toString().padStart(2, '0')}` : `@${user.username}`}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-400 flex flex-wrap items-center gap-x-1.5 font-mono">
                          <span>RE: {user.re}</span>
                          <span>•</span>
                          <span className="text-zinc-500">{user.pelotao}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        setIsContingentModalOpen(false);
                        await handleQuickLogin(user.role, user.id);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 flex items-center space-x-1 ${
                        user.role === 'ADMIN'
                          ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950'
                      }`}
                    >
                      <span>Entrar</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ));
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-between text-[11px] text-zinc-400">
              <span>
                Senha padrão:{' '}
                <code className="text-amber-400 font-mono">admin123</code> (Admin) |{' '}
                <code className="text-emerald-400 font-mono">operador123</code> (Operador)
              </span>
              <button
                type="button"
                onClick={() => setIsContingentModalOpen(false)}
                className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
