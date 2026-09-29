import React, { useState } from 'react';
import { FleetProvider, useFleet } from './context/FleetContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TeamProvider, useTeam } from './context/TeamContext';
import { LoginScreen } from './components/LoginScreen';
import { Header } from './components/Header';
import { VehicleList } from './components/VehicleList';
import { VehicleModal } from './components/VehicleModal';
import { OdometerModal } from './components/OdometerModal';
import { MaintenanceList } from './components/MaintenanceList';
import { MaintenanceModal } from './components/MaintenanceModal';
import { AlertsView } from './components/AlertsView';
import { DailyReport } from './components/DailyReport';
import { MonthlyReport } from './components/MonthlyReport';
import { CautelaList } from './components/CautelaList';
import { CautelaModal } from './components/CautelaModal';
import { DescautelaModal } from './components/DescautelaModal';
import { DescautelaSelectModal } from './components/DescautelaSelectModal';
import { CautelaDetailModal } from './components/CautelaDetailModal';
import { DatabaseModal } from './components/DatabaseModal';
import { TeamHub } from './components/TeamHub';
import { Vehicle, MaintenanceRecord, MaintenanceCategory, CautelaRecord } from './types';
import { Shield, Bike, Car, AlertTriangle, CheckCircle2, Lock, ArrowRight, ClipboardCheck, Users } from 'lucide-react';

