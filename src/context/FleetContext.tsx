import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
  Vehicle,
  MaintenanceRecord,
  MaintenanceRule,
  MaintenanceAlert,
  VehicleType,
  VehicleStatus,
  CautelaRecord,
  ChecklistItem,
  DamagePhoto,
  MonthlyBackup,
  BackupScheduleConfig,
} from '../types';
import {
  INITIAL_VEHICLES,
  INITIAL_MAINTENANCE_RECORDS,
  INITIAL_RULES
} from '../data/mockData';
import { INITIAL_CAUTELAS } from '../data/defaultChecklist';
import { calculateMaintenanceAlerts } from '../utils/alertEngine';
import {
  getAllMonthlyBackups,
  saveMonthlyBackup,
  deleteMonthlyBackup,
  getBackupScheduleConfig,
  saveBackupScheduleConfig,
  DEFAULT_BACKUP_CONFIG,
} from '../utils/indexedDBStorage';
import {
  buildMonthlyBackup,
  checkShouldRunMonthlyBackup,
  downloadMonthlyBackupFile,
  downloadMonthlySQLDump,
  formatMonthLabel,
} from '../utils/monthlyBackupEngine';

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
  addCautela: (cautelaData: Omit<CautelaRecord, 'id' | 'numeroTermo' | 'status'>) => Promise<boolean>;
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
  ) => Promise<void>;
  deleteCautela: (id: string) => void;

  updateRule: (id: string, updates: Partial<MaintenanceRule>) => void;
  resetToDefaultData: () => void;
  clearAllRecords: () => void;
  exportDatabaseJSON: () => void;
  importDatabaseJSON: (jsonStr: string) => boolean;

  // Monthly Backups
  monthlyBackups: MonthlyBackup[];
  backupConfig: BackupScheduleConfig;
  backupNotification: string | null;
  setBackupNotification: (msg: string | null) => void;
  generateMonthlyBackupNow: (mesReferencia?: string, tipo?: 'AUTOMATICO' | 'MANUAL') => Promise<MonthlyBackup>;
  restoreFromMonthlyBackup: (backup: MonthlyBackup) => boolean;
  deleteMonthlyBackupItem: (id: string) => Promise<void>;
  updateBackupConfig: (updates: Partial<BackupScheduleConfig>) => Promise<void>;
  downloadBackupFile: (backup: MonthlyBackup) => void;
  downloadBackupSQL: (backup: MonthlyBackup) => void;

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

