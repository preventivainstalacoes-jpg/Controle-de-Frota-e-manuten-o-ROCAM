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
  pendingUsers: UserProfile[];
  pendingApprovalsCount: number;
  isLoading: boolean;
  login: (identifier: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  quickLoginAs: (role: 'ADMIN' | 'OPERADOR', specificUserId?: string) => Promise<boolean>;
  logout: () => void;
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
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load users and check existing session on mount
  useEffect(() => {
    let isMounted = true;

    const profileToUser = (p: any): UserProfile => ({
      id: p.id,
      username: p.username || (p.email ? p.email.split('@')[0] : ''),
      email: p.email || undefined,
      name: p.full_name || '',
      graduacao: p.graduacao || '',
      re: p.re || '',
      role: String(p.role).toUpperCase() as UserRole,
      pelotao: p.pelotao || 'ROCAM',
      passwordHash: '',
      salt: '',
      createdAt: p.created_at || new Date().toISOString(),
      isActive: !!p.active,
      status: p.active ? 'ATIVO' : 'INATIVO',
    });

    async function initAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user && isMounted) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id,full_name,role,active,email,username,re,graduacao,pelotao,created_at')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profile && profile.active) {
            const user = profileToUser(profile);
            setCurrentUser(user);
            setUsers([user]);
            saveSavedSession(createSessionForUser(user));
          } else {
            await supabase.auth.signOut();
            clearSavedSession();
          }
        } else if (isMounted) {
          const loadedUsers = await loadUsersFromStorage();
          setUsers(loadedUsers);
          const savedSession = getSavedSession();
          if (savedSession) {
            const foundUser = loadedUsers.find((u) => u.id === savedSession.userId);
            if (foundUser && foundUser.isActive && foundUser.status === 'ATIVO') setCurrentUser(foundUser);
            else clearSavedSession();
          }
        }

        const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (!isMounted) return;
          if (!session?.user) {
            setCurrentUser(null);
            return;
          }
          const { data: profile } = await supabase
            .from('profiles')
            .select('id,full_name,role,active,email,username,re,graduacao,pelotao,created_at')
            .eq('id', session.user.id)
            .maybeSingle();
          if (profile && profile.active) {
            const user = profileToUser(profile);
            setCurrentUser(user);
            setUsers((prev) => prev.some((u) => u.id === user.id) ? prev.map((u) => u.id === user.id ? user : u) : [user, ...prev]);
          } else {
            setCurrentUser(null);
          }
        });

        return () => listener.subscription.unsubscribe();
      } catch (err) {
        console.error('Failed to init auth context', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    let cleanup: (() => void) | undefined;
    initAuth().then((fn) => { cleanup = fn; });

    return () => {
      isMounted = false;
      cleanup?.();
    };
  }, []);

  const login = async (identifier: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    const cleanIdentifier = identifier.trim().toLowerCase();

    if (cleanIdentifier.includes('@')) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanIdentifier,
        password: pass,
      });

      if (!error && data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id,full_name,role,active,email,username,re,graduacao,pelotao,created_at')
          .eq('id', data.user.id)
          .maybeSingle();

        if (!profile) {
          await supabase.auth.signOut();
          return { success: false, error: 'Perfil do usuário não encontrado no Supabase.' };
        }
        if (!profile.active) {
          await supabase.auth.signOut();
          return { success: false, error: 'Usuário ainda não foi aprovado pelo Administrador.' };
        }

        const updatedUser: UserProfile = {
          id: profile.id,
          username: profile.username || cleanIdentifier.split('@')[0],
          email: profile.email || cleanIdentifier,
          name: profile.full_name || '',
          graduacao: profile.graduacao || '',
          re: profile.re || '',
          role: String(profile.role).toUpperCase() as UserRole,
          pelotao: profile.pelotao || 'ROCAM',
          passwordHash: '',
          salt: '',
          createdAt: profile.created_at || new Date().toISOString(),
          isActive: true,
          status: 'ATIVO',
          lastLogin: new Date().toISOString(),
        };

        setCurrentUser(updatedUser);
        setUsers((prev) => prev.some((u) => u.id === updatedUser.id) ? prev.map((u) => u.id === updatedUser.id ? updatedUser : u) : [updatedUser, ...prev]);
        saveSavedSession(createSessionForUser(updatedUser));
        return { success: true };
      }

      return { success: false, error: error?.message || 'Credenciais inválidas' };
    }

    const currentList = users.length > 0 ? users : await loadUsersFromStorage();
    const authResult = await authenticateCredentials(identifier, pass, currentList);
    if (!authResult.user) return { success: false, error: authResult.error || 'Use o e-mail cadastrado para acesso compartilhado.' };

    setCurrentUser(authResult.user);
    saveSavedSession(createSessionForUser(authResult.user));
    return { success: true };
  };

  const quickLoginAs = async (role: 'ADMIN' | 'OPERADOR', specificUserId?: string): Promise<boolean> => {
    try {
      const listToSearch = users.length > 0 ? users : await loadUsersFromStorage();
      let candidate: UserProfile | undefined = undefined;

      if (specificUserId) {
        candidate = listToSearch.find((u: UserProfile) => u.id === specificUserId && u.isActive && u.status === 'ATIVO');
      }

      if (!candidate) {
        candidate = listToSearch.find((u: UserProfile) => u.role === role && u.isActive && u.status === 'ATIVO');
      }

      if (!candidate) {
        const freshList = await loadUsersFromStorage();
        if (specificUserId) {
          candidate = freshList.find((u: UserProfile) => u.id === specificUserId && u.isActive && u.status === 'ATIVO');
        }
        if (!candidate) {
          candidate = freshList.find((u: UserProfile) => u.role === role && u.isActive && u.status === 'ATIVO');
        }
      }

      // If still not found and role is ADMIN, guarantee 1º Administrador Master access immediately
      if (!candidate && role === 'ADMIN') {
        candidate = FIRST_ADMIN;
        const currentList = users.length > 0 ? users : await loadUsersFromStorage();
        const nextUsers = [FIRST_ADMIN, ...currentList.filter((u) => u.id !== FIRST_ADMIN.id && u.username !== 'admin')];
        setUsers(nextUsers);
        saveUsersToStorage(nextUsers);
      }

      if (candidate) {
        const updatedUser: UserProfile = {
          ...candidate,
          isActive: true,
          status: 'ATIVO',
          lastLogin: new Date().toISOString(),
        };
        const currentList = users.length > 0 ? users : await loadUsersFromStorage();
        const nextUsers = currentList.map((u: UserProfile) => (u.id === updatedUser.id ? updatedUser : u));
        if (!nextUsers.some((u) => u.id === updatedUser.id)) {
          nextUsers.unshift(updatedUser);
        }
        setUsers(nextUsers);
        saveUsersToStorage(nextUsers);

        const session = createSessionForUser(updatedUser);
        saveSavedSession(session);
        setCurrentUser(updatedUser);
        return true;
      }
    } catch (e) {
      console.error('Error in quickLoginAs:', e);
      if (role === 'ADMIN') {
        const session = createSessionForUser(FIRST_ADMIN);
        saveSavedSession(session);
        setCurrentUser(FIRST_ADMIN);
        return true;
      }
    }
    return false;
  };

  const logout = () => {
    void supabase.auth.signOut();
    clearSavedSession();
    setCurrentUser(null);
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
        pendingUsers,
        pendingApprovalsCount,
        isLoading,
        login,
        quickLoginAs,
        logout,
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
