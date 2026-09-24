import { Vehicle, MaintenanceRecord, MaintenanceRule, MaintenanceAlert } from '../types';

export function calculateMaintenanceAlerts(
  vehicles: Vehicle[],
  records: MaintenanceRecord[],
  rules: MaintenanceRule[]
): MaintenanceAlert[] {
  const alerts: MaintenanceAlert[] = [];

  for (const vehicle of vehicles) {
    const applicableRules = rules.filter(
      (r) => r.tipoViatura === 'TODAS' || r.tipoViatura === vehicle.tipo
    );

    for (const rule of applicableRules) {
      // Find completed or execution records for this vehicle and category
      const vehicleRecords = records
        .filter(
          (rec) =>
            rec.viaturaId === vehicle.id &&
            rec.categoria === rule.categoria &&
            rec.status !== 'CANCELADA'
        )
        .sort((a, b) => new Date(b.dataEntrada).getTime() - new Date(a.dataEntrada).getTime());

      let kmUltimaTroca = 0;
      let dataUltimaTroca: string | undefined;

      if (vehicleRecords.length > 0) {
        kmUltimaTroca = vehicleRecords[0].kmEntrada;
        dataUltimaTroca = vehicleRecords[0].dataEntrada;
      } else {
        // Estimate based on current km and interval (e.g. last interval multiple)
        const cycles = Math.floor(vehicle.kmAtual / rule.intervaloKm);
        kmUltimaTroca = cycles * rule.intervaloKm;
      }

      const kmProximaTroca = kmUltimaTroca + rule.intervaloKm;
      const kmRestante = kmProximaTroca - vehicle.kmAtual;

      let severidade: 'CRITICO' | 'ATENCAO' | 'NORMAL' = 'NORMAL';
      let mensagem = '';

      if (kmRestante <= 0) {
        severidade = 'CRITICO';
        mensagem = `VENCIDO há ${Math.abs(kmRestante).toLocaleString('pt-BR')} km! Exige parada imediata para ${rule.nomeItem}.`;
      } else if (kmRestante <= rule.avisoAntecipadoKm) {
        severidade = 'ATENCAO';
        mensagem = `Próximo da troca! Faltam apenas ${kmRestante.toLocaleString('pt-BR')} km para ${rule.nomeItem}.`;
      } else {
        severidade = 'NORMAL';
        mensagem = `Em dia. Próxima troca em ${kmRestante.toLocaleString('pt-BR')} km (${kmProximaTroca.toLocaleString('pt-BR')} km).`;
      }

      alerts.push({
        id: `alert-${vehicle.id}-${rule.id}`,
        viaturaId: vehicle.id,
        prefixoViatura: vehicle.prefixo,
        tipoViatura: vehicle.tipo,
        modeloViatura: vehicle.modelo,
        categoria: rule.categoria,
        nomeItem: rule.nomeItem,
        kmAtual: vehicle.kmAtual,
        kmUltimaTroca,
        kmProximaTroca,
        kmRestante,
        dataUltimaTroca,
        severidade,
        mensagem,
      });
    }
  }

  // Sort: CRITICO first, then ATENCAO, then NORMAL; within each group, lowest kmRestante first
  return alerts.sort((a, b) => {
    const priority = { CRITICO: 1, ATENCAO: 2, NORMAL: 3 };
    if (priority[a.severidade] !== priority[b.severidade]) {
      return priority[a.severidade] - priority[b.severidade];
    }
    return a.kmRestante - b.kmRestante;
  });
}
