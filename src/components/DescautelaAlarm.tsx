import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BellRing, Check, Volume2, Radio } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CautelaRecord, UserProfile } from '../types';

const CHANNEL_PREFIX = 'rocam-frota-alarme-descautela';

type AlarmPayload = {
  senderId: string;
  senderName: string;
  senderRole: string;
  targetRE: string;
  vehiclePrefixes: string[];
  sentAt: string;
};

type Props = {
  currentUser: UserProfile | null;
  cautelas: CautelaRecord[];
};

const normalizeRE = (value?: string) => (value || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');

const getOperatorChannel = (re: string) =>
  `${CHANNEL_PREFIX}-${encodeURIComponent(normalizeRE(re))}`;

export function DescautelaAlarm({ currentUser, cautelas }: Props) {
  const [incomingAlarm, setIncomingAlarm] = useState<AlarmPayload | null>(null);
  const [channelReady, setChannelReady] = useState(false);
  const activeAlarmRef = useRef<AlarmPayload | null>(null);
  const eligibleToReceiveRef = useRef(false);

  const userRE = normalizeRE(currentUser?.re);
  const myActiveCautelas = useMemo(
    () => cautelas.filter((item) =>
      item.status === 'EM_PATRULHAMENTO' &&
      normalizeRE(item.condutorRE) === userRE
    ),
    [cautelas, userRE]
  );
  const hasActiveCautela = Boolean(userRE && myActiveCautelas.length > 0);
  const canManageAlarms = currentUser?.role === 'ADMIN' || currentUser?.role === 'ADJUNTO';

  const operatorGroups = useMemo<OperatorCautelaGroup[]>(() => {
    const groups = new Map<string, OperatorCautelaGroup>();
    cautelas
      .filter((item) => item.status === 'EM_PATRULHAMENTO' && normalizeRE(item.condutorRE))
      .forEach((item) => {
        const re = normalizeRE(item.condutorRE);
        const existing = groups.get(re);
        if (existing) {
          existing.cautelas.push(item);
        } else {
          groups.set(re, {
            re,
            nome: item.condutorNome || 'Policial não identificado',
            graduacao: item.condutorGraduacao || '',
            cautelas: [item],
          });
        }
      });
    return Array.from(groups.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [cautelas]);

  eligibleToReceiveRef.current = hasActiveCautela;
  activeAlarmRef.current = incomingAlarm;

  // Cada operador escuta exclusivamente o canal associado ao próprio RE.
  useEffect(() => {
    if (!hasActiveCautela) {
      setChannelReady(false);
      return;
    }

    const channel = supabase
      .channel(getOperatorChannel(userRE))
      .on('broadcast', { event: 'descautela_alarm' }, ({ payload }) => {
        const alarm = payload as AlarmPayload;
        if (
          !eligibleToReceiveRef.current ||
          !alarm?.senderId ||
          alarm.senderId === currentUser?.id ||
          normalizeRE(alarm.targetRE) !== userRE
        ) return;
        setIncomingAlarm(alarm);
      })
      .subscribe((status) => {
        setChannelReady(status === 'SUBSCRIBED');
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Não foi possível conectar ao canal individual do alarme de descautela.');
        }
      });

    return () => {
      setChannelReady(false);
      void supabase.removeChannel(channel);
    };
  }, [currentUser?.id, hasActiveCautela, userRE]);

  useEffect(() => {
    if (!hasActiveCautela && incomingAlarm) setIncomingAlarm(null);
  }, [hasActiveCautela, incomingAlarm]);

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
            {incomingAlarm.vehiclePrefixes?.length > 0 && (
              <p className="mt-2 text-sm font-bold text-amber-300">
                Viatura(s): {incomingAlarm.vehiclePrefixes.join(', ')}
              </p>
            )}
            <p className="mt-3 text-xs text-zinc-400">
              Alarme acionado por {incomingAlarm.senderName}.
            </p>
            <button
              type="button"
              onClick={() => setIncomingAlarm(null)}
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
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
  const canSend = canManageAlarms || ['ADMIN', 'ADMINISTRADOR', 'ADJUNTO'].includes(normalizedRole);

  if (cautela.status !== 'EM_PATRULHAMENTO') return null;

  const sendAlarm = async () => {
    if (!currentUser || sending) return;
    const targetRE = normalizeRE(cautela.condutorRE);
    if (!targetRE) {
      setFeedback('Não foi possível identificar o RE do operador.');
      return;
    }

    const channel = supabase.channel(getOperatorChannel(targetRE));
    setSending(true);
    setFeedback(null);
    const payload: AlarmPayload = {
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      targetRE,
      vehiclePrefixes: [cautela.prefixoViatura],
      sentAt: new Date().toISOString(),
    };

    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error('Tempo esgotado ao conectar ao operador.')), 10000);
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            window.clearTimeout(timeout);
            resolve();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            window.clearTimeout(timeout);
            reject(new Error('Não foi possível conectar ao canal do operador.'));
          }
        });
      });
      const status = await channel.send({ type: 'broadcast', event: 'descautela_alarm', payload });
      if (status !== 'ok') throw new Error('O serviço não confirmou o envio do aviso.');
      setFeedback('Aviso enviado ao operador.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Falha ao enviar o aviso.');
    } finally {
      await supabase.removeChannel(channel);
      setSending(false);
      window.setTimeout(() => setFeedback(null), 5000);
    }
  };

  return (
    <div className="flex flex-col items-stretch gap-1">
      <button
        type="button"
        onClick={() => void sendAlarm()}
        disabled={sending || !canSend}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-rose-400 bg-rose-600 px-3 py-2 text-xs font-extrabold text-white shadow transition hover:bg-rose-500 active:scale-95 disabled:cursor-not-allowed disabled:border-zinc-600 disabled:bg-zinc-700 disabled:text-zinc-300"
        title={canSend ? `Enviar alerta individual para ${cautela.condutorNome}` : "Apenas administrador ou adjunto pode acionar o alarme"}
      >
        <Volume2 className="h-3.5 w-3.5" />
        {sending ? 'ENVIANDO...' : 'ACIONAR ALARME'}
      </button>
      {feedback && <span role="status" className="max-w-[190px] text-[10px] text-zinc-300">{feedback}</span>}
    </div>
  );
}