// Supabase is the single source of truth for shared operational data.
// Do not initialize fleet records from localStorage/mock data: that causes each
// phone/browser to keep a different copy of the fleet.
export const FleetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [rules, setRules] = useState<MaintenanceRule[]>(INITIAL_RULES);
  const [cautelas, setCautelas] = useState<CautelaRecord[]>([]);

  const [activeTab, setActiveTab] = useState<string>('frota');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'TODAS' | VehicleType>('TODAS');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | VehicleStatus>('TODOS');

  // Monthly Backups & Database Vault
  const [monthlyBackups, setMonthlyBackups] = useState<MonthlyBackup[]>([]);
  const [backupConfig, setBackupConfig] = useState<BackupScheduleConfig>(DEFAULT_BACKUP_CONFIG);
  const [backupNotification, setBackupNotification] = useState<string | null>(null);

  // Shared Supabase data layer
  const fromDbVehicle = (v: any): Vehicle => ({
    id:v.id,prefixo:v.prefix,placa:v.plate||'',tipo:v.vehicle_type==='viatura_4_rodas'?'QUATRO_RODAS':'MOTOCICLETA',marca:v.brand||'',modelo:v.model||'',ano:v.year||new Date().getFullYear(),kmAtual:v.mileage||0,
    status:v.status==='manutencao'?'EM_MANUTENCAO':v.status==='indisponivel'?'BAIXADA':v.status==='reserva'?'RESERVA':'OPERACIONAL',
    pelotao:v.pelotao||'ROCAM',batalhao:v.batalhao||'ROCAM',motivoBaixa:v.motivo_baixa,condutorPadrao:v.condutor_padrao,dataUltimaAtualizacaoKm:v.updated_at?.split('T')[0]||new Date().toISOString().split('T')[0],observacoes:v.notes||''
  });
  const toDbVehicleType = (t: VehicleType) => t === 'QUATRO_RODAS' ? 'viatura_4_rodas' : 'moto';
  const toDbVehicleStatus = (s: VehicleStatus) => s === 'EM_MANUTENCAO' ? 'manutencao' : s === 'BAIXADA' ? 'indisponivel' : s === 'RESERVA' ? 'reserva' : 'disponivel';
  const fromDbCautela = (c:any): CautelaRecord => ({
    id:c.id,numeroTermo:c.numero_termo,viaturaId:c.vehicle_id,prefixoViatura:c.prefixo_viatura||'',tipoViatura:c.tipo_viatura==='viatura_4_rodas'?'QUATRO_RODAS':'MOTOCICLETA',modeloViatura:c.modelo_viatura||'',placaViatura:c.placa_viatura||'',pelotao:c.pelotao||'ROCAM',
    dataHoraSaida:c.data_hora_saida,kmSaida:c.km_saida,combustivelSaida:c.combustivel_saida,condutorNome:c.condutor_nome,condutorRE:c.condutor_re,condutorGraduacao:c.condutor_graduacao,encarregadoVtr:c.encarregado_vtr,observacoesSaida:c.observacoes_saida,checklistSaida:c.checklist_saida||[],fotosAvariasSaida:c.fotos_saida||[],
    status:c.status==='CONCLUIDA'?'CONCLUIDA':'EM_PATRULHAMENTO',dataHoraRetorno:c.data_hora_retorno,kmRetorno:c.km_retorno,kmPercorrido:c.km_percorrido,combustivelRetorno:c.combustivel_retorno,recebedorNome:c.recebedor_nome,recebedorRE:c.recebedor_re,observacoesRetorno:c.observacoes_retorno,checklistRetorno:c.checklist_retorno||[],houveAvaria:c.houve_avaria,descricaoAvaria:c.descricao_avaria,viaturaBaixadaAposRetorno:c.viatura_baixada,fotosAvariasRetorno:c.fotos_retorno||[]
  });
  const loadSharedFleet = async () => {
    const [vr, mr, cr] = await Promise.all([
      supabase.from('vehicles').select('*').order('prefix'),
      supabase.from('maintenance').select('*').order('opened_at', { ascending: false }),
      supabase.from('cautelas').select('*').order('data_hora_saida', { ascending: false }),
    ]);

    if (vr.error) console.error('Erro ao carregar viaturas do Supabase:', vr.error);
    else setVehicles((vr.data || []).map(fromDbVehicle));

    if (mr.error) console.error('Erro ao carregar manutenções do Supabase:', mr.error);
    else setMaintenanceRecords((mr.data || []).map((r: any) => ({
      id:r.id,numeroOS:r.id,viaturaId:r.vehicle_id,prefixoViatura:'',tipoViatura:'MOTOCICLETA',
      tipoManutencao:r.maintenance_type==='preventiva'?'PREVENTIVA':'CORRETIVA',categoria:'OUTROS',
      status:r.status==='em_andamento'?'EM_EXECUCAO':r.status==='concluida'?'CONCLUIDA':r.status==='cancelada'?'CANCELADA':'AGENDADA',
      dataEntrada:r.opened_at?.split('T')[0],dataConclusao:r.closed_at?.split('T')[0],kmEntrada:r.mileage||0,
      descricaoProblema:r.description||'',servicosExecutados:r.service_performed||'',pecasSubstituidas:[],
      oficinaResponsavel:'',mecanicoResponsavel:'',policialSolicitante:'',matriculaRE:'',urgencia:'MEDIA'
    })));

    if (cr.error) console.error('Erro ao carregar cautelas do Supabase:', cr.error);
    else setCautelas((cr.data || []).map(fromDbCautela));
  };

  // Initial load + realtime refresh. Every device reads the same Supabase state.
  useEffect(() => {
    let alive = true;
    void loadSharedFleet();

    const channel = supabase
      .channel('rocam-frota-shared-data')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, () => {
        if (alive) void loadSharedFleet();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance' }, () => {
        if (alive) void loadSharedFleet();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cautelas' }, () => {
        if (alive) void loadSharedFleet();
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('Falha no canal realtime do ROCAM FROTA.');
        }
      });

    return () => {
      alive = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  // Actions
  const addVehicle = (vehicleData: Omit<Vehicle, 'id' | 'dataUltimaAtualizacaoKm'>) => {
    const today = new Date().toISOString().split('T')[0];
    const newVehicle: Vehicle = {
      ...vehicleData,
      id: crypto.randomUUID(),
      dataUltimaAtualizacaoKm: today,
    };
    setVehicles((prev) => [newVehicle, ...prev]);
    supabase.from('vehicles').insert({id:newVehicle.id,vehicle_type:toDbVehicleType(newVehicle.tipo),prefix:newVehicle.prefixo,plate:newVehicle.placa,brand:newVehicle.marca,model:newVehicle.modelo,year:newVehicle.ano,mileage:newVehicle.kmAtual,status:toDbVehicleStatus(newVehicle.status),notes:newVehicle.observacoes||''}).then(({error})=>{if(error)console.error('Erro ao salvar viatura:',error)});
  };

  const updateVehicle = (id: string, updates: Partial<Vehicle>) => {
    setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, ...updates } : v)));
    const db:any={}; if(updates.prefixo!==undefined)db.prefix=updates.prefixo;if(updates.placa!==undefined)db.plate=updates.placa;if(updates.marca!==undefined)db.brand=updates.marca;if(updates.modelo!==undefined)db.model=updates.modelo;if(updates.ano!==undefined)db.year=updates.ano;if(updates.kmAtual!==undefined)db.mileage=updates.kmAtual;if(updates.status!==undefined)db.status=toDbVehicleStatus(updates.status);if(updates.observacoes!==undefined)db.notes=updates.observacoes;
    if(Object.keys(db).length)supabase.from('vehicles').update(db).eq('id',id).then(({error})=>{if(error)console.error('Erro ao atualizar viatura:',error)});
  };

  const deleteVehicle = (id: string) => {
    setVehicles((prev) => prev.filter((v) => v.id !== id));
    supabase.from('vehicles').delete().eq('id',id).then(({error})=>{if(error)console.error(error)});
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
    const db:any={mileage:newKm};
    if(observacao) db.notes = observacao;
    supabase.from('vehicles').update(db).eq('id',id).then(({error})=>{if(error)console.error('Erro ao salvar hodômetro:',error)});
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
    supabase.auth.getUser().then(({data:{user}})=>{
      if(!user){console.error('Usuário não autenticado para salvar manutenção.');return;}
      const dbStatus = newRecord.status==='EM_EXECUCAO'||newRecord.status==='AGUARDANDO_PECAS'?'em_andamento':newRecord.status==='CONCLUIDA'?'concluida':newRecord.status==='CANCELADA'?'cancelada':'aberta';
      supabase.from('maintenance').insert({id:newRecord.id,vehicle_id:newRecord.viaturaId,reported_by:user.id,maintenance_type:newRecord.tipoManutencao==='PREVENTIVA'?'preventiva':'corretiva',status:dbStatus,mileage:newRecord.kmEntrada,description:newRecord.descricaoProblema,service_performed:newRecord.servicosExecutados,parts:JSON.stringify(newRecord.pecasSubstituidas||[]),opened_at:newRecord.dataEntrada}).then(({error})=>{if(error)console.error('Erro ao salvar manutenção:',error)});
    });

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
    const db:any={}; if(updates.status!==undefined)db.status=updates.status==='EM_EXECUCAO'||updates.status==='AGUARDANDO_PECAS'?'em_andamento':updates.status==='CONCLUIDA'?'concluida':updates.status==='CANCELADA'?'cancelada':'aberta';if(updates.kmEntrada!==undefined)db.mileage=updates.kmEntrada;if(updates.descricaoProblema!==undefined)db.description=updates.descricaoProblema;if(updates.servicosExecutados!==undefined)db.service_performed=updates.servicosExecutados;if(updates.dataConclusao!==undefined)db.closed_at=updates.dataConclusao;
    if(Object.keys(db).length)supabase.from('maintenance').update(db).eq('id',id).then(({error})=>{if(error)console.error(error)});
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
    supabase.from('maintenance').delete().eq('id',id).then(({error})=>{if(error)console.error(error)});
  };

  // Cautela Actions
  const addCautela = async (cautelaData: Omit<CautelaRecord, 'id' | 'numeroTermo' | 'status'>): Promise<boolean> => {
    // Bloqueio local rápido para UX; a regra definitiva está no índice único do Supabase.
    const activeCautelaExists = cautelas.some(
      (c) => c.viaturaId === cautelaData.viaturaId && c.status === 'EM_PATRULHAMENTO'
    );
    if (activeCautelaExists) {
      console.warn(`Tentativa bloqueada: Viatura ${cautelaData.prefixoViatura} já possui cautela ativa.`);
      return false;
    }

    const anoAtual = new Date().getFullYear();
    const proximoNumero = String(cautelas.length + 1).padStart(4, '0');
    const newRecord: CautelaRecord = {
      ...cautelaData,
      id: crypto.randomUUID(),
      numeroTermo: `CAUT-${anoAtual}-${proximoNumero}`,
      status: 'EM_PATRULHAMENTO',
    };

    const { error } = await supabase.from('cautelas').insert({
      id:newRecord.id,numero_termo:newRecord.numeroTermo,vehicle_id:newRecord.viaturaId,data_hora_saida:newRecord.dataHoraSaida,
      km_saida:newRecord.kmSaida,combustivel_saida:newRecord.combustivelSaida,condutor_nome:newRecord.condutorNome,condutor_re:newRecord.condutorRE,
      condutor_graduacao:newRecord.condutorGraduacao,encarregado_vtr:newRecord.encarregadoVtr,observacoes_saida:newRecord.observacoesSaida,
      checklist_saida:newRecord.checklistSaida||[],fotos_saida:newRecord.fotosAvariasSaida||[],status:newRecord.status,
      prefixo_viatura:newRecord.prefixoViatura,modelo_viatura:newRecord.modeloViatura,placa_viatura:newRecord.placaViatura,
      tipo_viatura:newRecord.tipoViatura==='QUATRO_RODAS'?'viatura_4_rodas':'moto',pelotao:newRecord.pelotao
    });

    if (error) {
      if (error.code === '23505') {
        console.warn(`Cautela concorrente bloqueada: Viatura ${cautelaData.prefixoViatura} já foi cautelada por outro operador.`);
      } else {
        console.error('Erro ao salvar cautela:', error);
      }
      return false;
    }

    setCautelas((prev) => [newRecord, ...prev]);

    const vehicle = vehicles.find((v) => v.id === cautelaData.viaturaId);
    if (vehicle && cautelaData.kmSaida > vehicle.kmAtual) {
      updateOdometer(vehicle.id, cautelaData.kmSaida, `Saída em Cautela ${newRecord.numeroTermo}`);
    }

    return true;
  };

  const finalizeDescautela = async (
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

    const dbUpdate = {
      status:'CONCLUIDA',data_hora_retorno:descautelaData.dataHoraRetorno,km_retorno:descautelaData.kmRetorno,
      km_percorrido:Math.max(0,descautelaData.kmRetorno-(cautelas.find(c=>c.id===id)?.kmSaida||0)),
      combustivel_retorno:descautelaData.combustivelRetorno,recebedor_nome:descautelaData.recebedorNome,recebedor_re:descautelaData.recebedorRE,
      observacoes_retorno:descautelaData.observacoesRetorno,checklist_retorno:descautelaData.checklistRetorno||[],houve_avaria:descautelaData.houveAvaria,
      descricao_avaria:descautelaData.descricaoAvaria,viatura_baixada:descautelaData.baixarViatura||false,fotos_retorno:descautelaData.fotosAvariasRetorno||[]
    };
    const { error: cautelaUpdateError } = await supabase.from('cautelas').update(dbUpdate).eq('id', id);
    if (cautelaUpdateError) {
      console.error('Erro ao salvar devolução da cautela no Supabase:', cautelaUpdateError);
      return;
    }

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
    supabase.from('cautelas').delete().eq('id',id).then(({error})=>{if(error)console.error('Erro ao excluir cautela:',error)});
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
    // Shared records are maintained in Supabase; localStorage is intentionally unused.
  };

  const resetToDefaultData = () => {
    setVehicles(INITIAL_VEHICLES);
    setMaintenanceRecords(INITIAL_MAINTENANCE_RECORDS);
    setRules(INITIAL_RULES);
    setCautelas(INITIAL_CAUTELAS);
    // Resetting operational data should be done through the shared database tools.
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

  // Load monthly backups vault & check scheduled auto-backup on mount
  useEffect(() => {
    let isMounted = true;
    async function initMonthlyBackups() {
      try {
        const [loadedBackups, loadedConfig] = await Promise.all([
          getAllMonthlyBackups(),
          getBackupScheduleConfig(),
        ]);
        if (!isMounted) return;
        setMonthlyBackups(loadedBackups);
        setBackupConfig(loadedConfig);

        // Check if an automated monthly backup needs to run
        const check = checkShouldRunMonthlyBackup(loadedConfig, loadedBackups);
        if (check.shouldRun && check.targetMonth) {
          const autoBackup = buildMonthlyBackup(
            check.targetMonth,
            'AUTOMATICO',
            vehicles,
            maintenanceRecords,
            rules,
            cautelas
          );
          await saveMonthlyBackup(autoBackup);
          const updatedConfig: BackupScheduleConfig = {
            ...loadedConfig,
            ultimoBackupAutomatico: new Date().toISOString(),
            ultimoMesBackupAutomatico: check.targetMonth,
          };
          await saveBackupScheduleConfig(updatedConfig);
          if (isMounted) {
            setBackupConfig(updatedConfig);
            setMonthlyBackups((prev) => [autoBackup, ...prev.filter((b) => b.id !== autoBackup.id)]);
            if (loadedConfig.notificarNovoBackup) {
              setBackupNotification(
                `Backup mensal de ${formatMonthLabel(check.targetMonth)} gerado e arquivado com sucesso no banco de dados!`
              );
            }
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar cofre de backups mensais', err);
      }
    }

    initMonthlyBackups();
    return () => {
      isMounted = false;
    };
  }, []);

  const generateMonthlyBackupNow = async (
    mesReferencia?: string,
    tipo: 'AUTOMATICO' | 'MANUAL' = 'MANUAL'
  ): Promise<MonthlyBackup> => {
    const today = new Date();
    const targetMonth =
      mesReferencia || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const newBackup = buildMonthlyBackup(
      targetMonth,
      tipo,
      vehicles,
      maintenanceRecords,
      rules,
      cautelas
    );
    await saveMonthlyBackup(newBackup);
    setMonthlyBackups((prev) => [newBackup, ...prev.filter((b) => b.id !== newBackup.id)]);
    setBackupNotification(`Backup de ${newBackup.labelMes} salvo com sucesso no banco de dados!`);
    return newBackup;
  };

  const restoreFromMonthlyBackup = (backup: MonthlyBackup): boolean => {
    try {
      if (backup && backup.dados) {
        if (Array.isArray(backup.dados.vehicles)) {
          setVehicles(backup.dados.vehicles);
        }
        if (Array.isArray(backup.dados.maintenanceRecords)) {
          setMaintenanceRecords(backup.dados.maintenanceRecords);
        }
        if (Array.isArray(backup.dados.rules)) {
          setRules(backup.dados.rules);
        }
        if (Array.isArray(backup.dados.cautelas)) {
          setCautelas(backup.dados.cautelas);
        }
        setBackupNotification(`Banco de dados restaurado com sucesso a partir do backup de ${backup.labelMes}.`);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const deleteMonthlyBackupItem = async (id: string): Promise<void> => {
    await deleteMonthlyBackup(id);
    setMonthlyBackups((prev) => prev.filter((b) => b.id !== id));
  };

  const updateBackupConfig = async (updates: Partial<BackupScheduleConfig>): Promise<void> => {
    const updated = { ...backupConfig, ...updates };
    setBackupConfig(updated);
    await saveBackupScheduleConfig(updated);
  };

  const downloadBackupFile = (backup: MonthlyBackup): void => {
    downloadMonthlyBackupFile(backup);
  };

  const downloadBackupSQL = (backup: MonthlyBackup): void => {
    downloadMonthlySQLDump(backup);
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
        monthlyBackups,
        backupConfig,
        backupNotification,
        setBackupNotification,
        generateMonthlyBackupNow,
        restoreFromMonthlyBackup,
        deleteMonthlyBackupItem,
        updateBackupConfig,
        downloadBackupFile,
        downloadBackupSQL,
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
