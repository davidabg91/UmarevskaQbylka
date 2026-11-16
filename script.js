/* ===================== УМАРЕВСКА ЯБЪЛКА ===================== */

/* ---------- FX SETUP ---------- */
const root = document.documentElement;
const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const FX = !RM;
if (FX) root.classList.add('fx');
const clamp01 = v => Math.min(1, Math.max(0, v));

/* Заглавия: разделяне на думи (маска + изплуване) и на букви за hero */
(function splitText() {
  let i = 0;
  function walk(node) {
    Array.from(node.childNodes).forEach(child => {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span');
          w.className = 'w';
          const inner = document.createElement('span');
          inner.className = 'w__i';
          inner.style.setProperty('--i', i++);
          inner.textContent = part;
          w.appendChild(inner);
          frag.appendChild(w);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === 1) {
        walk(child);
      }
    });
  }
  document.querySelectorAll('[data-split]').forEach(el => { i = 0; walk(el); });

  document.querySelectorAll('.hero__line').forEach((line, li) => {
    line.querySelectorAll('[data-chars]').forEach(word => {
      const chars = Array.from(word.textContent.trim());
      word.textContent = '';
      word.style.setProperty('--n', chars.length);
      chars.forEach((c, ci) => {
        const s = document.createElement('span');
        s.className = 'ch';
        s.setAttribute('aria-hidden', 'true');
        s.style.setProperty('--ci', ci);
        s.style.setProperty('--li', li);
        s.textContent = c;
        word.appendChild(s);
      });
    });
  });
})();

/* ---------- PRELOADER ---------- */
(function() {
  const preloader = document.getElementById('preloader');
  const heroVideo = document.querySelector('.hero__video');
  let loaded = false;

  function removePreloader() {
    if (loaded) return;
    loaded = true;
    document.dispatchEvent(new Event('preloaderDone'));
    if (preloader) {
      preloader.classList.add('fade-out');
      document.body.classList.remove('loading');
      setTimeout(() => {
        preloader.style.display = 'none';
      }, FX ? 2150 : 500);
    }
    /* входната анимация на hero тръгва, когато ябълката започне да „полита“ към зрителя */
    setTimeout(() => root.classList.add('ready'), FX ? 1050 : 100);
  }

  if (heroVideo) {
    if (heroVideo.readyState >= 3) {
      setTimeout(removePreloader, 250);
    } else {
      heroVideo.addEventListener('canplay', removePreloader);
      heroVideo.addEventListener('canplaythrough', removePreloader);
      heroVideo.addEventListener('playing', removePreloader);
    }
    // Safety fallback: if video is slow or fails, clear preloader after 4.5s
    setTimeout(removePreloader, 4500);
  } else {
    if (document.readyState === 'complete') {
      removePreloader();
    } else {
      window.addEventListener('load', removePreloader);
    }
    setTimeout(removePreloader, 1500);
  }
})();

/* ---------- NAV ---------- */
const nav = document.getElementById('nav');
const burger = document.getElementById('burger');
const navLinks = document.getElementById('navLinks');

if (burger && navLinks) {
  const setMenu = open => {
    burger.classList.toggle('open', open);
    navLinks.classList.toggle('open', open);
    root.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  burger.addEventListener('click', () => setMenu(!navLinks.classList.contains('open')));
  navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
}

/* ---------- REVEAL ON SCROLL ---------- */
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });

function observeReveal(scope) {
  (scope || document).querySelectorAll('.reveal, [data-split], .reveal-media').forEach(el => {
    if (el.classList.contains('reveal') && el.parentElement) {
      const sibs = Array.from(el.parentElement.children).filter(c => c.classList.contains('reveal'));
      el.style.setProperty('--ri', sibs.indexOf(el) % 4);
    }
    io.observe(el);
  });
}
observeReveal();

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ===================== SHOP ===================== */
const APPLE_PRICE_PER_KG = 2; // €
const JUICE_PRICE = 5;        // €

/* --- Apples --- */
let appleKg = 5;
const appleWeights = document.getElementById('appleWeights');
const appleTotalEl = document.getElementById('appleTotal');

if (appleWeights) {
  appleWeights.addEventListener('click', e => {
    const btn = e.target.closest('.weight');
    if (!btn) return;
    appleWeights.querySelectorAll('.weight').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    appleKg = +btn.dataset.kg;
    appleTotalEl.textContent = appleKg * APPLE_PRICE_PER_KG;
  });

  document.getElementById('addApples').addEventListener('click', () => {
    addToCart({
      id: 'apples-' + appleKg,
      type: 'apples',
      name: 'Свежи ябълки (микс)',
      meta: appleKg + ' кг · 2 €/кг',
      icon: '🍎',
      img: 'img/mix.jpg',
      unitPrice: appleKg * APPLE_PRICE_PER_KG,
      qty: 1
    });
    openCart();
  });
}

/* --- Juice --- */
let juiceCount = 1;
const juiceCountEl = document.getElementById('juiceCount');
const juiceTotalEl = document.getElementById('juiceTotal');
const juiceQty = document.getElementById('juiceQty');

if (juiceQty) {
  juiceQty.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    juiceCount = Math.max(1, juiceCount + (btn.dataset.act === 'inc' ? 1 : -1));
    juiceCountEl.textContent = juiceCount;
    juiceTotalEl.textContent = juiceCount * JUICE_PRICE;
  });

  document.getElementById('addJuice').addEventListener('click', () => {
    addToCart({
      id: 'juice',
      type: 'juice',
      name: 'Натурален ябълков сок',
      meta: '10 € / бр.',
      icon: '🧃',
      img: 'img/juice-box.webp',
      unitPrice: JUICE_PRICE,
      qty: juiceCount
    });
    openCart();
  });
}

/* --- Category Filters --- */
const filterBtns = document.querySelectorAll('.filter-btn');
const shopCardsNow = () => document.querySelectorAll('.varieties__grid .variety');

if (filterBtns.length && shopCardsNow().length) {
  shopCardsNow().forEach((card, i) => { card.style.viewTransitionName = 'shop-card-' + i; });

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('active')) return;
      const filterValue = btn.dataset.filter;

      const apply = () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        shopCardsNow().forEach(card => {
          const category = card.dataset.category;
          const show = filterValue === 'all' || category === filterValue;
          card.classList.toggle('hidden', !show);
          if (show) card.classList.add('in');
        });
      };

      /* View Transitions API — картите се пренареждат плавно */
      if (FX && document.startViewTransition) document.startViewTransition(apply);
      else apply();
    });
  });
}

/* --- Per-variety ordering (мин. 5 кг) --- */
document.querySelectorAll('.variety__order').forEach(function(block){
  var vaddBtn = block.querySelector('.vadd');
  var priceEl = block.querySelector('.vp');
  if (!vaddBtn || !priceEl) return; // Skip non-variety cards (Mix & Juice)

  var card = block.closest('.variety');
  var name = card.querySelector('h3').textContent.trim();
  var imgEl = card.querySelector('.variety__top img');
  var img = imgEl ? imgEl.getAttribute('src') : '';
  var kg = 5;
  block.querySelectorAll('.vw').forEach(function(b){
    b.addEventListener('click', function(){
      block.querySelectorAll('.vw').forEach(function(x){ x.classList.remove('active'); });
      b.classList.add('active');
      kg = +b.dataset.kg;
      priceEl.textContent = kg * APPLE_PRICE_PER_KG;
    });
  });
  vaddBtn.addEventListener('click', function(){
    addToCart({
      id: 'variety-' + name + '-' + kg,
      type: 'apples',
      name: 'Ябълки ' + name,
      meta: kg + ' кг · 2 €/кг',
      icon: '🍎',
      img: img,
      unitPrice: kg * APPLE_PRICE_PER_KG,
      qty: 1
    });
    openCart();
  });
});

/* ===================== КАТАЛОГ ОТ БАЗАТА =====================
   Продуктите, абонаментните планове и промоциите се управляват от админ панела.
   Страницата тръгва с вградените в HTML продукти; щом базата отговори, те се заменят с актуалните.
   Ако базата не отговори, остава вграденото съдържание и магазинът продължава да работи. */
