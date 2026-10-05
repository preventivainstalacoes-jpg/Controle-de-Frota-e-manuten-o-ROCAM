import { UserProfile, AuthSession, UserRole } from '../types';
import {
  DEFAULT_SALT,
  ADMIN_DEFAULT_HASH,
  OPERATOR_DEFAULT_HASH,
  FIRST_ADMIN,
  MAX_ADMINS,
  MAX_OPERATORS,
  SEED_ADMINS,
  SEED_OPERATORS,
  INITIAL_USERS,
} from '../data/seedUsers';

export {
  DEFAULT_SALT,
  ADMIN_DEFAULT_HASH,
  OPERATOR_DEFAULT_HASH,
  FIRST_ADMIN,
  MAX_ADMINS,
  MAX_OPERATORS,
  SEED_ADMINS,
  SEED_OPERATORS,
  INITIAL_USERS,
};

const STORAGE_USERS_KEY = 'rocam_security_users_v7';
const STORAGE_SESSION_KEY = 'rocam_security_session_v7';

const LEGACY_STORAGE_KEYS = [
  'rocam_security_users_v1',
  'rocam_security_users_v2',
  'rocam_security_users_v3',
  'rocam_security_users_v4',
  'rocam_security_users_v5',
  'rocam_security_users_v6',
  'rocam_security_session_v1',
  'rocam_security_session_v2',
  'rocam_security_session_v3',
  'rocam_security_session_v4',
  'rocam_security_session_v5',
  'rocam_security_session_v6',
];

/**
 * Purge legacy keys from localStorage
 */
function purgeLegacyKeys(): void {
  try {
    LEGACY_STORAGE_KEYS.forEach((key) => {
      localStorage.removeItem(key);
    });
  } catch {
    // Ignore environments where localStorage is restricted
  }
}

/**
 * Generate a random salt string
 */
export function generateSalt(length = 16): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let salt = '';
  for (let i = 0; i < length; i++) {
    salt += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return salt;
}

/**
 * Hash password with salt using SHA-256 (Web Crypto API with fallback)
 */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const combined = `${password}:${salt}`;
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(combined);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (err) {
    console.warn('SubtleCrypto not available, using fallback hash', err);
  }

  // Fallback simple bitwise hash
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'fb_' + Math.abs(hash).toString(16);
}

/**
 * Verify if password matches hash
 */
export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  const computed = await hashPassword(password, salt);
  return computed === hash;
}

/**
 * Load or initialize users from storage
 */
export async function loadUsersFromStorage(): Promise<UserProfile[]> {
  try {
    purgeLegacyKeys();
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as UserProfile[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure at least one active Admin exists
        const hasAdmin = parsed.some((u) => u.role === 'ADMIN');
        let list = [...parsed];
        if (!hasAdmin) {
          list.unshift(FIRST_ADMIN);
          saveUsersToStorage(list);
        }
        return list;
      }
    }
  } catch (e) {
    console.error('Error loading users from localStorage', e);
  }

  // Initial setup: strictly the 1º Administrador Master
  saveUsersToStorage([FIRST_ADMIN]);
  return [FIRST_ADMIN];
}

/**
 * Reset all user registrations and set/register the 1st Administrator
 */
export async function resetUsersToFirstAdmin(customAdmin?: {
  name: string;
  graduacao: string;
  re: string;
  pelotao: string;
  username: string;
  password: string;
}): Promise<UserProfile[]> {
  purgeLegacyKeys();
  let adminToSave: UserProfile;

  if (customAdmin && customAdmin.username.trim() && customAdmin.password.trim()) {
    const salt = generateSalt();
    const hash = await hashPassword(customAdmin.password.trim(), salt);
    adminToSave = {
      id: 'usr-admin-01',
      username: customAdmin.username.trim().toLowerCase(),
      name: `${customAdmin.graduacao} ${customAdmin.name.trim()}`,
      graduacao: customAdmin.graduacao,
      re: customAdmin.re.trim(),
      role: 'ADMIN',
      pelotao: customAdmin.pelotao.trim() || 'Comando & Logística ROCAM',
      passwordHash: hash,
      salt,
      createdAt: new Date().toISOString(),
      isActive: true,
      status: 'ATIVO',
    };
  } else {
    adminToSave = { ...FIRST_ADMIN };
  }

  const usersList = [adminToSave];
  saveUsersToStorage(usersList);
  clearSavedSession();
  return usersList;
}

/**
 * Save users list to localStorage
 */
export function saveUsersToStorage(users: UserProfile[]): void {
  try {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Error saving users to storage', e);
  }
}

