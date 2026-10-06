import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, UserRole } from '../types';
import { supabase } from '../lib/supabase';
import {
  loadUsersFromStorage,
  saveUsersToStorage,
  getSavedSession,
  saveSavedSession,
  clearSavedSession,
  createSessionForUser,
  authenticateCredentials,
  hashPassword,
  verifyPassword,
  generateSalt,
  resetUsersToFirstAdmin,
  MAX_ADMINS,
  MAX_OPERATORS,
  FIRST_ADMIN,
  INITIAL_USERS,
} from '../utils/security';

interface AuthContextType {
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isOperator: boolean;
  users: UserProfile[];
  hasAdmin: boolean;
  pendingUsers: UserProfile[];
  pendingApprovalsCount: number;
  isLoading: boolean;
  login: (identifier: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  quickLoginAs: (role: 'ADMIN' | 'OPERADOR', specificUserId?: string) => Promise<boolean>;
  logout: () => void;
  registerFirstAdmin: (data: {
    email: string;
    name: string;
    password: string;
  }) => Promise<{ success: boolean; error?: string; needsEmailConfirmation?: boolean }>;
  registerUserRequest: (data: {
    username: string;
    email?: string;
    name: string;
    graduacao: string;
    re: string;
    role: UserRole;
    pelotao: string;
    password: string;
  }) => Promise<{ success: boolean; error?: string }>;
  createUser: (data: {
    username: string;
    email?: string;
    name: string;
    graduacao: string;
    re: string;
    role: UserRole;
    pelotao: string;
    password: string;
  }) => Promise<{ success: boolean; error?: string }>;
  approveUser: (userId: string, targetRole?: UserRole) => Promise<{ success: boolean; error?: string }>;
  rejectUser: (userId: string, motivo?: string) => Promise<{ success: boolean; error?: string }>;
  updateUser: (userId: string, data: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (userId: string, adminPassword?: string) => Promise<{ success: boolean; error?: string }>;
  deleteMultipleUsers: (userIds: string[]) => Promise<{ success: boolean; deletedCount: number; error?: string }>;
  deleteOwnAccount: (password: string) => Promise<{ success: boolean; error?: string }>;
  changePassword: (userId: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
  resetPasswordByRecovery: (
    identifier: string,
    emailOrRe: string,
    newPass: string
  ) => Promise<{ success: boolean; error?: string }>;
  toggleUserActive: (userId: string) => Promise<{ success: boolean; error?: string }>;
  resetUsersToDefault: (adminPassword?: string) => Promise<{ success: boolean; error?: string }>;
  resetToFirstAdmin: (customAdminData?: {
    username: string;
    name: string;
    graduacao: string;
    re: string;
    pelotao: string;
    password: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [hasAdmin, setHasAdmin] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Authentication is backed by Supabase Auth so the same account works on every device.
  useEffect(() => {
    let mounted = true;

    const loadProfile = async (authUserId: string): Promise<UserProfile | null> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,email,full_name,role,active,created_at')
        .eq('id', authUserId)
        .maybeSingle();
      if (error) {
        console.error('Erro ao carregar perfil Supabase:', error);
        return null;
      }
      if (!data) return null;
      const role = String(data.role).toUpperCase() === 'ADMIN' ? 'ADMIN' : 'OPERADOR';
      return {
        id: data.id,
        username: data.email?.split('@')[0] || data.id.slice(0, 8),
        email: data.email || undefined,
        name: data.full_name || 'Usuário ROCAM',
        re: '',
        graduacao: '',
        role,
        pelotao: 'ROCAM',
        passwordHash: '',
        salt: '',
        createdAt: data.created_at || new Date().toISOString(),
        isActive: Boolean(data.active),
        status: data.active ? 'ATIVO' : 'INATIVO',
        lastLogin: new Date().toISOString(),
      };
    };

    const loadAllProfiles = async (): Promise<UserProfile[]> => {
      const { data, error } = await supabase.from('profiles').select('id,email,full_name,role,active,created_at');
      if (error) { console.error('Erro ao carregar usuários:', error); return []; }
      return (data || []).map((p:any) => ({
        id:p.id, username:p.email?.split('@')[0] || p.id.slice(0,8), email:p.email || undefined,
        name:p.full_name || 'Usuário ROCAM', re:'', graduacao:'', role:String(p.role).toUpperCase()==='ADMIN'?'ADMIN':'OPERADOR',
        pelotao:'ROCAM',passwordHash:'',salt:'',createdAt:p.created_at || new Date().toISOString(),
        isActive:Boolean(p.active),status:p.active?'ATIVO':'INATIVO',lastLogin:new Date().toISOString()
      }));
    };

    const init = async () => {
      try {
        const allProfiles = await loadAllProfiles();
        if (mounted) setUsers(allProfiles);
        const { data: adminExists } = await supabase.rpc('has_admin');
        if (mounted) setHasAdmin(Boolean(adminExists));

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          const profile = await loadProfile(session.user.id);
          if (profile?.isActive) {
            setCurrentUser(profile);
            setUsers((prev) => [profile, ...prev.filter((u) => u.id !== profile.id)]);
          } else {
            await supabase.auth.signOut();
          }
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    init();
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (!session?.user) {
        setCurrentUser(null);
        return;
      }
      const profile = await loadProfile(session.user.id);
      if (profile?.isActive) {
        setCurrentUser(profile);
        setUsers((prev) => [profile, ...prev.filter((u) => u.id !== profile.id)]);
      } else {
        await supabase.auth.signOut();
        setCurrentUser(null);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = async (identifier: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    const clean = identifier.trim().toLowerCase();
    if (!clean || !pass) return { success: false, error: 'Informe usuário/e-mail e senha.' };

    // Prefer e-mail. For legacy username/RE, resolve it through profiles when those columns exist.
    let email = clean;
    if (!clean.includes('@')) {
      const { data } = await supabase.from('profiles').select('email').or('email.eq.' + clean).maybeSingle();
      if (data?.email) email = data.email;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error || !data.user) return { success: false, error: error?.message || 'Credenciais inválidas.' };

    const { data: profile, error: profileError } = await supabase
      .from('profiles').select('id,email,full_name,role,active,created_at').eq('id', data.user.id).single();
    if (profileError || !profile) {
      await supabase.auth.signOut();
      return { success: false, error: 'Usuário autenticado, mas sem perfil no sistema.' };
    }
    if (!profile.active) {
      await supabase.auth.signOut();
      return { success: false, error: 'Seu acesso está inativo. Procure um administrador.' };
    }

    const user: UserProfile = {
      id: profile.id, username: profile.email?.split('@')[0] || profile.id.slice(0,8), email: profile.email || undefined,
      name: profile.full_name || 'Usuário ROCAM', re: '', graduacao: '',
      role: String(profile.role).toUpperCase() === 'ADMIN' ? 'ADMIN' : 'OPERADOR', pelotao: 'ROCAM',
      passwordHash: '', salt: '', createdAt: profile.created_at || new Date().toISOString(),
      isActive: true, status: 'ATIVO', lastLogin: new Date().toISOString()
    };
    setCurrentUser(user);
    setUsers((prev) => [user, ...prev.filter((u) => u.id !== user.id)]);
    return { success: true };
  };

  const quickLoginAs = async (_role: 'ADMIN' | 'OPERADOR', _specificUserId?: string): Promise<boolean> => {
    return false;
  };

  const logout = () => {
    void supabase.auth.signOut();
    setCurrentUser(null);
  };

  /**
   * First-admin bootstrap. The database trigger assigns ADMIN only when no
   * administrator exists. Supabase Auth remains responsible for passwords.
   */
  const registerFirstAdmin = async (data: {
    email: string;
    name: string;
    password: string;
  }): Promise<{ success: boolean; error?: string; needsEmailConfirmation?: boolean }> => {
    const email = data.email.trim().toLowerCase();
    const name = data.name.trim();
    if (!email || !email.includes('@')) return { success: false, error: 'Informe um e-mail válido.' };
    if (!name) return { success: false, error: 'Informe o nome do administrador.' };
    if (data.password.length < 6) return { success: false, error: 'A senha deve ter no mínimo 6 caracteres.' };

    const { data: hasAdmin, error: checkError } = await supabase.rpc('has_admin');
    if (checkError) return { success: false, error: 'Não foi possível verificar se já existe administrador.' };
    if (hasAdmin) return { success: false, error: 'Já existe um administrador cadastrado. O primeiro cadastro já foi realizado.' };

    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password: data.password,
      options: { data: { full_name: name } },
    });

    if (error || !authData.user) {
      return { success: false, error: error?.message || 'Não foi possível criar o administrador.' };
    }

    const needsEmailConfirmation = !authData.session;
    if (authData.session) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id,email,full_name,role,active,created_at')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (profile) {
        const user: UserProfile = {
          id: profile.id,
          username: profile.email?.split('@')[0] || profile.id.slice(0, 8),
          email: profile.email || undefined,
          name: profile.full_name || name,
          re: '',
          graduacao: '',
          role: 'ADMIN',
          pelotao: 'ROCAM',
          passwordHash: '',
          salt: '',
          createdAt: profile.created_at || new Date().toISOString(),
          isActive: Boolean(profile.active),
          status: profile.active ? 'ATIVO' : 'INATIVO',
          lastLogin: new Date().toISOString(),
        };
        setCurrentUser(user);
        setUsers((prev) => [user, ...prev.filter((u) => u.id !== user.id)]);
      }
    }

    setHasAdmin(true);
    return { success: true, needsEmailConfirmation };
  };

  /**
   * Self-registration requested by user (requires Admin approval)
   */
  const registerUserRequest = async (data: {
    username: string;
    email?: string;
    name: string;
    graduacao: string;
    re: string;
    role: UserRole;
    pelotao: string;
    password: string;
  }): Promise<{ success: boolean; error?: string }> => {
    const cleanUser = data.username.trim().toLowerCase();
    const cleanEmail = data.email ? data.email.trim().toLowerCase() : undefined;
    if (!cleanUser) {
      return { success: false, error: 'O nome de usuário é obrigatório.' };
    }
    if (users.some((u) => u.username.toLowerCase() === cleanUser)) {
      return { success: false, error: 'Já existe um policial com este nome de usuário cadastrado.' };
    }
    if (cleanEmail && users.some((u) => u.email && u.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'Já existe um policial com este e-mail cadastrado.' };
    }
    if (users.some((u) => u.re.replace(/[^0-9]/g, '') === data.re.replace(/[^0-9]/g, ''))) {
      return { success: false, error: 'Já existe um cadastro com esta matrícula RE.' };
    }
    if (!data.password || data.password.length < 4) {
      return { success: false, error: 'A senha deve ter no mínimo 4 caracteres.' };
    }

    const currentAdmins = users.filter((u) => u.role === 'ADMIN').length;
    const currentOps = users.filter((u) => u.role === 'OPERADOR').length;
    if (data.role === 'ADMIN' && currentAdmins >= MAX_ADMINS) {
      return {
        success: false,
        error: `Capacidade máxima atingida: O sistema permite no máximo ${MAX_ADMINS} Administradores com acesso total.`,
      };
    }
    if (data.role === 'OPERADOR' && currentOps >= MAX_OPERATORS) {
      return {
        success: false,
        error: `Capacidade máxima atingida: O sistema permite no máximo ${MAX_OPERATORS} Operadores com acesso limitado.`,
      };
    }

    const salt = generateSalt();
    const hash = await hashPassword(data.password, salt);

    const newUser: UserProfile = {
      id: `usr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      username: cleanUser,
      email: cleanEmail,
      name: data.name.trim(),
      graduacao: data.graduacao,
      re: data.re.trim(),
      role: data.role,
      pelotao: data.pelotao.trim() || 'ROCAM',
      passwordHash: hash,
      salt,
      createdAt: new Date().toISOString(),
      isActive: false, // PENDENTE de aprovação por um Administrador
      status: 'PENDENTE',
      solicitadoEm: new Date().toISOString(),
    };

    const nextUsers = [newUser, ...users];
    setUsers(nextUsers);
    saveUsersToStorage(nextUsers);
    return { success: true };
  };

  /**
   * Admin-created user (pre-authorized by Admin)
   */
  const createUser = async (data: {
    username: string;
    email?: string;
    name: string;
    graduacao: string;
    re: string;
    role: UserRole;
    pelotao: string;
    password: string;
  }): Promise<{ success: boolean; error?: string }> => {
    const cleanUser = data.username.trim().toLowerCase();
    const cleanEmail = data.email ? data.email.trim().toLowerCase() : undefined;
    if (!cleanUser) {
      return { success: false, error: 'O nome de usuário é obrigatório.' };
    }
    if (users.some((u) => u.username.toLowerCase() === cleanUser)) {
      return { success: false, error: 'Já existe um policial com este nome de usuário cadastrado.' };
    }
    if (cleanEmail && users.some((u) => u.email && u.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'Já existe um policial com este e-mail cadastrado.' };
    }
    if (!data.password || data.password.length < 4) {
      return { success: false, error: 'A senha deve ter no mínimo 4 caracteres.' };
    }

    const currentAdmins = users.filter((u) => u.role === 'ADMIN').length;
    const currentOps = users.filter((u) => u.role === 'OPERADOR').length;
    if (data.role === 'ADMIN' && currentAdmins >= MAX_ADMINS) {
      return {
        success: false,
        error: `Capacidade máxima atingida: O sistema permite no máximo ${MAX_ADMINS} Administradores com acesso total.`,
      };
    }
    if (data.role === 'OPERADOR' && currentOps >= MAX_OPERATORS) {
      return {
        success: false,
        error: `Capacidade máxima atingida: O sistema permite no máximo ${MAX_OPERATORS} Operadores com acesso limitado.`,
      };
    }

    const salt = generateSalt();
    const hash = await hashPassword(data.password, salt);

    const newUser: UserProfile = {
      id: `usr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      username: cleanUser,
      email: cleanEmail,
      name: data.name.trim(),
      graduacao: data.graduacao,
      re: data.re.trim(),
      role: data.role,
      pelotao: data.pelotao.trim() || 'ROCAM',
      passwordHash: hash,
      salt,
      createdAt: new Date().toISOString(),
      isActive: true,
      status: 'ATIVO',
      aprovadoPor: currentUser?.name || 'Administrador',
      aprovadoEm: new Date().toISOString(),
    };

    const nextUsers = [newUser, ...users];
    setUsers(nextUsers);
    saveUsersToStorage(nextUsers);
    return { success: true };
  };

  /**
   * Admin authorizes / approves a pending user registration
   */
  const approveUser = async (
    userId: string,
    targetRole?: UserRole
  ): Promise<{ success: boolean; error?: string }> => {
    const currentList = users.length > 0 ? users : await loadUsersFromStorage();
    let index = currentList.findIndex((u) => u.id === userId);
    let listToUse = currentList;

    if (index === -1) {
      const freshList = await loadUsersFromStorage();
      index = freshList.findIndex((u) => u.id === userId);
      listToUse = freshList;
    }

    if (index === -1) {
      return { success: false, error: 'Usuário não localizado.' };
    }

    const user = listToUse[index];
    const finalRole = targetRole || user.role;

    if (finalRole === 'ADMIN') {
      const activeAdmins = listToUse.filter((u) => u.role === 'ADMIN' && u.isActive && u.status === 'ATIVO').length;
      if (activeAdmins >= MAX_ADMINS) {
        return {
          success: false,
          error: `Capacidade máxima atingida: O sistema permite no máximo ${MAX_ADMINS} Administradores com acesso total.`,
        };
      }
    } else if (finalRole === 'OPERADOR') {
      const activeOps = listToUse.filter((u) => u.role === 'OPERADOR' && u.isActive && u.status === 'ATIVO').length;
      if (activeOps >= MAX_OPERATORS) {
        return {
          success: false,
          error: `Capacidade máxima atingida: O sistema permite no máximo ${MAX_OPERATORS} Operadores.`,
        };
      }
    }

    const updated: UserProfile = {
      ...user,
      isActive: true,
      status: 'ATIVO',
      role: finalRole,
      aprovadoPor: currentUser?.name || 'Administrador',
      aprovadoEm: new Date().toISOString(),
    };

    const nextUsers = [...listToUse];
    nextUsers[index] = updated;

    setUsers(nextUsers);
    saveUsersToStorage(nextUsers);
    return { success: true };
  };

  /**
   * Admin rejects a pending user registration
   */
  const rejectUser = async (
    userId: string,
    motivo?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const currentList = users.length > 0 ? users : await loadUsersFromStorage();
    let index = currentList.findIndex((u) => u.id === userId);
    let listToUse = currentList;

    if (index === -1) {
      const freshList = await loadUsersFromStorage();
      index = freshList.findIndex((u) => u.id === userId);
      listToUse = freshList;
    }

    if (index === -1) {
      return { success: false, error: 'Usuário não localizado.' };
    }

    const user = listToUse[index];
    const updated: UserProfile = {
      ...user,
      isActive: false,
      status: 'REJEITADO',
      motivoRejeicao: motivo || 'Cadastro não homologado pelo Administrador da Seção de Logística.',
    };

    const nextUsers = [...listToUse];
    nextUsers[index] = updated;

    setUsers(nextUsers);
    saveUsersToStorage(nextUsers);
    return { success: true };
  };

  const updateUser = async (
    userId: string,
    data: Partial<UserProfile>
  ): Promise<{ success: boolean; error?: string }> => {
    const currentList = users.length > 0 ? users : await loadUsersFromStorage();
    let index = currentList.findIndex((u) => u.id === userId);
    let listToUpdate = currentList;

    if (index === -1) {
      const freshList = await loadUsersFromStorage();
      index = freshList.findIndex((u) => u.id === userId);
      listToUpdate = freshList;
    }

    if (index === -1) {
      return { success: false, error: 'Usuário não localizado.' };
    }

    const updated = { ...listToUpdate[index], ...data };
    const nextUsers = [...listToUpdate];
    nextUsers[index] = updated;

    setUsers(nextUsers);
    await saveUsersToStorage(nextUsers);

    if (currentUser?.id === userId) {
      setCurrentUser(updated);
    }

    return { success: true };
  };

  /**
   * Admin deletes a user - requires Admin password confirmation
   */
  const deleteUser = async (
    userId: string,
    adminPassword?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return { success: false, error: 'Acesso negado: Somente administradores têm permissão para excluir usuários.' };
    }

    if (currentUser.id === userId) {
      return { success: false, error: 'Você não pode excluir sua própria conta de administrador por aqui. Use a opção "Excluir Minha Conta".' };
    }

    // Optional admin password verification (if provided, verify it)
    if (adminPassword && adminPassword.trim()) {
      const isPassValid = await verifyPassword(adminPassword, currentUser.passwordHash, currentUser.salt);
      if (!isPassValid) {
        return { success: false, error: 'Senha de administrador incorreta. Exclusão cancelada.' };
      }
    }

    // Verify if there's at least one remaining active ADMIN
    const target = users.find((u) => u.id === userId);
    if (target?.role === 'ADMIN' && target.status === 'ATIVO') {
      const activeAdmins = users.filter((u) => u.role === 'ADMIN' && u.id !== userId && u.isActive && u.status === 'ATIVO');
      if (activeAdmins.length === 0) {
        return { success: false, error: 'Não é possível excluir o único administrador ativo do sistema.' };
      }
    }

    const nextUsers = users.filter((u) => u.id !== userId);
    setUsers(nextUsers);
    saveUsersToStorage(nextUsers);
    return { success: true };
  };

  /**
   * Batch delete multiple users (Admin only)
   */
  const deleteMultipleUsers = async (
    userIds: string[]
  ): Promise<{ success: boolean; deletedCount: number; error?: string }> => {
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return { success: false, deletedCount: 0, error: 'Acesso negado: Somente administradores podem excluir usuários.' };
    }

    // Never delete current user via batch delete
    const validIdsToDelete = userIds.filter((id) => id !== currentUser.id);
    if (validIdsToDelete.length === 0) {
      return { success: false, deletedCount: 0, error: 'Nenhum outro usuário selecionado para exclusão.' };
    }

    // Check that at least 1 active admin remains
    const remainingUsers = users.filter((u) => !validIdsToDelete.includes(u.id));
    const remainingAdmins = remainingUsers.filter((u) => u.role === 'ADMIN' && u.isActive && u.status === 'ATIVO');
    if (remainingAdmins.length === 0) {
      return { success: false, deletedCount: 0, error: 'Operação bloqueada: O sistema deve manter pelo menos 1 Administrador ativo.' };
    }

    setUsers(remainingUsers);
    saveUsersToStorage(remainingUsers);
    return { success: true, deletedCount: validIdsToDelete.length };
  };

  /**
   * User deletes their own account
   */
  const deleteOwnAccount = async (password: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: 'Nenhum usuário conectado.' };
    }

    // Verify password
    const isPassValid = await verifyPassword(password, currentUser.passwordHash, currentUser.salt);
    if (!isPassValid) {
      return { success: false, error: 'Senha incorreta. Não foi possível confirmar a exclusão da conta.' };
    }

    // If current user is Admin, verify that another active Admin exists
    if (currentUser.role === 'ADMIN') {
      const otherActiveAdmins = users.filter(
        (u) => u.role === 'ADMIN' && u.id !== currentUser.id && u.isActive && u.status === 'ATIVO'
      );
      if (otherActiveAdmins.length === 0) {
        return {
          success: false,
          error:
            'Você é o único Administrador ativo no sistema. Antes de excluir sua conta, promova outro militar ao perfil de Administrador.',
        };
      }
    }

    const nextUsers = users.filter((u) => u.id !== currentUser.id);
    setUsers(nextUsers);
    saveUsersToStorage(nextUsers);

    logout();
    return { success: true };
  };

  const changePassword = async (
    userId: string,
    newPass: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!newPass || newPass.trim().length < 4) {
      return { success: false, error: 'A nova senha deve ter no mínimo 4 caracteres.' };
    }

    const currentList = users.length > 0 ? users : await loadUsersFromStorage();
    let index = currentList.findIndex((u) => u.id === userId);
    let listToUpdate = currentList;

    if (index === -1) {
      const freshList = await loadUsersFromStorage();
      index = freshList.findIndex((u) => u.id === userId);
      listToUpdate = freshList;
    }

    if (index === -1) {
      return { success: false, error: 'Usuário não encontrado.' };
    }

    const user = listToUpdate[index];
    const newSalt = generateSalt();
    const newHash = await hashPassword(newPass.trim(), newSalt);

    const updatedUser: UserProfile = {
      ...user,
      passwordHash: newHash,
      salt: newSalt,
    };

    const nextUsers = [...listToUpdate];
    nextUsers[index] = updatedUser;
    setUsers(nextUsers);
    saveUsersToStorage(nextUsers);

    if (currentUser?.id === userId) {
      setCurrentUser(updatedUser);
    }

    return { success: true };
  };

