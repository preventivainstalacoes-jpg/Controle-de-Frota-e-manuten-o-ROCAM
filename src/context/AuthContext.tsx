import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
    name: string;
    graduacao: string;
    re: string;
    role: UserRole;
    pelotao: string;
    password: string;
  }) => Promise<{ success: boolean; error?: string }>;
  createUser: (data: {
    username: string;
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
  deleteOwnAccount: (password: string) => Promise<{ success: boolean; error?: string }>;
  changePassword: (userId: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
  toggleUserActive: (userId: string) => Promise<{ success: boolean; error?: string }>;
  resetUsersToDefault: (adminPassword?: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load users and check existing session on mount
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const loadedUsers = await loadUsersFromStorage();
        if (isMounted) {
          setUsers(loadedUsers);

          const savedSession = getSavedSession();
          if (savedSession) {
            const foundUser = loadedUsers.find((u) => u.id === savedSession.userId);
            if (foundUser && foundUser.isActive && foundUser.status === 'ATIVO') {
              setCurrentUser(foundUser);
            } else {
              clearSavedSession();
            }
          }
        }
      } catch (err) {
        console.error('Failed to init auth context', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (identifier: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    const authResult = await authenticateCredentials(identifier, pass, users);
    if (!authResult.user) {
      return { success: false, error: authResult.error || 'Credenciais inválidas' };
    }

    const updatedUser = {
      ...authResult.user,
      lastLogin: new Date().toISOString(),
    };

    const nextUsers = users.map((u) => (u.id === updatedUser.id ? updatedUser : u));
    setUsers(nextUsers);
    saveUsersToStorage(nextUsers);

    const session = createSessionForUser(updatedUser);
    saveSavedSession(session);
    setCurrentUser(updatedUser);

    return { success: true };
  };

  const quickLoginAs = async (role: 'ADMIN' | 'OPERADOR', specificUserId?: string): Promise<boolean> => {
    const candidate = specificUserId
      ? users.find((u) => u.id === specificUserId && u.isActive && u.status === 'ATIVO')
      : users.find((u) => u.role === role && u.isActive && u.status === 'ATIVO');
    if (candidate) {
      const updatedUser = {
        ...candidate,
        lastLogin: new Date().toISOString(),
      };
      const nextUsers = users.map((u) => (u.id === updatedUser.id ? updatedUser : u));
      setUsers(nextUsers);
      saveUsersToStorage(nextUsers);

      const session = createSessionForUser(updatedUser);
      saveSavedSession(session);
      setCurrentUser(updatedUser);
      return true;
    }
    return false;
  };

  const logout = () => {
    clearSavedSession();
    setCurrentUser(null);
  };

  /**
   * Self-registration requested by user (requires Admin approval)
   */
  const registerUserRequest = async (data: {
    username: string;
    name: string;
    graduacao: string;
    re: string;
    role: UserRole;
    pelotao: string;
    password: string;
  }): Promise<{ success: boolean; error?: string }> => {
    const cleanUser = data.username.trim().toLowerCase();
    if (!cleanUser) {
      return { success: false, error: 'O nome de usuário é obrigatório.' };
    }
    if (users.some((u) => u.username.toLowerCase() === cleanUser)) {
      return { success: false, error: 'Já existe um policial com este nome de usuário cadastrado.' };
    }
    if (users.some((u) => u.re.replace(/[^0-9]/g, '') === data.re.replace(/[^0-9]/g, ''))) {
      return { success: false, error: 'Já existe um cadastro com esta matrícula RE.' };
    }
    if (!data.password || data.password.length < 4) {
      return { success: false, error: 'A senha deve ter no mínimo 4 caracteres.' };
    }

    const salt = generateSalt();
    const hash = await hashPassword(data.password, salt);

    const newUser: UserProfile = {
      id: `usr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      username: cleanUser,
      name: data.name.trim(),
      graduacao: data.graduacao,
      re: data.re.trim(),
      role: data.role,
      pelotao: data.pelotao.trim() || 'ROCAM',
      passwordHash: hash,
      salt,
      createdAt: new Date().toISOString(),
      isActive: true, // Authorized immediately!
      status: 'ATIVO',
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
    name: string;
    graduacao: string;
    re: string;
    role: UserRole;
    pelotao: string;
    password: string;
  }): Promise<{ success: boolean; error?: string }> => {
    const cleanUser = data.username.trim().toLowerCase();
    if (!cleanUser) {
      return { success: false, error: 'O nome de usuário é obrigatório.' };
    }
    if (users.some((u) => u.username.toLowerCase() === cleanUser)) {
      return { success: false, error: 'Já existe um policial com este nome de usuário cadastrado.' };
    }
    if (!data.password || data.password.length < 4) {
      return { success: false, error: 'A senha deve ter no mínimo 4 caracteres.' };
    }

    const salt = generateSalt();
    const hash = await hashPassword(data.password, salt);

    const newUser: UserProfile = {
      id: `usr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      username: cleanUser,
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
    const index = users.findIndex((u) => u.id === userId);
    if (index === -1) {
      return { success: false, error: 'Usuário não localizado.' };
    }

    const user = users[index];
    const updated: UserProfile = {
      ...user,
      isActive: true,
      status: 'ATIVO',
      role: targetRole || user.role,
      aprovadoPor: currentUser?.name || 'Administrador',
      aprovadoEm: new Date().toISOString(),
    };

    const nextUsers = [...users];
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
    const index = users.findIndex((u) => u.id === userId);
    if (index === -1) {
      return { success: false, error: 'Usuário não localizado.' };
    }

    const user = users[index];
    const updated: UserProfile = {
      ...user,
      isActive: false,
      status: 'REJEITADO',
      motivoRejeicao: motivo || 'Cadastro não homologado pelo Administrador da Seção de Logística.',
    };

    const nextUsers = [...users];
    nextUsers[index] = updated;

    setUsers(nextUsers);
    saveUsersToStorage(nextUsers);
    return { success: true };
  };

  const updateUser = async (
    userId: string,
    data: Partial<UserProfile>
  ): Promise<{ success: boolean; error?: string }> => {
    const index = users.findIndex((u) => u.id === userId);
    if (index === -1) {
      return { success: false, error: 'Usuário não localizado.' };
    }

    const updated = { ...users[index], ...data };
    const nextUsers = [...users];
    nextUsers[index] = updated;

    setUsers(nextUsers);
    saveUsersToStorage(nextUsers);

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
    if (!currentUser) {
      return { success: false, error: 'Administrador não autenticado.' };
    }

    if (currentUser.id === userId) {
      return { success: false, error: 'Para excluir sua própria conta, utilize a opção "Excluir Minha Conta".' };
    }

    // Security check: Must confirm admin password
    if (!adminPassword || !adminPassword.trim()) {
      return { success: false, error: 'Digite a senha de administrador para autorizar a exclusão.' };
    }

    const isPassValid = await verifyPassword(adminPassword, currentUser.passwordHash, currentUser.salt);
    if (!isPassValid) {
      return { success: false, error: 'Senha de administrador incorreta. Exclusão não autorizada.' };
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

    const index = users.findIndex((u) => u.id === userId);
    if (index === -1) {
      return { success: false, error: 'Usuário não encontrado.' };
    }

    const user = users[index];
    const newSalt = generateSalt();
    const newHash = await hashPassword(newPass.trim(), newSalt);

    const updatedUser: UserProfile = {
      ...user,
      passwordHash: newHash,
      salt: newSalt,
    };

    const nextUsers = [...users];
    nextUsers[index] = updatedUser;
    setUsers(nextUsers);
    saveUsersToStorage(nextUsers);

    if (currentUser?.id === userId) {
      setCurrentUser(updatedUser);
    }

    return { success: true };
  };

  const toggleUserActive = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    if (currentUser?.id === userId) {
      return { success: false, error: 'Você não pode desativar seu próprio acesso ativo.' };
    }

    const index = users.findIndex((u) => u.id === userId);
    if (index === -1) {
      return { success: false, error: 'Usuário não localizado.' };
    }

    const user = users[index];
    // If deactivating an admin, ensure another active admin exists
    if (user.role === 'ADMIN' && user.isActive) {
      const otherActiveAdmins = users.filter((u) => u.role === 'ADMIN' && u.id !== userId && u.isActive && u.status === 'ATIVO');
      if (otherActiveAdmins.length === 0) {
        return { success: false, error: 'Não é permitido desativar o único administrador ativo.' };
      }
    }

    const nextActive = !user.isActive;
    const nextStatus = nextActive ? 'ATIVO' : 'INATIVO';
    const updated: UserProfile = { ...user, isActive: nextActive, status: nextStatus };
    const nextUsers = [...users];
    nextUsers[index] = updated;

    setUsers(nextUsers);
    saveUsersToStorage(nextUsers);
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

    const seededUsers: UserProfile[] = [];
    for (const user of INITIAL_USERS) {
      const defaultPass = user.role === 'ADMIN' ? 'admin123' : 'operador123';
      const hash = await hashPassword(defaultPass, user.salt);
      seededUsers.push({
        ...user,
        passwordHash: hash,
        status: 'ATIVO',
        isActive: true,
      });
    }

    setUsers(seededUsers);
    saveUsersToStorage(seededUsers);

    // If current user is not in seeded, log out
    if (currentUser && !seededUsers.some((u) => u.id === currentUser.id)) {
      logout();
    }

    return { success: true };
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
        deleteOwnAccount,
        changePassword,
        toggleUserActive,
        resetUsersToDefault,
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
