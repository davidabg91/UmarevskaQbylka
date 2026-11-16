// Sync of courier offices (Speedy, Pigeon Express) into table public.courier_offices.
//
// Neither courier offers an open API for its office list, so this reads the same public
// pages their own websites use to show offices: Speedy's offices map and Pigeon Express's
// locations page. It runs once a day (pg_cron) and keeps the previous snapshot if a source
// changes its format or returns too few rows.
//
// Public URL, no secrets: a run is skipped when the last one is younger than 6 hours.
import { createClient } from "npm:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });

type Office = { courier: string; code: string; name: string; city: string; address: string | null; kind: string };

const titleCase = (s: string) =>
  s.toLowerCase().replace(/(^|[\s\-.(])(\p{L})/gu, (_m, a, b) => a + b.toUpperCase());
const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ").trim();

async function speedy(): Promise<Office[]> {
  const res = await fetch("https://services.speedy.bg/officesmap_v2/?src=sws", { headers: { "User-Agent": UA, "Accept-Language": "bg" } });
  if (!res.ok) throw new Error("speedy HTTP " + res.status);
  const html = await res.text();
  const i = html.indexOf("var speedy_offices = {");
  if (i < 0) throw new Error("speedy: office data not found");
  const blob = html.slice(i, html.indexOf("};", i));
  const out: Office[] = [];
  for (const chunk of blob.split(/\{\s*oID:/).slice(1)) {
    const id = /^\s*(\d+)/.exec(chunk)?.[1];
    const name = /officeName:\s*'([^']*)'/.exec(chunk)?.[1];
    const type = /officeType:\s*'(\w+)'/.exec(chunk)?.[1] ?? "OFFICE";
    const vendor = /vendor:\s*"([^"]*)"/.exec(chunk)?.[1] ?? "";
    if (!id || !name || vendor) continue;                       // partner networks abroad are skipped
    const parts = decode(name).replace(/\s*\(АВТОМАТ\)\s*$/i, "").split(/\s+[-–]\s+/);
    const city = titleCase(parts[0]).replace(/\s*\(\d+\)$/, "");      // "Генерал Тошево (1)" -> "Генерал Тошево"
    const rest = parts.slice(1).join(" - ");
    out.push({ courier: "speedy", code: id, name: (rest || parts[0]).slice(0, 190), city: city.slice(0, 110), address: null,
      kind: type === "OFFICE" ? "office" : "automat" });
  }
  return out;
}

async function pigeonPage(page: number) {
  const res = await fetch("https://pigeonexpress.com/api/locations/offices?page=" + page, {
    headers: { "User-Agent": UA, "X-Requested-With": "XMLHttpRequest", "Accept": "application/json" },
  });
  if (!res.ok) throw new Error("pigeon HTTP " + res.status);
  return await res.json() as { html: string; total: number; hasMore: boolean };
}
function pigeonParse(html: string): Office[] {
  const out: Office[] = [];
  for (const card of html.split('<article class="loc-card"').slice(1)) {
    const title = decode(/loc-card__title">([^<]+)/.exec(card)?.[1] ?? "");
    if (!title) continue;
    const badge = decode(/loc-card__badge[^>]*>([^<]+)/.exec(card)?.[1] ?? "");
    const address = decode(/icon-map_pin[^>]*>\s*<\/i>\s*<span>([^<]+)/.exec(card)?.[1] ?? "");
    const code = /\((\d+)\)\s*$/.exec(title)?.[1];
    const noCode = title.replace(/\s*\(\d+\)\s*$/, "");
    const comma = noCode.indexOf(",");
    const city = (comma > 0 ? noCode.slice(0, comma) : noCode).trim();
    const name = (comma > 0 ? noCode.slice(comma + 1) : noCode).trim();
    if (!code || !city) continue;
    out.push({ courier: "pigeon", code, name: name.slice(0, 190), city: city.slice(0, 110), address: address.slice(0, 290) || null,
      kind: /автомат/i.test(badge) ? "automat" : "office" });
  }
  return out;
}
async function pigeon(): Promise<Office[]> {
  const first = await pigeonPage(1);
  let out = pigeonParse(first.html);
  const perPage = Math.max(1, out.length);
  const pages = Math.min(80, Math.ceil((first.total || 0) / perPage));
  for (let p = 2; p <= pages; p += 6) {                           // six pages at a time
    const batch = await Promise.all(Array.from({ length: Math.min(6, pages - p + 1) }, (_x, k) => pigeonPage(p + k)));
    for (const b of batch) out = out.concat(pigeonParse(b.html));
  }
  return out;
}

async function store(courier: string, rows: Office[]) {
  const seen = new Set<string>();
  const unique = rows.filter((r) => (seen.has(r.code) ? false : (seen.add(r.code), true)));
  if (unique.length < 50) throw new Error(courier + ": only " + unique.length + " offices parsed, keeping the previous list");
  const stamp = new Date().toISOString();
  for (let i = 0; i < unique.length; i += 500) {
    const { error } = await sb.from("courier_offices").upsert(unique.slice(i, i + 500).map((r) => ({ ...r, updated_at: stamp })), { onConflict: "courier,code" });
    if (error) throw new Error(courier + ": " + error.message);
  }
  await sb.from("courier_offices").delete().eq("courier", courier).lt("updated_at", stamp);   // closed offices
  return unique.length;
}

Deno.serve(async () => {
  try {
    const { data: last } = await sb.from("app_private").select("value").eq("key", "offices_synced_at").maybeSingle();
    if (last?.value && Date.now() - Date.parse(last.value) < 6 * 3600 * 1000) return json({ ok: true, skipped: "synced recently", at: last.value });
    await sb.from("app_private").upsert({ key: "offices_synced_at", value: new Date().toISOString() }, { onConflict: "key" });
    const result: Record<string, unknown> = {};
    for (const [name, fn] of [["speedy", speedy], ["pigeon", pigeon]] as const) {
      try { result[name] = await store(name, await fn()); } catch (e) { result[name] = "error: " + String((e as Error)?.message ?? e); }
    }
    return json({ ok: true, ...result });
  } catch (e) {
    return json({ ok: false, error: String((e as Error)?.message ?? e) }, 500);
  }
});