  /**
   * Reset password via security verification (RE or Email matching user record)
   */
  const resetPasswordByRecovery = async (
    identifier: string,
    emailOrRe: string,
    newPass: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!identifier.trim()) {
      return { success: false, error: 'Informe seu Usuário ou RE funcional.' };
    }
    if (!emailOrRe.trim()) {
      return { success: false, error: 'Informe o E-mail cadastrado ou confirme seu RE funcional.' };
    }
    if (!newPass || newPass.trim().length < 4) {
      return { success: false, error: 'A nova senha deve possuir pelo menos 4 caracteres.' };
    }

    const cleanId = identifier.trim().toLowerCase();
    const cleanIdDigits = cleanId.replace(/[^0-9]/g, '');
    const cleanConfirm = emailOrRe.trim().toLowerCase();
    const cleanConfirmDigits = cleanConfirm.replace(/[^0-9]/g, '');

    const currentList = users.length > 0 ? users : await loadUsersFromStorage();

    const checkCandidate = (u: UserProfile) => {
      const uName = u.username.toLowerCase();
      const uRe = u.re.replace(/[^0-9]/g, '');
      const uEmail = (u.email || '').toLowerCase();

      const idMatches =
        uName === cleanId ||
        (cleanIdDigits.length >= 4 && uRe.includes(cleanIdDigits)) ||
        u.id === cleanId;

      if (!idMatches) return false;

      // Email match or RE confirmation
      const emailMatches = Boolean(uEmail && uEmail === cleanConfirm);
      const reMatches = Boolean(cleanConfirmDigits.length >= 4 && uRe.includes(cleanConfirmDigits));
      const userMatches = Boolean(uName === cleanConfirm);

      return emailMatches || reMatches || userMatches;
    };

