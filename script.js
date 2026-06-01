/* ===================== УМАРЕВСКА ЯБЪЛКА ===================== */

/* ---------- NAV ---------- */
const nav = document.getElementById('nav');
const burger = document.getElementById('burger');
const navLinks = document.getElementById('navLinks');

window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
});
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

/* ---------- REVEAL ON SCROLL ---------- */
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

document.getElementById('year').textContent = new Date().getFullYear();

/* ===================== SHOP ===================== */
const APPLE_PRICE_PER_KG = 2; // €
const JUICE_PRICE = 10;       // €

/* --- Apples --- */
let appleKg = 5;
const appleWeights = document.getElementById('appleWeights');
const appleTotalEl = document.getElementById('appleTotal');

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

/* --- Juice --- */
let juiceCount = 1;
const juiceCountEl = document.getElementById('juiceCount');
const juiceTotalEl = document.getElementById('juiceTotal');

document.getElementById('juiceQty').addEventListener('click', e => {
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

/* --- Per-variety ordering (мин. 5 кг) --- */
document.querySelectorAll('.variety__order').forEach(function(block){
  var card = block.closest('.variety');
  var name = card.querySelector('h3').textContent.trim();
  var imgEl = card.querySelector('.variety__top img');
  var img = imgEl ? imgEl.getAttribute('src') : '';
  var priceEl = block.querySelector('.vp');
  var kg = 5;
  block.querySelectorAll('.vw').forEach(function(b){
    b.addEventListener('click', function(){
      block.querySelectorAll('.vw').forEach(function(x){ x.classList.remove('active'); });
      b.classList.add('active');
      kg = +b.dataset.kg;
      priceEl.textContent = kg * APPLE_PRICE_PER_KG;
    });
  });
  block.querySelector('.vadd').addEventListener('click', function(){
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
const articles = [
  {
    cat: 'Сортове',
    img: 'img/b-varieties.jpg',
    icon: '🍎',
    bg: 'linear-gradient(135deg,#e8534f,#c1272d)',
    title: 'Кой сорт ябълка да изберете?',
    meta: '5 мин четене · Сортове',
    excerpt: 'Фуджи, Пинова, Грени Смит, Златна превъзходна и Флорина — кратък пътеводител на вкусовете.',
    body: `
      <p>Изборът на ябълка зависи изцяло от това какво търсите — за хапване в движение, за салата или за домашен сладкиш. Ето как се различават нашите пет сорта.</p>
      <h3>Фуджи</h3>
      <p>Много сладка, плътна и хрупкава. Перфектна за директна консумация и за деца, които обичат изразен сладък вкус.</p>
      <h3>Пинова</h3>
      <p>Балансиран сладко-кисел профил с богат аромат. Универсален сорт, който се представя отлично както пресен, така и в сок.</p>
      <h3>Грени Смит</h3>
      <p>Класическата зелена ябълка — свежо кисела и стегната. Идеална за печива, тарти и за тези, които предпочитат по-малко сладко.</p>
      <h3>Златна превъзходна</h3>
      <p>Мека сладост, нежен аромат и златиста кожа. Любимец за цялото семейство и чудесна основа за компоти.</p>
      <h3>Флорина</h3>
      <p>Наситен цвят и богат вкус, който се запазва дълго. Отличен избор за съхранение през по-студените месеци.</p>
      <p><strong>Съвет:</strong> Ако не можете да изберете — поръчайте микс и открийте своя фаворит.</p>
    `
  },
  {
    cat: 'Здраве',
    img: 'img/b-health.jpg',
    icon: '💚',
    bg: 'linear-gradient(135deg,#74c69d,#2d6a4f)',
    title: '7 причини да ядете ябълки всеки ден',
    meta: '4 мин четене · Здраве',
    excerpt: 'Стара поговорка казва: „По една ябълка на ден държи доктора далеч." И има основание.',
    body: `
      <p>Ябълките не са просто вкусни — те са едни от най-полезните плодове, които можете да включите в дневното си меню.</p>
      <ul>
        <li><strong>Богати на фибри</strong> — подпомагат храносмилането и засищат за по-дълго.</li>
        <li><strong>Антиоксиданти</strong> — защитават клетките от оксидативен стрес.</li>
        <li><strong>Сърдечно здраве</strong> — пектинът подпомага нормалните нива на холестерол.</li>
        <li><strong>Стабилна енергия</strong> — естествени захари без рязко покачване на кръвната захар.</li>
        <li><strong>Хидратация</strong> — съдържат над 85% вода.</li>
        <li><strong>Витамин C</strong> — подкрепя имунната система.</li>
        <li><strong>Здрави зъби</strong> — дъвченето стимулира слюнката и почиства плаката.</li>
      </ul>
      <p>За максимална полза яжте ябълката с кожата — точно там е концентрирана голяма част от фибрите и антиоксидантите.</p>
    `
  },
  {
    cat: 'Продукти',
    img: 'img/b-juice.jpg',
    icon: '🧃',
    bg: 'linear-gradient(135deg,#f2c14e,#d98e04)',
    title: 'Какво прави сока ни 100% натурален',
    meta: '3 мин четене · Продукти',
    excerpt: 'Без добавена захар, без концентрати, без консерванти — само зрели ябълки.',
    body: `
      <p>Нашият ябълков сок е директен израз на градината ни. Изстискваме го от същите зрели плодове, които предлагаме пресни.</p>
      <h3>Какво НЯМА в него</h3>
      <ul>
        <li>Добавена захар</li>
        <li>Концентрати и възстановена вода</li>
        <li>Консерванти и оцветители</li>
      </ul>
      <h3>Какво ИМА в него</h3>
      <p>Само 100% ябълки — целият им естествен вкус, аромат и хранителни стойности. Затова сокът ни е леко мътен и с дълбок, истински вкус, какъвто помните от детството.</p>
      <p>Сервирайте охладен. След отваряне съхранявайте в хладилник и консумирайте в рамките на няколко дни — точно защото няма консерванти.</p>
    `
  },
  {
    cat: 'Кулинария',
    img: 'img/b-pie.jpg',
    icon: '🥧',
    bg: 'linear-gradient(135deg,#e6a86c,#b5651d)',
    title: 'Класически ябълков пай със сорт Грени Смит',
    meta: '6 мин четене · Кулинария',
    excerpt: 'Уютна рецепта, в която киселинката на Грени Смит балансира сладостта на плънката.',
    body: `
      <p>Грени Смит е любимец за печене заради стегнатата си плът, която не се разпада, и свежата киселинност, която балансира захарта.</p>
      <h3>Нужни продукти</h3>
      <ul>
        <li>5–6 ябълки Грени Смит</li>
        <li>100 г захар</li>
        <li>1 ч.л. канела</li>
        <li>Сок от половин лимон</li>
        <li>Готово бутер тесто</li>
      </ul>
      <h3>Приготвяне</h3>
      <p>Обелете и нарежете ябълките на тънки филийки. Смесете със захарта, канелата и лимоновия сок. Подредете върху тестото, завийте краищата и печете при 190°C около 35–40 минути до златисто.</p>
      <p>Сервирайте топъл, със сладолед или просто с чаша от нашия натурален сок.</p>
    `
  },
  {
    cat: 'Съхранение',
    img: 'img/b-storage.jpg',
    icon: '📦',
    bg: 'linear-gradient(135deg,#9b7ede,#5e3cae)',
    title: 'Как да съхраняваме ябълките по-дълго',
    meta: '3 мин четене · Съхранение',
    excerpt: 'Няколко прости трика, за да останат ябълките свежи седмици наред.',
    body: `
      <p>Правилното съхранение може да удължи свежестта на ябълките с няколко седмици.</p>
      <ul>
        <li><strong>Хлад</strong> — ябълките се пазят най-добре при около 0–4°C, в чекмеджето за плодове на хладилника.</li>
        <li><strong>Отделно от другите плодове</strong> — те отделят етилен, който ускорява презряването на съседните продукти.</li>
        <li><strong>Не мийте предварително</strong> — измивайте чак преди консумация, за да не отстраните защитния слой.</li>
        <li><strong>Преглеждайте редовно</strong> — една презряла ябълка ускорява развалянето на останалите.</li>
      </ul>
      <p>Сорт Флорина се съхранява особено добре и е чудесен избор за зимни запаси.</p>
    `
  },
  {
    cat: 'Ферма',
    img: 'img/b-season.jpg',
    icon: '🌳',
    bg: 'linear-gradient(135deg,#74c69d,#1b4332)',
    title: 'Сезонът в Умаревци: от цвят до бране',
    meta: '5 мин четене · Ферма',
    excerpt: 'Разходка през годината в нашата градина — какво се случва зад всяка ябълка.',
    body: `
      <p>Зад всяка ябълка стои цяла година труд и грижа. Ето как изглежда сезонът в нашата градина край село Умаревци.</p>
      <h3>Пролет</h3>
      <p>Дърветата се покриват с бели и розови цветове. Това е най-крехкият момент — следим внимателно времето и опрашването.</p>
      <h3>Лято</h3>
      <p>Плодовете наедряват и набират цвят. Грижим се за дърветата, поддържаме почвата и следим за здравето на градината.</p>
      <h3>Есен</h3>
      <p>Времето за бране. Берем всеки сорт в точния момент на зрялост — на ръка, с внимание към всеки плод.</p>
      <p>Точно тази грижа е причината потребителите да усещат разликата във вкуса спрямо масовите вериги.</p>
    `
  }
];

const blogGrid = document.getElementById('blogGrid');
blogGrid.innerHTML = articles.map((a, i) => `
  <article class="post reveal" data-i="${i}">
    <div class="post__cover"><img src="${a.img}" alt="${a.title}" loading="lazy" onerror="this.parentNode.style.background='${a.bg}';this.parentNode.style.display='grid';this.parentNode.style.placeItems='center';this.parentNode.style.fontSize='3.4rem';this.outerHTML='${a.icon}'"></div>
    <div class="post__body">
      <span class="post__cat">${a.cat}</span>
      <h3 class="post__title">${a.title}</h3>
      <p class="post__excerpt">${a.excerpt}</p>
      <span class="post__more">Прочети →</span>
    </div>
  </article>
`).join('');
document.querySelectorAll('.post.reveal').forEach(el => io.observe(el));

const articleModal = document.getElementById('articleModal');
const modalBody = document.getElementById('modalBody');

blogGrid.addEventListener('click', e => {
  const card = e.target.closest('.post');
  if (!card) return;
  const a = articles[+card.dataset.i];
  modalBody.innerHTML = `
    <div class="modal__cover"><img src="${a.img}" alt="${a.title}"></div>
    <span class="modal__cat">${a.cat}</span>
    <h2>${a.title}</h2>
    <div class="modal__meta">${a.meta}</div>
    ${a.body}
  `;
  openModal(articleModal);
});
document.getElementById('modalClose').addEventListener('click', () => closeModal(articleModal));
document.getElementById('modalBackdrop').addEventListener('click', () => closeModal(articleModal));

/* ---------- MODAL HELPERS ---------- */
function openModal(m) { m.classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeModal(m) { m.classList.remove('open'); document.body.style.overflow = ''; }

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeCart();
    [articleModal, orderModal].forEach(m => m.classList.contains('open') && closeModal(m));
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
