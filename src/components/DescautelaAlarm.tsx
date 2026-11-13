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

type OperatorCautelaGroup = {
  re: string;
  nome: string;
  graduacao: string;
  cautelas: CautelaRecord[];
};

const normalizeRE = (value?: string) => (value || '').trim().toUpperCase();

const getOperatorChannel = (re: string) =>
  `${CHANNEL_PREFIX}-${encodeURIComponent(normalizeRE(re))}`;

export function DescautelaAlarm({ currentUser, cautelas }: Props) {
  const [incomingAlarm, setIncomingAlarm] = useState<AlarmPayload | null>(null);
  const [sendingRE, setSendingRE] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ re: string; message: string; error?: boolean } | null>(null);
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

  const triggerAlarm = async (operator: OperatorCautelaGroup) => {
    if (!canManageAlarms || !currentUser || sendingRE) return;

    const targetRE = normalizeRE(operator.re);
    const channel = supabase.channel(getOperatorChannel(targetRE));
    setSendingRE(targetRE);
    setFeedback(null);

    const payload: AlarmPayload = {
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      targetRE,
      vehiclePrefixes: operator.cautelas.map((item) => item.prefixoViatura),
      sentAt: new Date().toISOString(),
    };

    try {
      const subscriptionStatus = await new Promise<string>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error('Tempo esgotado ao conectar ao canal do operador.')), 10000);
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            window.clearTimeout(timeout);
            resolve(status);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            window.clearTimeout(timeout);
            reject(new Error('Não foi possível conectar ao canal individual do operador.'));
          }
        });
      });

      if (subscriptionStatus !== 'SUBSCRIBED') throw new Error('Canal do operador indisponível.');

      const status = await channel.send({
        type: 'broadcast',
        event: 'descautela_alarm',
        payload,
      });
      if (status !== 'ok') throw new Error('O serviço não confirmou o envio do aviso.');

      setFeedback({
        re: targetRE,
        message: `Aviso individual enviado para ${operator.nome}. O operador precisa estar com o aplicativo aberto e conectado para receber o alarme em tempo real.`,
      });
    } catch (error) {
      console.error('Erro ao disparar alarme individual de descautela:', error);
      setFeedback({
        re: targetRE,
        message: error instanceof Error ? error.message : 'Não foi possível enviar o aviso. Tente novamente.',
        error: true,
      });
    } finally {
      await supabase.removeChannel(channel);
      setSendingRE(null);
      window.setTimeout(() => setFeedback((current) => current?.re === targetRE ? null : current), 7000);
    }
  };

  return (
    <>
      {canManageAlarms && (
        <section className="mb-5 rounded-xl border border-rose-700/60 bg-rose-950/25 p-4 shadow-lg shadow-rose-950/20">
          <div className="mb-3 flex items-center gap-3">
            <div className="rounded-lg bg-rose-600 p-2 text-white">
              <BellRing className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white">Alarme individual de cautela esquecida</h2>
              <p className="text-xs text-rose-200">
                Selecione o policial que ainda consta com viatura cautelada. Somente ele receberá o aviso.
              </p>
            </div>
          </div>

          {operatorGroups.length === 0 ? (
            <p className="rounded-lg border border-zinc-700 bg-zinc-900/70 p-3 text-xs text-zinc-300">
              Não há operadores com cautelas em aberto neste momento.
            </p>
          ) : (
            <div className="space-y-2">
              {operatorGroups.map((operator) => (
                <div key={operator.re} className="flex flex-col gap-3 rounded-lg border border-zinc-700 bg-zinc-900/80 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white">
                      {operator.graduacao ? `${operator.graduacao} ` : ''}{operator.nome}
                    </p>
                    <p className="text-xs text-zinc-400">RE: {operator.re}</p>
                    <p className="mt-1 text-xs text-amber-300">
                      Viatura(s): {operator.cautelas.map((item) => item.prefixoViatura).join(', ')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void triggerAlarm(operator)}
                    disabled={Boolean(sendingRE)}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-md transition hover:bg-rose-500 active:scale-95 disabled:cursor-wait disabled:opacity-60"
                  >
                    <Volume2 className="h-4 w-4" />
                    {sendingRE === operator.re ? 'ENVIANDO...' : 'ACIONAR ALARME'}
                  </button>
                </div>
              ))}
            </div>
          )}
          {feedback && (
            <p role="status" className={`mt-3 text-xs ${feedback.error ? 'text-rose-300' : 'text-emerald-300'}`}>
              {feedback.message}
            </p>
          )}
          <p className="mt-3 text-[11px] text-zinc-500">
            O envio em segundo plano (com o aplicativo fechado) depende da configuração de notificações push, ainda não habilitada neste projeto.
          </p>
        </section>
      )}

      {incomingAlarm && hasActiveCautela && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <section role="alertdialog" aria-modal="true" aria-labelledby="descautela-alarm-title" className="w-full max-w-md rounded-2xl border-2 border-rose-500 bg-zinc-950 p-6 text-center shadow-2xl shadow-rose-950/60">
            <div className="mx-auto mb-4 flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-rose-600 text-white">
              <BellRing className="h-8 w-8" />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-rose-300">Alerta individual de cautela</p>
            <h2 id="descautela-alarm-title" className="mt-2 text-2xl font-black text-white">ATENÇÃO, ROCAM!</h2>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-100">
              Fim de serviço. Realize a devolução e descautela da sua viatura.
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
              CIENTE — PARAR ALARME
            </button>
          </section>
        </div>
      )}
      {hasActiveCautela && !canManageAlarms && !incomingAlarm && !channelReady && (
        <span className="sr-only"><Radio /> Conectando ao canal individual de alertas.</span>
      )}
    </>
  );
}
