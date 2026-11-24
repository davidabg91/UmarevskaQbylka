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
  /* размери на плода (напр. Едър 8,5+ см / Среден 7,5–8,5 см) — всеки със собствена цена за килограм */
  function sizesOf(p) {
    if (p.sale_type !== 'kg' || !Array.isArray(p.sizes)) return [];
    return p.sizes.filter(function (s) { return s && s.name && +s.price > 0; })
      .map(function (s) { return { name: String(s.name), range: String(s.range || ''), price: +s.price }; });
  }
  function sizeLabel(s) { return s.name + (s.range ? ' (' + s.range + ')' : ''); }
  /* цена без намаление / с намаление — за избрания размер (si), а без размери: цената на продукта */
  function baseOf(p, si) { var s = sizesOf(p); return s.length ? s[Math.min(si || 0, s.length - 1)].price : +p.price; }
  function priceOf(p, si) { return Math.round(baseOf(p, si) * (100 - promoOf(p))) / 100; }
  function minPriceOf(p) { var s = sizesOf(p); return s.length ? Math.min.apply(null, s.map(function (x, i) { return priceOf(p, i); })) : priceOf(p); }
  function fromOf(p) { return (sizesOf(p).length > 1 ? 'от ' : '') + fmt(minPriceOf(p)); }
  function sizesHtml(p, si) {
    var s = sizesOf(p);
    if (!s.length) return '';
    return '<div class="variety__sizes" role="group" aria-label="Размер на плода">' + s.map(function (x, i) {
      return '<button class="vs' + (i === (si || 0) ? ' active' : '') + '" data-si="' + i + '"><b>' + esc(x.name) + '</b><small>' + esc(x.range) + '</small><small class="vs__p">'
        + fmt(priceOf(p, i)) + ' €/кг</small></button>';
    }).join('') + '</div>';
  }
  function weightsOf(p) { var w = (Array.isArray(p.weights) ? p.weights : []).map(Number).filter(function (x) { return x > 0; }); return w.length ? w : [1]; }
  function nameOf(p) { return p.category === 'variety' ? 'Ябълки ' + p.name : p.name; }
  function descOf(p) { return clean(p.lead || p.description || ''); }
  function unitOf(p) { return p.sale_type === 'kg' ? 'кг' : (p.unit_label || 'бр.'); }
  function imgOf(p) { return p.image_url || 'img/apples.jpg'; }
  /* задължителна информация за храната — трябва да се вижда преди поръчката:
     произход, клас и сортове (ябълки); нетно количество, цена за литър, съхранение и хранителна стойност (сок, оцет) */
  function volOf(p) { var v = +p.volume_l; return p.sale_type !== 'kg' && v > 0 ? v : 0; }
  function volLabel(v) { return v < 1 ? fmt(v * 1000) + ' мл' : fmt(v) + ' л'; }
  function perLitre(p) { var v = volOf(p); return v ? fmt(priceOf(p) / v) + ' €/л' : ''; }
  function nutritionOf(p) { return (Array.isArray(p.nutrition) ? p.nutrition : []).filter(function (r) { return r && r.label && r.value; }); }
  function specsHtml(p) {
    var r = [];
    if (p.origin) r.push(['Произход', p.origin]);
    if (p.sale_type === 'kg' && p.quality_class) r.push(['Клас на качество', p.quality_class]);
    if (p.varieties) r.push(['Сортове в микса', p.varieties]);
    if (volOf(p)) r.push(['Нетно количество', volLabel(volOf(p))]);
    if (!r.length) return '';
    return '<dl class="product__specs">' + r.map(function (x) { return '<div><dt>' + x[0] + '</dt><dd>' + esc(x[1]) + '</dd></div>'; }).join('') + '</dl>';
  }
  function keepHtml(p) {
    var n = nutritionOf(p), per = volOf(p) ? '100 мл' : '100 г';
    if (!p.storage && !n.length) return '';
    return '<div class="product__keep" id="info">'
      + (p.storage ? '<h2>Съхранение</h2><p>' + esc(p.storage) + '</p>' : '')
      + (n.length ? '<table class="product__nutri"><caption>Хранителна стойност на ' + per + ' <small>средни стойности</small></caption><tbody>' + n.map(function (x) {
        return '<tr' + (/^от които/i.test(x.label) ? ' class="sub"' : '') + '><th scope="row">' + esc(x.label) + '</th><td>' + esc(x.value) + '</td></tr>';
      }).join('') + '</tbody></table>' : '')
      + '</div>';
  }
  function absUrl(u) { return /^https?:/i.test(u || '') ? u : SITE + String(u || 'img/apples.jpg').replace(/^\//, ''); }
  function slugify(s) {
    return String(s || '').toLowerCase().split('').map(function (ch) { return TR[ch] != null ? TR[ch] : ch; }).join('')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  /* блокът за поръчка: грамаж или брой, цена, бутон */
  function orderHtml(p, si, mult) {
    si = si || 0;
    var promo = promoOf(p), unit = priceOf(p, si), base = baseOf(p, si), sizes = sizesOf(p);
    var first = mult || (p.sale_type === 'kg' ? weightsOf(p)[0] : 1);
    var controls = p.sale_type === 'kg'
      ? '<div class="variety__weights">' + weightsOf(p).map(function (kg) { return '<button class="vw' + (kg === first ? ' active' : '') + '" data-kg="' + kg + '">' + fmt(kg) + ' кг</button>'; }).join('') + '</div>'
      : '<div class="qty-select" data-qty><button data-act="dec" aria-label="По-малко">−</button><span><span class="qv">' + first + '</span> ' + esc(p.unit_label || 'бр.') + '</span><button data-act="inc" aria-label="Повече">+</button></div>';
    return '<p class="product__unit">' + (promo ? '<s>' + fmt(base) + ' €</s> ' : '') + '<strong>' + fmt(unit) + ' €</strong> / ' + esc(unitOf(p))
      + (sizes.length ? ' · размер ' + esc(sizeLabel(sizes[Math.min(si, sizes.length - 1)])) : '')
      + (volOf(p) ? ' · ' + volLabel(volOf(p)) + ' · ' + perLitre(p) : '')
      + (promo ? ' <span class="product__promo">' + esc(p.promo_label || '−' + fmt(promo) + '%') + '</span>' : '') + '</p>'
      + (sizes.length ? '<span class="product__pick">Размер на плода</span>' + sizesHtml(p, si) + '<span class="product__pick">Количество</span>' : '')
      + controls
      + '<div class="variety__buy"><span class="variety__price">' + (promo ? '<s class="variety__old">' + fmt(first * base) + ' €</s>' : '')
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
      + specsHtml(p)
      + '<div class="product__order" id="productOrder">' + orderHtml(p) + '</div>'
      + keepHtml(p)
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
      + '<div class="post__body"><span class="post__cat">' + fromOf(p) + ' € / ' + esc(unitOf(p)) + '</span><h3 class="post__title">' + esc(nameOf(p)) + '</h3>'
      + '<p class="post__excerpt">' + esc(d.length > 130 ? d.slice(0, 127).replace(/\s+\S*$/, '') + '…' : d) + '</p>'
      + '<span class="post__more">Към продукта <svg class="ico"><use href="#i-arrow"/></svg></span></div></a>';
  }

  /* структурирани данни за търсачките */
  function schema(p, url) {
    var name = nameOf(p), desc = descOf(p), sizes = sizesOf(p);
    var one = function (si, label) {
      var price = priceOf(p, si).toFixed(2);
      var o = { '@type': 'Offer', url: url, priceCurrency: 'EUR', price: price, availability: 'https://schema.org/InStock',
        itemCondition: 'https://schema.org/NewCondition', seller: { '@type': 'Organization', '@id': SITE + '#organization', name: BRAND, url: SITE } };
      if (label) o.name = label;
      if (p.sale_type === 'kg') o.priceSpecification = { '@type': 'UnitPriceSpecification', price: price, priceCurrency: 'EUR',
        referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'KGM' } };
      return o;
    };
    var offer = one(0);
    if (sizes.length > 1) {   /* по една оферта за всеки размер */
      var all = sizes.map(function (s, i) { return priceOf(p, i); });
      offer = { '@type': 'AggregateOffer', url: url, priceCurrency: 'EUR', lowPrice: Math.min.apply(null, all).toFixed(2), highPrice: Math.max.apply(null, all).toFixed(2),
        offerCount: sizes.length, availability: 'https://schema.org/InStock', offers: sizes.map(function (s, i) { return one(i, name + ' — ' + sizeLabel(s)); }) };
    }
    var product = { '@type': 'Product', '@id': url + '#product', name: name, image: [absUrl(p.image_url)], sku: String(p.id),
      category: CATS[p.category] || 'Магазин', brand: { '@type': 'Brand', name: BRAND }, offers: offer };
    if (desc) product.description = desc;
    if (p.origin) product.countryOfOrigin = { '@type': 'Country', name: p.origin };
    return { '@context': 'https://schema.org', '@graph': [product,
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Начало', item: SITE },
        { '@type': 'ListItem', position: 2, name: 'Магазин', item: SITE + '#shop' },
        { '@type': 'ListItem', position: 3, name: name, item: url } ] }] };
  }

  var API = { SITE: SITE, BRAND: BRAND, esc: esc, fmt: fmt, slugify: slugify, nameOf: nameOf, descOf: descOf, unitOf: unitOf, priceOf: priceOf,
    promoOf: promoOf, absUrl: absUrl, mainHtml: mainHtml, moreCard: moreCard, schema: schema,
    sizesOf: sizesOf, sizeLabel: sizeLabel, baseOf: baseOf, minPriceOf: minPriceOf, fromOf: fromOf, sizesHtml: sizesHtml };
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
        card.querySelectorAll('a[data-plink]').forEach(function (l) { l.href = url + '#info'; });
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
    var sizes = sizesOf(p), sAct = box.querySelector('.vs.active'), si = sAct ? +sAct.dataset.si : 0;
    var unit = priceOf(p, si), promo = promoOf(p);
    var setPrice = function (mult) {
      box.querySelector('.vp').textContent = fmt(mult * unit);
      var old = box.querySelector('.variety__old'); if (old) old.textContent = fmt(mult * baseOf(p, si)) + ' €';
    };
    var sz = e.target.closest('.vs');
    if (sz) {   /* друг размер → друга цена за килограм; избраният грамаж се запазва */
      var wAct = box.querySelector('.vw.active');
      box.innerHTML = orderHtml(p, +sz.dataset.si, wAct ? +wAct.dataset.kg : 0);
      return;
    }
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
      var size = sizes[si];
      addToCart({ id: 'p-' + p.id + '-' + kg + (size ? '-s' + si : ''), type: 'apples', name: nameOf(p),
        meta: fmt(kg) + ' кг' + (size ? ', ' + sizeLabel(size) : '') + ' · ' + fmt(unit) + ' €/кг' + (promo ? ' (−' + fmt(promo) + '%)' : ''), icon: '🍎', img: p.image_url || '',
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
      if (box) {   /* изборът, направен преди базата да отговори, се запазва */
        var sNow = box.querySelector('.vs.active'), wNow = box.querySelector('.vw.active'), qNow = box.querySelector('.qv');
        box.innerHTML = orderHtml(live, sNow ? Math.min(+sNow.dataset.si, Math.max(0, sizesOf(live).length - 1)) : 0,
          wNow ? (weightsOf(live).indexOf(+wNow.dataset.kg) >= 0 ? +wNow.dataset.kg : 0) : (qNow ? +qNow.textContent || 0 : 0));
      }
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
