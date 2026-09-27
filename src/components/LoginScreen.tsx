import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
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
  Clock
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

      setSuccessMsg('Usuário cadastrado com sucesso! Entrando no sistema...');

      // Auto-login immediately
      const loginRes = await login(regUsername.trim(), regPassword.trim());
      if (!loginRes.success) {
        setActiveTab('login');
        setIdentifier(regUsername.trim());
        setSuccessMsg('Cadastro realizado com sucesso! Digite sua senha para entrar.');
      }
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
      await quickLoginAs(role, specificUserId);
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
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Controle de Frota & Logística
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 font-medium mt-1">
              Sistema Tático de Gestão, Cautelas e Manutenção
            </p>
          </div>
        </div>

        {/* Box Card */}
        <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-2xl p-5 sm:p-7 shadow-2xl shadow-black/80 space-y-5">
          {/* Top Tabs: Login vs Register */}
          <div className="flex border-b border-zinc-800 pb-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 pb-2 text-xs font-bold transition flex items-center justify-center space-x-2 border-b-2 cursor-pointer ${
                activeTab === 'login'
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Acessar Conta</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 pb-2 text-xs font-bold transition flex items-center justify-center space-x-2 border-b-2 cursor-pointer ${
                activeTab === 'register'
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Cadastrar Novo Usuário</span>
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
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Usuário / RE */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                  <span>Usuário ou RE Funcional</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Ex: admin ou 145.892-0</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Nome de usuário ou RE..."
                    className="w-full pl-10 pr-3 py-2.5 bg-zinc-950/80 border border-zinc-750 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                    disabled={isSubmitting || isLoading}
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              </div>

              {/* Senha */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                  <span>Senha de Acesso</span>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-zinc-400 hover:text-amber-400 transition cursor-pointer flex items-center gap-1"
                  >
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showPassword ? 'Ocultar' : 'Exibir'}</span>
                  </button>
                </label>
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
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-800" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
                  <span className="bg-zinc-900 px-3 text-amber-400 flex items-center gap-1.5">
                    <Shield className="w-3 h-3" />
                    <span>Acesso Rápido — 04 Administradores ROCAM</span>
                  </span>
                </div>
              </div>

              {/* Cards dos 04 Administradores */}
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(users.filter((u) => u.role === 'ADMIN' && u.isActive && u.status === 'ATIVO').length > 0
                    ? users.filter((u) => u.role === 'ADMIN' && u.isActive && u.status === 'ATIVO')
                    : [
                        { id: 'usr-admin-01', username: 'admin', name: 'Cap PM Souza', graduacao: 'CAP PM', re: '000.001-0', role: 'ADMIN' as const, pelotao: 'Comando & Logística ROCAM' },
                        { id: 'usr-admin-02', username: 'admin2', name: 'Maj PM Costa', graduacao: 'MAJ PM', re: '000.002-1', role: 'ADMIN' as const, pelotao: 'Subcomando ROCAM' },
                        { id: 'usr-admin-03', username: 'admin3', name: 'Cap PM Almeida', graduacao: 'CAP PM', re: '000.003-2', role: 'ADMIN' as const, pelotao: '1ª Cia Coordenação' },
                        { id: 'usr-admin-04', username: 'admin4', name: '1º Ten PM Ribeiro', graduacao: '1º TEN PM', re: '000.004-3', role: 'ADMIN' as const, pelotao: 'Motomecanização & Frota' },
                      ]
                  ).map((adminUser, idx) => (
                    <button
                      key={adminUser.id || `admin-${idx}`}
                      type="button"
                      onClick={() => handleQuickLogin('ADMIN', adminUser.id)}
                      disabled={isSubmitting || isLoading}
                      className="text-left p-2.5 rounded-xl bg-zinc-950/70 hover:bg-zinc-900 border border-amber-500/30 hover:border-amber-500/70 transition group cursor-pointer flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex items-center space-x-2">
                          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 group-hover:bg-amber-500 group-hover:text-zinc-950 transition shrink-0">
                            <Shield className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-zinc-100 truncate">
                              {adminUser.name}
                            </div>
                            <div className="text-[10px] text-zinc-400 font-mono">
                              RE {adminUser.re}
                            </div>
                          </div>
                        </div>
                        <span className="text-[9px] px-1 py-0.2 rounded font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                          ADM {idx + 1}
                        </span>
                      </div>
                      <div className="mt-2 pt-1.5 border-t border-zinc-800/60 flex items-center justify-between text-[10px]">
                        <span className="text-zinc-400 font-mono">@{adminUser.username}</span>
                        <span className="text-amber-400 font-semibold group-hover:translate-x-0.5 transition flex items-center gap-0.5">
                          Entrar &rarr;
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Card Operador */}
                <button
                  type="button"
                  onClick={() => handleQuickLogin('OPERADOR')}
                  disabled={isSubmitting || isLoading}
                  className="w-full text-left p-2.5 rounded-xl bg-zinc-950/60 hover:bg-zinc-900 border border-emerald-500/30 hover:border-emerald-500/60 transition group cursor-pointer mt-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-zinc-950 transition">
                        <ClipboardCheck className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-zinc-100">Cb PM Oliveira</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            OPERADOR
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono">
                          RE 145.892-0 • @operador • 1º Pelotão ROCAM
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-emerald-400 group-hover:translate-x-0.5 transition font-semibold">
                      Entrar &rarr;
                    </span>
                  </div>
                </button>

                <div className="text-center pt-1">
                  <span className="text-[10px] text-zinc-400">
                    Senha padrão dos administradores: <code className="text-amber-400 font-mono">admin123</code> | Operadores: <code className="text-emerald-400 font-mono">operador123</code>
                  </span>
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: CADASTRAR NOVO USUÁRIO */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
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
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-zinc-950 font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 active:scale-[0.99] transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isSubmitting ? 'Cadastrando...' : 'Cadastrar e Acessar Sistema'}</span>
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
    </div>
  );
};
