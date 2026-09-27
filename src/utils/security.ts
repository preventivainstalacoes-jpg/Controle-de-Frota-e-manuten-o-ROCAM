import { UserProfile, AuthSession, UserRole } from '../types';

const STORAGE_USERS_KEY = 'rocam_security_users_v2';
const STORAGE_SESSION_KEY = 'rocam_security_session_v2';

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
 * Default seeded users with pre-computed salts
 */
const DEFAULT_SALT = 'rocam_sec_salt_99';

// Pre-computed hash of "admin123:rocam_sec_salt_99" and "operador123:rocam_sec_salt_99"
// We will also re-hash at runtime during initialization if needed
export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'usr-admin-01',
    username: 'admin',
    name: 'Cap PM Souza',
    graduacao: 'CAP PM',
    re: '000.001-0',
    role: 'ADMIN',
    pelotao: 'Comando & Logística ROCAM',
    passwordHash: '', // computed on init
    salt: DEFAULT_SALT,
    createdAt: '2026-01-01T08:00:00Z',
    isActive: true,
    status: 'ATIVO',
  },
  {
    id: 'usr-admin-02',
    username: 'admin2',
    name: 'Maj PM Costa',
    graduacao: 'MAJ PM',
    re: '000.002-1',
    role: 'ADMIN',
    pelotao: 'Subcomando & Gestão Operacional',
    passwordHash: '', // computed on init
    salt: DEFAULT_SALT,
    createdAt: '2026-01-02T08:00:00Z',
    isActive: true,
    status: 'ATIVO',
  },
  {
    id: 'usr-admin-03',
    username: 'admin3',
    name: 'Cap PM Almeida',
    graduacao: 'CAP PM',
    re: '000.003-2',
    role: 'ADMIN',
    pelotao: '1ª Cia ROCAM - Coordenação',
    passwordHash: '', // computed on init
    salt: DEFAULT_SALT,
    createdAt: '2026-01-03T08:00:00Z',
    isActive: true,
    status: 'ATIVO',
  },
  {
    id: 'usr-admin-04',
    username: 'admin4',
    name: '1º Ten PM Ribeiro',
    graduacao: '1º TEN PM',
    re: '000.004-3',
    role: 'ADMIN',
    pelotao: 'Seção de Motomecanização & Frota',
    passwordHash: '', // computed on init
    salt: DEFAULT_SALT,
    createdAt: '2026-01-04T08:00:00Z',
    isActive: true,
    status: 'ATIVO',
  },
  {
    id: 'usr-operador-01',
    username: 'operador',
    name: 'Cb PM Oliveira',
    graduacao: 'CB PM',
    re: '145.892-0',
    role: 'OPERADOR',
    pelotao: '1º Pelotão ROCAM',
    passwordHash: '', // computed on init
    salt: DEFAULT_SALT,
    createdAt: '2026-01-15T08:00:00Z',
    isActive: true,
    status: 'ATIVO',
  },
  {
    id: 'usr-operador-02',
    username: 'sd.silva',
    name: 'Sd PM Silva',
    graduacao: 'SD PM',
    re: '158.421-3',
    role: 'OPERADOR',
    pelotao: '2º Pelotão ROCAM',
    passwordHash: '', // computed on init
    salt: DEFAULT_SALT,
    createdAt: '2026-02-01T08:00:00Z',
    isActive: true,
    status: 'ATIVO',
  },
];

/**
 * Load or initialize users from storage
 */
export async function loadUsersFromStorage(): Promise<UserProfile[]> {
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as UserProfile[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Check for any missing initial users (e.g. newly added admin accounts) and seed them
        const existingIds = new Set(parsed.map((u) => u.id));
        const existingUsernames = new Set(parsed.map((u) => u.username.toLowerCase()));
        const missingInitialUsers = INITIAL_USERS.filter(
          (init) => !existingIds.has(init.id) && !existingUsernames.has(init.username.toLowerCase())
        );

        let mergedList = [...parsed];
        if (missingInitialUsers.length > 0) {
          for (const missing of missingInitialUsers) {
            const defaultPass = missing.role === 'ADMIN' ? 'admin123' : 'operador123';
            const hash = await hashPassword(defaultPass, missing.salt);
            mergedList.push({
              ...missing,
              passwordHash: hash,
              status: 'ATIVO',
              isActive: true,
            });
          }
        }

        // Ensure status field exists and activate any previously pending accounts
        const sanitizedList = mergedList.map((u) => {
          const isPending = u.status === 'PENDENTE';
          return {
            ...u,
            status: isPending ? 'ATIVO' : (u.status || (u.isActive ? 'ATIVO' : 'INATIVO')),
            isActive: isPending ? true : u.isActive,
          };
        });

        if (missingInitialUsers.length > 0) {
          saveUsersToStorage(sanitizedList);
        }

        return sanitizedList;
      }
    }
  } catch (e) {
    console.error('Error loading users from localStorage', e);
  }

  // First time initialization: populate default users with proper hashes
  const seededUsers: UserProfile[] = [];
  for (const user of INITIAL_USERS) {
    const defaultPass = user.role === 'ADMIN' ? 'admin123' : 'operador123';
    const hash = await hashPassword(defaultPass, user.salt);
    seededUsers.push({
      ...user,
      passwordHash: hash,
    });
  }

  saveUsersToStorage(seededUsers);
  return seededUsers;
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

  // Find user by username or RE or admin alias
  const user = users.find((u) => {
    const uName = u.username.toLowerCase();
    const uReDigits = u.re.toLowerCase().replace(/[^0-9]/g, '');
    const cleanDigits = cleanId.replace(/[^0-9]/g, '');

    if (uName === cleanId) return true;
    if (cleanDigits && uReDigits === cleanDigits) return true;

    // Aliases for admin accounts
    if (uName === 'admin' && (cleanId === 'admin1' || cleanId === 'admin01')) return true;
    if (uName === 'admin2' && cleanId === 'admin02') return true;
    if (uName === 'admin3' && cleanId === 'admin03') return true;
    if (uName === 'admin4' && cleanId === 'admin04') return true;

    return false;
  });

  if (!user) {
    return { user: null, error: 'Credenciais inválidas. Usuário ou RE não localizado.' };
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
