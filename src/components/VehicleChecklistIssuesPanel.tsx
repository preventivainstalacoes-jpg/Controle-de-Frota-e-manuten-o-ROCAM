import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Vehicle, VehicleChecklistIssue, DamagePhoto } from '../types';
import { DamagePhotoManager } from './DamagePhotoManager';
import { CheckCircle2, ClipboardList, Loader2, Wrench } from 'lucide-react';

interface VehicleChecklistIssuesPanelProps {
  vehicles: Vehicle[];
  currentUserId?: string;
  currentUserName?: string;
  currentUserRE?: string;
}

export const VehicleChecklistIssuesPanel: React.FC<VehicleChecklistIssuesPanelProps> = ({ vehicles, currentUserId, currentUserName, currentUserRE }) => {
  const [issues, setIssues] = useState<VehicleChecklistIssue[]>([]);
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const loadIssues = async () => {
    if (!vehicles.length) { setIssues([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('vehicle_checklist_issues')
      .select('*')
      .in('vehicle_id', vehicles.map((vehicle) => vehicle.id))
      .eq('status', 'PENDENTE')
      .order('created_at', { ascending: true });
    if (error) {
      console.error('Erro ao carregar alterações pendentes:', error);
      setMessage('Não foi possível carregar as alterações pendentes.');
    } else {
      setIssues((data || []).map((row: any) => ({
        id: row.id,
        vehicleId: row.vehicle_id,
        unitId: row.unit_id,
        sourceCautelaId: row.source_cautela_id || undefined,
        sourceNumeroTermo: row.source_numero_termo || undefined,
        checklistItemId: row.checklist_item_id,
        item: row.item,
        observation: row.observation || undefined,
        photos: (row.photos || []) as DamagePhoto[],
        status: row.status,
        createdBy: row.created_by || undefined,
        createdAt: row.created_at,
        resolvedBy: row.resolved_by || undefined,
        resolvedAt: row.resolved_at || undefined,
        resolutionDescription: row.resolution_description || undefined,
      })));
    }
    setLoading(false);
  };

  useEffect(() => { void loadIssues(); }, [vehicles.map((v) => v.id).join('|')]);

  const resolveIssue = async (issue: VehicleChecklistIssue) => {
    const description = (descriptions[issue.id] || '').trim();
    if (!description || !currentUserId) {
      setMessage('Informe o serviço realizado antes de retirar a alteração do checklist.');
      return;
    }
    setSavingId(issue.id);
    setMessage('');
    const { error } = await supabase
      .from('vehicle_checklist_issues')
      .update({
        status: 'RESOLVIDA',
        resolved_by: currentUserId,
        resolved_by_name: currentUserName || null,
        resolved_by_re: currentUserRE || null,
        resolved_at: new Date().toISOString(),
        resolution_description: description,
      })
      .eq('id', issue.id)
      .eq('status', 'PENDENTE');
    if (error) {
      console.error('Erro ao confirmar reparo da alteração:', error);
      setMessage('Não foi possível confirmar o reparo. Verifique sua permissão e tente novamente.');
    } else {
      setMessage('Serviço confirmado. A alteração saiu do checklist ativo e foi preservada no histórico.');
      setDescriptions((prev) => ({ ...prev, [issue.id]: '' }));
      await loadIssues();
    }
    setSavingId(null);
  };

  if (!issues.length && !loading && !message) return null;

  return (
    <section className="rounded-2xl border-2 border-rose-600/70 bg-zinc-950 p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-rose-400" />
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide text-white">Alterações pendentes do checklist</h2>
            <p className="text-[11px] text-zinc-400">Confirme o serviço executado para retirar cada avaria das próximas cautelas.</p>
          </div>
        </div>
        <span className="rounded-full bg-rose-500/20 px-2.5 py-1 text-xs font-black text-rose-200">{issues.length}</span>
      </div>
      {message && <p className="rounded-lg bg-zinc-900 p-2 text-xs text-amber-200">{message}</p>}
      {loading && <div className="flex items-center gap-2 text-xs text-zinc-400"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>}
      {issues.map((issue) => {
        const vehicle = vehicles.find((v) => v.id === issue.vehicleId);
        return (
          <article key={issue.id} className="rounded-xl border border-rose-600/60 bg-rose-950/20 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-black text-rose-300">{vehicle?.prefixo || 'Viatura'} • {vehicle?.tipo === 'MOTOCICLETA' ? 'Motocicleta' : 'Viatura 04 rodas'}</div>
                <h3 className="mt-1 text-sm font-black text-rose-100">{issue.item}</h3>
              </div>
              <span className="rounded bg-rose-600 px-2 py-1 text-[10px] font-black text-white">AVARIA PENDENTE</span>
            </div>
            <p className="text-xs text-rose-100">{issue.observation || 'Sem observação informada.'}</p>
            <p className="text-[10px] text-rose-200/80">
              Registrada em {new Date(issue.createdAt).toLocaleString('pt-BR')}
              {issue.sourceNumeroTermo ? ' • Termo ' + issue.sourceNumeroTermo : ''}
            </p>
            {issue.photos?.length > 0 && (
              <DamagePhotoManager photos={issue.photos} momento="SAIDA" readOnly title="Fotos da avaria" subtitle="" />
            )}
            <label className="block space-y-1">
              <span className="text-[11px] font-semibold text-zinc-300">Serviço realizado / confirmação do reparo *</span>
              <textarea
                value={descriptions[issue.id] || ''}
                onChange={(event) => setDescriptions((prev) => ({ ...prev, [issue.id]: event.target.value }))}
                rows={2}
                placeholder="Descreva o reparo executado e confirme que a avaria foi corrigida..."
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
              />
            </label>
            <div className="flex justify-end">
              <button
                type="button"
                disabled={savingId === issue.id || !(descriptions[issue.id] || '').trim()}
                onClick={() => void resolveIssue(issue)}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <CheckCircle2 className="h-4 w-4" />
                {savingId === issue.id ? 'Salvando...' : 'Confirmar serviço e retirar do checklist'}
              </button>
            </div>
          </article>
        );
      })}
      {!loading && issues.length === 0 && <div className="text-xs text-zinc-400">Nenhuma alteração pendente nesta unidade.</div>}
    </section>
  );
};