function AppContent() {
  const {
    activeTab,
    setActiveTab,
    vehicles,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    updateOdometer,
    addMaintenanceRecord,
    updateMaintenanceRecord,
    cautelas,
    addCautela,
    finalizeDescautela,
    deleteCautela,
    stats,
    criticalAlertCount,
  } = useFleet();

  const { isAuthenticated, isLoading, isAdmin, isOperator, currentUser } = useAuth();
  const { logActivity } = useTeam();

  // Modals state - Vehicles & Maintenance
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [vehicleToEdit, setVehicleToEdit] = useState<Vehicle | null>(null);

  const [isOdometerModalOpen, setIsOdometerModalOpen] = useState(false);
  const [vehicleForOdometer, setVehicleForOdometer] = useState<Vehicle | null>(null);

  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<MaintenanceRecord | null>(null);
  const [initialVehicleId, setInitialVehicleId] = useState<string | undefined>(undefined);
  const [initialCategory, setInitialCategory] = useState<MaintenanceCategory | undefined>(undefined);

  // Modals state - Cautela & Checklist
  const [isCautelaModalOpen, setIsCautelaModalOpen] = useState(false);
  const [vehicleForCautela, setVehicleForCautela] = useState<Vehicle | null>(null);

  const [isDescautelaModalOpen, setIsDescautelaModalOpen] = useState(false);
  const [selectedCautelaForDescautela, setSelectedCautelaForDescautela] = useState<CautelaRecord | null>(null);
  const [isDescautelaSelectOpen, setIsDescautelaSelectOpen] = useState(false);

  const [isCautelaDetailOpen, setIsCautelaDetailOpen] = useState(false);
  const [selectedCautelaForDetail, setSelectedCautelaForDetail] = useState<CautelaRecord | null>(null);

  // Database Management Modal state
  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState(false);

  // Handlers - Vehicles
  const handleOpenNewVehicle = () => {
    if (!isAdmin) return;
    setVehicleToEdit(null);
    setIsVehicleModalOpen(true);
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    if (!isAdmin) return;
    setVehicleToEdit(vehicle);
    setIsVehicleModalOpen(true);
  };

  const handleSaveVehicle = (data: Omit<Vehicle, 'id' | 'dataUltimaAtualizacaoKm'>) => {
    if (!isAdmin) return;
    if (vehicleToEdit) {
      updateVehicle(vehicleToEdit.id, data);
      logActivity({
        tipo: 'SISTEMA',
        titulo: `Viatura Atualizada: ${data.prefixo}`,
        descricao: `${currentUser?.graduacao || ''} ${currentUser?.name || ''} atualizou os dados da viatura ${data.prefixo} (${data.modelo}).`,
        usuarioNome: currentUser?.name || 'Administrador',
        usuarioRE: currentUser?.re || '000.001-0',
        usuarioRole: currentUser?.role || 'ADMIN',
        badge: data.prefixo,
        linkTab: 'frota',
      });
    } else {
      addVehicle(data);
      logActivity({
        tipo: 'SISTEMA',
        titulo: `Nova Viatura Cadastrada: ${data.prefixo}`,
        descricao: `${currentUser?.graduacao || ''} ${currentUser?.name || ''} cadastrou a viatura ${data.prefixo} (${data.modelo}) na frota.`,
        usuarioNome: currentUser?.name || 'Administrador',
        usuarioRE: currentUser?.re || '000.001-0',
        usuarioRole: currentUser?.role || 'ADMIN',
        badge: data.prefixo,
        linkTab: 'frota',
      });
    }
  };

  const handleOpenOdometer = (vehicle: Vehicle) => {
    setVehicleForOdometer(vehicle);
    setIsOdometerModalOpen(true);
  };

  const handleUpdateOdometer = (id: string, newKm: number, observacao?: string) => {
    updateOdometer(id, newKm, observacao);
    const v = vehicles.find((vtr) => vtr.id === id);
    if (v) {
      logActivity({
        tipo: 'HODOMETRO',
        titulo: `Hodômetro Atualizado: ${v.prefixo}`,
        descricao: `${currentUser?.graduacao || ''} ${currentUser?.name || ''} registrou novo km: ${newKm.toLocaleString('pt-BR')} km.`,
        usuarioNome: currentUser?.name || 'Policial Militar',
        usuarioRE: currentUser?.re || '000.001-0',
        usuarioRole: currentUser?.role || 'OPERADOR',
        badge: `${newKm.toLocaleString('pt-BR')} km`,
        linkTab: 'frota',
      });
    }
  };

  // Handlers - Maintenance (Admin only)
  const handleOpenNewMaintenance = () => {
    if (!isAdmin) return;
    setRecordToEdit(null);
    setInitialVehicleId(undefined);
    setInitialCategory(undefined);
    setIsMaintenanceModalOpen(true);
  };

  const handleOpenMaintenanceForVehicle = (vehicle: Vehicle) => {
    if (!isAdmin) return;
    setRecordToEdit(null);
    setInitialVehicleId(vehicle.id);
    setInitialCategory(undefined);
    setIsMaintenanceModalOpen(true);
  };

  const handleEditMaintenance = (record: MaintenanceRecord) => {
    if (!isAdmin) return;
    setRecordToEdit(record);
    setInitialVehicleId(record.viaturaId);
    setInitialCategory(record.categoria);
    setIsMaintenanceModalOpen(true);
  };

  const handleScheduleFromAlert = (viaturaId: string, categoria: MaintenanceCategory) => {
    if (!isAdmin) return;
    setRecordToEdit(null);
    setInitialVehicleId(viaturaId);
    setInitialCategory(categoria);
    setIsMaintenanceModalOpen(true);
  };

  const handleSaveMaintenance = (data: Omit<MaintenanceRecord, 'id' | 'numeroOS'>) => {
    if (!isAdmin) return;
    if (recordToEdit) {
      updateMaintenanceRecord(recordToEdit.id, data);
      logActivity({
        tipo: 'MANUTENCAO',
        titulo: `O.S. Atualizada: ${recordToEdit.numeroOS}`,
        descricao: `Status: ${data.status} • Viatura ${data.prefixoViatura} • Responsável: ${data.oficinaResponsavel}.`,
        usuarioNome: currentUser?.name || 'Administrador',
        usuarioRE: currentUser?.re || '000.001-0',
        usuarioRole: currentUser?.role || 'ADMIN',
        badge: recordToEdit.numeroOS,
        linkTab: 'manutencao',
      });
    } else {
      addMaintenanceRecord(data);
      logActivity({
        tipo: 'MANUTENCAO',
        titulo: `Nova O.S. de Manutenção Aberta`,
        descricao: `${data.tipoManutencao} para ${data.prefixoViatura} (${data.categoria}). Oficina: ${data.oficinaResponsavel}.`,
        usuarioNome: currentUser?.name || 'Administrador',
        usuarioRE: currentUser?.re || '000.001-0',
        usuarioRole: currentUser?.role || 'ADMIN',
        badge: data.prefixoViatura,
        linkTab: 'manutencao',
      });
    }
  };

  // Handlers - Cautela & Checklist (Available for both Admin and Operator!)
  const handleOpenNewCautela = (initialVehicle?: Vehicle) => {
    setVehicleForCautela(initialVehicle || null);
    setIsCautelaModalOpen(true);
  };

  const handleSaveCautela = async (cautelaData: Parameters<typeof addCautela>[0]) => {
    const saved = await addCautela(cautelaData);
    if (!saved) {
      window.alert('Esta viatura já está cautelada por outro operador. Faça a descautela antes de iniciar um novo serviço.');
      return;
    }
    logActivity({
      tipo: 'CAUTELA',
      titulo: `Cautela Iniciada: ${cautelaData.prefixoViatura}`,
      descricao: `${cautelaData.condutorGraduacao} ${cautelaData.condutorNome} (RE ${cautelaData.condutorRE}) retirou viatura para patrulhamento.`,
      usuarioNome: currentUser?.name || cautelaData.condutorNome,
      usuarioRE: currentUser?.re || cautelaData.condutorRE,
      usuarioRole: currentUser?.role || 'OPERADOR',
      badge: cautelaData.prefixoViatura,
      linkTab: 'cautelas',
    });
  };

  const handleBaixarViaturaChecklist = (vehicleId: string, motivo: string) => {
    updateVehicle(vehicleId, {
      status: 'BAIXADA',
      motivoBaixa: motivo || 'Avaria constatada durante checklist de inspeção prévia.',
    });
    const v = vehicles.find((veh) => veh.id === vehicleId);
    logActivity({
      tipo: 'AVARIA',
      titulo: `Viatura Baixada no Checklist: ${v?.prefixo || 'Viatura'}`,
      descricao: `Status alterado para BAIXADA devido a: ${motivo || 'Defeito detectado no checklist'}. Encaminhada ao quantitativo de baixadas.`,
      usuarioNome: currentUser?.name || 'Policial',
      usuarioRE: currentUser?.re || '000.001-0',
      usuarioRole: currentUser?.role || 'OPERADOR',
      badge: v?.prefixo || 'ROCAM',
      linkTab: 'frota',
    });
  };

  const handleOpenDescautela = (cautela: CautelaRecord) => {
    setSelectedCautelaForDescautela(cautela);
    setIsDescautelaModalOpen(true);
  };

  const handleFinalizeDescautela = (
    id: string,
    descautelaData: Parameters<typeof finalizeDescautela>[1]
  ) => {
    finalizeDescautela(id, descautelaData);
    const c = cautelas.find((item) => item.id === id);
    logActivity({
      tipo: descautelaData.houveAvaria ? 'AVARIA' : 'DESCAUTELA',
      titulo: descautelaData.houveAvaria
        ? `Descautela com Avaria: ${c?.prefixoViatura || 'Viatura'}`
        : `Descautela Finalizada: ${c?.prefixoViatura || 'Viatura'}`,
      descricao: descautelaData.houveAvaria
        ? `Retorno com registro de avaria: "${descautelaData.descricaoAvaria || 'Dano'}" ${descautelaData.baixarViatura ? '(Viatura baixada)' : ''}.`
        : `Turno finalizado com sucesso. Km retorno: ${descautelaData.kmRetorno?.toLocaleString('pt-BR')} km.`,
      usuarioNome: currentUser?.name || 'Recebedor',
      usuarioRE: currentUser?.re || '000.001-0',
      usuarioRole: currentUser?.role || 'OPERADOR',
      badge: c?.prefixoViatura || 'ROCAM',
      linkTab: 'cautelas',
    });
  };

  const handleOpenDescautelarSelector = () => {
    const active = cautelas.filter((c) => c.status === 'EM_PATRULHAMENTO');
    if (active.length === 1) {
      handleOpenDescautela(active[0]);
    } else {
      setIsDescautelaSelectOpen(true);
    }
  };

  const handleViewCautelaDetail = (cautela: CautelaRecord) => {
    setSelectedCautelaForDetail(cautela);
    setIsCautelaDetailOpen(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 animate-pulse">
          <Shield className="w-6 h-6 animate-spin" />
        </div>
        <p className="text-xs font-mono uppercase tracking-wider text-zinc-400">
          Carregando credenciais e módulo de segurança ROCAM...
        </p>
      </div>
    );
  }

  // Not authenticated: render tactical login screen
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* Header com Navegação e KPIs */}
      <Header
        onOpenNewVehicle={handleOpenNewVehicle}
        onOpenNewMaintenance={handleOpenNewMaintenance}
        onOpenNewCautela={() => handleOpenNewCautela()}
        onOpenDescautelar={handleOpenDescautelarSelector}
        onOpenDatabaseModal={() => {
          if (isAdmin) setIsDatabaseModalOpen(true);
        }}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Banner Informativo de Perfil Operador */}
        {isOperator && activeTab === 'frota' && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-700/50 text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md animate-in fade-in duration-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-emerald-600 text-zinc-950 font-bold shrink-0">
                <ClipboardCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  Acesso Operador: {currentUser?.name} (RE: {currentUser?.re})
                </h3>
                <p className="text-[11px] text-emerald-300">
                  Visualize as viaturas disponíveis para patrulhamento. Clique em <strong>"Cautelar"</strong> para registrar saída ou em <strong>"Descautelar"</strong> para finalizar o turno com fotos de avarias.
                </p>
              </div>
            </div>
            <button
              onClick={() => handleOpenNewCautela()}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition whitespace-nowrap cursor-pointer shadow"
            >
              + Cautelar Viatura
            </button>
          </div>
        )}

        {/* Banner de Alerta Crítico Global se houver vencidos */}
        {criticalAlertCount > 0 && activeTab !== 'alertas' && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/60 border border-rose-700/60 text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-rose-950/40 animate-in fade-in duration-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-rose-600 text-white">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Atenção: {criticalAlertCount} viatura(s) com manutenção preventiva vencida!
                </h3>
                <p className="text-xs text-rose-300">
                  Quilometragem limite ultrapassada. Risco de avaria mecânica grave ou perda de garantia.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                const el = document.getElementById('tab-nav-alertas');
                el?.click();
              }}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition whitespace-nowrap cursor-pointer"
            >
              Visualizar Alertas Críticos
            </button>
          </div>
        )}

        {/* View Switcher com RBAC Guards */}
        {activeTab === 'frota' && (
          <VehicleList
            onOpenNewVehicle={handleOpenNewVehicle}
            onEditVehicle={handleEditVehicle}
            onOpenOdometer={handleOpenOdometer}
            onOpenMaintenanceForVehicle={handleOpenMaintenanceForVehicle}
            onOpenNewCautelaForVehicle={(v) => handleOpenNewCautela(v)}
            onOpenDescautelaForVehicle={handleOpenDescautela}
          />
        )}

        {activeTab === 'cautelas' && (
          <CautelaList
            onOpenNewCautela={() => handleOpenNewCautela()}
            onOpenDescautela={handleOpenDescautela}
            onViewCautelaDetail={handleViewCautelaDetail}
          />
        )}

        {activeTab === 'manutencao' && (
          isAdmin ? (
            <MaintenanceList
              onOpenNewMaintenance={handleOpenNewMaintenance}
              onEditMaintenance={handleEditMaintenance}
            />
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center max-w-lg mx-auto my-12 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center">
                <Lock className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Módulo Restrito a Administradores</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  A abertura e edição de Ordens de Serviço (O.S.) é restrita a administradores da Seção de Logística.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('cautelas')}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Ir para Cautela & Checklist
              </button>
            </div>
          )
        )}

        {activeTab === 'alertas' && (
          <AlertsView onScheduleMaintenance={handleScheduleFromAlert} />
        )}

        {activeTab === 'equipe' && (
          <TeamHub />
        )}

        {activeTab === 'relatorio-diario' && (
          <DailyReport
            onOpenDescautela={handleOpenDescautela}
            onViewCautelaDetail={handleViewCautelaDetail}
          />
        )}

        {activeTab === 'relatorio-mensal' && (
          isAdmin ? (
            <MonthlyReport />
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center max-w-lg mx-auto my-12 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center">
                <Lock className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Relatório Mensal Restrito</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  O fechamento contábil e backups mensais são de acesso exclusivo de Administradores.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('cautelas')}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Ir para Cautela & Checklist
              </button>
            </div>
          )
        )}
      </main>

      {/* Footer Tático */}
      <footer className="bg-zinc-950 border-t border-zinc-850 py-4 mt-auto no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-zinc-400">ROCAM</span>
            <span>• Seção de Logística & Manutenção Automotiva</span>
            <span>•</span>
            <span className="text-[11px] font-mono text-zinc-400">
              Conectado: {currentUser?.name} ({currentUser?.role})
            </span>
          </div>
          <div className="font-mono text-[11px] text-zinc-500">
            Frota Monitorada: {stats.total} Viaturas ({stats.motos} Motocicletas • {stats.quatroRodas} 04 Rodas)
          </div>
        </div>
      </footer>

      {/* Modals de Viaturas & Manutenções (Admin only) */}
      {isAdmin && (
        <>
          <VehicleModal
            isOpen={isVehicleModalOpen}
            onClose={() => setIsVehicleModalOpen(false)}
            onSave={handleSaveVehicle}
            onDelete={(id) => deleteVehicle(id)}
            vehicleToEdit={vehicleToEdit}
          />

          <MaintenanceModal
            isOpen={isMaintenanceModalOpen}
            onClose={() => setIsMaintenanceModalOpen(false)}
            onSave={handleSaveMaintenance}
            vehicles={vehicles}
            recordToEdit={recordToEdit}
            initialVehicleId={initialVehicleId}
            initialCategory={initialCategory}
          />

          <DatabaseModal
            isOpen={isDatabaseModalOpen}
            onClose={() => setIsDatabaseModalOpen(false)}
          />
        </>
      )}

      {/* Hodômetro modal */}
      <OdometerModal
        isOpen={isOdometerModalOpen}
        onClose={() => setIsOdometerModalOpen(false)}
        vehicle={vehicleForOdometer}
        onUpdate={handleUpdateOdometer}
      />

      {/* Modals de Cautela & Checklist (Acessíveis por ambos!) */}
      <CautelaModal
        isOpen={isCautelaModalOpen}
        onClose={() => {
          setIsCautelaModalOpen(false);
          setVehicleForCautela(null);
        }}
        vehicles={vehicles}
        activeCautelas={cautelas}
        initialVehicleId={vehicleForCautela?.id}
        onSaveCautela={handleSaveCautela}
        onBaixarViatura={handleBaixarViaturaChecklist}
      />

      <DescautelaModal
        isOpen={isDescautelaModalOpen}
        onClose={() => {
          setIsDescautelaModalOpen(false);
          setSelectedCautelaForDescautela(null);
        }}
        cautela={selectedCautelaForDescautela}
        onFinalizeDescautela={handleFinalizeDescautela}
      />

      <DescautelaSelectModal
        isOpen={isDescautelaSelectOpen}
        onClose={() => setIsDescautelaSelectOpen(false)}
        activeCautelas={cautelas.filter((c) => c.status === 'EM_PATRULHAMENTO')}
        onSelectCautela={(c) => {
          setIsDescautelaSelectOpen(false);
          handleOpenDescautela(c);
        }}
        onOpenNewCautela={() => handleOpenNewCautela()}
      />

      <CautelaDetailModal
        isOpen={isCautelaDetailOpen}
        onClose={() => {
          setIsCautelaDetailOpen(false);
          setSelectedCautelaForDetail(null);
        }}
        cautela={selectedCautelaForDetail}
        onOpenDescautela={(c) => {
          setIsCautelaDetailOpen(false);
          handleOpenDescautela(c);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <FleetProvider>
        <TeamProvider>
          <AppContent />
        </TeamProvider>
      </FleetProvider>
    </AuthProvider>
  );
}
