import React, { useEffect, useState } from "react";
import { Bell, BellRing, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "../lib/supabase";
import { UserProfile } from "../types";

const VAPID_PUBLIC_KEY = "BDakoIANkXlOpPEFdcZmvw7nE8NKY-t51zjErbvY2cVXW-PmUckhQcESsxAHEE6gVVGO6DOTTXAHQ1TYjFevnF8";

function urlBase64ToUint8Array(value: string): Uint8Array {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}
function toBase64(value: ArrayBuffer): string {
  const bytes = new Uint8Array(value);
  let raw = "";
  for (const byte of bytes) raw += String.fromCharCode(byte);
  return btoa(raw);
}

export function PushNotificationSetup({ currentUser }: { currentUser: UserProfile | null }) {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    const available = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(available);
    if (!available || !currentUser?.id) return;
    setPermission(Notification.permission);
    let cancelled = false;
    (async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        const subscription = await registration.pushManager.getSubscription();
        if (!subscription || cancelled) return;
        const { data } = await supabase.from("push_subscriptions").select("id").eq("endpoint", subscription.endpoint).maybeSingle();
        if (!cancelled && data) setEnabled(true);
      } catch (error) {
        console.warn("Não foi possível preparar notificações push:", error);
      }
    })();
    return () => { cancelled = true; };
  }, [currentUser?.id]);

  const enablePush = async () => {
    if (!currentUser?.id || busy) return;
    setBusy(true);
    setMessage("");
    try {
      if (!supported) throw new Error("Este navegador não oferece suporte a notificações push.");
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") throw new Error("Permissão de notificação não concedida neste celular.");
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const keys = subscription.toJSON().keys;
      if (!keys?.p256dh || !keys?.auth) throw new Error("O navegador não forneceu as chaves da inscrição push.");
      const { error } = await supabase.from("push_subscriptions").upsert({
        user_id: currentUser.id,
        endpoint: subscription.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        updated_at: new Date().toISOString(),
      }, { onConflict: "endpoint" });
      if (error) throw error;
      setEnabled(true);
      setMessage("Notificações ativadas neste celular.");
    } catch (error) {
      console.error("Falha ao ativar push:", error);
      setMessage(error instanceof Error ? error.message : "Não foi possível ativar as notificações.");
    } finally {
      setBusy(false);
    }
  };

  if (!currentUser) return null;
  return (
    <section className="mb-4 flex flex-col gap-2 rounded-xl border border-sky-800/60 bg-sky-950/30 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2">
        {enabled ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" /> : <Bell className="mt-0.5 h-5 w-5 shrink-0 text-sky-300" />}
        <div>
          <p className="text-xs font-bold text-white">Notificações de alarme neste celular</p>
          <p className="mt-0.5 text-[11px] text-sky-100/80">
            {enabled ? "Este aparelho está cadastrado para receber alertas push." : "Ative para receber alertas mesmo quando o Frota ROCAM estiver fechado."}
          </p>
          {message && <p role="status" className="mt-1 text-[11px] text-amber-200">{message}</p>}
          {permission === "denied" && <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-300"><AlertCircle className="h-3 w-3" /> Permissão bloqueada nas configurações do navegador.</p>}
        </div>
      </div>
      {!enabled && (
        <button type="button" onClick={() => void enablePush()} disabled={busy || !supported}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-xs font-bold text-white hover:bg-sky-500 disabled:opacity-50">
          <BellRing className="h-4 w-4" /> {busy ? "ATIVANDO..." : "ATIVAR NOTIFICAÇÕES"}
        </button>
      )}
    </section>
  );
}