const fmtNum = n => (Math.round((+n || 0) * 100) / 100).toString().replace('.', ',');
(function () {
  const D = window.UMData;
  if (!D || !D.publicSelect || D.mode === 'off') return;
  const grid = document.querySelector('.varieties__grid');
  const subGrid = document.querySelector('.sub__grid');
  if (!grid && !subGrid) return;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const today = new Date().toISOString().slice(0, 10);
  const ICONS = ['drop', 'shield', 'box', 'leaf', 'apple', 'sprout', 'clock', 'home'];
  const color = c => /^#[0-9a-f]{6}$/i.test(c || '') ? c : '#c1272d';
  const promoOf = p => (+p.promo_percent > 0 && (!p.promo_until || p.promo_until >= today)) ? +p.promo_percent : 0;
  const priceOf = p => Math.round(p.price * (100 - promoOf(p))) / 100;
  const weightsOf = p => { const w = (Array.isArray(p.weights) ? p.weights : []).map(Number).filter(x => x > 0); return w.length ? w : [1]; };
  const byId = new Map();

  function controls(p) {
    if (p.sale_type === 'kg') return `<div class="variety__weights">${weightsOf(p).map((kg, i) => `<button class="vw${i ? '' : ' active'}" data-kg="${kg}">${fmtNum(kg)} кг</button>`).join('')}</div>`;
    return `<div class="qty-select" data-qty><button data-act="dec" aria-label="По-малко">−</button><span><span class="qv">1</span> ${esc(p.unit_label || 'бр.')}</span><button data-act="inc" aria-label="Повече">+</button></div>`;
  }
  function priceHtml(p) {
    const first = p.sale_type === 'kg' ? weightsOf(p)[0] : 1, promo = promoOf(p);
    return `<span class="variety__price">${promo ? `<s class="variety__old">${fmtNum(first * p.price)} €</s>` : ''}<span class="vp">${fmtNum(first * priceOf(p))}</span> €</span>`;
  }
  const promoBadge = p => promoOf(p) ? `<span class="variety__promo">${esc(p.promo_label || '−' + fmtNum(promoOf(p)) + '%')}</span>` : '';

  function card(p) {
    if (p.featured) {
      const bullets = Array.isArray(p.bullets) ? p.bullets : [];
      return `<article class="variety variety--featured reveal" style="--c:${color(p.color)}" data-category="${esc(p.category)}" data-pid="${esc(p.id)}">
        <div class="variety__top variety__top--juice">
          <span class="juice__blob" aria-hidden="true"></span>
          <figure class="juice__photo"><img src="${esc(p.image_url || 'img/apples.jpg')}" alt="${esc(p.name)}" loading="lazy" /></figure>
          ${p.note ? `<span class="juice__note" aria-hidden="true">${esc(p.note)}</span>` : ''}
          ${promoBadge(p)}
        </div>
        <div class="variety__content">
          <div class="variety__header-group">${p.badge ? `<span class="variety__badge">${esc(p.badge)}</span>` : ''}<h3>${esc(p.name)}</h3></div>
          <p class="variety__lead">${esc(p.lead || p.description || '')}</p>
          <div class="variety__bullets">${bullets.map((b, i) => `<div class="bullet-item"><span class="bullet-icon"><svg class="ico"><use href="#i-${ICONS.includes(b.icon) ? b.icon : ICONS[i % 3]}"/></svg></span><div class="bullet-text"><strong>${esc(b.title)}</strong><p>${esc(b.text)}</p></div></div>`).join('')}</div>
          <div class="variety__footer-featured">
            ${p.tag ? `<span class="variety__tag variety__tag--green">${esc(p.tag)}</span>` : ''}
            <div class="variety__order">${controls(p)}<div class="variety__buy">${priceHtml(p)}<button class="btn btn--primary vadd">Поръчай</button></div></div>
          </div>
        </div>
      </article>`;
    }
    return `<article class="variety reveal" style="--c:${color(p.color)}" data-category="${esc(p.category)}" data-pid="${esc(p.id)}" data-tilt>
      <div class="variety__top"><img src="${esc(p.image_url || 'img/apples.jpg')}" alt="${esc(p.name)}" loading="lazy" /></div>
      ${promoBadge(p)}
      <h3>${esc(p.name)}</h3>
      <p>${esc(p.description || '')}</p>
      ${p.tag ? `<span class="variety__tag">${esc(p.tag)}</span>` : ''}
      <div class="variety__order">${controls(p)}<div class="variety__buy">${priceHtml(p)}<button class="btn btn--primary btn--sm vadd">Поръчай</button></div></div>
    </article>`;
  }
  function planCard(pl) {
    const perks = Array.isArray(pl.perks) ? pl.perks : [];
    return `<article class="sub__card${pl.hot ? ' sub__card--hot' : ''} reveal" data-spot>
      ${pl.badge ? `<div class="sub__badge">${esc(pl.badge)}</div>` : ''}
      <div class="sub__card-top"><span class="sub__tier${pl.hot ? ' sub__tier--hot' : ''}">${esc(pl.tier)}</span><div class="sub__icon"><img src="${esc(pl.image_url || 'img/apples.jpg')}" alt="" loading="lazy"></div></div>
      <h3>${esc(pl.title)}</h3>
      <p>${esc(pl.description || '')}</p>
      <ul class="sub__perks">${perks.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      <div class="sub__price"><strong>${fmtNum(pl.price)} €</strong><span>/ месец</span></div>
      ${pl.save_note ? `<p class="sub__save">${esc(pl.save_note)}</p>` : ''}
      <button class="btn sub__btn" data-plan="${esc(pl.tier + ' — ' + pl.title)}" data-price="${esc(pl.price)}" data-kg="${esc(pl.kg)}">Абонирай се <svg class="ico"><use href="#i-arrow"/></svg></button>
    </article>`;
  }
  /* структурирани данни за търсачките: продуктите с актуалните им цени от базата */
  function productSchema(products) {
    const site = 'https://umarevska-yabalka.com/';
    const abs = u => /^https?:/i.test(u || '') ? u : site + String(u || 'img/apples.jpg').replace(/^\//, '');
    const data = { '@context': 'https://schema.org', '@type': 'ItemList', name: 'Ябълки и ябълков сок от Умаревска Ябълка',
      itemListElement: products.map((p, i) => {
        const price = priceOf(p).toFixed(2);
        const offer = { '@type': 'Offer', url: site + '#shop', priceCurrency: 'EUR', price: price, availability: 'https://schema.org/InStock',
          seller: { '@id': site + '#organization' } };
        if (p.sale_type === 'kg') offer.priceSpecification = { '@type': 'UnitPriceSpecification', price: price, priceCurrency: 'EUR',
          referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'KGM' } };
        const item = { '@type': 'Product', name: p.category === 'variety' ? 'Ябълки ' + p.name : p.name, image: abs(p.image_url),
          brand: { '@type': 'Brand', name: 'Умаревска Ябълка' }, offers: offer };
        if (p.description || p.lead) item.description = p.description || p.lead;
        return { '@type': 'ListItem', position: i + 1, item: item };
      }) };
    let el = document.getElementById('ldProducts');
    if (!el) { el = document.createElement('script'); el.type = 'application/ld+json'; el.id = 'ldProducts'; document.head.appendChild(el); }
    el.textContent = JSON.stringify(data);
  }
  function refresh(scope) {
    scope.querySelectorAll('.reveal').forEach((el, i) => el.style.setProperty('--ri', i % 4));
    observeReveal(scope);
    if (window.umBindTilt) window.umBindTilt(scope);
  }

  /* --- избор на грамаж / брой и добавяне в кошницата (за продуктите от базата) --- */
  if (grid) grid.addEventListener('click', e => {
    const cardEl = e.target.closest('.variety[data-pid]');
    if (!cardEl) return;
    const p = byId.get(cardEl.dataset.pid); if (!p) return;
    const unit = priceOf(p), promo = promoOf(p);
    const setPrice = mult => {
      cardEl.querySelector('.vp').textContent = fmtNum(mult * unit);
      const old = cardEl.querySelector('.variety__old'); if (old) old.textContent = fmtNum(mult * p.price) + ' €';
    };
    const w = e.target.closest('.vw');
    if (w) {
      cardEl.querySelectorAll('.vw').forEach(b => b.classList.toggle('active', b === w));
      return setPrice(+w.dataset.kg);
    }
    const q = e.target.closest('[data-qty] button');
    if (q) {
      const qv = cardEl.querySelector('.qv');
      const n = Math.max(1, (+qv.textContent || 1) + (q.dataset.act === 'inc' ? 1 : -1));
      qv.textContent = n;
      return setPrice(n);
    }
    if (!e.target.closest('.vadd')) return;
    if (p.sale_type === 'kg') {
      const act = cardEl.querySelector('.vw.active'), kg = act ? +act.dataset.kg : weightsOf(p)[0];
      addToCart({ id: 'p-' + p.id + '-' + kg, type: 'apples', name: p.category === 'variety' ? 'Ябълки ' + p.name : p.name,
        meta: fmtNum(kg) + ' кг · ' + fmtNum(unit) + ' €/кг' + (promo ? ' (−' + fmtNum(promo) + '%)' : ''), icon: '🍎', img: p.image_url || '',
        unitPrice: Math.round(kg * unit * 100) / 100, qty: 1, kg: kg });
    } else {
      const n = Math.max(1, +cardEl.querySelector('.qv').textContent || 1);
      addToCart({ id: 'p-' + p.id, type: 'unit', name: p.name, meta: fmtNum(unit) + ' € / ' + (p.unit_label || 'бр.') + (promo ? ' (−' + fmtNum(promo) + '%)' : ''),
        icon: '🧃', img: p.image_url || '', unitPrice: unit, qty: n, kg: +p.unit_kg || 1 });
    }
    openCart();
  });

  Promise.all([
    grid ? D.publicSelect('products', { filters: [['active', 'eq', 'true']], order: 'sort.asc' }) : Promise.resolve(null),
    subGrid ? D.publicSelect('plans', { filters: [['active', 'eq', 'true']], order: 'sort.asc' }) : Promise.resolve(null),
    grid ? D.publicSelect('site_settings', { filters: [['key', 'eq', 'promo_banner']], order: 'key.asc' }).catch(() => []) : Promise.resolve([])
  ]).then(r => {
    const products = r[0], plans = r[1], banner = r[2] && r[2][0] && r[2][0].value;
    if (grid && products && products.length) {
      byId.clear(); products.forEach(p => byId.set(String(p.id), p));
      grid.innerHTML = products.map(card).join('');
      productSchema(products);
      grid.querySelectorAll('.variety').forEach((c, i) => { c.style.viewTransitionName = 'shop-card-' + i; });
      refresh(grid);
    }
    if (subGrid && plans && plans.length) { subGrid.innerHTML = plans.map(planCard).join(''); refresh(subGrid); }
    const filters = document.querySelector('.shop__filters');
    if (filters && banner && banner.active && banner.text && (!banner.until || banner.until >= today)) {
      const b = document.createElement('p');
      b.className = 'shop__promo';
      b.textContent = banner.text;
      filters.parentNode.insertBefore(b, filters);
    }
  }).catch(() => {});   /* базата не отговаря → остава вграденото съдържание */
})();

