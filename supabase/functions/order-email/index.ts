// Имейл за потвърждение на поръчката до клиента — Умаревска Ябълка.
//
// Базата вика тази функция при всяка нова поръчка. Функцията НЕ вярва на заявката:
// сама чете от базата кои скорошни поръчки имат имейл и още нямат изпратено потвърждение,
// маркира ги и праща писмото през Resend. Затова е безопасно адресът ѝ да е публичен.
//
// Тайни на функцията (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY  — ключ за изпращане от Resend (задължителен; без него функцията не прави нищо)
//   MAIL_FROM       — подател, напр. „Умаревска Ябълка <porachki@umarevska-yabalka.com>“ (по желание)
//   MAIL_REPLY_TO   — адрес, на който да отиват отговорите на клиентите (по желание)
import { createClient } from "npm:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = Deno.env.get("MAIL_FROM") || "Умаревска Ябълка <porachki@umarevska-yabalka.com>";
const REPLY_TO = Deno.env.get("MAIL_REPLY_TO") || "";
const SITE = "https://umarevska-yabalka.com";
const PHONE = "089 679 9117";
const WINDOW_MIN = 120;      // потвърждение се праща само за поръчки от последните 2 часа
const HOURLY_CAP = 40;       // предпазител срещу злоупотреба с формата

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const money = (n: unknown) => (Math.round(Number(n || 0) * 100) / 100).toFixed(2).replace(".", ",").replace(/,00$/, "") + " €";
const COURIERS: Record<string, string> = { econt: "Еконт", speedy: "Спиди", pigeon: "Pigeon Express" };
const okEmail = (e: unknown) => /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]{2,}$/.test(String(e ?? ""));

type Order = Record<string, any>;

function deliveryLines(o: Order): string[] {
  if (o.delivery === "pickup") return ["Вземане от наш обект", o.pickup_place];
  const c = COURIERS[o.courier] ? " с " + COURIERS[o.courier] : "";
  if (o.delivery === "office") return ["До офис на куриер" + c, o.city, o.office_name];
  return ["До адрес" + c, o.city, o.address];
}

