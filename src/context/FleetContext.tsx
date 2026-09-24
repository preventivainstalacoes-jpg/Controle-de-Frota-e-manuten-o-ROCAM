import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  Vehicle,
  MaintenanceRecord,
  MaintenanceRule,
  MaintenanceAlert,
  VehicleType,
  VehicleStatus,
  CautelaRecord,
  ChecklistItem,
  DamagePhoto
} from '../types';
import {
  INITIAL_VEHICLES,
  INITIAL_MAINTENANCE_RECORDS,
  INITIAL_RULES
} from '../data/mockData';
import { INITIAL_CAUTELAS } from '../data/defaultChecklist';
import { calculateMaintenanceAlerts } from '../utils/alertEngine';

interface FleetContextType {
  vehicles: Vehicle[];
  maintenanceRecords: MaintenanceRecord[];
  rules: MaintenanceRule[];
  cautelas: CautelaRecord[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  typeFilter: 'TODAS' | VehicleType;
  setTypeFilter: (type: 'TODAS' | VehicleType) => void;
  statusFilter: 'TODOS' | VehicleStatus;
  setStatusFilter: (status: 'TODOS' | VehicleStatus) => void;

  // Actions
  addVehicle: (vehicleData: Omit<Vehicle, 'id' | 'dataUltimaAtualizacaoKm'>) => void;
  updateVehicle: (id: string, updates: Partial<Vehicle>) => void;
  deleteVehicle: (id: string) => void;
  updateOdometer: (id: string, newKm: number, observacao?: string) => void;
  
  addMaintenanceRecord: (recordData: Omit<MaintenanceRecord, 'id' | 'numeroOS'>) => void;
  updateMaintenanceRecord: (id: string, updates: Partial<MaintenanceRecord>) => void;
  deleteMaintenanceRecord: (id: string) => void;
  
  // Cautela / Descautela Actions
  addCautela: (cautelaData: Omit<CautelaRecord, 'id' | 'numeroTermo' | 'status'>) => void;
  finalizeDescautela: (
    id: string,
    descautelaData: {
      dataHoraRetorno: string;
      kmRetorno: number;
      combustivelRetorno: 'RESERVA' | '1/4' | '1/2' | '3/4' | 'CHEIO';
      recebedorNome?: string;
      recebedorRE?: string;
      observacoesRetorno?: string;
      checklistRetorno: ChecklistItem[];
      houveAvaria: boolean;
      descricaoAvaria?: string;
      baixarViatura?: boolean;
      motivoBaixa?: string;
      fotosAvariasRetorno?: DamagePhoto[];
    }
  ) => void;
  deleteCautela: (id: string) => void;

  updateRule: (id: string, updates: Partial<MaintenanceRule>) => void;
  resetToDefaultData: () => void;
  clearAllRecords: () => void;
  exportDatabaseJSON: () => void;
  importDatabaseJSON: (jsonStr: string) => boolean;

  // Computed
  alerts: MaintenanceAlert[];
  criticalAlertCount: number;
  warningAlertCount: number;
  activeCautelasCount: number;
  stats: {
    total: number;
    motos: number;
    quatroRodas: number;
    operacionais: number;
    baixadas: number;
    emManutencao: number;
    reserva: number;
    taxaProntidao: number;
  };
}

const FleetContext = createContext<FleetContextType | undefined>(undefined);

const STORAGE_KEY_VEHICLES = 'rocam_frota_vehicles_v3';
const STORAGE_KEY_RECORDS = 'rocam_frota_records_v3';
const STORAGE_KEY_RULES = 'rocam_frota_rules_v3';
const STORAGE_KEY_CAUTELAS = 'rocam_frota_cautelas_v3';

// Cleanup any legacy mock storage keys on module initialization
try {
  localStorage.removeItem('rocam_frota_records_v2');
  localStorage.removeItem('rocam_frota_cautelas_v2');
  localStorage.removeItem('rocam_frota_records_v1');
  localStorage.removeItem('rocam_frota_cautelas_v1');
} catch {
  // ignore storage errors
}

export const FleetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_VEHICLES);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure vehicles don't remain in maintenance if records are erased
        return Array.isArray(parsed)
          ? parsed.map((v: Vehicle) =>
              v.status === 'EM_MANUTENCAO'
                ? { ...v, status: 'OPERACIONAL', motivoBaixa: undefined }
                : v
            )
          : INITIAL_VEHICLES;
      }
      return INITIAL_VEHICLES;
    } catch {
      return INITIAL_VEHICLES;
    }
  });

  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RECORDS);
      return saved ? JSON.parse(saved) : INITIAL_MAINTENANCE_RECORDS;
    } catch {
      return INITIAL_MAINTENANCE_RECORDS;
    }
  });

  const [rules, setRules] = useState<MaintenanceRule[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RULES);
      return saved ? JSON.parse(saved) : INITIAL_RULES;
    } catch {
      return INITIAL_RULES;
    }
  });

  const [cautelas, setCautelas] = useState<CautelaRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CAUTELAS);
      return saved ? JSON.parse(saved) : INITIAL_CAUTELAS;
    } catch {
      return INITIAL_CAUTELAS;
    }
  });

  const [activeTab, setActiveTab] = useState<string>('frota');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'TODAS' | VehicleType>('TODAS');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | VehicleStatus>('TODOS');

  // Persistence
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_VEHICLES, JSON.stringify(vehicles));
    } catch (e) {
      console.error('Failed to save vehicles to localStorage', e);
    }
  }, [vehicles]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(maintenanceRecords));
    } catch (e) {
      console.error('Failed to save records to localStorage', e);
    }
  }, [maintenanceRecords]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RULES, JSON.stringify(rules));
    } catch (e) {
      console.error('Failed to save rules to localStorage', e);
    }
  }, [rules]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CAUTELAS, JSON.stringify(cautelas));
    } catch (e) {
      console.error('Failed to save cautelas to localStorage', e);
    }
  }, [cautelas]);

  // Actions
  const addVehicle = (vehicleData: Omit<Vehicle, 'id' | 'dataUltimaAtualizacaoKm'>) => {
    const today = new Date().toISOString().split('T')[0];
    const newVehicle: Vehicle = {
      ...vehicleData,
      id: `v-${Date.now()}`,
      dataUltimaAtualizacaoKm: today,
    };
    setVehicles((prev) => [newVehicle, ...prev]);
  };

  const updateVehicle = (id: string, updates: Partial<Vehicle>) => {
    setVehicles((prev) =>
      prev.map((v) => (v.id === id ? { ...v, ...updates } : v))
    );
  };

  const deleteVehicle = (id: string) => {
    setVehicles((prev) => prev.filter((v) => v.id !== id));
  };

  const updateOdometer = (id: string, newKm: number, observacao?: string) => {
    const today = new Date().toISOString().split('T')[0];
    setVehicles((prev) =>
      prev.map((v) => {
        if (v.id === id) {
          return {
            ...v,
            kmAtual: newKm,
            dataUltimaAtualizacaoKm: today,
            observacoes: observacao ? `${observacao} | ${v.observacoes || ''}` : v.observacoes,
          };
        }
        return v;
      })
    );
  };

  const addMaintenanceRecord = (recordData: Omit<MaintenanceRecord, 'id' | 'numeroOS'>) => {
    const nextSeq = maintenanceRecords.length + 84;
    const padded = String(nextSeq).padStart(4, '0');
    const currentYear = new Date().getFullYear();
    const numeroOS = `OS-${currentYear}-${padded}`;

    const newRecord: MaintenanceRecord = {
      ...recordData,
      id: `os-${Date.now()}`,
      numeroOS,
    };

    setMaintenanceRecords((prev) => [newRecord, ...prev]);

    // Also update vehicle status and km if relevant
    const vehicle = vehicles.find((v) => v.id === recordData.viaturaId);
    if (vehicle) {
      const updates: Partial<Vehicle> = {};
      if (recordData.status === 'EM_EXECUCAO' || recordData.status === 'AGUARDANDO_PECAS') {
        updates.status = 'EM_MANUTENCAO';
        updates.motivoBaixa = recordData.descricaoProblema;
      } else if (recordData.status === 'CONCLUIDA' && vehicle.status === 'EM_MANUTENCAO') {
        updates.status = 'OPERACIONAL';
        updates.motivoBaixa = undefined;
      }
      if (recordData.kmEntrada > vehicle.kmAtual) {
        updates.kmAtual = recordData.kmEntrada;
        updates.dataUltimaAtualizacaoKm = recordData.dataEntrada;
      }
      if (Object.keys(updates).length > 0) {
        updateVehicle(vehicle.id, updates);
      }
    }
  };

  const updateMaintenanceRecord = (id: string, updates: Partial<MaintenanceRecord>) => {
    setMaintenanceRecords((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const updated = { ...r, ...updates };
          // If status completed and was in execution, check if we should return vehicle to OPERACIONAL
          if (updates.status === 'CONCLUIDA' && r.status !== 'CONCLUIDA') {
            const v = vehicles.find((veh) => veh.id === r.viaturaId);
            if (v && v.status === 'EM_MANUTENCAO') {
              updateVehicle(v.id, { status: 'OPERACIONAL', motivoBaixa: undefined });
            }
          }
          return updated;
        }
        return r;
      })
    );
  };

  const deleteMaintenanceRecord = (id: string) => {
    setMaintenanceRecords((prev) => prev.filter((r) => r.id !== id));
  };

  // Cautela Actions
  const addCautela = (cautelaData: Omit<CautelaRecord, 'id' | 'numeroTermo' | 'status'>) => {
    // Validar se a viatura já se encontra em patrulhamento (cautela ativa)
    const activeCautelaExists = cautelas.some(
      (c) => c.viaturaId === cautelaData.viaturaId && c.status === 'EM_PATRULHAMENTO'
    );
    if (activeCautelaExists) {
      console.warn(`Tentativa bloqueada: Viatura ${cautelaData.prefixoViatura} já possui cautela ativa.`);
      return;
    }

    const anoAtual = new Date().getFullYear();
    const proximoNumero = String(cautelas.length + 1).padStart(4, '0');
    const newRecord: CautelaRecord = {
      ...cautelaData,
      id: `caut-${Date.now()}`,
      numeroTermo: `CAUT-${anoAtual}-${proximoNumero}`,
      status: 'EM_PATRULHAMENTO',
    };

    setCautelas((prev) => [newRecord, ...prev]);

    // Update vehicle km if departure km is higher
    const vehicle = vehicles.find((v) => v.id === cautelaData.viaturaId);
    if (vehicle && cautelaData.kmSaida > vehicle.kmAtual) {
      updateOdometer(vehicle.id, cautelaData.kmSaida, `Saída em Cautela ${newRecord.numeroTermo}`);
    }
  };

  const finalizeDescautela = (
    id: string,
    descautelaData: {
      dataHoraRetorno: string;
      kmRetorno: number;
      combustivelRetorno: 'RESERVA' | '1/4' | '1/2' | '3/4' | 'CHEIO';
      recebedorNome?: string;
      recebedorRE?: string;
      observacoesRetorno?: string;
      checklistRetorno: ChecklistItem[];
      houveAvaria: boolean;
      descricaoAvaria?: string;
      baixarViatura?: boolean;
      motivoBaixa?: string;
      fotosAvariasRetorno?: DamagePhoto[];
    }
  ) => {
    setCautelas((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const kmPercorrido = Math.max(0, descautelaData.kmRetorno - c.kmSaida);
          return {
            ...c,
            status: 'CONCLUIDA' as const,
            dataHoraRetorno: descautelaData.dataHoraRetorno,
            kmRetorno: descautelaData.kmRetorno,
            kmPercorrido,
            combustivelRetorno: descautelaData.combustivelRetorno,
            recebedorNome: descautelaData.recebedorNome,
            recebedorRE: descautelaData.recebedorRE,
            observacoesRetorno: descautelaData.observacoesRetorno,
            checklistRetorno: descautelaData.checklistRetorno,
            houveAvaria: descautelaData.houveAvaria,
            descricaoAvaria: descautelaData.descricaoAvaria,
            viaturaBaixadaAposRetorno: descautelaData.baixarViatura || false,
            fotosAvariasRetorno: descautelaData.fotosAvariasRetorno,
          };
        }
        return c;
      })
    );

    // Find cautela to get viaturaId
    const currentCautela = cautelas.find((c) => c.id === id);
    if (currentCautela) {
      const v = vehicles.find((veh) => veh.id === currentCautela.viaturaId);
      if (v) {
        const updates: Partial<Vehicle> = {
          kmAtual: descautelaData.kmRetorno,
          dataUltimaAtualizacaoKm: descautelaData.dataHoraRetorno.split('T')[0],
        };

        if (descautelaData.baixarViatura) {
          updates.status = 'BAIXADA';
          updates.motivoBaixa = descautelaData.motivoBaixa || descautelaData.descricaoAvaria || 'Avaria constatada no retorno da cautela.';
        }

        updateVehicle(v.id, updates);
      }
    }
  };

  const deleteCautela = (id: string) => {
    setCautelas((prev) => prev.filter((c) => c.id !== id));
  };

  const updateRule = (id: string, updates: Partial<MaintenanceRule>) => {
    setRules((prev) =>
      prev.map((rule) => (rule.id === id ? { ...rule, ...updates } : rule))
    );
  };

  const clearAllRecords = () => {
    setMaintenanceRecords([]);
    setCautelas([]);
    setVehicles((prev) =>
      prev.map((v) =>
        v.status === 'EM_MANUTENCAO' || v.status === 'BAIXADA'
          ? { ...v, status: 'OPERACIONAL', motivoBaixa: undefined }
          : v
      )
    );
    try {
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEY_CAUTELAS, JSON.stringify([]));
      localStorage.removeItem('rocam_frota_records_v2');
      localStorage.removeItem('rocam_frota_cautelas_v2');
      localStorage.removeItem('rocam_frota_records_v1');
      localStorage.removeItem('rocam_frota_cautelas_v1');
    } catch (e) {
      console.error('Failed to clear records in localStorage', e);
    }
  };

  const resetToDefaultData = () => {
    setVehicles(INITIAL_VEHICLES);
    setMaintenanceRecords(INITIAL_MAINTENANCE_RECORDS);
    setRules(INITIAL_RULES);
    setCautelas(INITIAL_CAUTELAS);
    try {
      localStorage.removeItem(STORAGE_KEY_VEHICLES);
      localStorage.removeItem(STORAGE_KEY_RECORDS);
      localStorage.removeItem(STORAGE_KEY_RULES);
      localStorage.removeItem(STORAGE_KEY_CAUTELAS);
      localStorage.removeItem('rocam_frota_records_v2');
      localStorage.removeItem('rocam_frota_cautelas_v2');
      localStorage.removeItem('rocam_frota_records_v1');
      localStorage.removeItem('rocam_frota_cautelas_v1');
    } catch (e) {
      console.error('Failed to clear localStorage', e);
    }
  };

  const exportDatabaseJSON = () => {
    const data = {
      exportDate: new Date().toISOString(),
      vehicles,
      maintenanceRecords,
      rules,
      cautelas,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rocam_frota_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importDatabaseJSON = (jsonStr: string): boolean => {
    try {
      const data = JSON.parse(jsonStr);
      if (Array.isArray(data.vehicles) && Array.isArray(data.maintenanceRecords)) {
        setVehicles(data.vehicles);
        setMaintenanceRecords(data.maintenanceRecords);
        if (Array.isArray(data.rules)) {
          setRules(data.rules);
        }
        if (Array.isArray(data.cautelas)) {
          setCautelas(data.cautelas);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Alerts
  const alerts = useMemo(() => {
    return calculateMaintenanceAlerts(vehicles, maintenanceRecords, rules);
  }, [vehicles, maintenanceRecords, rules]);

  const criticalAlertCount = useMemo(() => {
    return alerts.filter((a) => a.severidade === 'CRITICO').length;
  }, [alerts]);

  const warningAlertCount = useMemo(() => {
    return alerts.filter((a) => a.severidade === 'ATENCAO').length;
  }, [alerts]);

  const activeCautelasCount = useMemo(() => {
    return cautelas.filter((c) => c.status === 'EM_PATRULHAMENTO').length;
  }, [cautelas]);

  // Stats
  const stats = useMemo(() => {
    const total = vehicles.length;
    const motos = vehicles.filter((v) => v.tipo === 'MOTOCICLETA').length;
    const quatroRodas = vehicles.filter((v) => v.tipo === 'QUATRO_RODAS').length;
    const operacionais = vehicles.filter((v) => v.status === 'OPERACIONAL').length;
    const baixadas = vehicles.filter((v) => v.status === 'BAIXADA').length;
    const emManutencao = vehicles.filter((v) => v.status === 'EM_MANUTENCAO').length;
    const reserva = vehicles.filter((v) => v.status === 'RESERVA').length;
    const taxaProntidao = total > 0 ? Math.round(((operacionais + reserva) / total) * 100) : 0;

    return {
      total,
      motos,
      quatroRodas,
      operacionais,
      baixadas,
      emManutencao,
      reserva,
      taxaProntidao,
    };
  }, [vehicles]);

  return (
    <FleetContext.Provider
      value={{
        vehicles,
        maintenanceRecords,
        rules,
        cautelas,
        activeTab,
        setActiveTab,
        searchQuery,
        setSearchQuery,
        typeFilter,
        setTypeFilter,
        statusFilter,
        setStatusFilter,
        addVehicle,
        updateVehicle,
        deleteVehicle,
        updateOdometer,
        addMaintenanceRecord,
        updateMaintenanceRecord,
        deleteMaintenanceRecord,
        addCautela,
        finalizeDescautela,
        deleteCautela,
        updateRule,
        resetToDefaultData,
        clearAllRecords,
        exportDatabaseJSON,
        importDatabaseJSON,
        alerts,
        criticalAlertCount,
        warningAlertCount,
        activeCautelasCount,
        stats,
      }}
    >
      {children}
    </FleetContext.Provider>
  );
};

export const useFleet = () => {
  const context = useContext(FleetContext);
  if (!context) {
    throw new Error('useFleet must be used within a FleetProvider');
  }
  return context;
};
