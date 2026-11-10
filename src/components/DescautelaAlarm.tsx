import React, { useEffect, useRef, useState } from 'react';
import { BellRing, Check, Volume2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CautelaRecord, UserProfile } from '../types';

const CHANNEL_NAME = 'rocam-frota-alarme-descautela';
const EVENT_NAME = 'descautela_alarm';

type AlarmPayload = {
  senderId: string;
  senderName: string;
  senderRole: string;
  sentAt: string;
};

type Props = {
  currentUser: UserProfile | null;
  cautelas: CautelaRecord[];
};

export function DescautelaAlarm({ currentUser, cautelas }: Props) {
  const [incomingAlarm, setIncomingAlarm] = useState<AlarmPayload | null>(null);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const activeAlarmRef = useRef<AlarmPayload | null>(null);
  const eligibleToReceiveRef = useRef(false);

  const userRE = (currentUser?.re || '').trim().toUpperCase();
  const myActiveCautelas = cautelas.filter(
    (item) => item.status === 'EM_PATRULHAMENTO' &&
      (item.condutorRE || '').trim().toUpperCase() === userRE
  );
  const hasActiveCautela = Boolean(userRE && myActiveCautelas.length > 0);
  const canTrigger = currentUser?.role === 'OPERADOR' && hasActiveCautela;

  eligibleToReceiveRef.current = hasActiveCautela;
  activeAlarmRef.current = incomingAlarm;

  useEffect(() => {
    const channel = supabase
      .channel(CHANNEL_NAME)
      .on('broadcast', { event: EVENT_NAME }, ({ payload }) => {
        const alarm = payload as AlarmPayload;
        if (!eligibleToReceiveRef.current || !alarm?.senderId || alarm.senderId === currentUser?.id) return;
        setIncomingAlarm(alarm);
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Não foi possível conectar ao canal do alarme de descautela.');
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

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

  const triggerAlarm = async () => {
    if (!canTrigger || !currentUser || sending) return;
    setSending(true);
    setFeedback(null);

    const payload: AlarmPayload = {
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      sentAt: new Date().toISOString(),
    };

    try {
      const channel = supabase.channel(CHANNEL_NAME);
      const status = await channel.send({
        type: 'broadcast',
        event: EVENT_NAME,
        payload,
      });
      if (status !== 'ok') throw new Error('O serviço de comunicação não confirmou o envio do alarme.');
      setIncomingAlarm(payload);
      setFeedback('Alarme enviado aos usuários com viaturas cauteladas.');
    } catch (error) {
      console.error('Erro ao disparar alarme de descautela:', error);
      setFeedback('Não foi possível enviar o alarme. Verifique a conexão e tente novamente.');
    } finally {
      setSending(false);
      window.setTimeout(() => setFeedback(null), 5000);
    }
  };

  return (
    <>
      {canTrigger && (
        <section className="mb-5 rounded-xl border border-rose-700/60 bg-rose-950/35 p-3.5 shadow-lg shadow-rose-950/20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-rose-600 p-2 text-white">
                <BellRing className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-white">Alarme de encerramento do serviço</h2>
                <p className="text-xs text-rose-200">Dispare um aviso sonoro para todos os usuários que ainda estiverem com viaturas cauteladas.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={triggerAlarm}
              disabled={sending}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-md transition hover:bg-rose-500 active:scale-95 disabled:cursor-wait disabled:opacity-60"
            >
              <Volume2 className="h-4 w-4" />
              {sending ? 'ENVIANDO...' : 'ACIONAR ALARME'}
            </button>
          </div>
          {feedback && <p role="status" className="mt-2 text-xs text-rose-200">{feedback}</p>}
        </section>
      )}

      {incomingAlarm && hasActiveCautela && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <section role="alertdialog" aria-modal="true" aria-labelledby="descautela-alarm-title" className="w-full max-w-md rounded-2xl border-2 border-rose-500 bg-zinc-950 p-6 text-center shadow-2xl shadow-rose-950/60">
            <div className="mx-auto mb-4 flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-rose-600 text-white">
              <BellRing className="h-8 w-8" />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-rose-300">Alerta de encerramento</p>
            <h2 id="descautela-alarm-title" className="mt-2 text-2xl font-black text-white">ATENÇÃO, ROCAM!</h2>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-100">
              Fim de serviço. Realize a devolução e descautela da sua viatura.
            </p>
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
    </>
  );
}