/* ===================== CART ===================== */
const CART_KEY = 'umarevska_cart';
let cart = loadCart();

const cartEl = document.getElementById('cart');
const cartBackdrop = document.getElementById('cartBackdrop');
const cartItemsEl = document.getElementById('cartItems');
const cartEmptyEl = document.getElementById('cartEmpty');
const cartTotalEl = document.getElementById('cartTotal');
const cartCountEl = document.getElementById('cartCount');
const checkoutBtn = document.getElementById('checkout');

function loadCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}
function saveCart() { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }

function cartSnapshot() {
  return {
    cart: cart.map(i => ({ n: i.name + (i.meta ? ' · ' + i.meta.split(' · ')[0] : ''), q: i.qty, p: i.unitPrice })),
    total: Math.round(cart.reduce((s, i) => s + i.qty * i.unitPrice, 0) * 100) / 100
  };
}
function trackCart(action, item) {
  if (!window.UMTrack) return;
  const s = cartSnapshot();
  if (item) { s.item = item.name; s.qty = item.qty; }
  UMTrack.event('cart', action, s);
}

function addToCart(item) {
  const existing = cart.find(i => i.id === item.id);
  if (existing) existing.qty += item.qty;
  else cart.push(item);
  saveCart(); renderCart();
  trackCart('add', item);
}
function removeFromCart(id) {
  const gone = cart.find(i => i.id === id);
  cart = cart.filter(i => i.id !== id);
  saveCart(); renderCart();
  if (gone) trackCart('remove', gone);
}
function changeQty(id, delta) {
  const it = cart.find(i => i.id === id);
  if (!it) return;
  it.qty += delta;
  if (it.qty <= 0) removeFromCart(id);
  else { saveCart(); renderCart(); trackCart('qty', it); }
}

function renderCart() {
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const total = cart.reduce((s, i) => s + i.qty * i.unitPrice, 0);

  cartCountEl.textContent = count;
  cartCountEl.classList.toggle('show', count > 0);
  cartTotalEl.textContent = fmtNum(total);
  checkoutBtn.disabled = cart.length === 0;

  cartEmptyEl.style.display = cart.length ? 'none' : 'flex';
  cartItemsEl.style.display = cart.length ? 'flex' : 'none';

  cartItemsEl.innerHTML = cart.map(i => `
    <div class="cart-item">
      <div class="cart-item__ico">${i.img ? `<img src="${i.img}" alt="">` : i.icon}</div>
      <div class="cart-item__main">
        <div class="cart-item__name">${i.name}</div>
        <div class="cart-item__meta">${i.meta}</div>
        <div class="cart-item__row">
          <div class="qty">
            <button onclick="changeQty('${i.id}',-1)" aria-label="По-малко">−</button>
            <span>${i.qty}</span>
            <button onclick="changeQty('${i.id}',1)" aria-label="Повече">+</button>
          </div>
          <span class="cart-item__price">${fmtNum(i.qty * i.unitPrice)} €</span>
        </div>
        <button class="cart-item__del" onclick="removeFromCart('${i.id}')">Премахни</button>
      </div>
    </div>
  `).join('');
}

function openCart() {
  cartEl.classList.add('open');
  cartBackdrop.classList.add('open');
  cartEl.setAttribute('aria-hidden', 'false');
}
function closeCart() {
  cartEl.classList.remove('open');
  cartBackdrop.classList.remove('open');
  cartEl.setAttribute('aria-hidden', 'true');
}

document.getElementById('cartToggle').addEventListener('click', openCart);
document.getElementById('cartClose').addEventListener('click', closeCart);
cartBackdrop.addEventListener('click', closeCart);
document.getElementById('cartShopLink').addEventListener('click', closeCart);

/* checkout — истинска поръчка: данни за връзка + запис в базата */
const orderModal = document.getElementById('orderModal');
const orderPanel = orderModal.querySelector('.modal__panel');
const UM_DATA = window.UMData || { mode: 'off', insert: () => Promise.resolve({ ok: false }) };
const UM_PHONE = '089 679 9117';
const PICKUPS = ['с. Умаревци (обект 1)', 'с. Брестовец, Плевен (обект 2)', 'с. Калейца, на пътя за Троян (обект 3)'];
const escHtml = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const orderCode = () => 'UY-' + Math.random().toString(36).slice(2, 7).toUpperCase();

/* --- куриери ---
   Еконт: офисите, населените места и цената идват на живо от официалния им публичен интерфейс (без ключ).
   Спиди и Pigeon Express: офисите и автоматите се четат от таблица courier_offices, която всеки ден се
   обновява от публичните им страници с офиси. Цена на живо двата куриера дават само с договор — уточнява се. */
const COURIERS = { econt: 'Еконт', speedy: 'Спиди', pigeon: 'Pigeon Express' };
const COURIER_LOGOS = { econt: ['img/couriers/econt.svg', 86, 18], speedy: ['img/couriers/speedy.png', 72, 32], pigeon: ['img/couriers/pigeon.svg', 85, 29] };
const ECONT = { base: 'https://ee.econt.com/services/', sender: (window.UM_CONFIG && UM_CONFIG.econtSenderOffice) || '5506', officesP: null, citiesP: null };
function econtCall(path, body) {
  return fetch(ECONT.base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then(r => { if (!r.ok) throw new Error('econt ' + r.status); return r.json(); });
}
function econtOffices() {
  if (!ECONT.officesP) ECONT.officesP = econtCall('Nomenclatures/NomenclaturesService.getOffices.json', { countryCode: 'BGR' })
    .then(d => (d.offices || []).filter(o => !o.isMPS && o.address && o.address.city && o.address.city.name)
      .map(o => ({ code: String(o.code), name: o.name, aps: !!o.isAPS, city: o.address.city.name, addr: String(o.address.fullAddress || '').trim() })))
    .catch(e => { ECONT.officesP = null; throw e; });
  return ECONT.officesP;
}
function econtCities() {
  if (!ECONT.citiesP) ECONT.citiesP = econtCall('Nomenclatures/NomenclaturesService.getCities.json', { countryCode: 'BGR' })
    .then(d => (d.cities || []).filter(c => c.name && c.postCode).map(c => ({ name: c.name, post: String(c.postCode), region: c.regionName || '' })))
    .catch(e => { ECONT.citiesP = null; throw e; });
  return ECONT.citiesP;
}
/* офиси и автомати на куриер като { code, name, aps, city, addr } */
const COURIER_OFFICES = {};
function courierOffices(courier) {
  if (courier === 'econt') return econtOffices();
  if (!COURIER_OFFICES[courier]) COURIER_OFFICES[courier] = (UM_DATA.publicSelect
      ? UM_DATA.publicSelect('courier_offices', { columns: 'code,name,city,address,kind', filters: [['courier', 'eq', courier]], order: 'code.asc', all: true })
      : Promise.reject(new Error('no data layer')))
    .then(rows => {
      if (!rows || !rows.length) throw new Error('no offices');
      return rows.map(r => ({ code: String(r.code), name: r.name, aps: r.kind === 'automat', city: r.city,
        addr: String(r.address || '').replace(/^обл\.[^,]*,[^,]*,\s*/i, '') }));       /* без „обл. …, гр. …,“ — градът вече е избран */
    })
    .catch(e => { COURIER_OFFICES[courier] = null; throw e; });
  return COURIER_OFFICES[courier];
}
function officeLabel(courier, o) {
  return (o.aps ? (courier === 'econt' ? 'Еконтомат: ' : 'Автомат: ') : '') + o.name + (o.addr ? ' — ' + o.addr : '') + (courier === 'econt' ? '' : ' (№ ' + o.code + ')');
}
function econtQuote(weight, receiver) {
  return econtCall('Shipments/LabelService.createLabel.json', { mode: 'calculate',
    label: Object.assign({ senderOfficeCode: ECONT.sender, packCount: 1, shipmentType: 'PACK', weight: weight, shipmentDescription: 'Ябълки' }, receiver) })
    .then(d => (d.label && typeof d.label.totalPrice === 'number' && d.label.currency === 'EUR') ? d.label.totalPrice : null);
}
/* тегло на пратката: килограмите ябълки + ~3,3 кг за всяка кутия сок */
function cartWeight() {
  const kg = cart.reduce((s, i) => {
    if (typeof i.kg === 'number' && i.kg > 0) return s + i.kg * i.qty;
    if (i.type === 'juice') return s + 3.3 * i.qty;
    const m = /(\d+(?:[.,]\d+)?)\s*кг/.exec(i.meta || '');
    return s + (m ? parseFloat(m[1].replace(',', '.')) : 1) * i.qty;
  }, 0);
  return Math.max(1, Math.round(kg * 10) / 10);
}
const normCity = s => String(s || '').trim().toLowerCase().replace(/^(гр\.|с\.|град|село)\s*/, '');
const fmtEur = n => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',').replace(/,00$/, '') + ' €';

