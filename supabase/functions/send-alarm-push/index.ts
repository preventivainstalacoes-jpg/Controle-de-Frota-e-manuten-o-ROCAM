import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as webpush from "jsr:@negrel/webpush";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://rocammecanizacao.com.br",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
function b64urlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
function bytesToB64url(value: Uint8Array): string {
  let raw = "";
  for (const byte of value) raw += String.fromCharCode(byte);
  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function vapidJwk(publicKey: string, privateKey: string) {
  const raw = b64urlToBytes(publicKey);
  if (raw.length !== 65 || raw[0] !== 4) throw new Error("VAPID_PUBLIC_KEY inválida");
  const x = raw.slice(1, 33), y = raw.slice(33, 65), d = b64urlToBytes(privateKey);
  if (d.length !== 32) throw new Error("VAPID_PRIVATE_KEY inválida");
  return {
    publicKey: { kty: "EC", crv: "P-256", alg: "ES256", x: bytesToB64url(x), y: bytesToB64url(y), key_ops: ["verify"], ext: true },
    privateKey: { kty: "EC", crv: "P-256", alg: "ES256", x: bytesToB64url(x), y: bytesToB64url(y), d: bytesToB64url(d), key_ops: ["sign"], ext: true },
  };
}
const normalizeRE = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, "");

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  try {
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return Response.json({ error: "Sessão não autenticada" }, { status: 401, headers: corsHeaders });
    const url = Deno.env.get("SUPABASE_URL")!, anon = Deno.env.get("SUPABASE_ANON_KEY")!, service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authClient = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData.user) return Response.json({ error: "Sessão inválida" }, { status: 401, headers: corsHeaders });
    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const { alarmId } = await req.json();
    if (!alarmId || typeof alarmId !== "string") return Response.json({ error: "Alarme não informado" }, { status: 400, headers: corsHeaders });
    const { data: sender } = await admin.from("profiles").select("id,role,active").eq("id", authData.user.id).maybeSingle();
    if (!sender?.active || !["admin", "adjunto"].includes(String(sender.role).toLowerCase())) return Response.json({ error: "Usuário sem permissão para enviar alarmes" }, { status: 403, headers: corsHeaders });
    const { data: alarm } = await admin.from("alarm_notifications").select("id,sender_id,sender_name,recipient_re,vehicle_prefix").eq("id", alarmId).maybeSingle();
    if (!alarm || alarm.sender_id !== authData.user.id) return Response.json({ error: "Alarme não encontrado ou não autorizado" }, { status: 404, headers: corsHeaders });
    const targetRE = normalizeRE(String(alarm.recipient_re || ""));
    const { data: activeProfiles, error: profilesError } = await admin.from("profiles").select("id,re").eq("active", true);
    if (profilesError) throw profilesError;
    const recipient = (activeProfiles || []).find((profile: any) => normalizeRE(String(profile.re || "")) === targetRE);
    if (!recipient) return Response.json({ error: "Policial destinatário não encontrado ou inativo" }, { status: 404, headers: corsHeaders });
    const { data: subscriptions, error: subError } = await admin.from("push_subscriptions").select("id,endpoint,p256dh,auth").eq("user_id", recipient.id);
    if (subError) throw subError;
    if (!subscriptions?.length) return Response.json({ ok: true, sent: 0, message: "Destinatário ainda não habilitou notificações neste celular" }, { headers: corsHeaders });
    const publicKey = Deno.env.get("VAPID_PUBLIC_KEY") || "", privateKey = Deno.env.get("VAPID_PRIVATE_KEY") || "", contact = Deno.env.get("VAPID_SUBJECT") || "";
    if (!publicKey || !privateKey || !contact) throw new Error("Configuração VAPID ausente no Supabase Secrets");
    const vapidKeys = await webpush.importVapidKeys(vapidJwk(publicKey, privateKey), { extractable: false });
    const appServer = await webpush.ApplicationServer.new({ contactInformation: contact, vapidKeys });
    let sent = 0, failed = 0;
    for (const sub of subscriptions) {
      try {
        const subscriber = appServer.subscribe({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } });
        await subscriber.pushTextMessage(JSON.stringify({
          title: "ATENÇÃO, ROCAM!",
          body: `Alarme individual: viatura ${alarm.vehicle_prefix || "ROCAM"}. Acionado por ${alarm.sender_name || "Administração"}.`,
          url: "/", tag: `rocam-alarm-${alarm.id}`, renotify: true,
        }), {});
        sent++;
      } catch (error) {
        console.error("Falha ao enviar push:", error);
        failed++;
      }
    }
    return Response.json({ ok: sent > 0, sent, total: subscriptions.length, failed }, { headers: corsHeaders });
  } catch (error) {
    console.error("send-alarm-push:", error);
    return Response.json({ error: error instanceof Error ? error.message : "Falha ao enviar notificação" }, { status: 500, headers: corsHeaders });
  }
});