/**
 * Retrieve saved session from storage
 */
export function getSavedSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      clearSavedSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

/**
 * Save active session
 */
export function saveSavedSession(session: AuthSession): void {
  try {
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
  } catch (e) {
    console.error('Error saving session', e);
  }
}

/**
 * Clear session
 */
export function clearSavedSession(): void {
  try {
    localStorage.removeItem(STORAGE_SESSION_KEY);
  } catch (e) {
    console.error('Error clearing session', e);
  }
}

/**
 * Create a new session for a user
 */
export function createSessionForUser(user: UserProfile): AuthSession {
  const token = 'tok_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  // Session expires in 7 days
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  return {
    token,
    userId: user.id,
    username: user.username,
    role: user.role,
    createdAt: new Date().toISOString(),
    expiresAt,
  };
}

/**
 * Authenticate user with username/RE and password
 */
export async function authenticateCredentials(
  identifier: string,
  pass: string,
  users: UserProfile[]
): Promise<{ user: UserProfile | null; error?: string }> {
  const cleanId = identifier.trim().toLowerCase();
  const cleanPass = pass.trim();

  if (!cleanId || !cleanPass) {
    return { user: null, error: 'Informe o usuário/RE e a senha.' };
  }

  // Find user by username, email or RE or admin alias
  const user = users.find((u) => {
    const uName = u.username.toLowerCase();
    const uEmail = (u.email || '').toLowerCase().trim();
    const uReDigits = u.re.toLowerCase().replace(/[^0-9]/g, '');
    const cleanDigits = cleanId.replace(/[^0-9]/g, '');

    if (uName === cleanId) return true;
    if (uEmail && uEmail === cleanId) return true;
    if (
      cleanDigits &&
      cleanDigits.length >= 4 &&
      (uReDigits === cleanDigits ||
        uReDigits.replace(/^0+/, '') === cleanDigits.replace(/^0+/, ''))
    ) {
      return true;
    }

    // Aliases for 20 Admins (e.g. admin, admin1..admin20, admin01..admin20, adm1..adm20)
    const adminMatch = cleanId.match(/^(?:admin|adm)(\d{1,2})$/);
    if (adminMatch) {
      const num = parseInt(adminMatch[1], 10);
      if (num >= 1 && num <= 20) {
        if (num === 1 && (uName === 'admin' || uName === 'admin1' || u.id === 'usr-admin-01')) return true;
        if (u.id === `usr-admin-${String(num).padStart(2, '0')}`) return true;
        if (uName === `admin${num}`) return true;
      }
    }
    if (cleanId === 'admin' && (uName === 'admin' || u.id === 'usr-admin-01')) {
      return true;
    }

    // Aliases for 300 Operators (e.g. operador, op1..op300, op001..op300, operador1..operador300)
    const opMatch = cleanId.match(/^(?:operador|op)(\d{1,3})$/);
    if (opMatch) {
      const num = parseInt(opMatch[1], 10);
      if (num >= 1 && num <= 300) {
        if (num === 1 && (uName === 'operador' || u.id === 'usr-operador-001')) return true;
        if (num === 2 && (uName === 'sd.silva' || u.id === 'usr-operador-002')) return true;
        if (u.id === `usr-operador-${String(num).padStart(3, '0')}`) return true;
        if (uName === `op${String(num).padStart(3, '0')}` || uName === `op${num}`) return true;
      }
    }
    if (cleanId === 'operador' && (uName === 'operador' || u.id === 'usr-operador-001')) {
      return true;
    }

    return false;
  });

  if (!user) {
    return { user: null, error: 'Credenciais inválidas. Usuário ou RE não localizado.' };
  }

  if (user.status === 'PENDENTE') {
    return {
      user: null,
      error: 'O cadastro de um novo usuário é concluído após confirmação de um Administrador. Sua solicitação foi recebida e está aguardando homologação pelo comando da ROCAM.',
    };
  }

  if (user.status === 'REJEITADO') {
    return {
      user: null,
      error: `Cadastro não aprovado pelo Administrador${user.motivoRejeicao ? `: ${user.motivoRejeicao}` : '.'}`,
    };
  }

  if (!user.isActive || user.status === 'INATIVO') {
    return { user: null, error: 'Acesso bloqueado: Este usuário foi desativado pelo Administrador.' };
  }

  const isValid = await verifyPassword(cleanPass, user.passwordHash, user.salt);
  if (!isValid) {
    return { user: null, error: 'Senha incorreta. Verifique suas credenciais.' };
  }

  return { user };
}
