import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile, UserRole } from '../types';
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
  }) => Promise<{ success: boolean; isFirstAdmin?: boolean; error?: string }>;
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
  firstAdminQuickAccessUsed: boolean;
  markFirstAdminQuickAccessUsed: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const STORAGE_FIRST_ADMIN_USED_KEY = 'rocam_first_admin_quick_used_v1';

  const [firstAdminQuickAccessUsed, setFirstAdminQuickAccessUsed] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_FIRST_ADMIN_USED_KEY);
      if (stored === 'true') return true;
      if (localStorage.getItem('rocam_first_admin_quick_used') === 'true') return true;
      return false;
    } catch {
      return false;
    }
  });

  const markFirstAdminQuickAccessUsed = () => {
    try {
      localStorage.setItem(STORAGE_FIRST_ADMIN_USED_KEY, 'true');
      localStorage.setItem('rocam_first_admin_quick_used', 'true');
    } catch (e) {
      console.warn('Could not persist first admin quick access flag', e);
    }
    setFirstAdminQuickAccessUsed(true);
  };

  // Supabase Auth is the source of truth for sessions across devices.
  // localStorage is kept only as a UI cache; it must never authenticate a user.
  useEffect(() => {
    let isMounted = true;

    const hydrateFromSupabaseUser = async (authUser: any) => {
      if (!authUser?.id || !isMounted) {
        if (isMounted) setCurrentUser(null);
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (error || !profile || profile.active === false) {
        if (isMounted) setCurrentUser(null);
        return;
      }

      const mappedUser: UserProfile = {
        id: profile.id,
        username: profile.username || profile.email?.split('@')[0] || authUser.email || '',
        email: profile.email || authUser.email || '',
        name: profile.full_name || profile.username || authUser.email || '',
        graduacao: profile.graduacao || '',
        re: profile.re || '',
        role: profile.role === 'admin' ? 'ADMIN' : 'OPERADOR',
        pelotao: profile.pelotao || 'ROCAM',
        passwordHash: '',
        salt: '',
        createdAt: profile.created_at || new Date().toISOString(),
        isActive: profile.active !== false,
        status: profile.active === false ? 'INATIVO' : 'ATIVO',
        lastLogin: new Date().toISOString(),
      };

      if (isMounted) {
        setCurrentUser(mappedUser);
        setUsers((prev) => [mappedUser, ...prev.filter((u) => u.id !== mappedUser.id)]);
      }
    };

    const initAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          await hydrateFromSupabaseUser(data.session.user);
        } else if (isMounted) {
          setCurrentUser(null);
        }
      } catch (err) {
        console.error('Failed to initialize Supabase Auth', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      void hydrateFromSupabaseUser(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = async (identifier: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    const cleanId = identifier.trim().toLowerCase();

    // Fonte compartilhada para autenticação: Supabase Auth + public.profiles.
    // Isso permite o mesmo usuário entrar em celulares diferentes.
    try {
      // Primeiro tenta e-mail diretamente no Supabase Auth. Isso garante o login
      // em qualquer celular mesmo quando o perfil ainda não possui username/RE.
      if (cleanId.includes('@')) {
        const { data: directAuth, error: directError } = await supabase.auth.signInWithPassword({
          email: cleanId,
          password: pass,
        });
        if (!directError && directAuth.user) {
          const { data: directProfile } = await supabase
            .from('profiles').select('*').eq('id', directAuth.user.id).maybeSingle();
          if (directProfile?.active !== false && directProfile) {
            const mappedUser: UserProfile = {
              id: directProfile.id,
              username: directProfile.username || cleanId.split('@')[0],
              email: directProfile.email || cleanId,
              name: directProfile.full_name || cleanId.split('@')[0],
              graduacao: directProfile.graduacao || '', re: directProfile.re || '',
              role: directProfile.role === 'admin' ? 'ADMIN' : 'OPERADOR',
              pelotao: directProfile.pelotao || 'ROCAM', passwordHash: '', salt: '',
              createdAt: directProfile.created_at || new Date().toISOString(),
              isActive: true, status: 'ATIVO', lastLogin: new Date().toISOString(),
            };
            setCurrentUser(mappedUser);
            setUsers(prev => [mappedUser, ...prev.filter(u => u.id !== mappedUser.id)]);
            saveSavedSession(createSessionForUser(mappedUser));
            if (mappedUser.role === 'ADMIN') markFirstAdminQuickAccessUsed();
            return { success: true };
          }
          await supabase.auth.signOut();
          if (directProfile?.active === false) return { success: false, error: 'Acesso bloqueado: este usuário foi desativado pelo Administrador.' };
        } else if (directError && /email not confirmed/i.test(directError.message)) {
          return { success: false, error: 'E-mail ainda não confirmado. Confirme o e-mail cadastrado no Supabase antes de entrar.' };
        }
      }

      // Para usuário/RE, resolve o e-mail pela função segura no Supabase.
      const { data: profile, error: lookupError } = await supabase
        .rpc('find_profile_for_login', { p_identifier: cleanId })
        .maybeSingle();

      if (!lookupError && profile?.email) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: profile.email,
          password: pass,
        });

        if (authError || !authData.user) {
          return { success: false, error: authError?.message || 'Credenciais inválidas.' };
        }

        if (profile.active === false) {
          await supabase.auth.signOut();
          return { success: false, error: 'Acesso bloqueado: este usuário foi desativado pelo Administrador.' };
        }

        const mappedUser: UserProfile = {
          id: profile.id,
          username: profile.username || profile.email.split('@')[0],
          email: profile.email,
          name: profile.full_name || profile.username || profile.email,
          graduacao: profile.graduacao || '',
          re: profile.re || '',
          role: profile.role === 'admin' ? 'ADMIN' : 'OPERADOR',
          pelotao: profile.pelotao || 'ROCAM',
          passwordHash: '',
          salt: '',
          createdAt: profile.created_at || new Date().toISOString(),
          isActive: profile.active !== false,
          status: profile.active === false ? 'INATIVO' : 'ATIVO',
          lastLogin: new Date().toISOString(),
        };

        setUsers((prev) => {
          const without = prev.filter((u) => u.id !== mappedUser.id);
          const next = [mappedUser, ...without];
          saveUsersToStorage(next);
          return next;
        });
        saveSavedSession(createSessionForUser(mappedUser));
        setCurrentUser(mappedUser);
        if (mappedUser.role === 'ADMIN') markFirstAdminQuickAccessUsed();
        return { success: true };
      }
    } catch (error) {
      console.warn('Falha ao autenticar pelo Supabase; tentando compatibilidade local.', error);
    }


    // No local-storage authentication fallback.
    // A shared fleet application must use the same Supabase Auth credentials on every device.
    return {
      success: false,
      error: 'Credenciais inválidas. Confira o usuário/e-mail/RE e a senha cadastrados.',
    };
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
        if (candidate.role === 'ADMIN' || role === 'ADMIN') {
          markFirstAdminQuickAccessUsed();
        }

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
        markFirstAdminQuickAccessUsed();
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
   * Self-registration requested by user (requires Admin approval, except 1st admin)
   */
  const registerUserRequest = async (data: {
    username: string; email?: string; name: string; graduacao: string; re: string;
    role: UserRole; pelotao: string; password: string;
  }): Promise<{ success: boolean; isFirstAdmin?: boolean; error?: string }> => {
    const cleanUser = data.username.trim().toLowerCase();
    const cleanEmail = data.email?.trim().toLowerCase() || '';
    const cleanRe = data.re.trim();
    if (!cleanUser || !data.name.trim() || !cleanRe) return { success: false, error: 'Preencha nome, usuário e RE.' };
    if (!cleanEmail || !cleanEmail.includes('@')) return { success: false, error: 'O e-mail é obrigatório para criar o acesso em todos os celulares.' };
    if (!data.password || data.password.length < 6) return { success: false, error: 'A senha deve ter no mínimo 6 caracteres.' };

    try {
      const { data: existing } = await supabase.from('profiles').select('id,email,username,re')
        .or(`email.eq.${cleanEmail},username.eq.${cleanUser},re.eq.${cleanRe}`).limit(1).maybeSingle();
      if (existing) return { success: false, error: 'Já existe um usuário com este e-mail, usuário ou RE.' };

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail, password: data.password,
        options: { data: { full_name: data.name.trim(), username: cleanUser, re: cleanRe, graduacao: data.graduacao, pelotao: data.pelotao.trim() || 'ROCAM' } }
      });
      if (signUpError) {
        if (/already registered|already exists/i.test(signUpError.message)) return { success: false, error: 'Este e-mail já está cadastrado. Use Entrar ou recupere a senha.' };
        return { success: false, error: signUpError.message };
      }
      if (!signUpData.user) return { success: false, error: 'O Supabase não retornou o usuário criado.' };

      const adminCheck = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin').eq('active', true);
      const hasAdmin = (adminCheck.count || 0) > 0 || users.some(u => u.role === 'ADMIN' && u.isActive && u.status === 'ATIVO');
      const isFirstAdmin = data.role === 'ADMIN' && !hasAdmin;

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: signUpData.user.id, full_name: data.name.trim(),
        role: isFirstAdmin || data.role === 'ADMIN' ? 'admin' : 'operador',
        active: isFirstAdmin, email: cleanEmail, username: cleanUser, re: cleanRe,
        graduacao: data.graduacao, pelotao: data.pelotao.trim() || 'ROCAM'
      }, { onConflict: 'id' });
      if (profileError) {
        await supabase.auth.signOut();
        return { success: false, error: `Usuário criado no Auth, mas o perfil não foi gravado: ${profileError.message}` };
      }

      const mapped: UserProfile = {
        id: signUpData.user.id, username: cleanUser, email: cleanEmail, name: data.name.trim(),
        graduacao: data.graduacao, re: cleanRe, role: isFirstAdmin || data.role === 'ADMIN' ? 'ADMIN' : 'OPERADOR',
        pelotao: data.pelotao.trim() || 'ROCAM', passwordHash: '', salt: '',
        createdAt: new Date().toISOString(), isActive: isFirstAdmin, status: isFirstAdmin ? 'ATIVO' : 'PENDENTE'
      };
      setUsers(prev => { const next=[mapped,...prev.filter(u=>u.id!==mapped.id)]; saveUsersToStorage(next); return next; });

      if (signUpData.session && isFirstAdmin) {
        setCurrentUser(mapped); saveSavedSession(createSessionForUser(mapped)); markFirstAdminQuickAccessUsed();
      } else {
        await supabase.auth.signOut();
      }
      return { success: true, isFirstAdmin };
    } catch (e: any) {
      console.error('Erro no cadastro Supabase:', e);
      return { success: false, error: e?.message || 'Não foi possível concluir o cadastro.' };
    }
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
      try {
        localStorage.removeItem(STORAGE_FIRST_ADMIN_USED_KEY);
        localStorage.removeItem('rocam_first_admin_quick_used');
      } catch {}
      setFirstAdminQuickAccessUsed(false);
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
        firstAdminQuickAccessUsed,
        markFirstAdminQuickAccessUsed,
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