/* Падащо меню под текстово поле: пишеш → излизат съвпадения → избираш (мишка, пръст или стрелки + Enter).
   items() връща [{ key, name, sub }], popular() — какво да се покаже, преди да е написано нещо. */
function bindCombo(input, list, items, popular, onPick) {
  let shown = [], active = -1;
  const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); active = -1; };
  const mark = () => Array.from(list.children).forEach((li, n) => {
    li.classList.toggle('is-active', n === active);
    li.setAttribute('aria-selected', n === active ? 'true' : 'false');
    if (n === active) li.scrollIntoView({ block: 'nearest' });
  });
  function open() {
    const q = normCity(input.value), all = items();
    if (!all.length) return close();
    if (!q) shown = popular();
    else {
      const starts = [], has = [];
      for (const it of all) {
        if (it.key.startsWith(q)) starts.push(it);
        else if (has.length < 30 && it.key.includes(q)) has.push(it);
      }
      starts.sort((a, b) => (b.w || 0) - (a.w || 0));          /* при офисите: по-големите населени места първи */
      shown = starts.concat(has).slice(0, 50);
    }
    if (!q && !shown.length) return close();
    active = q && shown.length ? 0 : -1;
    list.innerHTML = shown.length
      ? shown.map((it, n) => `<li role="option" data-n="${n}"><span>${escHtml(it.name)}</span>${it.sub ? `<small>${escHtml(it.sub)}</small>` : ''}</li>`).join('')
      : '<li class="combo__empty">Няма такова населено място в списъка</li>';
    list.hidden = false;
    list.scrollTop = 0;
    input.setAttribute('aria-expanded', 'true');
    mark();
    list.scrollIntoView({ block: 'nearest' });              /* менюто да се вижда цялото в прозореца на поръчката */
  }
  function pick(n) {
    const it = shown[n];
    if (!it) return;
    input.value = it.name;
    close();
    onPick(it);
  }
  input.addEventListener('input', open);
  input.addEventListener('focus', open);
  input.addEventListener('click', () => { if (list.hidden) open(); });
  input.addEventListener('blur', () => setTimeout(close, 160));
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (list.hidden) return open();
      e.preventDefault();
      if (!shown.length) return;
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + shown.length) % shown.length;
      mark();
    } else if (e.key === 'Enter' && !list.hidden) {
      e.preventDefault();                                   /* Enter избира от менюто, не изпраща формата */
      if (active >= 0) pick(active); else close();
    } else if (e.key === 'Escape' && !list.hidden) {
      e.stopPropagation();
      close();
    }
  });
  list.addEventListener('mousedown', e => e.preventDefault());   /* полето да не губи фокуса при избор */
  list.addEventListener('click', e => { const li = e.target.closest('li[data-n]'); if (li) pick(+li.dataset.n); });
  return { open, close };
}

