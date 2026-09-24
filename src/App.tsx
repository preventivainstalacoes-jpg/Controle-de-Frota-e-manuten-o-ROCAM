import React, { useState } from 'react';
import { FleetProvider, useFleet } from './context/FleetContext';
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
import { Vehicle, MaintenanceRecord, MaintenanceCategory, CautelaRecord } from './types';
import { Shield, Bike, Car, AlertTriangle, CheckCircle2 } from 'lucide-react';

function AppContent() {
  const {
    activeTab,
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

  // Handlers - Vehicles
  const handleOpenNewVehicle = () => {
    setVehicleToEdit(null);
    setIsVehicleModalOpen(true);
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setVehicleToEdit(vehicle);
    setIsVehicleModalOpen(true);
  };

  const handleSaveVehicle = (data: Omit<Vehicle, 'id' | 'dataUltimaAtualizacaoKm'>) => {
    if (vehicleToEdit) {
      updateVehicle(vehicleToEdit.id, data);
    } else {
      addVehicle(data);
    }
  };

  const handleOpenOdometer = (vehicle: Vehicle) => {
    setVehicleForOdometer(vehicle);
    setIsOdometerModalOpen(true);
  };

  // Handlers - Maintenance
  const handleOpenNewMaintenance = () => {
    setRecordToEdit(null);
    setInitialVehicleId(undefined);
    setInitialCategory(undefined);
    setIsMaintenanceModalOpen(true);
  };

  const handleOpenMaintenanceForVehicle = (vehicle: Vehicle) => {
    setRecordToEdit(null);
    setInitialVehicleId(vehicle.id);
    setInitialCategory(undefined);
    setIsMaintenanceModalOpen(true);
  };

  const handleEditMaintenance = (record: MaintenanceRecord) => {
    setRecordToEdit(record);
    setInitialVehicleId(record.viaturaId);
    setInitialCategory(record.categoria);
    setIsMaintenanceModalOpen(true);
  };

  const handleScheduleFromAlert = (viaturaId: string, categoria: MaintenanceCategory) => {
    setRecordToEdit(null);
    setInitialVehicleId(viaturaId);
    setInitialCategory(categoria);
    setIsMaintenanceModalOpen(true);
  };

  const handleSaveMaintenance = (data: Omit<MaintenanceRecord, 'id' | 'numeroOS'>) => {
    if (recordToEdit) {
      updateMaintenanceRecord(recordToEdit.id, data);
    } else {
      addMaintenanceRecord(data);
    }
  };

  // Handlers - Cautela & Checklist
  const handleOpenNewCautela = (initialVehicle?: Vehicle) => {
    setVehicleForCautela(initialVehicle || null);
    setIsCautelaModalOpen(true);
  };

  const handleOpenDescautela = (cautela: CautelaRecord) => {
    setSelectedCautelaForDescautela(cautela);
    setIsDescautelaModalOpen(true);
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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* Header com Navegação e KPIs */}
      <Header
        onOpenNewVehicle={handleOpenNewVehicle}
        onOpenNewMaintenance={handleOpenNewMaintenance}
        onOpenNewCautela={() => handleOpenNewCautela()}
        onOpenDescautelar={handleOpenDescautelarSelector}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
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

        {/* View Switcher */}
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
          <MaintenanceList
            onOpenNewMaintenance={handleOpenNewMaintenance}
            onEditMaintenance={handleEditMaintenance}
          />
        )}

        {activeTab === 'alertas' && (
          <AlertsView onScheduleMaintenance={handleScheduleFromAlert} />
        )}

        {activeTab === 'relatorio-diario' && (
          <DailyReport
            onOpenDescautela={handleOpenDescautela}
            onViewCautelaDetail={handleViewCautelaDetail}
          />
        )}

        {activeTab === 'relatorio-mensal' && <MonthlyReport />}
      </main>

      {/* Footer Tático */}
      <footer className="bg-zinc-950 border-t border-zinc-850 py-4 mt-auto no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-zinc-400">ROCAM</span>
            <span>• Seção de Logística & Manutenção Automotiva</span>
          </div>
          <div className="font-mono text-[11px] text-zinc-500">
            Frota Monitorada: {stats.total} Viaturas ({stats.motos} Motocicletas • {stats.quatroRodas} 04 Rodas)
          </div>
        </div>
      </footer>

      {/* Modals de Viaturas & Manutenções */}
      <VehicleModal
        isOpen={isVehicleModalOpen}
        onClose={() => setIsVehicleModalOpen(false)}
        onSave={handleSaveVehicle}
        onDelete={(id) => deleteVehicle(id)}
        vehicleToEdit={vehicleToEdit}
      />

      <OdometerModal
        isOpen={isOdometerModalOpen}
        onClose={() => setIsOdometerModalOpen(false)}
        vehicle={vehicleForOdometer}
        onUpdate={updateOdometer}
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

      {/* Modals de Cautela & Checklist */}
      <CautelaModal
        isOpen={isCautelaModalOpen}
        onClose={() => {
          setIsCautelaModalOpen(false);
          setVehicleForCautela(null);
        }}
        vehicles={vehicles}
        activeCautelas={cautelas}
        initialVehicleId={vehicleForCautela?.id}
        onSaveCautela={addCautela}
      />

      <DescautelaModal
        isOpen={isDescautelaModalOpen}
        onClose={() => {
          setIsDescautelaModalOpen(false);
          setSelectedCautelaForDescautela(null);
        }}
        cautela={selectedCautelaForDescautela}
        onFinalizeDescautela={finalizeDescautela}
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
    <FleetProvider>
      <AppContent />
    </FleetProvider>
  );
}