    let candidate = currentList.find(checkCandidate);

    if (!candidate) {
      const freshList = await loadUsersFromStorage();
      candidate = freshList.find(checkCandidate);
    }

    if (!candidate) {
      return {
        success: false,
        error:
          'Dados de validação não conferem com o militar cadastrado. Verifique o RE/E-mail ou solicite a redefinição ao Oficial da Seção de Logística / P-4.',
      };
    }

    return changePassword(candidate.id, newPass);
  };

  const toggleUserActive = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    if (currentUser?.id === userId) {
      return { success: false, error: 'Você não pode desativar seu próprio acesso ativo.' };
    }

    const currentList = users.length > 0 ? users : await loadUsersFromStorage();
    let index = currentList.findIndex((u) => u.id === userId);
    let listToUpdate = currentList;

    if (index === -1) {
      const freshList = await loadUsersFromStorage();
      index = freshList.findIndex((u) => u.id === userId);
      listToUpdate = freshList;
    }

    if (index === -1) {
      return { success: false, error: 'Usuário não localizado.' };
    }

    const user = listToUpdate[index];
    // If deactivating an admin, ensure another active admin exists
    if (user.role === 'ADMIN' && user.isActive) {
      const otherActiveAdmins = listToUpdate.filter((u) => u.role === 'ADMIN' && u.id !== userId && u.isActive && u.status === 'ATIVO');
      if (otherActiveAdmins.length === 0) {
        return { success: false, error: 'Não é permitido desativar o único administrador ativo.' };
      }
    }

    const nextActive = !user.isActive;
    const nextStatus = nextActive ? 'ATIVO' : 'INATIVO';
    const updated: UserProfile = { ...user, isActive: nextActive, status: nextStatus };
    const nextUsers = [...listToUpdate];
    nextUsers[index] = updated;

    setUsers(nextUsers);
    await saveUsersToStorage(nextUsers);
    return { success: true };
  };

  /**
   * Admin restores default users - requires Admin password confirmation
   */
  const resetUsersToDefault = async (
    adminPassword?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: 'Administrador não autenticado.' };
    }

    // Security check: Must confirm admin password
    if (!adminPassword || !adminPassword.trim()) {
      return { success: false, error: 'Digite sua senha de administrador para autorizar a restauração padrão.' };
    }

    const isPassValid = await verifyPassword(adminPassword, currentUser.passwordHash, currentUser.salt);
    if (!isPassValid) {
      return { success: false, error: 'Senha de administrador incorreta. Restauração cancelada.' };
    }

    // INITIAL_USERS already contains the full set of 20 Admins and 300 Operators with pre-computed hashes
    const seededUsers: UserProfile[] = INITIAL_USERS.map((user) => ({
      ...user,
      status: 'ATIVO',
      isActive: true,
    }));

    setUsers(seededUsers);
    saveUsersToStorage(seededUsers);

    // If current user is not in seeded, log out
    if (currentUser && !seededUsers.some((u) => u.id === currentUser.id)) {
      logout();
    }

    return { success: true };
  };

  /**
   * Reset all user registrations and set the 1st Administrator
   */
  const resetToFirstAdmin = async (customAdminData?: {
    username: string;
    name: string;
    graduacao: string;
    re: string;
    pelotao: string;
    password: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const resetList = await resetUsersToFirstAdmin(customAdminData);
      setUsers(resetList);
      setCurrentUser(resetList[0]);
      const session = createSessionForUser(resetList[0]);
      saveSavedSession(session);
      return { success: true };
    } catch (e) {
      console.error('Failed to reset users to first admin', e);
      return { success: false, error: 'Falha ao resetar cadastros.' };
    }
  };

  const pendingUsers = users.filter((u) => u.status === 'PENDENTE');
  const pendingApprovalsCount = pendingUsers.length;

  const isAuthenticated = !!currentUser && currentUser.isActive && currentUser.status === 'ATIVO';
  const isAdmin = currentUser?.role === 'ADMIN';
  const isOperator = currentUser?.role === 'OPERADOR';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        isAdmin,
        isOperator,
        users,
        hasAdmin,
        pendingUsers,
        pendingApprovalsCount,
        isLoading,
        login,
        quickLoginAs,
        logout,
        registerFirstAdmin,
        registerUserRequest,
        createUser,
        approveUser,
        rejectUser,
        updateUser,
        deleteUser,
        deleteMultipleUsers,
        deleteOwnAccount,
        changePassword,
        resetPasswordByRecovery,
        toggleUserActive,
        resetUsersToDefault,
        resetToFirstAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
