// Потвърждение за получен отказ от договор (чл. 52а ЗЗП) — Умаревска Ябълка.
//
// Базата вика тази функция при всеки нов отказ, подаден от формата на страницата с общите условия.
// Функцията НЕ вярва на заявката: сама чете от базата кои скорошни откази още нямат изпратено
// потвърждение, маркира ги и праща писмото през Resend. Затова е безопасно адресът ѝ да е публичен.
//
// Тайни на функцията: RESEND_API_KEY (задължителен), MAIL_FROM и MAIL_REPLY_TO (по желание) —
// същите като при supabase/functions/order-email.
import { createClient } from "npm:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = Deno.env.get("MAIL_FROM") || "Умаревска Ябълка <porachki@umarevska-yabalka.com>";
const REPLY_TO = Deno.env.get("MAIL_REPLY_TO") || "";
const SITE = "https://umarevska-yabalka.com";
const PHONE = "089 679 9117";
const WINDOW_MIN = 120;
const HOURLY_CAP = 20;       // предпазител срещу злоупотреба с формата

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const okEmail = (e: unknown) => /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]{2,}$/.test(String(e ?? ""));
const when = (iso: string) =>
  new Intl.DateTimeFormat("bg-BG", { timeZone: "Europe/Sofia", dateStyle: "long", timeStyle: "short" }).format(new Date(iso));

type Row = Record<string, any>;

function render(m: Row) {
  const at = when(m.created_at);
  const html = `<!doctype html><html lang="bg"><body style="margin:0;padding:0;background:#f6f1e7">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f1e7;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden">
        <tr><td style="background:#0f2a1d;padding:22px 28px;color:#ffffff;font-size:20px;font-weight:bold">Умаревска Ябълка</td></tr>
        <tr><td style="padding:28px">
          <h1 style="margin:0 0 10px;font-size:22px;color:#0f2a1d">Получихме вашия отказ от договора</h1>
          <p style="margin:0 0 18px;font-size:15px;line-height:1.55;color:#22302a">Това писмо потвърждава, че заявлението ви за отказ от договора е получено на <strong>${esc(at)}</strong>.</p>
          <p style="margin:0 0 6px;font-size:13px;color:#6b7a70">Съдържание на заявлението:</p>
          <p style="margin:0 0 18px;padding:12px 16px;background:#f6f1e7;border-radius:10px;font-size:15px;line-height:1.55;color:#22302a;white-space:pre-line">${esc(m.message)}</p>
          <p style="margin:0 0 18px;font-size:15px;line-height:1.55;color:#22302a">Ще се свържем с вас за връщането на стоката и възстановяването на сумата. Правото на отказ не се прилага за пресните ябълки и за разпечатани сок и оцет — подробностите са в <a href="${SITE}/obshti-usloviya.html#otkaz" style="color:#2d6a4f">Общите условия</a>.</p>
          <p style="margin:0;font-size:15px;line-height:1.55;color:#22302a">Въпроси? Обадете се на <a href="tel:+359896799117" style="color:#2d6a4f;font-weight:bold;text-decoration:none">${PHONE}</a>.</p>
        </td></tr>
        <tr><td style="padding:16px 28px;background:#faf7f0;font-size:12px;color:#6b7a70">Получавате това писмо, защото подадохте отказ от договор на <a href="${SITE}" style="color:#6b7a70">umarevska-yabalka.com</a>. Запазете го.</td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
  const text = [
    "Получихме вашия отказ от договора.",
    "Заявлението е получено на " + at + ".", "",
    "Съдържание на заявлението:", String(m.message ?? ""), "",
    "Ще се свържем с вас за връщането на стоката и възстановяването на сумата.",
    "Общи условия: " + SITE + "/obshti-usloviya.html#otkaz",
    "Телефон: " + PHONE,
  ].join("\n");
  return { html, text };
}

async function send(m: Row) {
  const { html, text } = render(m);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": "Bearer " + API_KEY, "Content-Type": "application/json", "Idempotency-Key": "withdrawal-" + m.id },
    body: JSON.stringify({
      from: FROM, to: [m.email], subject: "Получихме вашия отказ от договора",
      html, text, ...(REPLY_TO ? { reply_to: REPLY_TO } : {}),
    }),
  });
  if (!res.ok) await res.body?.cancel();
  return res.ok;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");
  try {
    if (!API_KEY) return json({ ok: true, skipped: "no-key" });
    const since = new Date(Date.now() - WINDOW_MIN * 60000).toISOString();
    const hourAgo = new Date(Date.now() - 3600000).toISOString();
    const { count } = await sb.from("messages").select("id", { count: "exact", head: true }).gte("emailed_at", hourAgo);
    const room = HOURLY_CAP - (count ?? 0);
    if (room <= 0) return json({ ok: true, skipped: "cap" });

    const { data: pending } = await sb.from("messages").select("id")
      .eq("kind", "withdrawal").not("email", "is", null).is("emailed_at", null).gte("created_at", since)
      .order("created_at").limit(Math.min(room, 10));
    if (!pending?.length) return json({ ok: true, sent: 0 });
    const { data: mine } = await sb.from("messages").update({ emailed_at: new Date().toISOString() })
      .in("id", pending.map((r) => r.id)).is("emailed_at", null)
      .select("id, created_at, email, message");

    let sent = 0, failed = 0;
    for (const m of mine ?? []) {
      if (!okEmail(m.email)) continue;
      let ok = false;
      try { ok = await send(m); } catch (_e) { ok = false; }
      if (ok) sent++;
      else { failed++; await sb.from("messages").update({ emailed_at: null }).eq("id", m.id); }
    }
    return json({ ok: true, sent, failed });
  } catch (_e) {
    return json({ ok: false }, 500);
  }
});
