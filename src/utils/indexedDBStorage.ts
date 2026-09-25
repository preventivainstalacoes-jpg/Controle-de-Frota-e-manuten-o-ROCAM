import { MonthlyBackup, BackupScheduleConfig } from '../types';

const DB_NAME = 'rocam_fleet_storage_db';
const DB_VERSION = 1;
const STORE_MONTHLY_BACKUPS = 'monthly_backups';
const STORE_CONFIG = 'backup_config';

const LOCALSTORAGE_BACKUP_KEY = 'rocam_monthly_backups_vault_v1';
const LOCALSTORAGE_CONFIG_KEY = 'rocam_backup_schedule_config_v1';

export const DEFAULT_BACKUP_CONFIG: BackupScheduleConfig = {
  autoBackupMonthlyEnabled: true,
  diaDoMesAgendado: 1, // 1º dia do mês
  ultimoBackupAutomatico: undefined,
  ultimoMesBackupAutomatico: undefined,
  notificarNovoBackup: true,
};

/**
 * Open or initialize IndexedDB instance
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_MONTHLY_BACKUPS)) {
        const store = db.createObjectStore(STORE_MONTHLY_BACKUPS, { keyPath: 'id' });
        store.createIndex('mesReferencia', 'mesReferencia', { unique: false });
        store.createIndex('criadoEm', 'criadoEm', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_CONFIG)) {
        db.createObjectStore(STORE_CONFIG, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieve all monthly backups from IndexedDB with fallback to localStorage
 */
export async function getAllMonthlyBackups(): Promise<MonthlyBackup[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_MONTHLY_BACKUPS, 'readonly');
      const store = tx.objectStore(STORE_MONTHLY_BACKUPS);
      const req = store.getAll();

      req.onsuccess = () => {
        const results = req.result as MonthlyBackup[];
        if (results && results.length > 0) {
          // Sort newest to oldest
          results.sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
          // Sync to localStorage
          try {
            localStorage.setItem(LOCALSTORAGE_BACKUP_KEY, JSON.stringify(results));
          } catch {
            // Ignore quota errors in localStorage
          }
          resolve(results);
        } else {
          // Fallback to localStorage
          const local = getFromLocalStorage();
          resolve(local);
        }
      };

      req.onerror = () => {
        resolve(getFromLocalStorage());
      };
    });
  } catch {
    return getFromLocalStorage();
  }
}

function getFromLocalStorage(): MonthlyBackup[] {
  try {
    const data = localStorage.getItem(LOCALSTORAGE_BACKUP_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      parsed.sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Save a single monthly backup
 */
export async function saveMonthlyBackup(backup: MonthlyBackup): Promise<void> {
  // Always update localStorage first as fast fallback
  try {
    const existing = getFromLocalStorage();
    const updated = [backup, ...existing.filter((b) => b.id !== backup.id)];
    localStorage.setItem(LOCALSTORAGE_BACKUP_KEY, JSON.stringify(updated));
  } catch {
    // Local storage might exceed quota, IndexedDB handles large size
  }

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_MONTHLY_BACKUPS, 'readwrite');
      const store = tx.objectStore(STORE_MONTHLY_BACKUPS);
      const req = store.put(backup);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to save to IndexedDB, fallback was saved to localStorage', err);
  }
}

/**
 * Delete a single monthly backup by ID
 */
export async function deleteMonthlyBackup(id: string): Promise<void> {
  try {
    const existing = getFromLocalStorage();
    const filtered = existing.filter((b) => b.id !== id);
    localStorage.setItem(LOCALSTORAGE_BACKUP_KEY, JSON.stringify(filtered));
  } catch {
    // ignore
  }

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_MONTHLY_BACKUPS, 'readwrite');
      const store = tx.objectStore(STORE_MONTHLY_BACKUPS);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to delete from IndexedDB', err);
  }
}

/**
 * Retrieve backup scheduling configuration
 */
export async function getBackupScheduleConfig(): Promise<BackupScheduleConfig> {
  try {
    const local = localStorage.getItem(LOCALSTORAGE_CONFIG_KEY);
    if (local) {
      return { ...DEFAULT_BACKUP_CONFIG, ...JSON.parse(local) };
    }
  } catch {
    // ignore
  }
  return DEFAULT_BACKUP_CONFIG;
}

/**
 * Save backup scheduling configuration
 */
export async function saveBackupScheduleConfig(config: BackupScheduleConfig): Promise<void> {
  try {
    localStorage.setItem(LOCALSTORAGE_CONFIG_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_CONFIG, 'readwrite');
    const store = tx.objectStore(STORE_CONFIG);
    store.put({ key: 'schedule_config', value: config });
  } catch {
    // ignore
  }
}
