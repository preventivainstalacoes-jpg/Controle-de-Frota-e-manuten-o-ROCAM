import { ChecklistItem, CautelaRecord } from '../types';

export const STANDARD_CHECKLIST_ITEMS: Omit<ChecklistItem, 'id' | 'conforme' | 'observacao'>[] = [
  { item: 'Pneus e Rodas (calibragem, banda de rodagem, fixação de aros/raios)', categoria: 'MECANICA' },
  { item: 'Sistema de Freios (pastilhas, disco, nível de fluido e manete/pedal)', categoria: 'MECANICA' },
  { item: 'Nível de Óleo do Motor e Arrefecimento (ausência de vazamentos)', categoria: 'MECANICA' },
  { item: 'Transmissão e Relação (tensão e lubrificação de corrente / cardã)', categoria: 'MECANICA' },
  { item: 'Farol Dianteiro (luz alta e baixa) e Lanterna Traseira', categoria: 'ELETRICA' },
  { item: 'Luzes de Freio e Luzes Indicadoras de Direção (Setas)', categoria: 'ELETRICA' },
  { item: 'Giroflex / Strobo de Emergência Operante', categoria: 'ELETRICA' },
];

export function generateDefaultChecklist(): ChecklistItem[] {
  return STANDARD_CHECKLIST_ITEMS.map((item, index) => ({
    id: `chk-${index + 1}`,
    item: item.item,
    categoria: item.categoria,
    conforme: true,
    observacao: '',
  }));
}

export const INITIAL_CAUTELAS: CautelaRecord[] = [];

