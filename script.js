/* ===================== УМАРЕВСКА ЯБЪЛКА ===================== */

/* ---------- PRELOADER ---------- */
(function() {
  const preloader = document.getElementById('preloader');
  const heroVideo = document.querySelector('.hero__video');
  let loaded = false;

  function removePreloader() {
    if (loaded) return;
    loaded = true;
    if (preloader) {
      preloader.classList.add('fade-out');
      document.body.classList.remove('loading');
      setTimeout(() => {
        preloader.style.display = 'none';
      }, 600);
    }
  }

  if (heroVideo) {
    if (heroVideo.readyState >= 3) {
      removePreloader();
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

if (nav) {
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  });
}
if (burger && navLinks) {
  burger.addEventListener('click', () => {
    burger.classList.toggle('open');
    navLinks.classList.toggle('open');
  });
  navLinks.querySelectorAll('a').forEach(a =>
    a.addEventListener('click', () => {
      burger.classList.remove('open');
      navLinks.classList.remove('open');
    })
  );
}

/* ---------- REVEAL ON SCROLL ---------- */
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

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
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const filterValue = btn.dataset.filter;
      
      shopCards.forEach(card => {
        const category = card.dataset.category;
        if (filterValue === 'all' || category === filterValue) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });
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
        <span class="post__more">Прочети →</span>
      </div>
    </a>
  `).join('');
  document.querySelectorAll('.post.reveal').forEach(el => io.observe(el));
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