function render(o: Order) {
  const items: Order[] = Array.isArray(o.items) ? o.items : [];
  const first = String(o.customer_name ?? "").trim().split(/\s+/)[0] || "";
  const del = deliveryLines(o).filter(Boolean);
  const shipNote = o.delivery === "pickup"
    ? "Без разходи за доставка."
    : "Сумата е само за продуктите. Доставката се заплаща от вас на куриера при получаване, по неговата тарифа.";
  const rows = items.map((i) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #eee6d8;font-size:15px;color:#22302a">${esc(i.name)}
        <div style="font-size:13px;color:#6b7a70">${esc(String(i.meta ?? "").split(" · ")[0])} × ${esc(i.qty)}</div></td>
      <td align="right" style="padding:10px 0;border-bottom:1px solid #eee6d8;font-size:15px;color:#22302a;white-space:nowrap">${money(Number(i.qty) * Number(i.price))}</td>
    </tr>`).join("");
  const html = `<!doctype html><html lang="bg"><body style="margin:0;padding:0;background:#f6f1e7">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f1e7;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden">
        <tr><td style="background:#0f2a1d;padding:22px 28px;color:#ffffff;font-size:20px;font-weight:bold">Умаревска Ябълка</td></tr>
        <tr><td style="padding:28px">
          <h1 style="margin:0 0 10px;font-size:22px;color:#0f2a1d">Благодарим за поръчката${first ? ", " + esc(first) : ""}!</h1>
          <p style="margin:0 0 18px;font-size:15px;line-height:1.55;color:#22302a">Получихме вашата заявка. Ще се свържем с вас по телефона за потвърждение и уточняване на доставката.</p>
          <p style="margin:0 0 18px;padding:12px 16px;background:#f6f1e7;border-radius:10px;font-size:15px;color:#22302a">Номер на поръчката: <strong>${esc(o.code)}</strong></p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}
            <tr>
              <td style="padding:14px 0 0;font-size:16px;font-weight:bold;color:#0f2a1d">Общо</td>
              <td align="right" style="padding:14px 0 0;font-size:16px;font-weight:bold;color:#0f2a1d;white-space:nowrap">${money(o.total)}</td>
            </tr>
          </table>
          <p style="margin:8px 0 22px;font-size:13px;color:#6b7a70">${shipNote}</p>
          <h2 style="margin:0 0 6px;font-size:15px;color:#0f2a1d">Получаване</h2>
          <p style="margin:0 0 22px;font-size:15px;line-height:1.55;color:#22302a">${del.map(esc).join("<br>")}</p>
          <p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#22302a">Въпроси или промяна по поръчката? Обадете се на <a href="tel:+359896799117" style="color:#2d6a4f;font-weight:bold;text-decoration:none">${PHONE}</a>.</p>
          <p style="margin:0;font-size:13px;line-height:1.55;color:#6b7a70"><a href="${SITE}/obshti-usloviya.html" style="color:#2d6a4f">Общи условия</a> · <a href="${SITE}/obshti-usloviya.html#otkaz" style="color:#2d6a4f">Право на отказ и форма за отказ</a></p>
        </td></tr>
        <tr><td style="padding:16px 28px;background:#faf7f0;font-size:12px;color:#6b7a70">Получавате това писмо, защото направихте поръчка на <a href="${SITE}" style="color:#6b7a70">umarevska-yabalka.com</a>. Продавач: УМАРЕВСКА ЯБЪЛКА ООД, ЕИК 208882203.</td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
  const text = [
    "Благодарим за поръчката" + (first ? ", " + first : "") + "!",
    "Получихме вашата заявка. Ще се свържем с вас по телефона за потвърждение и уточняване на доставката.",
    "", "Номер на поръчката: " + o.code, "",
    ...items.map((i) => `${i.name} (${String(i.meta ?? "").split(" · ")[0]}) × ${i.qty} — ${money(Number(i.qty) * Number(i.price))}`),
    "Общо: " + money(o.total), shipNote, "",
    "Получаване: " + del.join(", "), "",
    "Въпроси или промяна по поръчката? Телефон: " + PHONE,
    "Общи условия и право на отказ: " + SITE + "/obshti-usloviya.html",
    "Продавач: УМАРЕВСКА ЯБЪЛКА ООД, ЕИК 208882203", SITE,
  ].join("\n");
  return { html, text };
}

async function send(o: Order) {
  const { html, text } = render(o);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": "Bearer " + API_KEY, "Content-Type": "application/json", "Idempotency-Key": "order-" + o.id },
    body: JSON.stringify({
      from: FROM, to: [o.email], subject: "Поръчка " + o.code + " — получихме я",
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
    const { count } = await sb.from("orders").select("id", { count: "exact", head: true }).gte("emailed_at", hourAgo);
    const room = HOURLY_CAP - (count ?? 0);
    if (room <= 0) return json({ ok: true, skipped: "cap" });

    const { data: pending } = await sb.from("orders").select("id")
      .not("email", "is", null).is("emailed_at", null).gte("created_at", since).order("created_at").limit(Math.min(room, 10));
    if (!pending?.length) return json({ ok: true, sent: 0 });
    // маркира ги; връща само тези, които е маркирал сам (ако две извиквания се засекат)
    const { data: mine } = await sb.from("orders").update({ emailed_at: new Date().toISOString() })
      .in("id", pending.map((r) => r.id)).is("emailed_at", null)
      .select("id, code, customer_name, email, delivery, courier, city, office_name, address, pickup_place, items, total");

    let sent = 0, failed = 0;
    for (const o of mine ?? []) {
      if (!okEmail(o.email)) continue;                 // невалиден адрес — остава маркиран, не се опитва пак
      let ok = false;
      try { ok = await send(o); } catch (_e) { ok = false; }
      if (ok) sent++;
      else { failed++; await sb.from("orders").update({ emailed_at: null }).eq("id", o.id); }   // ще се опита при следващата поръчка
    }
    return json({ ok: true, sent, failed });
  } catch (_e) {
    return json({ ok: false }, 500);
  }
});
