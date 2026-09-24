export function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  const parts = dateString.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateString;
}

export function formatKm(km: number): string {
  return new Intl.NumberFormat('pt-BR').format(km) + ' km';
}

export function getStatusBadgeInfo(status: string) {
  switch (status) {
    case 'OPERACIONAL':
      return {
        label: 'Operacional',
        bg: 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50',
        dot: 'bg-emerald-500',
      };
    case 'BAIXADA':
      return {
        label: 'Baixada',
        bg: 'bg-rose-950/60 text-rose-300 border-rose-700/50',
        dot: 'bg-rose-500 animate-pulse',
      };
    case 'EM_MANUTENCAO':
      return {
        label: 'Em Manutenção',
        bg: 'bg-amber-950/60 text-amber-300 border-amber-700/50',
        dot: 'bg-amber-500',
      };
    case 'RESERVA':
      return {
        label: 'Reserva Técnica',
        bg: 'bg-blue-950/60 text-blue-300 border-blue-700/50',
        dot: 'bg-blue-400',
      };
    case 'AGENDADA':
      return {
        label: 'Agendada',
        bg: 'bg-sky-950/60 text-sky-300 border-sky-700/50',
        dot: 'bg-sky-400',
      };
    case 'EM_EXECUCAO':
      return {
        label: 'Em Execução',
        bg: 'bg-amber-950/60 text-amber-300 border-amber-700/50',
        dot: 'bg-amber-500 animate-spin',
      };
    case 'AGUARDANDO_PECAS':
      return {
        label: 'Aguardando Peças',
        bg: 'bg-purple-950/60 text-purple-300 border-purple-700/50',
        dot: 'bg-purple-400',
      };
    case 'CONCLUIDA':
      return {
        label: 'Concluída',
        bg: 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50',
        dot: 'bg-emerald-500',
      };
    case 'CANCELADA':
      return {
        label: 'Cancelada',
        bg: 'bg-zinc-800 text-zinc-400 border-zinc-700',
        dot: 'bg-zinc-500',
      };
    default:
      return {
        label: status,
        bg: 'bg-zinc-800 text-zinc-300 border-zinc-700',
        dot: 'bg-zinc-400',
      };
  }
}

export function getCategoryLabel(cat: string): string {
  const map: Record<string, string> = {
    OLEO_FILTRO: 'Óleo e Filtros',
    TRANSMISSAO_RELACAO: 'Kit Relação e Corrente',
    FREIOS: 'Freios e Pastilhas',
    PNEUS: 'Pneus e Rodas',
    SUSPENSAO: 'Suspensão e Bengala',
    ELETRICA_SIRENE: 'Elétrica, Sinalizador e Sirene',
    MOTOR_CAMBIO: 'Motor e Transmissão',
    REVISAO_PERIODICA: 'Revisão Geral Periódica',
    FUNILARIA_ESTRUTURA: 'Carenagem, Proteção e Funilaria',
    OUTROS: 'Diversos / Outros',
  };
  return map[cat] || cat;
}
