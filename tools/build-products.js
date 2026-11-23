/* Генератор на страниците на продуктите за търсачките.

   Продуктите се управляват от админ панела и живеят в базата. За да ги намират Google и останалите,
   всеки продукт трябва да има собствена HTML страница със заглавие, описание, цена и снимка — не само
   рендиране с JavaScript. Този скрипт чете активните продукти от базата (с публичния ключ от config.js)
   и прави:
     produkt-<име>.html   — по една страница за всеки продукт (от рамката на article.html)
     produkt.html         — резервна страница за продукт, добавен след последното генериране
     products-pages.js    — списък „продукт → страница“, по който картите в магазина намират адреса
     sitemap.xml          — добавя адресите на продуктите

   Пуска се след промяна на продукт в панела (ново име, описание, снимка, цена, нов или спрян продукт):
       node tools/build-products.js
   Страниците produkt*.html и products-pages.js се генерират — не се редактират на ръка.
   Адресът на вече публикуван продукт не се сменя, дори да му смените името. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const P = require(path.join(ROOT, 'um-products.js'));
const SITE = P.SITE, BRAND = P.BRAND, esc = P.esc;
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const write = (f, s) => fs.writeFileSync(path.join(ROOT, f), s);
const exists = f => fs.existsSync(path.join(ROOT, f));
const today = new Date().toISOString().slice(0, 10);
const MANIFEST = 'products-pages.js';
const VER = { css: 2, js: 2 };   /* вдигат се при промяна на product.css / um-products.js */

function replaceOnce(s, re, to, what) {
  if (!re.test(s)) throw new Error('Шаблонът не съдържа: ' + what);
  return s.replace(re, () => to);
}
function loadConfig() {
  const box = { window: {} };
  vm.runInNewContext(read('config.js'), box);
  const c = box.window.UM_CONFIG || {};
  if (!c.supabaseUrl || !c.supabaseKey) throw new Error('config.js: няма връзка с базата');
  return c;
}
function loadManifest() {
  if (!exists(MANIFEST)) return [];
  const box = { window: {} };
  vm.runInNewContext(read(MANIFEST), box);
  return Array.isArray(box.window.UM_PRODUCT_PAGES) ? box.window.UM_PRODUCT_PAGES : [];
}
async function loadProducts() {
  const c = loadConfig();
  const headers = { apikey: c.supabaseKey };
  if (c.supabaseKey.indexOf('eyJ') === 0) headers.Authorization = 'Bearer ' + c.supabaseKey;
  const r = await fetch(c.supabaseUrl.replace(/\/+$/, '') + '/rest/v1/products?select=*&active=eq.true&order=sort.asc', { headers });
  if (!r.ok) throw new Error('Базата върна ' + r.status);
  const rows = await r.json();
  if (!Array.isArray(rows) || !rows.length) throw new Error('Базата не върна продукти — нищо не е променено');
  return rows;
}
const cut = (s, n) => s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '').replace(/[\s,;:—-]+$/, '') + '…' : s;

