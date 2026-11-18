/* ===== Страници на продуктите =====
   Всеки продукт от магазина има собствена страница produkt-<име>.html, за да го намират търсачките.
   Страниците се правят от tools/build-products.js (от продуктите в базата) — същият изглед се ползва и тук,
   затова файлът работи и в браузъра, и в генератора.

   В браузъра прави три неща:
     1) в началната страница — картите в магазина водят към страницата на продукта;
     2) в страницата на продукт — избор на грамаж / брой, „Поръчай“ и актуална цена от базата;
     3) produkt.html?id=… — резервна страница за продукт, добавен в панела след последното генериране. */
(function () {
  'use strict';

  var SITE = 'https://umarevska-yabalka.com/';
  var BRAND = 'Умаревска Ябълка';
  var ICONS = ['drop', 'shield', 'box', 'leaf', 'apple', 'sprout', 'clock', 'home'];
  var CATS = { variety: 'Сортове ябълки', 'mix-juice': 'Сок и други' };
  var TR = { 'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sht',
    'ъ': 'a', 'ь': 'y', 'ю': 'yu', 'я': 'ya' };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n) { return (Math.round((+n || 0) * 100) / 100).toString().replace('.', ','); }
  function clean(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').replace(/\.\.+/g, '. ').replace(/\s+/g, ' ').trim(); }
  function color(c) { return /^#[0-9a-f]{6}$/i.test(c || '') ? c : '#c1272d'; }
  function today() { return new Date().toISOString().slice(0, 10); }
  function promoOf(p) { return (+p.promo_percent > 0 && (!p.promo_until || p.promo_until >= today())) ? +p.promo_percent : 0; }
  function priceOf(p) { return Math.round(p.price * (100 - promoOf(p))) / 100; }
  function weightsOf(p) { var w = (Array.isArray(p.weights) ? p.weights : []).map(Number).filter(function (x) { return x > 0; }); return w.length ? w : [1]; }
  function nameOf(p) { return p.category === 'variety' ? 'Ябълки ' + p.name : p.name; }
  function descOf(p) { return clean(p.lead || p.description || ''); }
  function unitOf(p) { return p.sale_type === 'kg' ? 'кг' : (p.unit_label || 'бр.'); }
  function imgOf(p) { return p.image_url || 'img/apples.jpg'; }
  function absUrl(u) { return /^https?:/i.test(u || '') ? u : SITE + String(u || 'img/apples.jpg').replace(/^\//, ''); }
  function slugify(s) {
    return String(s || '').toLowerCase().split('').map(function (ch) { return TR[ch] != null ? TR[ch] : ch; }).join('')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  /* блокът за поръчка: грамаж или брой, цена, бутон */
  function orderHtml(p) {
    var promo = promoOf(p), unit = priceOf(p);
    var first = p.sale_type === 'kg' ? weightsOf(p)[0] : 1;
    var controls = p.sale_type === 'kg'
      ? '<div class="variety__weights">' + weightsOf(p).map(function (kg, i) { return '<button class="vw' + (i ? '' : ' active') + '" data-kg="' + kg + '">' + fmt(kg) + ' кг</button>'; }).join('') + '</div>'
      : '<div class="qty-select" data-qty><button data-act="dec" aria-label="По-малко">−</button><span><span class="qv">1</span> ' + esc(p.unit_label || 'бр.') + '</span><button data-act="inc" aria-label="Повече">+</button></div>';
    return '<p class="product__unit">' + (promo ? '<s>' + fmt(p.price) + ' €</s> ' : '') + '<strong>' + fmt(unit) + ' €</strong> / ' + esc(unitOf(p))
      + (promo ? ' <span class="product__promo">' + esc(p.promo_label || '−' + fmt(promo) + '%') + '</span>' : '') + '</p>'
      + controls
      + '<div class="variety__buy"><span class="variety__price">' + (promo ? '<s class="variety__old">' + fmt(first * p.price) + ' €</s>' : '')
      + '<span class="vp">' + fmt(first * unit) + '</span> €</span><button class="btn btn--primary vadd">Поръчай <svg class="ico"><use href="#i-arrow"/></svg></button></div>';
  }

  /* съдържанието на <main> за един продукт */
  function mainHtml(p) {
    var name = nameOf(p), desc = descOf(p), bullets = Array.isArray(p.bullets) ? p.bullets : [];
    var extra = p.lead && p.description && clean(p.description) !== desc ? clean(p.description) : '';
    return '<nav class="product__crumbs" aria-label="Път до страницата"><a href="./">Начало</a><span aria-hidden="true">›</span><a href="./#shop">Магазин</a><span aria-hidden="true">›</span><span>' + esc(name) + '</span></nav>'
      + '<div class="product__grid" style="--c:' + color(p.color) + '">'
      + '<div class="product__media"><img src="' + esc(imgOf(p)) + '" alt="' + esc(name) + ' — ' + BRAND + '" fetchpriority="high" />'
      + (p.note ? '<span class="product__note" aria-hidden="true">' + esc(p.note) + '</span>' : '') + '</div>'
      + '<div class="product__info">'
      + '<span class="post__cat">' + esc(p.badge || CATS[p.category] || 'Магазин') + '</span>'
      + '<h1 class="product__title">' + esc(name) + '</h1>'
      + (p.tag ? '<span class="product__tag">' + esc(p.tag) + '</span>' : '')
      + (desc ? '<p class="product__desc">' + esc(desc) + '</p>' : '')
      + (extra ? '<p class="product__desc">' + esc(extra) + '</p>' : '')
      + (bullets.length ? '<div class="variety__bullets">' + bullets.map(function (b, i) {
        return '<div class="bullet-item"><span class="bullet-icon"><svg class="ico"><use href="#i-' + (ICONS.indexOf(b.icon) >= 0 ? b.icon : ICONS[i % 3]) + '"/></svg></span><div class="bullet-text"><strong>' + esc(b.title) + '</strong><p>' + esc(b.text) + '</p></div></div>';
      }).join('') + '</div>' : '')
      + '<div class="product__order" id="productOrder">' + orderHtml(p) + '</div>'
      + '<ul class="product__facts">'
      + '<li><svg class="ico"><use href="#i-sprout"/></svg><span>Директно от производител — семейно стопанство в с. Умаревци, Ловешко.</span></li>'
      + '<li><svg class="ico"><use href="#i-box"/></svg><span>Доставка с Еконт, Спиди или Pigeon Express — до офис, автомат или адрес в цяла България.</span></li>'
      + '<li><svg class="ico"><use href="#i-shield"/></svg><span>Плащане с наложен платеж при получаване. <a href="obshti-usloviya.html#dostavka">Доставка и плащане</a></span></li>'
      + '<li><svg class="ico"><use href="#i-pin"/></svg><span>Или вземете поръчката от <a href="./#locations">нашите обекти</a> — без разходи за доставка.</span></li>'
      + '</ul></div></div>';
  }

  /* карта „друг продукт“ под основния */
  function moreCard(p, url) {
    var d = descOf(p);
    return '<a class="post" href="' + esc(url) + '"><div class="post__cover"><img src="' + esc(imgOf(p)) + '" alt="' + esc(nameOf(p)) + '" loading="lazy" decoding="async"></div>'
      + '<div class="post__body"><span class="post__cat">' + fmt(priceOf(p)) + ' € / ' + esc(unitOf(p)) + '</span><h3 class="post__title">' + esc(nameOf(p)) + '</h3>'
      + '<p class="post__excerpt">' + esc(d.length > 130 ? d.slice(0, 127).replace(/\s+\S*$/, '') + '…' : d) + '</p>'
      + '<span class="post__more">Към продукта <svg class="ico"><use href="#i-arrow"/></svg></span></div></a>';
  }

  /* структурирани данни за търсачките */
  function schema(p, url) {
    var price = priceOf(p).toFixed(2), name = nameOf(p), desc = descOf(p);
    var offer = { '@type': 'Offer', url: url, priceCurrency: 'EUR', price: price, availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition', seller: { '@type': 'Organization', '@id': SITE + '#organization', name: BRAND, url: SITE } };
    if (p.sale_type === 'kg') offer.priceSpecification = { '@type': 'UnitPriceSpecification', price: price, priceCurrency: 'EUR',
      referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'KGM' } };
    var product = { '@type': 'Product', '@id': url + '#product', name: name, image: [absUrl(p.image_url)], sku: String(p.id),
      category: CATS[p.category] || 'Магазин', brand: { '@type': 'Brand', name: BRAND }, offers: offer };
    if (desc) product.description = desc;
    return { '@context': 'https://schema.org', '@graph': [product,
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Начало', item: SITE },
        { '@type': 'ListItem', position: 2, name: 'Магазин', item: SITE + '#shop' },
        { '@type': 'ListItem', position: 3, name: name, item: url } ] }] };
  }

  var API = { SITE: SITE, BRAND: BRAND, esc: esc, fmt: fmt, slugify: slugify, nameOf: nameOf, descOf: descOf, unitOf: unitOf, priceOf: priceOf,
    promoOf: promoOf, absUrl: absUrl, mainHtml: mainHtml, moreCard: moreCard, schema: schema };
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; return; }   /* генераторът спира тук */

  /* ============================ в браузъра ============================ */
  var PAGES = Array.isArray(window.UM_PRODUCT_PAGES) ? window.UM_PRODUCT_PAGES : [];
  function fileById(id) { for (var i = 0; i < PAGES.length; i++) if (String(PAGES[i].id) === String(id)) return PAGES[i].file; return ''; }
  function fileByName(n) { for (var i = 0; i < PAGES.length; i++) if (PAGES[i].name === n) return PAGES[i].file; return ''; }
  /* адресът на страницата на продукт (готовата, а ако още няма такава — резервната) */
  function pageOf(p) { return fileById(p.id) || 'produkt.html?id=' + encodeURIComponent(p.id); }
  window.umProductUrl = function (p) { var f = fileById(p.id); return f ? SITE + f : ''; };

  /* ---------- 1) началната страница: картите водят към страницата на продукта ---------- */
  var grid = document.querySelector('.varieties__grid');
  if (grid) {
    var st = document.createElement('style');
    st.textContent = '.variety[data-href]{cursor:pointer}.variety[data-href] .variety__order{cursor:auto}';
    document.head.appendChild(st);
    var link = function () {
      grid.querySelectorAll('.variety').forEach(function (card) {
        var h = card.querySelector('h3'); if (!h) return;
        var pid = card.dataset.pid;
        var url = (pid && fileById(pid)) || fileByName(h.textContent.trim()) || (pid ? 'produkt.html?id=' + encodeURIComponent(pid) : '');
        if (!url) return;
        card.dataset.href = url;
        var a = h.querySelector('a');
        if (!a) { a = document.createElement('a'); while (h.firstChild) a.appendChild(h.firstChild); h.appendChild(a); }
        a.href = url;
      });
    };
    link();
    new MutationObserver(link).observe(grid, { childList: true });   /* магазинът се прерисува, щом базата отговори */
    grid.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button) return;
      if (e.target.closest('.variety__order, a, button, input, select, label')) return;   /* грамаж, брой и „Поръчай“ работят както досега */
      var card = e.target.closest('.variety[data-href]');
      if (!card) return;
      if (e.ctrlKey || e.metaKey || e.shiftKey) window.open(card.dataset.href, '_blank');
      else location.href = card.dataset.href;
    });
    return;
  }

  /* ---------- 2) и 3) страница на продукт ---------- */
  var root = document.getElementById('productRoot');
  if (!root) return;
  var D = window.UMData;
  var more = document.getElementById('moreProducts');
  var current = null;

  function bind(p) {
    current = p;
    root.dataset.pid = p.id;
  }
  root.addEventListener('click', function (e) {
    var p = current, box = e.target.closest('#productOrder');
    if (!p || !box) return;
    var unit = priceOf(p), promo = promoOf(p);
    var setPrice = function (mult) {
      box.querySelector('.vp').textContent = fmt(mult * unit);
      var old = box.querySelector('.variety__old'); if (old) old.textContent = fmt(mult * p.price) + ' €';
    };
    var w = e.target.closest('.vw');
    if (w) {
      box.querySelectorAll('.vw').forEach(function (b) { b.classList.toggle('active', b === w); });
      return setPrice(+w.dataset.kg);
    }
    var q = e.target.closest('[data-qty] button');
    if (q) {
      var qv = box.querySelector('.qv');
      var n = Math.max(1, (+qv.textContent || 1) + (q.dataset.act === 'inc' ? 1 : -1));
      qv.textContent = n;
      return setPrice(n);
    }
    if (!e.target.closest('.vadd') || typeof addToCart !== 'function') return;
    /* същите записи в кошницата, каквито прави и магазинът в началната страница */
    if (p.sale_type === 'kg') {
      var act = box.querySelector('.vw.active'), kg = act ? +act.dataset.kg : (Array.isArray(p.weights) && +p.weights[0]) || 1;
      addToCart({ id: 'p-' + p.id + '-' + kg, type: 'apples', name: nameOf(p),
        meta: fmt(kg) + ' кг · ' + fmt(unit) + ' €/кг' + (promo ? ' (−' + fmt(promo) + '%)' : ''), icon: '🍎', img: p.image_url || '',
        unitPrice: Math.round(kg * unit * 100) / 100, qty: 1, kg: kg });
    } else {
      var cnt = Math.max(1, +box.querySelector('.qv').textContent || 1);
      addToCart({ id: 'p-' + p.id, type: 'unit', name: p.name, meta: fmt(unit) + ' € / ' + (p.unit_label || 'бр.') + (promo ? ' (−' + fmt(promo) + '%)' : ''),
        icon: '🧃', img: p.image_url || '', unitPrice: unit, qty: cnt, kg: +p.unit_kg || 1 });
    }
    openCart();
  });

  function setSchema(p, url) {
    var el = document.getElementById('ldProduct');
    if (!el) { el = document.createElement('script'); el.type = 'application/ld+json'; el.id = 'ldProduct'; document.head.appendChild(el); }
    el.textContent = JSON.stringify(schema(p, url));
  }
  function notFound() {
    root.innerHTML = '<div class="article__notfound"><h1>Продуктът не е намерен</h1><p>Възможно е връзката да е остаряла или продуктът вече да не се предлага.</p>'
      + '<a href="./#shop" class="btn btn--primary">Към магазина</a></div>';
    var sec = more && more.closest('.more'); if (sec) sec.hidden = true;
  }
  function load() {
    if (!D || !D.publicSelect || D.mode === 'off') return Promise.reject(new Error('no-db'));
    return D.publicSelect('products', { filters: [['active', 'eq', 'true']], order: 'sort.asc' });
  }

  var data = document.getElementById('productData');
  if (data) {
    /* готова страница: работи веднага с вградените данни, после взима актуалната цена от базата */
    var built; try { built = JSON.parse(data.textContent); } catch (e) { built = null; }
    if (!built) return;
    bind(built);
    load().then(function (list) {
      var live = (list || []).filter(function (x) { return String(x.id) === String(built.id); })[0];
      var box = document.getElementById('productOrder');
      if (!live) {   /* спрян от панела */
        current = null;
        if (box) box.innerHTML = '<p class="product__unit"><strong>В момента не се предлага.</strong></p><a href="./#shop" class="btn btn--primary">Към магазина <svg class="ico"><use href="#i-arrow"/></svg></a>';
        return;
      }
      bind(live);
      if (box) box.innerHTML = orderHtml(live);
      setSchema(live, SITE + (fileById(live.id) || location.pathname.split('/').pop()));
    }).catch(function () {});   /* базата не отговаря → остават вградените данни */
    return;
  }

  /* резервна страница produkt.html?id=… */
  var id = new URLSearchParams(location.search).get('id');
  if (!id) return notFound();
  var ready = fileById(id);
  if (ready) { location.replace(ready); return; }
  load().then(function (list) {
    var p = (list || []).filter(function (x) { return String(x.id) === String(id); })[0];
    if (!p) return notFound();
    document.title = nameOf(p) + ' — от производител | ' + BRAND;
    root.innerHTML = mainHtml(p);
    bind(p);
    if (more) more.innerHTML = list.filter(function (x) { return x !== p; }).slice(0, 3).map(function (x) { return moreCard(x, pageOf(x)); }).join('');
  }).catch(notFound);
})();
