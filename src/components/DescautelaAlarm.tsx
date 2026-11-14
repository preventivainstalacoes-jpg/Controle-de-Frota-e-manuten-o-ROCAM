import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BellRing, Check, Volume2, Radio } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CautelaRecord, UserProfile } from '../types';

type AlarmPayload = {
  id: string;
  sender_name: string;
  vehicle_prefix: string;
  created_at: string;
};

type Props = {
  currentUser: UserProfile | null;
  cautelas: CautelaRecord[];
};

const normalizeRE = (value?: string | number | null) =>
  String(value ?? '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export function DescautelaAlarm({ currentUser, cautelas }: Props) {
  const [incomingAlarm, setIncomingAlarm] = useState<AlarmPayload | null>(null);
  const [channelReady, setChannelReady] = useState(false);
  const activeAlarmRef = useRef<AlarmPayload | null>(null);

  const userRE = normalizeRE(currentUser?.re);
  const myActiveCautelas = useMemo(
    () => cautelas.filter((item) =>
      item.status === 'EM_PATRULHAMENTO' &&
      normalizeRE(item.condutorRE) === userRE
    ),
    [cautelas, userRE]
  );
  const hasActiveCautela = Boolean(userRE && myActiveCautelas.length > 0);

  activeAlarmRef.current = incomingAlarm;

  // O alarme fica gravado no banco. Assim, uma oscilação do Realtime ou
  // o operador abrir o aplicativo alguns segundos depois não faz o aviso sumir.
  useEffect(() => {
    if (!currentUser?.id || !hasActiveCautela || !userRE) {
      setChannelReady(false);
      setIncomingAlarm(null);
      return;
    }

    let cancelled = false;

    const loadPendingAlarm = async () => {
      const { data, error } = await supabase
        .from('alarm_notifications')
        .select('id,sender_name,vehicle_prefix,created_at')
        .eq('recipient_re', userRE)
        .is('acknowledged_at', null)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Não foi possível consultar os alarmes pendentes:', error);
        return;
      }
      if (!cancelled && data && !activeAlarmRef.current) {
        setIncomingAlarm(data as AlarmPayload);
      }
    };

    void loadPendingAlarm();

    const channel = supabase
      .channel(`rocam-alarmes-operador-${userRE}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alarm_notifications', filter: `recipient_re=eq.${userRE}` },
        (payload) => {
          const alarm = payload.new as AlarmPayload;
          if (!cancelled && alarm?.id) setIncomingAlarm(alarm);
        }
      )
      .subscribe((status) => {
        setChannelReady(status === 'SUBSCRIBED');
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Canal de alarmes indisponível; a consulta periódica continuará ativa.');
        }
      });

    // Recuperação de segurança caso o evento em tempo real não chegue.
    const refreshTimer = window.setInterval(() => void loadPendingAlarm(), 7000);

    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
      setChannelReady(false);
      void supabase.removeChannel(channel);
    };
  }, [currentUser?.id, hasActiveCautela, userRE]);

  useEffect(() => {
    if (!incomingAlarm || !hasActiveCautela) return;

    let context: AudioContext | null = null;
    let intervalId: number | undefined;
    let stopped = false;

    const playBeep = async () => {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass || stopped) return;
        context ||= new AudioContextClass();
        if (context.state === 'suspended') await context.resume();
        if (stopped) return;

        const playTone = (frequency: number, startAt: number, duration: number) => {
          if (!context) return;
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.type = 'sine';
          oscillator.frequency.value = frequency;
          gain.gain.setValueAtTime(0.0001, startAt);
          gain.gain.exponentialRampToValueAtTime(0.22, startAt + 0.025);
          gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
          oscillator.connect(gain);
          gain.connect(context.destination);
          oscillator.start(startAt);
          oscillator.stop(startAt + duration + 0.02);
        };

        const now = context.currentTime;
        playTone(880, now, 0.24);
        playTone(660, now + 0.32, 0.24);
        playTone(880, now + 0.64, 0.32);
      } catch (error) {
        console.warn('O navegador bloqueou a reprodução automática do alarme sonoro:', error);
        try { navigator.vibrate?.([250, 120, 250, 120, 450]); } catch {}
      }
    };

    void playBeep();
    intervalId = window.setInterval(() => void playBeep(), 2600);

    return () => {
      stopped = true;
      if (intervalId !== undefined) window.clearInterval(intervalId);
      if (context) void context.close().catch(() => {});
    };
  }, [incomingAlarm, hasActiveCautela]);

  const acknowledgeAlarm = async () => {
    if (!incomingAlarm) return;
    const alarmId = incomingAlarm.id;
    setIncomingAlarm(null);
    const { error } = await supabase
      .from('alarm_notifications')
      .update({ acknowledged_at: new Date().toISOString() })
      .eq('id', alarmId)
      .is('acknowledged_at', null);
    if (error) {
      console.error('Não foi possível registrar a ciência do alarme:', error);
      setIncomingAlarm(incomingAlarm);
    }
  };

  return (
    <>
      {incomingAlarm && hasActiveCautela && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <section role="alertdialog" aria-modal="true" aria-labelledby="descautela-alarm-title" className="w-full max-w-md rounded-2xl border-2 border-rose-500 bg-zinc-950 p-6 text-center shadow-2xl shadow-rose-950/60">
            <div className="mx-auto mb-4 flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-rose-600 text-white">
              <BellRing className="h-8 w-8" />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-rose-300">Alerta individual de cautela</p>
            <h2 id="descautela-alarm-title" className="mt-2 text-2xl font-black text-white">ATENÇÃO, ROCAM!</h2>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-100">
              Consta uma viatura cautelada em seu nome. Verifique se é necessário realizar a descautela. Se o serviço foi prorrogado, você poderá permanecer com a viatura cautelada. A ciência deste aviso não altera a cautela.
            </p>
            {incomingAlarm.vehicle_prefix && (
              <p className="mt-2 text-sm font-bold text-amber-300">Viatura: {incomingAlarm.vehicle_prefix}</p>
            )}
            <p className="mt-3 text-xs text-zinc-400">Alarme acionado por {incomingAlarm.sender_name}.</p>
            <button
              type="button"
              onClick={() => void acknowledgeAlarm()}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-rose-500"
            >
              <Check className="h-4 w-4" />
              CIENTE — FECHAR AVISO
            </button>
          </section>
        </div>
      )}
      {hasActiveCautela && !incomingAlarm && !channelReady && (
        <span className="sr-only"><Radio /> Conectando ao canal individual de alertas.</span>
      )}
    </>
  );
}

type AlarmButtonProps = {
  currentUser: UserProfile | null;
  cautela: CautelaRecord;
  canManageAlarms?: boolean;
};

export function DescautelaAlarmButton({ currentUser, cautela, canManageAlarms = false }: AlarmButtonProps) {
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const normalizedRole = String(currentUser?.role ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .toUpperCase();
  const canSend = canManageAlarms || ['ADMIN', 'ADMINISTRADOR', 'ADJUNTO'].includes(normalizedRole);

  if (cautela.status !== 'EM_PATRULHAMENTO') return null;

  const sendAlarm = async () => {
    if (!currentUser || sending) return;
    setSending(true);
    setFeedback(null);

    try {
      let targetRE = normalizeRE(cautela.condutorRE);
      if (!targetRE && cautela.id) {
        const { data: freshCautela, error: lookupError } = await supabase
          .from('cautelas')
          .select('condutor_re')
          .eq('id', cautela.id)
          .maybeSingle();

        if (lookupError) throw new Error('Não foi possível consultar o RE desta cautela.');
        targetRE = normalizeRE(freshCautela?.condutor_re);
      }

      if (!targetRE) {
        throw new Error(`A cautela ${cautela.prefixoViatura || ''} não possui RE válido cadastrado.`.trim());
      }

      const { error } = await supabase
        .from('alarm_notifications')
        .insert({
          sender_id: currentUser.id,
          sender_name: currentUser.name || 'Administrador',
          recipient_re: targetRE,
          vehicle_prefix: cautela.prefixoViatura || 'Viatura',
          cautela_id: cautela.id,
        });

      if (error) {
        console.error('Falha ao registrar alarme no banco:', error);
        throw new Error('O banco não aceitou registrar o alarme. Verifique sua conexão e permissão.');
      }

      setFeedback('Alarme registrado. O operador receberá o aviso ao estar conectado ao aplicativo.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Falha ao registrar o alarme.');
    } finally {
      setSending(false);
      window.setTimeout(() => setFeedback(null), 7000);
    }
  };

  return (
    <div className="flex flex-col items-stretch gap-1">
      <button
        type="button"
        onClick={() => void sendAlarm()}
        disabled={sending || !canSend}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-rose-400 bg-rose-600 px-3 py-2 text-xs font-extrabold text-white shadow transition hover:bg-rose-500 active:scale-95 disabled:cursor-not-allowed disabled:border-zinc-600 disabled:bg-zinc-700 disabled:text-zinc-300"
        title={canSend ? `Enviar alerta individual para ${cautela.condutorNome}` : 'Apenas administrador ou adjunto pode acionar o alarme'}
      >
        <Volume2 className="h-3.5 w-3.5" />
        {sending ? 'ENVIANDO...' : 'ACIONAR ALARME'}
      </button>
      {feedback && <span role="status" className="max-w-[220px] text-[10px] text-zinc-300">{feedback}</span>}
    </div>
  );
}
