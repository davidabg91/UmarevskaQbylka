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
      }, 1200);
    }
    /* входната анимация на hero тръгва, докато завесата се вдига */
    setTimeout(() => root.classList.add('ready'), 380);
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
      img: 'img/juice.jpg',
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

function addToCart(item) {
  const existing = cart.find(i => i.id === item.id);
  if (existing) existing.qty += item.qty;
  else cart.push(item);
  saveCart(); renderCart();
}
function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  saveCart(); renderCart();
}
function changeQty(id, delta) {
  const it = cart.find(i => i.id === id);
  if (!it) return;
  it.qty += delta;
  if (it.qty <= 0) removeFromCart(id);
  else { saveCart(); renderCart(); }
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

/* checkout */
const orderModal = document.getElementById('orderModal');
checkoutBtn.addEventListener('click', () => {
  if (!cart.length) return;
  cart = []; saveCart(); renderCart(); closeCart();
  openModal(orderModal);
});
document.getElementById('orderOk').addEventListener('click', () => closeModal(orderModal));
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

/* ---------- MODAL HELPERS ---------- */
function openModal(m) { m.classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeModal(m) { m.classList.remove('open'); document.body.style.overflow = ''; }

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeCart();
    if (orderModal.classList.contains('open')) closeModal(orderModal);
  }
});

/* ---------- CONTACT (демо) ---------- */
function umFakeSubmit(e) {
  e.preventDefault();
  e.target.reset();
  alert('Благодарим! Вашето съобщение е изпратено (демо).');
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
    statsEl.querySelectorAll('strong').forEach(function(el){
      var raw = el.textContent.trim();
      var num = parseInt(raw, 10);
      var suffix = raw.replace(/[0-9]/g, '');
      if (!num) return;
      var t0 = null, dur = 1400;
      (function tick(ts){
        if (!t0) t0 = ts;
        var p = Math.min((ts - t0) / dur, 1);
        var e = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(e * num) + suffix;
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

  function openModal(plan, price, kg) {
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
      form.style.display = 'none';
      success.style.display = 'flex';
    });
  }
})();

/* ---------- CALENDAR: текущ месец + маркер „днес“ ---------- */
(function(){
  var now = new Date();
  var m = now.getMonth() + 1;
  document.querySelectorAll('.cal__months span[data-m]').forEach(function(s){
    if (+s.dataset.m === m) s.classList.add('cal__now');
  });
  var wrap = document.querySelector('.cal__wrap');
  var today = document.querySelector('.cal__today');
  if (wrap && today) {
    var days = new Date(now.getFullYear(), m, 0).getDate();
    wrap.style.setProperty('--now', ((m - 1 + (now.getDate() - 0.5) / days) / 12).toFixed(4));
    today.classList.add('on');
  }
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
      targets: Array.prototype.slice.call(el.querySelectorAll('.ghost,.story__video,.values__deco,.sub__deco')),
      /* панели, които „порастват“ при влизане */
      grow: el.classList.contains('values') ? { el: el, from: 0.9 } :
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

  /* --- story видео: върви само когато се вижда --- */
  var storyVideo = document.querySelector('.story__video');
  if (storyVideo && 'IntersectionObserver' in window) {
    new IntersectionObserver(function(en){
      if (en[0].isIntersecting) storyVideo.play().catch(function(){}); else storyVideo.pause();
    }, { rootMargin: '500px 0px' }).observe(storyVideo);
  }

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