function renderOrderForm() {
  const snap = cartSnapshot();
  const weight = cartWeight();
  orderPanel.classList.add('modal__panel--form');
  orderPanel.innerHTML = `
    <button class="modal__close" type="button" data-order-close aria-label="Затвори">✕</button>
    <form class="sub-modal__form order-form" id="orderForm">
      <h3>Завършване на поръчката</h3>
      <p>Оставете данни за връзка — ще ви се обадим за потвърждение.</p>
      <ul class="order-form__items">
        ${cart.map(i => `<li><span>${escHtml(i.name)} <small>${escHtml(i.meta.split(' · ')[0])} × ${i.qty}</small></span><b>${fmtNum(i.qty * i.unitPrice)} €</b></li>`).join('')}
        <li class="order-form__sum"><span>Стоки</span><b>${fmtNum(snap.total)} €</b></li>
      </ul>
      <div class="sub-modal__row">
        <input type="text" name="name" placeholder="Име и фамилия" aria-label="Име и фамилия" autocomplete="name" minlength="2" maxlength="120" required />
        <input type="tel" name="phone" placeholder="Телефон" aria-label="Телефон" autocomplete="tel" minlength="5" maxlength="40" required />
      </div>
      <input type="email" name="email" placeholder="Имейл (по желание)" aria-label="Имейл" autocomplete="email" maxlength="160" />

      <span class="order-form__label">Как да получите поръчката</span>
      <div class="order-form__switch order-form__switch--3" role="radiogroup" aria-label="Начин на получаване">
        <label><input type="radio" name="delivery" value="office" checked /><span>До офис на куриер</span></label>
        <label><input type="radio" name="delivery" value="address" /><span>До адрес</span></label>
        <label><input type="radio" name="delivery" value="pickup" /><span>От наш обект</span></label>
      </div>

      <div data-block="couriers">
        <span class="order-form__label">Куриер</span>
        <div class="order-form__switch order-form__switch--3 order-form__switch--logos" role="radiogroup" aria-label="Куриер">
          ${Object.keys(COURIERS).map((k, n) => `<label><input type="radio" name="courier" value="${k}"${n ? '' : ' checked'} aria-label="${escHtml(COURIERS[k])}" /><span><img src="${COURIER_LOGOS[k][0]}" alt="${escHtml(COURIERS[k])}" width="${COURIER_LOGOS[k][1]}" height="${COURIER_LOGOS[k][2]}" decoding="async" /></span></label>`).join('')}
        </div>
      </div>

      <div data-block="office" class="order-form__group">
        <div class="combo">
          <input type="text" name="ocity" placeholder="Населено място — започнете да пишете" aria-label="Населено място" autocomplete="off" autocapitalize="words" spellcheck="false" maxlength="120" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="orderCityList" />
          <ul class="combo__list" id="orderCityList" role="listbox" aria-label="Населени места" hidden></ul>
        </div>
        <select name="ooffice" aria-label="Офис или автомат"><option value="">Първо изберете населено място</option></select>
      </div>
      <div data-block="free-office" class="order-form__group">
        <input type="text" name="fcity" placeholder="Населено място" aria-label="Населено място" autocomplete="address-level2" maxlength="120" />
        <input type="text" name="foffice" placeholder="Офис — име или адрес на офиса" aria-label="Офис" maxlength="280" />
      </div>
      <div data-block="address" class="order-form__group">
        <div class="combo">
          <input type="text" name="acity" placeholder="Населено място — започнете да пишете" aria-label="Населено място" autocomplete="off" autocapitalize="words" spellcheck="false" maxlength="120" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="orderAddrList" />
          <ul class="combo__list" id="orderAddrList" role="listbox" aria-label="Населени места" hidden></ul>
        </div>
        <textarea name="address" rows="2" placeholder="Улица, №, блок, вход, етаж, апартамент" aria-label="Адрес за доставка" autocomplete="street-address" maxlength="380"></textarea>
      </div>
      <select name="pickup" data-block="pickup" aria-label="Обект за вземане">
        ${PICKUPS.map(p => `<option>${escHtml(p)}</option>`).join('')}
      </select>

      <p class="order-form__ship" role="status" aria-live="polite"></p>
      <textarea name="note" rows="2" placeholder="Бележка към поръчката (по желание)" aria-label="Бележка" maxlength="1000"></textarea>
      <input type="text" name="website" class="order-form__hp" tabindex="-1" autocomplete="off" aria-hidden="true" />
      <p class="order-form__error" role="alert" hidden></p>
      <div class="sub-modal__pay-row">
        <div class="sub-modal__total"><span data-total-label>Общо</span>: <strong data-total>${fmtNum(snap.total)} €</strong></div>
        <button type="submit" class="btn btn--primary sub-modal__pay-btn">Изпрати поръчката <svg class="ico"><use href="#i-arrow"/></svg></button>
      </div>
    </form>`;
  const form = orderPanel.querySelector('#orderForm');
  const err = form.querySelector('.order-form__error');
  const shipEl = form.querySelector('.order-form__ship');
  const totalEl = form.querySelector('[data-total]'), totalLabel = form.querySelector('[data-total-label]');
  const submitBtn = form.querySelector('button[type="submit"]');
  const block = n => form.querySelector('[data-block="' + n + '"]');
  const st = { price: null, token: 0, data: {}, cityMap: new Map(), addrCities: [], addrPick: null, addrAsked: false };
  const later = c => 'Цената на доставката ' + (c === 'speedy' ? 'със ' : 'с ') + COURIERS[c] + ' ще уточним при потвърждението.';

  function paint(text, price) {
    st.price = typeof price === 'number' ? price : null;
    shipEl.textContent = text;
    shipEl.classList.toggle('is-price', st.price != null);
    totalLabel.textContent = st.price != null ? 'Общо с доставката' : 'Общо';
    totalEl.textContent = fmtEur(snap.total + (st.price || 0));
  }
  /* населеното място за доставка до адрес: избраното от менюто, иначе първото със същото име */
  function addrCity() {
    const k = normCity(form.acity.value);
    return (st.addrPick && st.addrPick.key === k) ? st.addrPick : (st.cityMap.get(k) || null);
  }
  function quote() {
    const my = ++st.token, delivery = form.delivery.value, courier = form.courier.value;
    if (delivery === 'pickup') return paint('Вземате поръчката от наш обект — без разходи за доставка.');
    let receiver;
    if (delivery === 'office') {
      const d = st.data[courier];
      if (!d || d.down) return paint(later(courier));
      if (!form.ooffice.value) return paint(courier === 'econt' ? 'Изберете населено място и офис, за да видите цената на доставката.' : 'Изберете населено място и офис. ' + later(courier));
      if (courier !== 'econt') return paint(later(courier));
      receiver = { receiverOfficeCode: form.ooffice.value };
    } else {
      if (courier !== 'econt') return paint(later(courier));
      const c = addrCity();
      if (!c) return paint(form.acity.value.trim() ? 'За това населено място цената на доставката ще уточним при потвърждението.' : 'Въведете населено място, за да видите цената на доставката.');
      receiver = { receiverAddress: { city: { country: { code3: 'BGR' }, name: c.name, postCode: c.post } } };
    }
    paint('Изчисляваме доставката…');
    econtQuote(weight, receiver).then(p => {
      if (my !== st.token) return;
      if (p == null) throw new Error('no price');
      paint('Доставка с Еконт ' + (delivery === 'office' ? 'до офис' : 'до адрес') + ' за ' + String(weight).replace('.', ',') + ' кг: ' + fmtEur(p) + ' (по тарифата на Еконт)', p);
    }).catch(() => { if (my === st.token) paint('Цената на доставката ще уточним при потвърждението.'); });
  }
  /* офисите на куриера се зареждат при първо избиране; ако не дойдат — офисът се описва с думи */
  function loadOffices(courier) {
    if (st.data[courier]) return;
    const d = st.data[courier] = { list: [], cities: [], popular: [], ready: false, down: false };
    courierOffices(courier).then(list => {
      const m = new Map();
      list.forEach(o => {
        const k = normCity(o.city);
        const c = m.get(k) || { key: k, name: o.city, offices: 0, automats: 0 };
        if (o.aps) c.automats++; else c.offices++;
        m.set(k, c);
      });
      d.cities = Array.from(m.values()).sort((a, b) => a.name.localeCompare(b.name, 'bg'));
      d.cities.forEach(c => {
        c.sub = [c.offices ? c.offices + (c.offices === 1 ? ' офис' : ' офиса') : '', c.automats ? c.automats + (c.automats === 1 ? ' автомат' : ' автомата') : ''].filter(Boolean).join(' · ');
      });
      d.cities.forEach(c => { c.w = c.offices + c.automats; });
      d.popular = d.cities.slice().sort((a, b) => b.w - a.w).slice(0, 8);
      d.list = list;
      d.ready = true;
    }).catch(() => { d.down = true; }).then(() => { if (form.isConnected && form.courier.value === courier) sync(); });
  }
  function fillOffices() {
    const courier = form.courier.value, d = st.data[courier], key = normCity(form.ocity.value);
    const list = d && d.ready && key ? d.list.filter(o => normCity(o.city) === key).sort((a, b) => (a.aps - b.aps) || a.name.localeCompare(b.name, 'bg')) : [];
    form.ooffice.innerHTML = list.length
      ? '<option value="">Изберете ' + (courier === 'econt' ? 'офис или еконтомат' : 'офис или автомат') + ' (' + list.length + ')</option>'
        + list.map(o => `<option value="${escHtml(o.code)}">${escHtml(officeLabel(courier, o))}</option>`).join('')
      : '<option value="">' + (!d || !d.ready ? 'Зареждаме офисите…' : key ? 'Няма офис на ' + COURIERS[courier] + ' в това населено място' : 'Първо изберете населено място') + '</option>';
    if (list.length === 1) form.ooffice.value = list[0].code;
  }
  function sync() {
    const delivery = form.delivery.value, courier = form.courier.value, ship = delivery !== 'pickup';
    const toOffice = ship && delivery === 'office';
    if (toOffice) loadOffices(courier);
    const d = st.data[courier];
    const pick = toOffice && !(d && d.down);      /* меню с град и офис */
    const free = toOffice && !pick;                /* списъкът с офиси не е достъпен */
    const addr = delivery === 'address';
    block('couriers').hidden = !ship;
    block('office').hidden = !pick;
    block('free-office').hidden = !free;
    block('address').hidden = !addr;
    block('pickup').hidden = ship;
    form.ocity.required = form.ooffice.required = pick;
    form.fcity.required = form.foffice.required = free;
    form.acity.required = form.address.required = addr;
    if (pick) {
      form.ocity.placeholder = d && d.ready ? 'Населено място — започнете да пишете' : 'Зареждаме офисите на ' + COURIERS[courier] + '…';
      fillOffices();
    }
    if (free && !form.fcity.value) form.fcity.value = form.ocity.value;
    if (addr && !st.addrAsked) {                    /* предложения за населено място (номенклатурата на Еконт) */
      st.addrAsked = true;
      econtCities().then(list => {
        st.addrCities = list.map(c => ({ key: normCity(c.name), name: c.name, post: c.post, sub: (c.region ? 'обл. ' + c.region + ' · ' : '') + 'п.к. ' + c.post }))
          .sort((a, b) => a.name.localeCompare(b.name, 'bg'));
        st.addrCities.forEach(c => { if (!st.cityMap.has(c.key)) st.cityMap.set(c.key, c); });
        if (form.isConnected) quote();
      }).catch(() => { st.addrAsked = false; });
    }
    quote();
  }
  form.querySelectorAll('input[name="delivery"],input[name="courier"]').forEach(r => r.addEventListener('change', sync));
  bindCombo(form.ocity, form.querySelector('#orderCityList'),
    () => { const d = st.data[form.courier.value]; return d && d.ready ? d.cities : []; },
    () => { const d = st.data[form.courier.value]; return d && d.ready ? d.popular : []; },
    () => { fillOffices(); quote(); form.ooffice.focus(); });
  form.ocity.addEventListener('input', () => { fillOffices(); quote(); });
  form.ooffice.addEventListener('change', quote);
  let cityT;
  bindCombo(form.acity, form.querySelector('#orderAddrList'), () => st.addrCities, () => [],
    it => { st.addrPick = it; clearTimeout(cityT); quote(); form.address.focus(); });
  form.acity.addEventListener('input', () => { st.addrPick = null; clearTimeout(cityT); cityT = setTimeout(quote, 350); });
  orderPanel.querySelector('[data-order-close]').addEventListener('click', () => closeModal(orderModal));
  sync();

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (form.website.value) { renderOrderDone(''); return; }      /* капан за ботове */
    const delivery = form.delivery.value, courier = delivery === 'pickup' ? null : form.courier.value;
    const picked = delivery === 'office' && !block('office').hidden;      /* офисът е избран от меню */
    const office = picked && st.data[courier] ? st.data[courier].list.find(o => o.code === form.ooffice.value) : null;
    const code = orderCode();
    const row = {
      code: code,
      customer_name: form.elements.name.value.trim(),
      phone: form.phone.value.trim(),
      email: form.email.value.trim() || null,
      delivery: delivery,
      courier: courier,
      city: delivery === 'pickup' ? null : (picked ? (office ? office.city : form.ocity.value.trim()) : delivery === 'office' ? form.fcity.value.trim() : form.acity.value.trim()) || null,
      office_code: office ? office.code : null,
      office_name: delivery !== 'office' ? null : office ? officeLabel(courier, office).slice(0, 290) : form.foffice.value.trim().slice(0, 290),
      address: delivery === 'address' ? form.address.value.trim() : null,
      pickup_place: delivery === 'pickup' ? form.pickup.value : null,
      delivery_price: delivery === 'pickup' ? 0 : st.price,
      weight_kg: weight,
      note: form.note.value.trim() || null,
      items: cart.map(i => ({ id: i.id, name: i.name, meta: i.meta, qty: i.qty, price: i.unitPrice })),
      total: snap.total,
      session_id: window.UMTrack && UMTrack.sid || null
    };
    err.hidden = true;
    submitBtn.disabled = true;
    const label = submitBtn.innerHTML;
    submitBtn.textContent = 'Изпращане…';
    UM_DATA.insert('orders', row).then(res => {
      if (!res.ok) {
        submitBtn.disabled = false; submitBtn.innerHTML = label;
        err.textContent = 'Не успяхме да изпратим поръчката. Опитайте отново или се обадете на ' + UM_PHONE + '.';
        err.hidden = false;
        return;
      }
      if (window.UMTrack) UMTrack.event('order', code, { total: row.total, items: row.items.length, delivery: row.delivery, courier: row.courier, ship: row.delivery_price });
      cart = []; saveCart(); renderCart();
      renderOrderDone(code);
    });
  });
}
function renderOrderDone(code) {
  orderPanel.classList.remove('modal__panel--form');
  orderPanel.innerHTML = `
    <div class="order-done">
      <span class="order-done__check">✓</span>
      <h3>Благодарим за поръчката!</h3>
      <p>Получихме вашата заявка. Ще се свържем с вас за потвърждение и доставка.</p>
      ${code ? `<p class="order-done__code">Номер на поръчката: <strong>${escHtml(code)}</strong></p>` : ''}
      <button class="btn btn--primary" id="orderOk">Продължи</button>
    </div>`;
  orderPanel.querySelector('#orderOk').addEventListener('click', () => closeModal(orderModal));
}
checkoutBtn.addEventListener('click', () => {
  if (!cart.length) return;
  closeCart();
  renderOrderForm();
  openModal(orderModal);
  if (window.UMTrack) UMTrack.event('checkout_open', null, cartSnapshot());
});
document.getElementById('orderBackdrop').addEventListener('click', () => closeModal(orderModal));

