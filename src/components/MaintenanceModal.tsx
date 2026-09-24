import React, { useState, useEffect } from 'react';
import {
  Vehicle,
  MaintenanceRecord,
  MaintenanceType,
  MaintenanceStatus,
  MaintenanceCategory,
  VehiclePartReplacement,
  WorkshopType,
} from '../types';
import {
  X,
  Wrench,
  Plus,
  Trash2,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  FileText,
  UserCheck,
  PackageCheck,
  Building2,
  Shield
} from 'lucide-react';

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<MaintenanceRecord, 'id' | 'numeroOS'>) => void;
  vehicles: Vehicle[];
  recordToEdit?: MaintenanceRecord | null;
  initialVehicleId?: string;
  initialCategory?: MaintenanceCategory;
}

export const MaintenanceModal: React.FC<MaintenanceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  vehicles,
  recordToEdit,
  initialVehicleId,
  initialCategory,
}) => {
  const [viaturaId, setViaturaId] = useState('');
  const [tipoManutencao, setTipoManutencao] = useState<MaintenanceType>('PREVENTIVA');
  const [categoria, setCategoria] = useState<MaintenanceCategory>('OLEO_FILTRO');
  const [status, setStatus] = useState<MaintenanceStatus>('EM_EXECUCAO');
  const [dataEntrada, setDataEntrada] = useState(new Date().toISOString().split('T')[0]);
  const [dataConclusao, setDataConclusao] = useState('');
  const [kmEntrada, setKmEntrada] = useState<number>(0);
  const [descricaoProblema, setDescricaoProblema] = useState('');
  const [servicosExecutados, setServicosExecutados] = useState('');
  const [pecasSubstituidas, setPecasSubstituidas] = useState<VehiclePartReplacement[]>([]);
  const [tipoOficina, setTipoOficina] = useState<WorkshopType>('INTERNA');
  const [oficinaResponsavel, setOficinaResponsavel] = useState('Mecânica Central ROCAM');
  const [cnpjOficina, setCnpjOficina] = useState('');
  const [numeroContratoEmpenho, setNumeroContratoEmpenho] = useState('');
  const [mecanicoResponsavel, setMecanicoResponsavel] = useState('CB PM Prado');
  const [policialSolicitante, setPolicialSolicitante] = useState('');
  const [matriculaRE, setMatriculaRE] = useState('');
  const [urgencia, setUrgencia] = useState<'BAIXA' | 'MEDIA' | 'ALTA' | 'EMERGENCIAL'>('MEDIA');

  // Input states for adding new part
  const [partNome, setPartNome] = useState('');
  const [partCodigo, setPartCodigo] = useState('');
  const [partQtd, setPartQtd] = useState(1);

  useEffect(() => {
    if (recordToEdit) {
      setViaturaId(recordToEdit.viaturaId);
      setTipoManutencao(recordToEdit.tipoManutencao);
      setCategoria(recordToEdit.categoria);
      setStatus(recordToEdit.status);
      setDataEntrada(recordToEdit.dataEntrada);
      setDataConclusao(recordToEdit.dataConclusao || '');
      setKmEntrada(recordToEdit.kmEntrada);
      setDescricaoProblema(recordToEdit.descricaoProblema);
      setServicosExecutados(recordToEdit.servicosExecutados);
      setPecasSubstituidas(recordToEdit.pecasSubstituidas || []);
      setTipoOficina(recordToEdit.tipoOficina || (recordToEdit.oficinaResponsavel.toLowerCase().includes('rocam') ? 'INTERNA' : 'EXTERNA'));
      setOficinaResponsavel(recordToEdit.oficinaResponsavel);
      setCnpjOficina(recordToEdit.cnpjOficina || '');
      setNumeroContratoEmpenho(recordToEdit.numeroContratoEmpenho || '');
      setMecanicoResponsavel(recordToEdit.mecanicoResponsavel);
      setPolicialSolicitante(recordToEdit.policialSolicitante);
      setMatriculaRE(recordToEdit.matriculaRE);
      setUrgencia(recordToEdit.urgencia);
    } else {
      const selectedVtr = vehicles.find((v) => v.id === initialVehicleId) || vehicles[0];
      if (selectedVtr) {
        setViaturaId(selectedVtr.id);
        setKmEntrada(selectedVtr.kmAtual);
        setPolicialSolicitante(selectedVtr.condutorPadrao || '');
      }
      if (initialCategory) {
        setCategoria(initialCategory);
      } else {
        setCategoria('OLEO_FILTRO');
      }
      setTipoManutencao('PREVENTIVA');
      setStatus('EM_EXECUCAO');
      setDataEntrada(new Date().toISOString().split('T')[0]);
      setDataConclusao('');
      setDescricaoProblema('');
      setServicosExecutados('');
      setPecasSubstituidas([]);
      setTipoOficina('INTERNA');
      setOficinaResponsavel('Mecânica Central ROCAM');
      setCnpjOficina('');
      setNumeroContratoEmpenho('');
      setMecanicoResponsavel('CB PM Prado');
      setMatriculaRE('');
      setUrgencia('MEDIA');
    }
  }, [recordToEdit, initialVehicleId, initialCategory, isOpen, vehicles]);

  // When selected vehicle changes in creation mode, update km and default driver
  const handleVehicleChange = (vId: string) => {
    setViaturaId(vId);
    const v = vehicles.find((item) => item.id === vId);
    if (v) {
      setKmEntrada(v.kmAtual);
      if (v.condutorPadrao && !policialSolicitante) {
        setPolicialSolicitante(v.condutorPadrao);
      }
    }
  };

  const handleAddPart = () => {
    if (!partNome.trim() || partQtd <= 0) return;
    const newPart: VehiclePartReplacement = {
      id: `p-${Date.now()}`,
      nome: partNome.trim(),
      codigoPeca: partCodigo.trim() || undefined,
      quantidade: Number(partQtd),
    };
    setPecasSubstituidas([...pecasSubstituidas, newPart]);
    setPartNome('');
    setPartCodigo('');
    setPartQtd(1);
  };

  const handleRemovePart = (id: string) => {
    setPecasSubstituidas(pecasSubstituidas.filter((p) => p.id !== id));
  };

  const selectedVehicle = vehicles.find((v) => v.id === viaturaId);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!viaturaId || !selectedVehicle) {
      alert('Selecione uma viatura para a Ordem de Serviço.');
      return;
    }
    if (!descricaoProblema.trim()) {
      alert('Informe a descrição do problema ou serviço a ser executado.');
      return;
    }

    onSave({
      viaturaId,
      prefixoViatura: selectedVehicle.prefixo,
      tipoViatura: selectedVehicle.tipo,
      tipoManutencao,
      categoria,
      status,
      dataEntrada,
      dataConclusao: status === 'CONCLUIDA' ? (dataConclusao || dataEntrada) : undefined,
      kmEntrada: Number(kmEntrada),
      descricaoProblema: descricaoProblema.trim(),
      servicosExecutados: servicosExecutados.trim(),
      pecasSubstituidas,
      tipoOficina,
      oficinaResponsavel: oficinaResponsavel.trim(),
      cnpjOficina: tipoOficina === 'EXTERNA' ? cnpjOficina.trim() || undefined : undefined,
      numeroContratoEmpenho: tipoOficina === 'EXTERNA' ? numeroContratoEmpenho.trim() || undefined : undefined,
      mecanicoResponsavel: mecanicoResponsavel.trim(),
      policialSolicitante: policialSolicitante.trim() || 'Comando da Subunidade',
      matriculaRE: matriculaRE.trim() || 'N/A',
      urgencia,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-100">
                {recordToEdit
                  ? `Editar ${recordToEdit.numeroOS} (${recordToEdit.prefixoViatura})`
                  : 'Abertura de Ordem de Serviço (O.S.) ROCAM'}
              </h2>
              <p className="text-xs text-zinc-400">
                Registro de manutenção preventiva e corretiva com rastreamento de peças e insumos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {/* Tipo de Manutenção (Preventiva vs Corretiva) */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setTipoManutencao('PREVENTIVA');
                setUrgencia('MEDIA');
              }}
              className={`p-3 rounded-xl border text-sm font-bold flex items-center justify-center space-x-2 transition cursor-pointer ${
                tipoManutencao === 'PREVENTIVA'
                  ? 'bg-blue-950/60 border-blue-500 text-blue-300 shadow-md'
                  : 'bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
              <span>Manutenção Preventiva (Programada)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTipoManutencao('CORRETIVA');
                setUrgencia('ALTA');
              }}
              className={`p-3 rounded-xl border text-sm font-bold flex items-center justify-center space-x-2 transition cursor-pointer ${
                tipoManutencao === 'CORRETIVA'
                  ? 'bg-rose-950/60 border-rose-500 text-rose-300 shadow-md'
                  : 'bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Manutenção Corretiva (Avaria/Quebra)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Viatura */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Viatura Alvo *
              </label>
              <select
                value={viaturaId}
                onChange={(e) => handleVehicleChange(e.target.value)}
                disabled={!!recordToEdit}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 font-semibold focus:outline-none focus:border-amber-500"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.prefixo} • {v.tipo === 'MOTOCICLETA' ? 'Moto' : '04 Rodas'} • {v.modelo} (KM: {v.kmAtual})
                  </option>
                ))}
              </select>
            </div>

            {/* KM na Entrada */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                KM na Entrada *
              </label>
              <input
                type="number"
                required
                min={0}
                value={kmEntrada}
                onChange={(e) => setKmEntrada(Number(e.target.value))}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Categoria */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Categoria do Item *
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as MaintenanceCategory)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
              >
                <option value="OLEO_FILTRO">Óleo e Filtros</option>
                <option value="TRANSMISSAO_RELACAO">Kit Relação e Corrente (Motos)</option>
                <option value="FREIOS">Freios e Pastilhas</option>
                <option value="PNEUS">Pneus e Rodas</option>
                <option value="SUSPENSAO">Suspensão e Bengala</option>
                <option value="ELETRICA_SIRENE">Elétrica, Luzes e Sirene</option>
                <option value="MOTOR_CAMBIO">Motor e Câmbio</option>
                <option value="REVISAO_PERIODICA">Revisão Geral Periódica</option>
                <option value="FUNILARIA_ESTRUTURA">Carenagem e Estrutura</option>
                <option value="OUTROS">Outros Serviços</option>
              </select>
            </div>

            {/* Status da O.S. */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Status da O.S. *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as MaintenanceStatus)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
              >
                <option value="EM_EXECUCAO">Em Execução</option>
                <option value="AGUARDANDO_PECAS">Aguardando Peças</option>
                <option value="AGENDADA">Agendada</option>
                <option value="CONCLUIDA">Concluída / Liberada</option>
                <option value="CANCELADA">Cancelada</option>
              </select>
            </div>

            {/* Urgência */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Grau de Urgência
              </label>
              <select
                value={urgencia}
                onChange={(e) => setUrgencia(e.target.value as any)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
              >
                <option value="BAIXA">Baixa</option>
                <option value="MEDIA">Média (Padrão)</option>
                <option value="ALTA">Alta (Urgente)</option>
                <option value="EMERGENCIAL">Emergencial (Frota Crítica)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Data Entrada */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Data de Entrada / Abertura *
              </label>
              <input
                type="date"
                required
                value={dataEntrada}
                onChange={(e) => setDataEntrada(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Data Conclusão */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Data de Conclusão / Liberação
              </label>
              <input
                type="date"
                value={dataConclusao}
                onChange={(e) => setDataConclusao(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Descrição do Problema */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Descrição da Solicitação / Avaria Relatada *
            </label>
            <textarea
              rows={2}
              required
              value={descricaoProblema}
              onChange={(e) => setDescricaoProblema(e.target.value)}
              placeholder="Ex: Troca preventiva de óleo e pastilhas dianteiras / Motor estalando em desaceleração..."
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Serviços Executados */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Serviços Executados pelo Mecânico
            </label>
            <textarea
              rows={2}
              value={servicosExecutados}
              onChange={(e) => setServicosExecutados(e.target.value)}
              placeholder="Ex: Desmontagem, limpeza do cárter, sangria do fluido de freio e teste dinâmico..."
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Peças Substituídas */}
          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <PackageCheck className="w-4 h-4 text-amber-500" />
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Peças & Insumos Utilizados
                </label>
              </div>
              <span className="text-xs font-medium text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded-full border border-zinc-800">
                {pecasSubstituidas.length} item(ns) registrado(s)
              </span>
            </div>

            {/* Tabela de Peças Já Adicionadas */}
            {pecasSubstituidas.length > 0 && (
              <div className="border border-zinc-800 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-zinc-900 text-zinc-400 font-semibold border-b border-zinc-800">
                    <tr>
                      <th className="py-2 px-3">Item / Peça</th>
                      <th className="py-2 px-3">Cód. Almoxarifado / Ref.</th>
                      <th className="py-2 px-3 text-center">Qtd Aplicada</th>
                      <th className="py-2 px-2 text-center w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850">
                    {pecasSubstituidas.map((part) => (
                      <tr key={part.id} className="hover:bg-zinc-900/50">
                        <td className="py-2 px-3 font-medium text-zinc-200">{part.nome}</td>
                        <td className="py-2 px-3 font-mono text-zinc-400">{part.codigoPeca || '-'}</td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-amber-400">{part.quantidade} un</td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemovePart(part.id)}
                            className="text-zinc-500 hover:text-rose-400 transition cursor-pointer"
                            title="Remover peça"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Inputs para adicionar peça rápida */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
              <div className="sm:col-span-6">
                <input
                  type="text"
                  placeholder="Nome da peça / insumo (ex: Filtro de Óleo, Pastilha...)"
                  value={partNome}
                  onChange={(e) => setPartNome(e.target.value)}
                  className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-750 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="sm:col-span-3">
                <input
                  type="text"
                  placeholder="Cód. Almoxarifado (opcional)"
                  value={partCodigo}
                  onChange={(e) => setPartCodigo(e.target.value)}
                  className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-750 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
              <div className="sm:col-span-1">
                <input
                  type="number"
                  min={1}
                  placeholder="Qtd"
                  value={partQtd}
                  onChange={(e) => setPartQtd(Number(e.target.value))}
                  className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-750 rounded-lg text-xs text-center text-zinc-100 focus:outline-none focus:border-amber-500 font-bold"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={handleAddPart}
                  className="w-full flex items-center justify-center space-x-1 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-amber-400 rounded-lg text-xs font-semibold border border-zinc-700 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar</span>
                </button>
              </div>
            </div>
          </div>

          {/* Seletor de Tipo de Oficina: Interna vs Externa */}
          <div className="p-3.5 bg-zinc-950/80 border border-zinc-800 rounded-xl space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Local de Execução dos Serviços *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTipoOficina('INTERNA');
                    if (!oficinaResponsavel || oficinaResponsavel !== 'Mecânica Central ROCAM') {
                      setOficinaResponsavel('Mecânica Central ROCAM');
                    }
                  }}
                  className={`flex items-center space-x-2.5 p-3 rounded-xl border text-left transition cursor-pointer ${
                    tipoOficina === 'INTERNA'
                      ? 'bg-amber-500/15 border-amber-500/60 text-amber-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <Shield className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-zinc-100">Oficina Interna ROCAM</div>
                    <div className="text-[10px] text-zinc-400">Manutenção na própria base / mecânica da unidade</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTipoOficina('EXTERNA');
                    if (oficinaResponsavel === 'Mecânica Central ROCAM') {
                      setOficinaResponsavel('');
                    }
                  }}
                  className={`flex items-center space-x-2.5 p-3 rounded-xl border text-left transition cursor-pointer ${
                    tipoOficina === 'EXTERNA'
                      ? 'bg-blue-500/15 border-blue-500/60 text-blue-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <Building2 className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-zinc-100">Oficina Externa / Concessionária</div>
                    <div className="text-[10px] text-zinc-400">Prestador terceirizado, garantia ou oficina credenciada</div>
                  </div>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* Oficina */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  {tipoOficina === 'EXTERNA' ? 'Razão Social / Nome da Oficina Externa *' : 'Unidade de Manutenção Interna *'}
                </label>
                <input
                  type="text"
                  required
                  value={oficinaResponsavel}
                  onChange={(e) => setOficinaResponsavel(e.target.value)}
                  placeholder={
                    tipoOficina === 'EXTERNA'
                      ? 'Ex: Concessionária BMW Motorrad Osten, Oficina Credenciada...'
                      : 'Ex: Mecânica Central ROCAM'
                  }
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Mecânico ou Técnico Responsável */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  {tipoOficina === 'EXTERNA' ? 'Consultor Técnico / Mecânico Externo *' : 'Militar Mecânico Responsável *'}
                </label>
                <input
                  type="text"
                  required
                  value={mecanicoResponsavel}
                  onChange={(e) => setMecanicoResponsavel(e.target.value)}
                  placeholder={tipoOficina === 'EXTERNA' ? 'Ex: Consultor Técnico Marcelo...' : 'Ex: CB PM Prado...'}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Campos adicionais para oficina externa */}
            {tipoOficina === 'EXTERNA' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-800 animate-in fade-in duration-200">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    CNPJ da Empresa / Oficina Externa
                  </label>
                  <input
                    type="text"
                    value={cnpjOficina}
                    onChange={(e) => setCnpjOficina(e.target.value)}
                    placeholder="Ex: 00.000.000/0001-00"
                    className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Nº de Contrato / Empenho Público
                  </label>
                  <input
                    type="text"
                    value={numeroContratoEmpenho}
                    onChange={(e) => setNumeroContratoEmpenho(e.target.value)}
                    placeholder="Ex: EMP-2026/0412 ou Contrato 089/26"
                    className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Policial Solicitante */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Policial Solicitante / Condutor
              </label>
              <input
                type="text"
                value={policialSolicitante}
                onChange={(e) => setPolicialSolicitante(e.target.value)}
                placeholder="Ex: 2º Sgt PM Rocha"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Matrícula / RE */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Matrícula / RE do Policial
              </label>
              <input
                type="text"
                value={matriculaRE}
                onChange={(e) => setMatriculaRE(e.target.value)}
                placeholder="Ex: 192.341-9"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/20 transition cursor-pointer"
            >
              {recordToEdit ? 'Salvar O.S.' : 'Registrar Ordem de Serviço'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
