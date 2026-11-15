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
const JUICE_PRICE = 10;       // €

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
const shopCards = document.querySelectorAll('.varieties__grid .variety');

if (filterBtns.length && shopCards.length) {
  shopCards.forEach((card, i) => { card.style.viewTransitionName = 'shop-card-' + i; });

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('active')) return;
      const filterValue = btn.dataset.filter;

      const apply = () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        shopCards.forEach(card => {
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
    total: cart.reduce((s, i) => s + i.qty * i.unitPrice, 0)
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
  cartTotalEl.textContent = total;
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
          <span class="cart-item__price">${i.qty * i.unitPrice} €</span>
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

function renderOrderForm() {
  const snap = cartSnapshot();
  orderPanel.classList.add('modal__panel--form');
  orderPanel.innerHTML = `
    <button class="modal__close" type="button" data-order-close aria-label="Затвори">✕</button>
    <form class="sub-modal__form order-form" id="orderForm">
      <h3>Завършване на поръчката</h3>
      <p>Оставете данни за връзка — ще ви се обадим за потвърждение и уточняване на доставката.</p>
      <ul class="order-form__items">
        ${cart.map(i => `<li><span>${escHtml(i.name)} <small>${escHtml(i.meta.split(' · ')[0])} × ${i.qty}</small></span><b>${i.qty * i.unitPrice} €</b></li>`).join('')}
        <li class="order-form__sum"><span>Общо</span><b>${snap.total} €</b></li>
      </ul>
      <div class="sub-modal__row">
        <input type="text" name="name" placeholder="Име и фамилия" aria-label="Име и фамилия" autocomplete="name" minlength="2" maxlength="120" required />
        <input type="tel" name="phone" placeholder="Телефон" aria-label="Телефон" autocomplete="tel" minlength="5" maxlength="40" required />
      </div>
      <input type="email" name="email" placeholder="Имейл (по желание)" aria-label="Имейл" autocomplete="email" maxlength="160" />
      <div class="order-form__switch" role="radiogroup" aria-label="Начин на получаване">
        <label><input type="radio" name="delivery" value="address" checked /><span>Доставка до адрес</span></label>
        <label><input type="radio" name="delivery" value="pickup" /><span>Вземане от обект</span></label>
      </div>
      <textarea name="address" rows="2" placeholder="Адрес за доставка (град, улица, №)" aria-label="Адрес за доставка" autocomplete="street-address" maxlength="400" required></textarea>
      <select name="pickup" aria-label="Обект за вземане" hidden>
        ${PICKUPS.map(p => `<option>${escHtml(p)}</option>`).join('')}
      </select>
      <textarea name="note" rows="2" placeholder="Бележка към поръчката (по желание)" aria-label="Бележка" maxlength="1000"></textarea>
      <input type="text" name="website" class="order-form__hp" tabindex="-1" autocomplete="off" aria-hidden="true" />
      <p class="order-form__error" role="alert" hidden></p>
      <div class="sub-modal__pay-row">
        <div class="sub-modal__total">Общо: <strong>${snap.total} €</strong></div>
        <button type="submit" class="btn btn--primary sub-modal__pay-btn">Изпрати поръчката <svg class="ico"><use href="#i-arrow"/></svg></button>
      </div>
    </form>`;
  const form = orderPanel.querySelector('#orderForm');
  const err = form.querySelector('.order-form__error');
  const submitBtn = form.querySelector('button[type="submit"]');
  const syncDelivery = () => {
    const pickup = form.delivery.value === 'pickup';
    form.address.hidden = pickup; form.address.required = !pickup;
    form.pickup.hidden = !pickup;
  };
  form.querySelectorAll('input[name="delivery"]').forEach(r => r.addEventListener('change', syncDelivery));
  orderPanel.querySelector('[data-order-close]').addEventListener('click', () => closeModal(orderModal));

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (form.website.value) { renderOrderDone(''); return; }      /* капан за ботове */
    const pickup = form.delivery.value === 'pickup';
    const code = orderCode();
    const row = {
      code: code,
      customer_name: form.elements.name.value.trim(),
      phone: form.phone.value.trim(),
      email: form.email.value.trim() || null,
      delivery: pickup ? 'pickup' : 'address',
      address: pickup ? null : form.address.value.trim(),
      pickup_place: pickup ? form.pickup.value : null,
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
      if (window.UMTrack) UMTrack.event('order', code, { total: row.total, items: row.items.length, delivery: row.delivery });
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
    <a class="post reveal" href="article.html?id=${i}">
      <div class="post__cover"><img src="${a.img}" alt="${a.title}" loading="lazy" onerror="this.parentNode.style.background='${a.bg}';this.parentNode.style.display='grid';this.parentNode.style.placeItems='center';this.parentNode.style.fontSize='3.4rem';this.outerHTML='${a.icon}'"></div>
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

  document.querySelectorAll('.sub__btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      openModal(btn.dataset.plan, btn.dataset.price, btn.dataset.kg);
    });
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
    document.querySelectorAll('[data-tilt],[data-spot]').forEach(function(el){
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
    });
  }
})();