/* ===================== BLOG ===================== */
const articles = window.ARTICLES || [];

const blogGrid = document.getElementById('blogGrid');
if (blogGrid) {
  blogGrid.innerHTML = articles.map((a, i) => `
    <a class="post reveal" href="${a.slug ? 'blog-' + a.slug + '.html' : 'article.html?id=' + i}">
      <div class="post__cover"><img src="${a.img}" alt="${a.title}" width="${(a.imgSize || [1200, 800])[0]}" height="${(a.imgSize || [1200, 800])[1]}" loading="lazy" decoding="async" onerror="this.parentNode.style.background='${a.bg}';this.parentNode.style.display='grid';this.parentNode.style.placeItems='center';this.parentNode.style.fontSize='3.4rem';this.outerHTML='${a.icon}'"></div>
      <div class="post__body">
        <span class="post__cat">${a.cat}</span>
        <h3 class="post__title">${a.title}</h3>
        <p class="post__excerpt">${a.excerpt}</p>
        <span class="post__more">Прочети <svg class="ico"><use href="#i-arrow"/></svg></span>
      </div>
    </a>
  `).join('');
  observeReveal(blogGrid);
}

/* ===== ВИДЕО В „МЕДИИ“ — YouTube се зарежда чак при клик (по-лека страница) ===== */
document.querySelectorAll('[data-yt]').forEach(frame => {
  const link = frame.querySelector('.mvideo__play');
  if (!link) return;
  link.addEventListener('click', e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return; /* нов таб → отваря YouTube */
    e.preventDefault();
    const f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + frame.dataset.yt + '?autoplay=1&rel=0&start=' + (parseInt(frame.dataset.start, 10) || 0);
    f.title = link.getAttribute('aria-label') || 'Видео';
    f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    f.allowFullscreen = true;
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.replaceChildren(f);
  });
});

/* ---------- MODAL HELPERS ---------- */
function openModal(m) { m.classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeModal(m) { m.classList.remove('open'); document.body.style.overflow = ''; }

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeCart();
    if (orderModal.classList.contains('open')) closeModal(orderModal);
  }
});

/* ---------- CONTACT — запитването се записва в базата ---------- */
function umFakeSubmit(e) {
  e.preventDefault();
  var f = e.target;
  var status = f.querySelector('.contact__form-status');
  if (!status) { status = document.createElement('p'); status.className = 'contact__form-status'; status.setAttribute('role', 'status'); f.appendChild(status); }
  var name = (f.querySelector('input[type="text"]') || {}).value || '';
  var phone = (f.querySelector('input[type="tel"]') || {}).value || '';
  var email = (f.querySelector('input[type="email"]') || {}).value || '';
  var message = (f.querySelector('textarea') || {}).value || '';
  if (!phone.trim() && !email.trim()) { status.textContent = 'Оставете телефон или имейл, за да ви върнем отговор.'; return false; }
  var btn = f.querySelector('button[type="submit"]');
  if (btn) btn.disabled = true;
  status.textContent = 'Изпращане…';
  UM_DATA.insert('messages', {
    customer_name: name.trim().slice(0, 120), phone: phone.trim().slice(0, 40) || null, email: email.trim().slice(0, 160) || null,
    message: message.trim().slice(0, 3000), session_id: window.UMTrack && UMTrack.sid || null
  }).then(function (res) {
    if (btn) btn.disabled = false;
    if (res.ok) { f.reset(); status.textContent = 'Благодарим! Получихме съобщението и ще се свържем с вас.'; if (window.UMTrack) UMTrack.event('contact_msg'); }
    else status.textContent = 'Не успяхме да изпратим съобщението. Обадете се на ' + UM_PHONE + '.';
  });
  return false;
}

/* expose for inline handlers */
window.changeQty = changeQty;
window.removeFromCart = removeFromCart;
window.umFakeSubmit = umFakeSubmit;

/* init */
renderCart();

/* ---------- COUNTER ANIMATION ---------- */
(function(){
  var statsEl = document.querySelector('.story__stats');
  if (!statsEl) return;
  var done = false;
  new IntersectionObserver(function(entries){
    if (!entries[0].isIntersecting || done) return;
    done = true;
    statsEl.querySelectorAll('strong:not([data-static])').forEach(function(el){
      var parts = el.textContent.trim().match(/^(\D*)(\d+)(.*)$/); /* „~20“, „110+“, „5“ */
      if (!parts) return;
      var prefix = parts[1], num = parseInt(parts[2], 10), suffix = parts[3];
      if (!num) return;
      var t0 = null, dur = 1400;
      (function tick(ts){
        if (!t0) t0 = ts;
        var p = Math.min((ts - t0) / dur, 1);
        var e = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + Math.round(e * num) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      })(performance.now());
    });
  }, {threshold: 0.6}).observe(statsEl);
})();

