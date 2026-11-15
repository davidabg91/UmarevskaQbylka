// Известия на телефона на собственика (Web Push) — Умаревска Ябълка.
//
// Базата вика тази функция при всяка нова поръчка, заявка за абонамент или запитване.
// Функцията НЕ вярва на заявката: сама чете от базата кои редове още не са известени,
// маркира ги и праща известие до всяко устройство, на което собственикът е включил известията.
// Затова е безопасно адресът ѝ да е публичен — най-много да изпрати вече чакащите известия.
//
// ?test=1  — пробно известие; изисква вход на администратор.
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUBJECT = "https://umarevska-yabalka.com";
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

// ---------------------------------------------------------------- Web Push (RFC 8291 / 8292)
const te = new TextEncoder();
const b64u = {
  enc: (buf: ArrayBuffer | Uint8Array) =>
    btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
  dec: (s: string) =>
    Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0)),
};
const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
};
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number) {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, len * 8));
}
async function webpushEncrypt(sub: { p256dh: string; auth: string }, plaintext: Uint8Array) {
  const uaPublic = b64u.dec(sub.p256dh), authSecret = b64u.dec(sub.auth);
  const asKeys = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", asKeys.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, asKeys.privateKey, 256));
  const ikm = await hkdf(authSecret, ecdh, concat(te.encode("WebPush: info\0"), uaPublic, asPublic), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, te.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, te.encode("Content-Encoding: nonce\0"), 12);
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, concat(plaintext, new Uint8Array([2]))),
  );
  return concat(salt, new Uint8Array([0, 0, 16, 0]), new Uint8Array([asPublic.length]), asPublic, cipher);
}
type Vapid = { privateJwk: JsonWebKey; publicKey: string };
async function webpushVapid(endpoint: string, vapid: Vapid) {
  const head = b64u.enc(te.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const body = b64u.enc(te.encode(JSON.stringify({
    aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: SUBJECT,
  })));
  const key = await crypto.subtle.importKey("jwk", vapid.privateJwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, te.encode(head + "." + body)));
  return "vapid t=" + head + "." + body + "." + b64u.enc(sig) + ", k=" + vapid.publicKey;
}
async function sendPush(sub: { endpoint: string; p256dh: string; auth: string }, payload: unknown, vapid: Vapid) {
  const body = await webpushEncrypt(sub, te.encode(JSON.stringify(payload)));
  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      "Authorization": await webpushVapid(sub.endpoint, vapid),
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      "TTL": "86400",
      "Urgency": "high",
    },
    body,
  });
  return res.status;
}

// ---------------------------------------------------------------- ключове (създават се при първото извикване)
async function getVapid(): Promise<Vapid> {
  const { data } = await sb.from("app_private").select("value").eq("key", "vapid").maybeSingle();
  if (data?.value) return JSON.parse(data.value);
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const vapid: Vapid = {
    privateJwk: await crypto.subtle.exportKey("jwk", pair.privateKey),
    publicKey: b64u.enc(await crypto.subtle.exportKey("raw", pair.publicKey)),
  };
  // ако две извиквания се засекат, печели първото записано
  await sb.from("app_private").upsert({ key: "vapid", value: JSON.stringify(vapid) }, { onConflict: "key", ignoreDuplicates: true });
  const again = await sb.from("app_private").select("value").eq("key", "vapid").single();
  const stored: Vapid = JSON.parse(again.data!.value);
  await sb.from("app_private").upsert({ key: "vapid_public", value: stored.publicKey }, { onConflict: "key" });
  return stored;
}

async function broadcast(messages: unknown[], vapid: Vapid) {
  const { data: subs } = await sb.from("push_subscriptions").select("id, endpoint, p256dh, auth");
  let sent = 0, failed = 0, removed = 0;
  for (const sub of subs ?? []) {
    for (const msg of messages) {
      try {
        const status = await sendPush(sub, msg, vapid);
        if (status === 404 || status === 410) {      // устройството вече не е абонирано
          await sb.from("push_subscriptions").delete().eq("id", sub.id);
          removed++;
          break;
        }
        if (status >= 200 && status < 300) sent++; else failed++;
      } catch (_e) {
        failed++;
      }
    }
  }
  return { devices: (subs ?? []).length, sent, failed, removed };
}

const money = (n: unknown) => (Math.round(Number(n || 0) * 100) / 100).toString().replace(".", ",") + " €";
const cut = (s: unknown, n: number) => { const t = String(s ?? "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; };

/* взима неизвестените редове от една таблица и ги маркира; връща само тези, които е маркирал сам */
async function claim(table: string, columns: string) {
  const { data: pending } = await sb.from(table).select("id").is("notified_at", null).order("created_at").limit(20);
  if (!pending?.length) return [];
  const { data } = await sb.from(table).update({ notified_at: new Date().toISOString() })
    .in("id", pending.map((r) => r.id)).is("notified_at", null).select(columns);
  return (data ?? []) as Record<string, unknown>[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = new URL(req.url);
    const vapid = await getVapid();

    if (url.searchParams.get("test")) {
      const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
      const { data: u } = await sb.auth.getUser(token);
      const email = u?.user?.email ?? "";
      const { data: adm } = email
        ? await sb.from("admins").select("email").ilike("email", email).maybeSingle()
        : { data: null };
      if (!adm) return json({ error: "not-admin" }, 401);
      const r = await broadcast([{
        title: "Пробно известие", body: "Известията от Умаревска Ябълка работят на това устройство.",
        tag: "test", url: "admin.html",
      }], vapid);
      return json({ ok: true, ...r });
    }

    const [orders, subs, msgs] = await Promise.all([
      claim("orders", "id, code, customer_name, total, delivery"),
      claim("subscriptions", "id, plan, customer_name, price"),
      claim("messages", "id, customer_name, message"),
    ]);
    const messages = [
      ...orders.map((o) => ({
        title: "Нова поръчка — " + money(o.total), body: cut(o.customer_name, 60) + " · " + o.code +
          (o.delivery === "pickup" ? " · вземане от обект" : ""), tag: "order-" + o.id, url: "admin.html#orders",
      })),
      ...subs.map((s) => ({
        title: "Нова заявка за абонамент", body: cut(s.customer_name, 50) + " · " + cut(s.plan, 60),
        tag: "sub-" + s.id, url: "admin.html#subs",
      })),
      ...msgs.map((m) => ({
        title: "Ново запитване от " + cut(m.customer_name || "посетител", 40), body: cut(m.message, 120),
        tag: "msg-" + m.id, url: "admin.html#messages",
      })),
    ];
    if (!messages.length) return json({ ok: true, new: 0 });
    const r = await broadcast(messages, vapid);
    return json({ ok: true, new: messages.length, ...r });
  } catch (e) {
    return json({ ok: false, error: String((e as Error)?.message ?? e) }, 500);
  }
});
