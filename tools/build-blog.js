/* Генератор на статичните страници за търсачките.

   Статиите живеят в articles.js. За да ги намират Google и останалите, всяка статия трябва да има
   собствена HTML страница със заглавие, описание и съдържание — не само рендиране с JavaScript.
   Този скрипт прави от шаблона article.html по една страница blog-<slug>.html за всяка статия,
   вписва картите на статиите в index.html и пише sitemap.xml.

   Пуска се след всяка промяна в articles.js (нова статия, поправен текст):
       node tools/build-blog.js
   Страниците blog-*.html се генерират — не се редактират на ръка. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://umarevska-yabalka.com/';
const BRAND = 'Умаревска Ябълка';
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const write = (f, s) => fs.writeFileSync(path.join(ROOT, f), s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const text = html => String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const today = new Date().toISOString().slice(0, 10);

const box = { window: {} };
vm.runInNewContext(read('articles.js'), box);
const articles = box.window.ARTICLES;
if (!Array.isArray(articles) || !articles.length) throw new Error('articles.js: няма статии');
const seen = new Set();
articles.forEach((a, i) => {
  if (!/^[a-z0-9-]+$/.test(a.slug || '')) throw new Error('Статия ' + i + ' няма slug (латиница, цифри и тирета)');
  if (seen.has(a.slug)) throw new Error('Повторен slug: ' + a.slug);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a.date || '')) throw new Error('Статия ' + a.slug + ' няма date (ГГГГ-ММ-ДД)');
  seen.add(a.slug);
});
const fileOf = a => 'blog-' + a.slug + '.html';
const urlOf = a => SITE + fileOf(a);

const card = (a, extra) => `
        <a class="post${extra || ''}" href="${fileOf(a)}">
          <div class="post__cover"><img src="${esc(a.img)}" alt="${esc(a.title)}" width="${(a.imgSize || [1200, 800])[0]}" height="${(a.imgSize || [1200, 800])[1]}" loading="lazy" decoding="async"></div>
          <div class="post__body">
            <span class="post__cat">${esc(a.cat)}</span>
            <h3 class="post__title">${esc(a.title)}</h3>
            <p class="post__excerpt">${esc(a.excerpt)}</p>
            <span class="post__more">Прочети <svg class="ico"><use href="#i-arrow"/></svg></span>
          </div>
        </a>`;

function replaceOnce(s, re, to, what) {
  if (!re.test(s)) throw new Error('Шаблонът не съдържа: ' + what);
  return s.replace(re, () => to);
}

const tpl = read('article.html');
const old = fs.readdirSync(ROOT).filter(f => /^blog-.*\.html$/.test(f));

articles.forEach((a, i) => {
  const title = a.title + ' — ' + BRAND;
  const img = SITE + a.img;
  const modified = a.updated || a.date;
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'BlogPosting', '@id': urlOf(a) + '#article', headline: a.title, description: a.excerpt, image: [img],
        datePublished: a.date, dateModified: modified, inLanguage: 'bg', articleSection: a.cat,
        wordCount: text(a.body).split(' ').length,
        mainEntityOfPage: { '@type': 'WebPage', '@id': urlOf(a) },
        author: { '@type': 'Organization', '@id': SITE + '#organization', name: BRAND, url: SITE },
        publisher: { '@type': 'Organization', '@id': SITE + '#organization', name: BRAND, logo: { '@type': 'ImageObject', url: SITE + 'img/logo.png' } } },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Начало', item: SITE },
        { '@type': 'ListItem', position: 2, name: 'Блог', item: SITE + '#blog' },
        { '@type': 'ListItem', position: 3, name: a.title, item: urlOf(a) } ] }
    ]
  };
  const head = `<title>${esc(title)}</title>
  <meta name="description" content="${esc(a.excerpt)}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <meta name="theme-color" content="#0f2a1d" />
  <link rel="canonical" href="${urlOf(a)}" />

  <meta property="og:type" content="article" />
  <meta property="og:locale" content="bg_BG" />
  <meta property="og:site_name" content="${BRAND}" />
  <meta property="og:url" content="${urlOf(a)}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(a.excerpt)}" />
  <meta property="og:image" content="${img}" />
  <meta property="article:published_time" content="${a.date}" />
  <meta property="article:modified_time" content="${modified}" />
  <meta property="article:section" content="${esc(a.cat)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(a.excerpt)}" />
  <meta name="twitter:image" content="${img}" />
  <script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
`;
  const main = `<main class="article" id="articleRoot" data-static="${i}">
    <a href="./#blog" class="article__back">← Обратно към блога</a>
    <div class="article__head">
      <span class="post__cat">${esc(a.cat)}</span>
      <h1 class="article__title">${esc(a.title)}</h1>
      <div class="article__meta">${esc(a.meta)} · <time datetime="${modified}">${modified.split('-').reverse().join('.')}</time></div>
    </div>
    <div class="article__cover"><img src="${esc(a.img)}" alt="${esc(a.title)}" width="${(a.imgSize || [1200, 800])[0]}" height="${(a.imgSize || [1200, 800])[1]}" fetchpriority="high" decoding="async"></div>
    <article class="article__body">${a.body}</article>
    <aside class="article__cta">
      <span class="article__cta-emoji"><svg class="ico"><use href="#i-apple"/></svg></span>
      <div class="article__cta-text">
        <h3>${esc(a.ctaTitle || 'Поръчайте директно от фермата')}</h3>
        <p>${esc(a.ctaText || 'Свежи ябълки и 100% натурален сок от Умаревска Ябълка — поръчайте лесно онлайн.')}</p>
      </div>
      <a href="./#shop" class="btn btn--primary">Към магазина <svg class="ico"><use href="#i-arrow"/></svg></a>
    </aside>
    <div class="article__foot">
      <a href="./#blog" class="btn btn--ghost btn--dark">← Всички статии</a>
      <a href="./#shop" class="btn btn--primary">Към магазина</a>
    </div>
  </main>`;
  const more = articles.filter(x => x !== a).slice(0, 3).map(x => card(x)).join('');

  let page = tpl;
  page = replaceOnce(page, /<title>[\s\S]*?<link rel="preconnect"/, head + '\n  <link rel="preconnect"', 'блока от <title> до preconnect');
  page = replaceOnce(page, /<main class="article" id="articleRoot">[\s\S]*?<\/main>/, main, '<main id="articleRoot">');
  page = replaceOnce(page, /<div class="more__grid" id="moreGrid">[\s\S]*?<\/div>/, '<div class="more__grid" id="moreGrid">' + more + '\n    </div>', '#moreGrid');
  page = page.replace('<!DOCTYPE html>', '<!DOCTYPE html>\n<!-- Генерирано от tools/build-blog.js от articles.js и article.html — не редактирайте на ръка. -->');
  write(fileOf(a), page);
});
old.filter(f => !articles.some(a => fileOf(a) === f)).forEach(f => fs.unlinkSync(path.join(ROOT, f)));   /* махнати статии */

/* картите на статиите — статично в началната страница (script.js ги прерисува със същото съдържание) */
let index = read('index.html');
index = replaceOnce(index, /<!-- blog:start -->[\s\S]*?<!-- blog:end -->/,
  '<!-- blog:start -->' + articles.map(a => card(a, ' reveal')).join('') + '\n      <!-- blog:end -->', 'маркерите blog:start / blog:end в index.html');
write('index.html', index);

/* карта на сайта */
const urls = [{ loc: SITE, lastmod: today, pr: '1.0' }].concat(articles.map(a => ({ loc: urlOf(a), lastmod: a.updated || a.date, pr: '0.7' })));
write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  + urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join('\n') + '\n</urlset>\n');

console.log('Готово: ' + articles.length + ' статии, sitemap.xml с ' + urls.length + ' адреса.');