/* ---------- SUBSCRIBE MODAL ---------- */
(function(){
  var modal = document.getElementById('subModal');
  if (!modal) return;
  var backdrop = document.getElementById('subModalBackdrop');
  var closeBtn = document.getElementById('subModalClose');
  var form = document.getElementById('subForm');
  var success = document.getElementById('subSuccess');
  var planName = document.getElementById('subModalPlanName');
  var planPrice = document.getElementById('subModalPrice');
  var planTotal = document.getElementById('subModalTotalPrice');
  var planInput = document.getElementById('subPlanInput');
  var successOk = document.getElementById('subSuccessOk');

  var current = { plan: '', price: 0, kg: null };
  function openModal(plan, price, kg) {
    current = { plan: plan, price: parseFloat(price) || 0, kg: parseFloat(kg) || null };
    if (window.UMTrack) UMTrack.event('sub_open', plan, { price: current.price });
    if (planName) planName.textContent = plan;
    if (planPrice) planPrice.textContent = price;
    if (planTotal) planTotal.textContent = price;
    if (planInput) planInput.value = plan;
    form.style.display = '';
    success.style.display = 'none';
    form.reset();
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  document.addEventListener('click', function(e) {
    var btn = e.target.closest ? e.target.closest('.sub__btn') : null;
    if (btn) openModal(btn.dataset.plan, btn.dataset.price, btn.dataset.kg);
  });

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (backdrop) backdrop.addEventListener('click', closeModal);
  if (successOk) successOk.addEventListener('click', closeModal);
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });

  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      var fd = new FormData(form);
      var err = form.querySelector('.order-form__error');
      if (!err) { err = document.createElement('p'); err.className = 'order-form__error'; err.setAttribute('role', 'alert'); form.insertBefore(err, form.querySelector('.sub-modal__pay-row')); }
      err.hidden = true;
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      UM_DATA.insert('subscriptions', {
        plan: current.plan, price: current.price, kg: current.kg,
        customer_name: String(fd.get('name') || '').trim(), phone: String(fd.get('phone') || '').trim(),
        email: String(fd.get('email') || '').trim() || null, address: String(fd.get('address') || '').trim() || null,
        start_pref: String(fd.get('start') || '') || null, session_id: window.UMTrack && UMTrack.sid || null
      }).then(function (res) {
        btn.disabled = false;
        if (!res.ok) {
          err.textContent = 'Не успяхме да запишем заявката. Опитайте отново или се обадете на ' + UM_PHONE + '.';
          err.hidden = false;
          return;
        }
        if (window.UMTrack) UMTrack.event('sub_order', current.plan, { price: current.price });
        form.style.display = 'none';
        success.style.display = 'flex';
      });
    });
  }
})();

/* ===================== GALLERY ===================== */
(function(){
  const grid = document.getElementById('galGrid');
  if (!grid) return;
  const items = Array.from(grid.querySelectorAll('.gal__item'));
  const tabs = document.getElementById('galTabs');
  const more = document.getElementById('galMore');
  let filter = 'all', expanded = false;
  const visibleSet = () => items.filter(el => filter === 'all' || el.dataset.cat === filter);

  /* --- табове --- */
  function apply(next){
    filter = next;
    grid.classList.toggle('is-collapsed', filter === 'all' && !expanded);
    let k = 0;
    items.forEach(el => {
      const show = filter === 'all' || el.dataset.cat === filter;
      el.classList.toggle('hidden', !show);
      if (show) { el.style.setProperty('--ri', k++ % 4); el.classList.remove('in'); }
    });
    void grid.offsetWidth; /* рестартира входната анимация на показаните плочки */
    items.forEach(el => { if (!el.classList.contains('hidden')) el.classList.add('in'); });
  }
  if (tabs) tabs.addEventListener('click', e => {
    const btn = e.target.closest('.gal__tab');
    if (!btn || btn.classList.contains('active')) return;
    tabs.querySelectorAll('.gal__tab').forEach(b => {
      b.classList.toggle('active', b === btn);
      b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
    });
    apply(btn.dataset.gal);
  });
  if (more) more.addEventListener('click', () => {
    expanded = true;
    grid.classList.remove('is-collapsed');
    items.forEach(el => el.classList.add('in'));
  });

  /* --- преглед на цял екран --- */
  const lb = document.createElement('div');
  lb.className = 'lightbox';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', 'Галерия');
  lb.innerHTML =
    '<div class="lightbox__backdrop"></div>' +
    '<figure class="lightbox__fig"><img class="lightbox__img" alt="" />' +
    '<figcaption class="lightbox__bar"><span class="lightbox__count"></span><span class="lightbox__cap"></span></figcaption></figure>' +
    '<button class="lightbox__btn lightbox__btn--close" aria-label="Затвори"><svg class="ico"><use href="#i-x"/></svg></button>' +
    '<button class="lightbox__btn lightbox__btn--prev" aria-label="Предишна снимка"><svg class="ico"><use href="#i-chev-l"/></svg></button>' +
    '<button class="lightbox__btn lightbox__btn--next" aria-label="Следваща снимка"><svg class="ico"><use href="#i-chev-r"/></svg></button>';
  document.body.appendChild(lb);
  const lbImg = lb.querySelector('.lightbox__img');
  const lbCap = lb.querySelector('.lightbox__cap');
  const lbCount = lb.querySelector('.lightbox__count');
  const closeBtn = lb.querySelector('.lightbox__btn--close');
  let list = [], idx = 0, token = 0, opener = null;

  function show(i){
    idx = (i + list.length) % list.length;
    const el = list[idx], thumb = el.querySelector('img'), my = ++token;
    lbImg.style.setProperty('--ar', (el.dataset.w / el.dataset.h).toFixed(4));
    lbImg.src = thumb.currentSrc || thumb.src;   /* миниатюрата веднага, голямата — щом се зареди */
    lbImg.alt = thumb.alt;
    lbCap.textContent = thumb.alt;
    lbCount.textContent = (idx + 1) + ' / ' + list.length;
    const full = new Image();
    full.onload = () => { if (my === token) lbImg.src = full.src; };
    full.src = el.href;
  }
  function open(el){
    list = visibleSet();
    opener = el;
    const thumb = el.querySelector('img');
    const reveal = () => {
      thumb.style.viewTransitionName = '';
      show(list.indexOf(el));
      lb.classList.add('open');
      root.classList.add('lb-open');
    };
    if (FX && document.startViewTransition) {
      /* снимката „израства“ от плочката до цял екран */
      thumb.style.viewTransitionName = 'gal-photo';
      lbImg.style.viewTransitionName = '';
      const vt = document.startViewTransition(() => { reveal(); lbImg.style.viewTransitionName = 'gal-photo'; });
      vt.finished.finally(() => { lbImg.style.viewTransitionName = ''; });
    } else reveal();
    closeBtn.focus({ preventScroll: true });
  }
  function close(){
    token++;
    lb.classList.remove('open');
    root.classList.remove('lb-open');
    if (opener) opener.focus({ preventScroll: true });
  }

  grid.addEventListener('click', e => {
    const el = e.target.closest('.gal__item');
    if (!el || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    e.preventDefault();
    open(el);
  });
  lb.addEventListener('click', e => {
    if (e.target.closest('.lightbox__btn--prev')) show(idx - 1);
    else if (e.target.closest('.lightbox__btn--next') || e.target === lbImg) show(idx + 1);
    else close();
  });
  document.addEventListener('keydown', e => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(idx - 1);
    else if (e.key === 'ArrowRight') show(idx + 1);
  });
  let sx = 0, sy = 0;
  lb.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  lb.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) show(idx + (dx < 0 ? 1 : -1));
  }, { passive: true });
})();