(async () => {
  const products = await loadProducts();
  const before = loadManifest();

  /* адреси: вече публикуваните се пазят; новите идват от името */
  const taken = new Set();
  const fileOf = new Map();
  products.forEach(p => {
    const old = before.find(x => String(x.id) === String(p.id));
    if (old && /^produkt-[a-z0-9-]+\.html$/.test(old.file) && !taken.has(old.file)) { fileOf.set(p.id, old.file); taken.add(old.file); }
  });
  products.forEach(p => {
    if (fileOf.has(p.id)) return;
    const base = 'produkt-' + (P.slugify(P.nameOf(p)) || 'p');
    let file = base + '.html', n = 2;
    while (taken.has(file)) file = base + '-' + (n++) + '.html';
    fileOf.set(p.id, file); taken.add(file);
  });
  const urlOf = p => SITE + fileOf.get(p.id);

  const manifest = products.map(p => ({ id: p.id, name: p.name, file: fileOf.get(p.id) }));
  const manifestJs = '/* Генерирано от tools/build-products.js — не редактирайте на ръка. */\nwindow.UM_PRODUCT_PAGES = ' + JSON.stringify(manifest, null, 1) + ';\n';
  const mv = crypto.createHash('sha1').update(manifestJs).digest('hex').slice(0, 8);

  /* рамката: article.html без частите за статия */
  let shell = read('article.html');
  shell = replaceOnce(shell, /(<link rel="stylesheet" href="styles\.css[^"]*" \/>)/, shell.match(/<link rel="stylesheet" href="styles\.css[^"]*" \/>/)[0]
    + '\n  <link rel="stylesheet" href="product.css?v=' + VER.css + '" />', 'връзката към styles.css');
  shell = replaceOnce(shell, /<script src="articles\.js[^"]*"><\/script>\s*<script src="article\.js[^"]*"><\/script>/,
    '<script src="' + MANIFEST + '?v=' + mv + '"></script>', 'скриптовете на статията');
  shell = replaceOnce(shell, /(<script src="script\.js[^"]*"><\/script>)/, shell.match(/<script src="script\.js[^"]*"><\/script>/)[0]
    + '\n  <script src="um-products.js?v=' + VER.js + '"></script>', 'script.js');
  shell = shell.replace('<!DOCTYPE html>', '<!DOCTYPE html>\n<!-- Генерирано от tools/build-products.js от продуктите в базата и article.html — не редактирайте на ръка. -->');

  const moreSection = cards => `<section class="more">
    <div class="more__head">
      <span class="kicker">Още от градината</span>
      <h2>Вижте също</h2>
    </div>
    <div class="more__grid" id="moreProducts">${cards}</div>
  </section>`;
  const page = (head, main, cards) => {
    let s = shell;
    s = replaceOnce(s, /<title>[\s\S]*?<link rel="preconnect"/, head + '\n  <link rel="preconnect"', 'блока от <title> до preconnect');
    s = replaceOnce(s, /<main class="article" id="articleRoot">[\s\S]*?<\/main>/, main, '<main id="articleRoot">');
    s = replaceOnce(s, /<section class="more">[\s\S]*?<\/section>/, moreSection(cards), 'секцията „още“');
    return s;
  };

  /* lastmod в картата на сайта се сменя само когато данните на продукта са се променили */
  const mapOld = {};
  (exists('sitemap.xml') ? read('sitemap.xml') : '').replace(/<url><loc>([^<]+)<\/loc><lastmod>([^<]+)<\/lastmod><\/url>/g, (m, loc, d) => { mapOld[loc] = d; return m; });
  const embedded = f => { const m = exists(f) && read(f).match(/<script type="application\/json" id="productData">([\s\S]*?)<\/script>/); return m ? m[1] : ''; };
  const lastmod = {};

  products.forEach((p, i) => {
    const name = P.nameOf(p), desc = P.descOf(p), url = urlOf(p), file = fileOf.get(p.id);
    const title = name + ' — от производител | ' + BRAND;
    const priceLine = 'Цена ' + P.fromOf(p) + ' € / ' + P.unitOf(p) + ', доставка с куриер в цяла България.';
    /* описание за търсачките: цели изречения от описанието, докато се побират, и цената накрая */
    const room = 158 - priceLine.length - (name + ' от производител. ').length;
    let lead = '';
    (desc.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) || []).some(s => { s = s.trim(); if ((lead + ' ' + s).trim().length > room) return true; lead = (lead + ' ' + s).trim(); return false; });
    if (!lead && desc) lead = cut(desc, room);
    const meta = name + ' от производител. ' + (lead ? lead + (/[.!?…]$/.test(lead) ? ' ' : '. ') : '') + priceLine;
    const img = P.absUrl(p.image_url);
    const json = JSON.stringify(p).replace(/</g, '\\u003c');
    lastmod[url] = (embedded(file) === json && mapOld[url]) || today;

    const head = `<title>${esc(title)}</title>
  <meta name="description" content="${esc(meta)}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <meta name="theme-color" content="#0f2a1d" />
  <link rel="canonical" href="${url}" />

  <meta property="og:type" content="product" />
  <meta property="og:locale" content="bg_BG" />
  <meta property="og:site_name" content="${BRAND}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(meta)}" />
  <meta property="og:image" content="${esc(img)}" />
  <meta property="product:price:amount" content="${P.minPriceOf(p).toFixed(2)}" />
  <meta property="product:price:currency" content="EUR" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(meta)}" />
  <meta name="twitter:image" content="${esc(img)}" />
  <script type="application/ld+json" id="ldProduct">${JSON.stringify(P.schema(p, url)).replace(/</g, '\\u003c')}</script>
  <script type="application/json" id="productData">${json}</script>
`;
    const main = `<main class="product" id="productRoot" data-pid="${esc(p.id)}">\n    ${P.mainHtml(p)}\n  </main>`;
    const others = [1, 2, 3].map(k => products[(i + k) % products.length]).filter((x, k, a) => x !== p && a.indexOf(x) === k);
    write(file, page(head, main, others.map(x => '\n      ' + P.moreCard(x, fileOf.get(x.id))).join('') + '\n    '));
  });

  /* резервната страница — съдържанието ѝ се рисува в браузъра по ?id= */
  write('produkt.html', page(`<title>Продукт — ${BRAND}</title>
  <meta name="description" content="Ябълки и натурален ябълков сок от ${BRAND} — поръчайте директно от производителя." />
  <meta name="robots" content="noindex, follow" />
  <meta name="theme-color" content="#0f2a1d" />
`, '<main class="product" id="productRoot">\n    <!-- рисува се от um-products.js -->\n  </main>', ''));

  /* спрени / изтрити продукти → страниците им се махат */
  fs.readdirSync(ROOT).filter(f => /^produkt-.*\.html$/.test(f) && !taken.has(f)).forEach(f => fs.unlinkSync(path.join(ROOT, f)));

  write(MANIFEST, manifestJs);

  /* началната страница зарежда списъка и скрипта, който свързва картите със страниците */
  let index = read('index.html');
  const tags = '<script src="' + MANIFEST + '?v=' + mv + '"></script>\n  <script src="um-products.js?v=' + VER.js + '"></script>';
  if (/<script src="products-pages\.js[^"]*"><\/script>\s*<script src="um-products\.js[^"]*"><\/script>/.test(index)) {
    index = index.replace(/<script src="products-pages\.js[^"]*"><\/script>\s*<script src="um-products\.js[^"]*"><\/script>/, () => tags);
  } else {
    index = replaceOnce(index, /(<script src="script\.js[^"]*"><\/script>)/, index.match(/<script src="script\.js[^"]*"><\/script>/)[0] + '\n  ' + tags, 'script.js в index.html');
  }
  write('index.html', index);

  /* карта на сайта: останалите адреси се пазят, продуктите се подменят */
  const keep = Object.keys(mapOld).filter(loc => !/\/produkt-[^/]*\.html$/.test(loc)).map(loc => ({ loc, lastmod: mapOld[loc] }));
  const urls = keep.concat(products.map(p => ({ loc: urlOf(p), lastmod: lastmod[urlOf(p)] })));
  write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join('\n') + '\n</urlset>\n');

  console.log('Готово: ' + products.length + ' продукта, sitemap.xml с ' + urls.length + ' адреса.');
  products.forEach(p => console.log('  ' + fileOf.get(p.id) + '  ←  ' + P.nameOf(p)));
})().catch(e => { console.error('Грешка: ' + e.message); process.exit(1); });