/* ===================== MOTION ENGINE ===================== */
(function(){
  var hero = document.querySelector('.hero');
  var heroVideo = document.querySelector('.hero__video');
  var footer = document.querySelector('.footer');
  var isHome = !!hero;
  var vh = window.innerHeight;
  var footerH = 0;
  var heroOff = false;
  var vel = 0, lastY = window.scrollY;
  var ticking = false;

  /* ВАЖНО за плавността: стойностите се записват само върху елементите, които ги
     ползват (не върху <html> или цялата секция) и само когато са се променили.
     CSS променлива върху родител кара браузъра да преизчисли стила на всичките му деца. */
  var progressEl = document.querySelector('.progress');
  var heroParts = hero ? Array.prototype.slice.call(hero.querySelectorAll('.hero__media,.hero__overlay,.hero__meta,.hero__scroll')) : [];
  var heroContent = hero ? hero.querySelector('.hero__content') : null; /* има много деца → директен стил, без променлива */
  var footWord = footer ? footer.querySelector('.footer__word') : null;
  var lastProgress = '', lastHp = '';

  function setVar(el, name, val){
    var cache = el._fxv || (el._fxv = {});
    if (cache[name] === val) return;
    cache[name] = val;
    el.style.setProperty(name, val);
  }
  function setTransform(el, val){
    if (el._fxt === val) return;
    el._fxt = val;
    el.style.transform = val;
  }

  var fxEls = Array.prototype.map.call(document.querySelectorAll('[data-fx]'), function(el){
    return {
      el: el,
      curve: el.querySelector(':scope > .curve path'),
      lastD: '',
      /* елементи с паралакс по --p */
      targets: Array.prototype.slice.call(el.querySelectorAll('.ghost,.story__slides,.values__deco,.sub__deco')),
      /* панели, които „порастват“ при влизане */
      grow: el.classList.contains('values') ? { el: el, from: 0.9 } :
            el.classList.contains('media') ? { el: el, from: 0.92 } :
            el.querySelector('.contact__card') ? { el: el.querySelector('.contact__card'), from: 0.88 } : null
    };
  });
  if (FX && isHome) root.classList.add('at-top');

  /* --- footer reveal: подвалът стои неподвижно под листа --- */
  function measureFooter(){
    vh = window.innerHeight;
    if (!footer || !FX) return;
    root.classList.remove('fx-foot');
    footerH = footer.offsetHeight;
    if (footerH < vh * 0.92) {
      root.style.setProperty('--footer-h', footerH + 'px');
      root.classList.add('fx-foot');
    } else {
      footerH = 0;
    }
  }

  function frame(){
    ticking = false;
    var y = window.scrollY;
    var max = document.documentElement.scrollHeight - vh;
    vel += (y - lastY - vel) * 0.5;
    lastY = y;

    if (nav && !nav.classList.contains('nav--solid')) nav.classList.toggle('scrolled', y > 40);
    if (!FX) return;

    if (progressEl) {
      var pr = 'scaleX(' + (max > 0 ? clamp01(y / max).toFixed(4) : 0) + ')';
      if (pr !== lastProgress) { lastProgress = pr; progressEl.style.transform = pr; }
    }

    if (isHome) {
      var off = y > vh * 1.15;
      if (off !== heroOff) {
        heroOff = off;
        hero.style.visibility = off ? 'hidden' : '';
        if (heroVideo) { if (off) heroVideo.pause(); else heroVideo.play().catch(function(){}); }
        root.classList.toggle('at-top', !off);
      }
      var hp = clamp01(y / vh).toFixed(3);
      if (hp !== lastHp) {
        lastHp = hp;
        for (var h = 0; h < heroParts.length; h++) heroParts[h].style.setProperty('--hp', hp);
        if (heroContent) {
          heroContent.style.transform = 'translate3d(0,' + (hp * -110).toFixed(1) + 'px,0) scale(' + (1 - hp * 0.1).toFixed(4) + ')';
          heroContent.style.opacity = Math.max(0, 1 - hp * 1.6).toFixed(3);
        }
      }
    }

    /* всички четения на размери наведнъж, после всички записи (без layout thrashing) */
    var rects = [];
    for (var i = 0; i < fxEls.length; i++) rects.push(fxEls[i].el.getBoundingClientRect());
    for (var j = 0; j < fxEls.length; j++) {
      var o = fxEls[j], r = rects[j];
      var p = clamp01((vh - r.top) / (vh + r.height)).toFixed(3);
      var e = clamp01((vh - r.top) / (vh * 0.8));
      for (var t = 0; t < o.targets.length; t++) setVar(o.targets[t], '--p', p);
      if (o.grow) setTransform(o.grow.el, 'scale(' + (o.grow.from + (1 - o.grow.from) * e).toFixed(4) + ')');
      if (o.curve) {
        var d = 'M0 100 Q50 ' + (100 - 200 * (1 - e)).toFixed(1) + ' 100 100Z';
        if (d !== o.lastD) { o.lastD = d; o.curve.setAttribute('d', d); }
      }
    }

    if (footWord && footerH) setVar(footWord, '--fp', clamp01(1 - (max - y) / footerH).toFixed(3));
  }
  function onScroll(){ if (!ticking) { ticking = true; requestAnimationFrame(frame); } }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function(){ measureFooter(); onScroll(); });
  if (footer && FX && 'ResizeObserver' in window) new ResizeObserver(function(){
    if (Math.abs(footer.offsetHeight - footerH) > 2) { measureFooter(); onScroll(); }
  }).observe(footer);
  measureFooter();
  frame();
  window.addEventListener('load', function(){ measureFooter(); frame(); });

  /* --- фотоалбум в „Нашата история": нова снимка на всеки 2 секунди, само докато се вижда --- */
  (function(){
    var box = document.getElementById('storySlides');
    if (!box) return;
    var slides = Array.prototype.slice.call(box.querySelectorAll('.story__slide'));
    if (slides.length < 2 || !FX || !('IntersectionObserver' in window)) return;
    var STEP = 2000, cur = 0, timer = null, visible = false;
    var bars = document.querySelector('.story__bars'), segs = [];
    if (bars) {
      bars.style.setProperty('--step', STEP + 'ms');
      slides.forEach(function(){ segs.push(bars.appendChild(document.createElement('i'))); });
    }
    function load(el){ if (el.dataset.src) { el.src = el.dataset.src; el.removeAttribute('data-src'); } }
    function mark(){
      segs.forEach(function(s, k){ s.className = k < cur ? 'done' : ''; });
      if (segs[cur] && visible) { void segs[cur].offsetWidth; segs[cur].className = 'now'; }
    }
    function schedule(ms){ clearTimeout(timer); if (visible && !document.hidden) timer = setTimeout(next, ms); }
    function next(){
      var n = (cur + 1) % slides.length, el = slides[n];
      load(el);
      if (!el.complete || !el.naturalWidth) return schedule(250); /* изчаква снимката да се зареди */
      var prev = slides[cur];
      prev.classList.remove('is-on'); prev.classList.add('is-out');
      setTimeout(function(){ prev.classList.remove('is-out'); }, 1300);
      el.classList.remove('is-out'); el.classList.add('is-on');
      cur = n;
      load(slides[(cur + 1) % slides.length]);
      mark();
      schedule(STEP);
    }
    new IntersectionObserver(function(en){
      visible = en[0].isIntersecting;
      if (visible) { load(slides[(cur + 1) % slides.length]); mark(); schedule(STEP); }
      else clearTimeout(timer);
    }, { threshold: 0.25 }).observe(box);
    document.addEventListener('visibilitychange', function(){ if (!document.hidden) { mark(); schedule(STEP); } else clearTimeout(timer); });
  })();

  /* --- активен линк в навигацията --- */
  if (navLinks && isHome && 'IntersectionObserver' in window) {
    var links = {};
    navLinks.querySelectorAll('a[href^="#"]').forEach(function(a){ links[a.getAttribute('href').slice(1)] = a; });
    var spy = new IntersectionObserver(function(en){
      en.forEach(function(x){
        var a = links[x.target.id];
        if (a) a.classList.toggle('is-active', x.isIntersecting);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(links).forEach(function(id){ var s = document.getElementById(id); if (s) spy.observe(s); });
  }

  if (!FX) return;

  /* --- бягащи ленти: постоянна скорост + инерция от скрола --- */
  var rows = Array.prototype.map.call(document.querySelectorAll('[data-marquee]'), function(row){
    var track = row.querySelector('.strip__track');
    return { track: track, dir: +row.dataset.marquee || 1, html: track.innerHTML, w: 0, x: 0 };
  });
  function buildMarquee(){
    rows.forEach(function(m){
      m.track.innerHTML = m.html;
      m.w = m.track.scrollWidth;
      if (!m.w) return;
      var n = Math.ceil((window.innerWidth * 2) / m.w) + 1;
      m.track.innerHTML = new Array(n + 1).join(m.html);
    });
  }
  if (rows.length) {
    buildMarquee();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(buildMarquee);
    var rT;
    window.addEventListener('resize', function(){ clearTimeout(rT); rT = setTimeout(buildMarquee, 200); });
    var visible = false, last = 0;
    var loop = function(t){
      if (!visible) return;
      var dt = Math.min(48, t - (last || t)); last = t;
      vel *= 0.93;
      rows.forEach(function(m){
        if (!m.w) return;
        m.x = (m.x + (0.045 + Math.abs(vel) * 0.012) * dt) % m.w;
        var tx = m.dir > 0 ? -m.x : m.x - m.w;
        m.track.style.transform = 'translate3d(' + tx.toFixed(2) + 'px,0,0)';
      });
      requestAnimationFrame(loop);
    };
    new IntersectionObserver(function(en){
      var was = visible;
      visible = en[0].isIntersecting;
      if (visible && !was) { last = 0; requestAnimationFrame(loop); }
    }).observe(document.querySelector('.strip'));
  }

  /* --- 3D наклон и „прожектор“ под курсора --- */
  if (window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
    var bindTilt = function(el){
      if (el._tilt) return; el._tilt = true;
      var tilt = el.hasAttribute('data-tilt');
      el.addEventListener('pointermove', function(ev){
        var r = el.getBoundingClientRect();
        var x = ev.clientX - r.left, y = ev.clientY - r.top;
        el.style.setProperty('--mx', x.toFixed(0) + 'px');
        el.style.setProperty('--my', y.toFixed(0) + 'px');
        if (tilt) {
          el.style.setProperty('--ry', ((x / r.width - 0.5) * 9).toFixed(2) + 'deg');
          el.style.setProperty('--rx', ((0.5 - y / r.height) * 7).toFixed(2) + 'deg');
        }
      });
      el.addEventListener('pointerleave', function(){
        if (tilt) { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); }
      });
    };
    document.querySelectorAll('[data-tilt],[data-spot]').forEach(bindTilt);
    window.umBindTilt = function(scope){ scope.querySelectorAll('[data-tilt],[data-spot]').forEach(bindTilt); };
  }
})();
