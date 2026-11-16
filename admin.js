/* Админ панел — Умаревска Ябълка */
(function () {
  'use strict';
  const D = window.UMData;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => (Math.round((+n || 0) * 100) / 100).toLocaleString('bg-BG', { maximumFractionDigits: 2 }) + ' €';
  const num = n => (+n || 0).toLocaleString('bg-BG');
  const pad = n => String(n).padStart(2, '0');
  const dayKey = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parseDay = k => { const p = k.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };
  const fmtDT = iso => { const d = new Date(iso); return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear() + ', ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const fmtShort = iso => { const d = new Date(iso); return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + ', ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const fmtDay = d => d.toLocaleDateString('bg-BG', { day: 'numeric', month: 'long' });
  const fmtDur = s => { s = Math.round(s || 0); return s < 60 ? s + ' сек' : Math.floor(s / 60) + ' мин ' + pad(s % 60) + ' сек'; };
  const today0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const digits = p => String(p || '').replace(/[^\d+]/g, '');
  const intl = p => { let d = digits(p); if (d.startsWith('0')) d = '+359' + d.slice(1); return d; };

  const ORDER_ST = { new: ['Нова', 'new'], confirmed: ['Потвърдена', 'info'], shipped: ['Изпратена', 'warn'], done: ['Завършена', 'ok'], cancelled: ['Отказана', 'off'] };
  const SUB_ST = { new: ['Нова заявка', 'new'], active: ['Активен', 'ok'], paused: ['На пауза', 'warn'], cancelled: ['Прекратен', 'off'] };
  const SECTIONS = { hero: 'Начален екран', story: 'Нашата история', values: 'Нашето обещание', shop: 'Магазин', subscribe: 'Абонамент',
    gallery: 'Галерия', media: 'В медиите', blog: 'Блог', locations: 'Обекти', contact: 'Контакти', footer: 'Футър', article: 'Статии от блога' };
  const DEVICES = { mobile: 'Телефон', tablet: 'Таблет', desktop: 'Компютър' };
  const TITLES = { home: 'Табло', orders: 'Поръчки', subs: 'Абонаменти', calendar: 'Доставки по абонаменти', messages: 'Запитвания', stats: 'Статистика', carts: 'Изоставени кошници', products: 'Продукти и промоции', plans: 'Абонаментни планове' };
  const COURIER = { econt: 'Еконт', speedy: 'Спиди', pigeon: 'Pigeon Express' };
  /* как и къде се получава поръчката — с думи */
  const deliveryText = o => o.delivery === 'pickup' ? 'Вземане от обект: ' + (o.pickup_place || '—')
    : o.delivery === 'office' ? (COURIER[o.courier] || 'Куриер') + ' — до офис' + (o.city ? ', ' + o.city : '')
    : (COURIER[o.courier] || 'Куриер') + ' — до адрес' + (o.city ? ', ' + o.city : '');
  const shipText = o => o.delivery === 'pickup' ? 'няма' : o.delivery_price != null ? money(o.delivery_price) : 'уточнява се';
  const badge = (map, st) => { const m = map[st] || [st, 'off']; return `<span class="badge badge--${m[1]}">${esc(m[0])}</span>`; };

  const S = { view: 'home', range: 7, orders: [], subs: [], msgs: [], deliveries: [], events: [], stats: null, products: [], plans: [], banner: null,
              orderFilter: 'all', orderSearch: '', calMonth: null };

  /* ====================================================================== вход */
  const loginEl = $('#login'), appEl = $('#app');
  function showLogin(msg) {
    appEl.hidden = true; loginEl.hidden = false;
    paintInstall();
    $('#loginSub').textContent = D.mode === 'demo' ? 'Демо режим: влезте с произволен имейл и парола.'
      : D.mode === 'off' ? 'Базата данни още не е свързана (config.js).' : 'Влезте с имейла и паролата на собственика.';
    const e = $('#loginError'); e.hidden = !msg; e.textContent = msg || '';
  }
  $('#loginForm').addEventListener('submit', ev => {
    ev.preventDefault();
    const f = ev.target, btn = f.querySelector('button[type="submit"]');
    btn.disabled = true; $('#loginError').hidden = true;
    D.signIn(f.email.value.trim(), f.password.value).then(() => { f.password.value = ''; start(); })
      .catch(err => showLogin(err.message || 'Неуспешен вход.'))
      .finally(() => { btn.disabled = false; });
  });
  $('#logoutBtn').addEventListener('click', () => D.signOut().then(() => showLogin()));

  function start() {
    D.getSession().then(s => {
      if (!s) return showLogin();
      try { localStorage.setItem('um_no_track', '1'); } catch (e) {}   /* собственикът не се брои в статистиката */
      loginEl.hidden = true; appEl.hidden = false;
      $('#userEmail').textContent = s.email || '';
      $('#demoNote').hidden = D.mode !== 'demo';
      $('#seedBtn').hidden = D.mode !== 'demo';
      const h = location.hash.slice(1); if (TITLES[h]) S.view = h;
      loadAll();
      initPush();
    });
  }

  /* ====================================================================== данни */
  function rangeFrom() { const d = today0(); d.setDate(d.getDate() - (S.range - 1)); return d; }
  function loadAll() {
    $('#view').innerHTML = '<div class="empty">Зареждане…</div>';
    const from = rangeFrom().toISOString();
    return Promise.all([
      D.select('orders'), D.select('subscriptions'), D.select('messages'), D.select('sub_deliveries'),
      D.select('events', { filters: [['created_at', 'gte', from]], order: 'created_at.asc',
        columns: 'created_at,session_id,visitor_id,type,name,path,device,referrer,data' }),
      D.select('products', { order: 'sort.asc' }), D.select('plans', { order: 'sort.asc' }),
      D.select('site_settings', { order: 'key.asc' })
    ]).then(r => {
      S.orders = r[0]; S.subs = r[1]; S.msgs = r[2]; S.deliveries = r[3]; S.events = r[4];
      S.products = r[5]; S.plans = r[6];
      const bn = (r[7] || []).find(x => x.key === 'promo_banner'); S.banner = bn ? bn.value : null;
      S.stats = analyze(S.events);
      render();
    }).catch(err => {
      if (err && err.auth) return showLogin(err.message);
      $('#view').innerHTML = `<div class="card"><div class="empty">Данните не се заредиха: ${esc(err && err.message || err)}<br><br>Ако току-що сте създали базата, проверете дали сте пуснали <b>supabase/schema.sql</b> и дали имейлът ви е в таблицата <b>admins</b>.</div></div>`;
    });
  }
  const guard = p => p.catch(err => { if (err && err.auth) showLogin(err.message); else toast('Грешка: ' + (err && err.message || err)); throw err; });

  /* ====================================================================== приложение и известия */
  const PUSH = { supported: 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window, reg: null, sub: null, busy: false };
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  let installEvt = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; paintInstall(); if (!appEl.hidden) render(); });
  window.addEventListener('appinstalled', () => { installEvt = null; paintInstall(); if (!appEl.hidden) render(); });
  /* блокът „Инсталирай приложението“ на екрана за вход */
  function paintInstall() {
    const box = $('#installBox'); if (!box) return;
    box.hidden = isStandalone();   /* вече е отворено като приложение */
    $('#installBtn').textContent = installEvt ? 'Инсталирай приложението' : 'Как да инсталирам приложението';
  }
  $('#installBtn').addEventListener('click', () => {
    if (installEvt) { const ev = installEvt; installEvt = null; ev.prompt(); if (ev.userChoice) ev.userChoice.then(paintInstall); return; }
    const help = $('#installHelp');
    $('#installIos').hidden = !isIOS; $('#installOther').hidden = isIOS;
    help.hidden = !help.hidden;
  });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  const keyBytes = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
  const saveSub = sub => { const j = sub.toJSON(); return D.adminInsert('push_subscriptions', { endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, user_agent: navigator.userAgent.slice(0, 280) })
    .catch(err => { if (!(err && err.status === 409)) throw err; }); };   /* 409 = това устройство вече е записано */

  function initPush() {
    if (D.mode !== 'supabase' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('sw.js').then(reg => {
      PUSH.reg = reg;
      return PUSH.supported ? reg.pushManager.getSubscription() : null;
    }).then(sub => {
      PUSH.sub = sub;
      if (sub) saveSub(sub).catch(() => {});   /* ако записът в базата е изчезнал, го връща */
      render();
    }).catch(() => {});
  }
  function pushOn() {
    if (PUSH.busy) return;
    PUSH.busy = true;
    Notification.requestPermission().then(perm => {
      if (perm !== 'granted') throw new Error('Известията не са разрешени за този сайт.');
      return navigator.serviceWorker.ready;
    }).then(reg => reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(D.vapidPublicKey) }))
      .then(sub => { PUSH.sub = sub; return saveSub(sub); })
      .then(() => toast('Известията са включени на това устройство'))
      .catch(err => { if (err && err.auth) showLogin(err.message); else toast(err && err.message || 'Известията не се включиха'); })
      .finally(() => { PUSH.busy = false; render(); });
  }
  function pushOff() {
    const sub = PUSH.sub; if (!sub) return;
    D.select('push_subscriptions', { filters: [['endpoint', 'eq', sub.endpoint]] })
      .then(rows => Promise.all(rows.map(r => D.remove('push_subscriptions', r.id))))
      .catch(() => {})
      .then(() => sub.unsubscribe())
      .then(() => { PUSH.sub = null; render(); toast('Известията са изключени на това устройство'); });
  }
  function pushTest() {
    guard(D.callFunction('notify', '?test=1')).then(r => toast(r.sent ? 'Пробното известие е изпратено до ' + r.sent + ' устройства' : 'Няма устройство с включени известия'));
  }
  function appCard() {
    if (D.mode !== 'supabase') return '';
    let body, actions = '';
    const install = installEvt ? '<button class="btn btn--ghost btn--sm" data-install>Инсталирай като приложение</button>' : '';
    if (!PUSH.supported) {
      body = isIOS && !isStandalone()
        ? 'За известия на iPhone: натиснете „Сподели“ → „Към началния екран“, отворете панела от новата икона и включете известията оттам.'
        : 'Този браузър не поддържа известия. Отворете панела в Chrome или го добавете на началния екран.';
      actions = install;
    } else if (Notification.permission === 'denied') {
      body = 'Известията са забранени за този сайт. Разрешете ги от настройките на браузъра и презаредете панела.';
      actions = install;
    } else if (PUSH.sub) {
      body = 'Известията са включени на това устройство — ще получавате съобщение при нова поръчка, заявка за абонамент или запитване.';
      actions = '<button class="btn btn--ghost btn--sm" data-push="test">Изпрати пробно известие</button><button class="btn btn--ghost btn--sm" data-push="off">Изключи</button>' + install;
    } else {
      body = 'Получавайте известие на това устройство при нова поръчка, заявка за абонамент или запитване.';
      actions = '<button class="btn btn--green btn--sm" data-push="on">Включи известията</button>' + install;
    }
    return `<div class="card appcard"><div class="appcard__text"><b>Известия на телефона</b><span>${body}</span></div><div class="actions">${actions}</div></div>`;
  }

  /* ====================================================================== статистика */
  function analyze(events) {
    const ses = new Map();
    const get = e => {
      let s = ses.get(e.session_id);
      if (!s) { s = { id: e.session_id, start: e.created_at, end: e.created_at, visitor: e.visitor_id, device: e.device || 'desktop', ref: e.referrer || 'direct',
                      ret: false, pages: 0, dur: 0, scroll: 0, dwell: {}, clicks: {}, cart: null, cartTotal: 0, added: false, checkout: false, ordered: false, subOrdered: false };
        ses.set(e.session_id, s); }
      if (e.created_at > s.end) s.end = e.created_at;
      return s;
    };
    const products = {};
    events.forEach(e => {
      const s = get(e), d = e.data || {};
      switch (e.type) {
        case 'visit': s.pages++; s.ret = !!d.ret; break;
        case 'page': s.pages++; break;
        case 'beat':
          s.dur += +d.dur || 0; s.scroll = Math.max(s.scroll, +d.scroll || 0);
          Object.keys(d.dwell || {}).forEach(k => { s.dwell[k] = (s.dwell[k] || 0) + (+d.dwell[k] || 0); });
          Object.keys(d.clicks || {}).forEach(k => { s.clicks[k] = (s.clicks[k] || 0) + (+d.clicks[k] || 0); });
          break;
        case 'cart':
          s.added = true; s.cart = d.cart || []; s.cartTotal = +d.total || 0;
          if (e.name === 'add' && d.item) products[d.item] = (products[d.item] || 0) + (+d.qty || 1);
          break;
        case 'checkout_open': s.checkout = true; break;
        case 'order': s.ordered = true; break;
        case 'sub_order': s.subOrdered = true; break;
      }
    });
    const list = Array.from(ses.values());
    const visits = list.length;
    const byDay = {}, devices = {}, refs = {}, hours = new Array(24).fill(0), dwell = {}, reach = {}, clicks = {};
    let durSum = 0, durN = 0, scrollSum = 0, scrollN = 0, returning = 0, bounces = 0, pages = 0;
    const visitors = new Set();
    list.forEach(s => {
      const t = new Date(s.start);
      byDay[dayKey(t)] = (byDay[dayKey(t)] || 0) + 1;
      hours[t.getHours()]++;
      devices[s.device] = (devices[s.device] || 0) + 1;
      refs[s.ref] = (refs[s.ref] || 0) + 1;
      visitors.add(s.visitor || s.id);
      if (s.ret) returning++;
      pages += s.pages;
      if (s.dur > 0) { durSum += s.dur; durN++; scrollSum += s.scroll; scrollN++; }
      if (s.dur < 10 && !Object.keys(s.clicks).length) bounces++;
      Object.keys(s.dwell).forEach(k => { dwell[k] = (dwell[k] || 0) + s.dwell[k]; if (s.dwell[k] >= 2) reach[k] = (reach[k] || 0) + 1; });
      Object.keys(s.clicks).forEach(k => { clicks[k] = (clicks[k] || 0) + s.clicks[k]; });
    });
    const cutoff = Date.now() - 30 * 60000;   /* кошница се брои за изоставена 30 минути след последната активност */
    const abandoned = list.filter(s => s.added && !s.ordered && s.cart && s.cart.length && new Date(s.end).getTime() < cutoff)
      .sort((a, b) => (a.end < b.end ? 1 : -1));
    return {
      visits, visitors: visitors.size, returning, pages, bounces,
      avgDur: durN ? durSum / durN : 0, avgScroll: scrollN ? scrollSum / scrollN : 0,
      byDay, devices, refs, hours, dwell, reach, clicks, products,
      funnel: [visits, list.filter(s => (s.dwell.shop || 0) >= 2).length, list.filter(s => s.added).length,
               list.filter(s => s.checkout).length, list.filter(s => s.ordered).length],
      abandoned, abandonedValue: abandoned.reduce((a, s) => a + s.cartTotal, 0)
    };
  }

  /* ====================================================================== абонаментни доставки */
  function clampDay(y, m, day) { return new Date(y, m, Math.min(day, new Date(y, m + 1, 0).getDate())); }
  /* всички дати за доставка на активните абонаменти между две дати */
  function duesBetween(from, to) {
    const done = new Map(S.deliveries.map(d => [d.subscription_id + '|' + d.due_date, d]));
    const out = [], t0 = today0().getTime();
    S.subs.filter(s => s.status === 'active' && s.delivery_day).forEach(sub => {
      const first = sub.started_on ? parseDay(sub.started_on) : new Date(sub.created_at);
      first.setHours(0, 0, 0, 0);
      for (let y = from.getFullYear(), m = from.getMonth(); new Date(y, m, 1) <= to; m++) {
        if (m > 11) { m = 0; y++; }
        const d = clampDay(y, m, sub.delivery_day);
        if (d < from || d > to || d < first) continue;
        const key = dayKey(d), rec = done.get(sub.id + '|' + key);
        out.push({ sub, date: d, key, done: rec || null, late: !rec && d.getTime() < t0, today: d.getTime() === t0 });
      }
    });
    return out.sort((a, b) => a.date - b.date);
  }
  function reminders() {
    const from = today0(); from.setDate(from.getDate() - 62);
    const to = today0(); to.setDate(to.getDate() + 7);
    return duesBetween(from, to).filter(x => !x.done);
  }
  function nextDue(sub) {
    if (sub.status !== 'active' || !sub.delivery_day) return null;
    const from = today0(), to = today0(); to.setDate(to.getDate() + 62);
    const one = duesBetween(from, to).find(x => x.sub.id === sub.id && !x.done);
    return one ? one.date : null;
  }
  function toggleDelivered(subId, key) {
    const rec = S.deliveries.find(d => d.subscription_id === subId && d.due_date === key);
    const p = rec ? D.remove('sub_deliveries', rec.id) : D.adminInsert('sub_deliveries', { subscription_id: subId, due_date: key });
    return guard(p).then(() => D.select('sub_deliveries')).then(rows => { S.deliveries = rows; render(); toast(rec ? 'Отметката е махната' : 'Отбелязано като изпратено'); });
  }

  /* ====================================================================== графики */
  function niceMax(v) { if (v <= 4) return 4; const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; }
  /* колони: една серия, един цвят; стойността се вижда при посочване и в таблицата под графиката */
  function columns(points, unit) {
    if (!points.length || !points.some(p => p.v > 0)) return '<div class="empty">Още няма данни за този период.</div>';
    const max = niceMax(Math.max.apply(null, points.map(p => p.v)));
    const step = Math.ceil(points.length / 8);
    return `<div class="cols"><div class="cols__y"><span>${num(max)}</span><span>${num(max / 2)}</span><span>0</span></div><div class="cols__plot">` +
      points.map((p, i) => `<div class="col"><span class="col__bar" style="height:${(p.v / max * 100).toFixed(2)}%"></span>` +
        `<span class="col__tip">${esc(p.tip || p.label)}<br>${num(p.v)} ${esc(unit)}</span>` +
        ((i % step === 0) ? `<span class="col__x">${esc(p.label)}</span>` : '') + `</div>`).join('') +
      `</div></div><details class="tableview"><summary>Виж като таблица</summary><table><thead><tr><th>Период</th><th class="num">${esc(unit)}</th></tr></thead><tbody>` +
      points.map(p => `<tr><td>${esc(p.tip || p.label)}</td><td class="num">${num(p.v)}</td></tr>`).join('') + '</tbody></table></details>';
  }
  /* хоризонтални ленти със стойност в края */
  function hbars(rows, opts) {
    opts = opts || {};
    if (!rows.length) return '<div class="empty">Още няма данни за този период.</div>';
    const max = opts.max || Math.max.apply(null, rows.map(r => r.v)) || 1;
    return '<div class="hbars">' + rows.map(r => `<div class="hbar" title="${esc(r.label)}"><span class="hbar__label">${esc(r.label)}</span>` +
      `<span class="hbar__track"><span class="hbar__fill" style="width:${Math.max(0, r.v / max * 100).toFixed(2)}%"></span></span>` +
      `<span class="hbar__val">${esc(r.text != null ? r.text : num(r.v))}${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</span></div>`).join('') + '</div>';
  }
  const top = (obj, n) => Object.keys(obj).map(k => ({ k, v: obj[k] })).sort((a, b) => b.v - a.v).slice(0, n);
  const pct = (a, b) => b ? Math.round(a / b * 1000) / 10 : 0;

  function dailyPoints() {
    const pts = [], d = rangeFrom(), end = today0();
    if (S.range === 1) {
      return S.stats.hours.map((v, h) => ({ label: pad(h) + ':00', tip: pad(h) + ':00–' + pad(h) + ':59', v }));
    }
    for (; d <= end; d.setDate(d.getDate() + 1)) {
      pts.push({ label: pad(d.getDate()) + '.' + pad(d.getMonth() + 1), tip: d.toLocaleDateString('bg-BG', { weekday: 'long', day: 'numeric', month: 'long' }), v: S.stats.byDay[dayKey(d)] || 0 });
    }
    return pts;
  }
  const inRange = iso => new Date(iso) >= rangeFrom();
  const rangeLabel = () => S.range === 1 ? 'днес' : 'последните ' + S.range + ' дни';

  /* ====================================================================== изгледи */
  function viewHome() {
    const st = S.stats;
    const ordersIn = S.orders.filter(o => inRange(o.created_at) && o.status !== 'cancelled');
    const revenue = ordersIn.reduce((a, o) => a + (+o.total || 0), 0);
    const active = S.subs.filter(s => s.status === 'active');
    const mrr = active.reduce((a, s) => a + (+s.price || 0), 0);
    const newOrders = S.orders.filter(o => o.status === 'new').length;
    const rem = reminders();
    return appCard() + (rem.length ? remindCard(rem) : '') +
      `<div class="tiles">
        <div class="tile${newOrders ? ' tile--accent' : ''}"><span class="tile__label">Нови поръчки</span><span class="tile__value">${num(newOrders)}</span><span class="tile__sub">чакат потвърждение</span></div>
        <div class="tile"><span class="tile__label">Поръчки</span><span class="tile__value">${num(ordersIn.length)}</span><span class="tile__sub">${rangeLabel()}</span></div>
        <div class="tile"><span class="tile__label">Оборот</span><span class="tile__value">${money(revenue)}</span><span class="tile__sub">без отказаните</span></div>
        <div class="tile"><span class="tile__label">Посещения</span><span class="tile__value">${num(st.visits)}</span><span class="tile__sub">${num(st.visitors)} уникални посетители</span></div>
        <div class="tile"><span class="tile__label">Поръчали от посетилите</span><span class="tile__value">${pct(st.funnel[4], st.visits)}%</span><span class="tile__sub">${num(st.funnel[4])} от ${num(st.visits)} посещения</span></div>
        <div class="tile"><span class="tile__label">Активни абонаменти</span><span class="tile__value">${num(active.length)}</span><span class="tile__sub">${money(mrr)} на месец</span></div>
        <div class="tile"><span class="tile__label">Изоставени кошници</span><span class="tile__value">${num(st.abandoned.length)}</span><span class="tile__sub">на стойност ${money(st.abandonedValue)}</span></div>
      </div>
      <div class="card"><div class="card__head"><h2>Посещения ${S.range === 1 ? 'по часове' : 'по дни'}</h2><small>${rangeLabel()}</small></div>${columns(dailyPoints(), 'посещения')}</div>
      <div class="grid2">
        <div class="card"><div class="card__head"><h2>Последни поръчки</h2><button class="linkbtn" data-go="orders">Всички</button></div>${ordersTable(S.orders.slice(0, 5), true)}</div>
        <div class="card"><div class="card__head"><h2>Къде се задържат хората</h2><small>средно на посещение</small></div>${sectionBars(6)}</div>
      </div>`;
  }
  function remindCard(rem) {
    return `<div class="card remind"><div class="card__head"><h2>Напомняне: абонаментни доставки</h2><button class="linkbtn" data-go="calendar">Към календара</button></div>
      <ul class="remind__list">${rem.slice(0, 8).map(remindItem).join('')}</ul></div>`;
  }
  function remindItem(x) {
    const when = x.late ? `<span class="badge badge--new">Закъсняла · ${esc(fmtDay(x.date))}</span>` : x.today ? '<span class="badge badge--warn">Днес</span>' : `<span class="badge badge--info">${esc(fmtDay(x.date))}</span>`;
    return `<li class="remind__item"><span class="remind__date">${when}</span>
      <span class="remind__who"><b>${esc(x.sub.customer_name)} — ${esc(x.sub.plan)}</b><span>${esc(x.sub.address || 'няма адрес')} · ${esc(x.sub.phone)}</span></span>
      <button class="btn btn--green btn--sm" data-deliver="${esc(x.sub.id)}|${x.key}">Изпратено</button></li>`;
  }
  function sectionBars(n) {
    const st = S.stats;
    const rows = top(st.dwell, 20).filter(r => r.k !== 'footer').slice(0, n || 20).map(r => ({
      label: SECTIONS[r.k] || r.k, v: st.visits ? r.v / st.visits : 0, text: fmtDur(st.visits ? r.v / st.visits : 0),
      sub: pct(st.reach[r.k] || 0, st.visits) + '% стигат дотук'
    }));
    return hbars(rows);
  }

  function ordersTable(rows, compact) {
    if (!rows.length) return '<div class="empty">Няма поръчки.</div>';
    if (compact) {
      return '<div class="tablewrap"><table><tbody>' + rows.map(o => `<tr class="rowlink" data-order="${esc(o.id)}" tabindex="0">
        <td>${esc(o.customer_name)}<small><span class="mono">${esc(o.code)}</span> · ${esc(fmtShort(o.created_at))}</small></td>
        <td class="num">${money(o.total)}</td><td class="num">${badge(ORDER_ST, o.status)}</td></tr>`).join('') + '</tbody></table></div>';
    }
    return `<div class="tablewrap"><table><thead><tr><th>Номер</th><th>Дата</th><th>Клиент</th><th>Продукти</th><th class="num">Сума</th><th>Статус</th></tr></thead><tbody>` +
      rows.map(o => `<tr class="rowlink" data-order="${esc(o.id)}" tabindex="0"><td class="mono">${esc(o.code)}</td><td>${esc(fmtDT(o.created_at))}</td>
        <td>${esc(o.customer_name)}<small>${esc(o.phone)}</small></td>
        <td>${(o.items || []).map(i => esc(i.name) + ' × ' + esc(i.qty)).join('<br>')}<small>${esc(deliveryText(o))}</small></td>
        <td class="num">${money(o.total)}</td><td>${badge(ORDER_ST, o.status)}</td></tr>`).join('') + '</tbody></table></div>';
  }
  function viewOrders() {
    const counts = { all: S.orders.length };
    S.orders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });
    const q = S.orderSearch.trim().toLowerCase();
    const rows = S.orders.filter(o => (S.orderFilter === 'all' || o.status === S.orderFilter) &&
      (!q || [o.code, o.customer_name, o.phone, o.email, o.address, o.city, o.office_name].join(' ').toLowerCase().includes(q)));
    return `<div class="card"><div class="bar" style="margin-bottom:1rem">
        <div class="chips">${[['all', 'Всички']].concat(Object.keys(ORDER_ST).map(k => [k, ORDER_ST[k][0]])).map(c =>
          `<button class="chip${S.orderFilter === c[0] ? ' active' : ''}" data-ofilter="${c[0]}">${esc(c[1])}<b>${num(counts[c[0]] || 0)}</b></button>`).join('')}</div>
        <input class="search" id="orderSearch" type="search" placeholder="Търси по име, телефон, номер…" value="${esc(S.orderSearch)}" aria-label="Търсене в поръчките" />
        <button class="btn btn--ghost btn--sm" data-csv>Свали в Excel (CSV)</button>
      </div>${ordersTable(rows)}</div>`;
  }

  function viewSubs() {
    const active = S.subs.filter(s => s.status === 'active');
    const mrr = active.reduce((a, s) => a + (+s.price || 0), 0);
    const kg = active.reduce((a, s) => a + (+s.kg || 0), 0);
    const fresh = S.subs.filter(s => s.status === 'new').length;
    const noDay = active.filter(s => !s.delivery_day).length;
    const rows = S.subs;
    return `<div class="tiles">
        <div class="tile${fresh ? ' tile--accent' : ''}"><span class="tile__label">Нови заявки</span><span class="tile__value">${num(fresh)}</span><span class="tile__sub">чакат обаждане</span></div>
        <div class="tile"><span class="tile__label">Активни абонаменти</span><span class="tile__value">${num(active.length)}</span><span class="tile__sub">${num(kg)} кг ябълки на месец</span></div>
        <div class="tile"><span class="tile__label">Месечен приход</span><span class="tile__value">${money(mrr)}</span><span class="tile__sub">от активните</span></div>
      </div>
      ${noDay ? `<div class="demo-note">${num(noDay)} активни абонамента нямат зададен ден за доставка и не излизат в календара. Отворете ги и изберете ден.</div>` : ''}
      <div class="card"><div class="card__head"><h2>Всички абонаменти</h2><small>натиснете ред за подробности</small></div>` +
      (rows.length ? `<div class="tablewrap"><table><thead><tr><th>Клиент</th><th>План</th><th class="num">Цена</th><th>Доставка</th><th>Следваща</th><th>Статус</th></tr></thead><tbody>` +
        rows.map(s => { const nd = nextDue(s); return `<tr class="rowlink" data-sub="${esc(s.id)}" tabindex="0"><td>${esc(s.customer_name)}<small>${esc(s.phone)}</small></td>
          <td>${esc(s.plan)}<small>от ${esc(fmtDT(s.created_at))}</small></td><td class="num">${money(s.price)}<small>на месец</small></td>
          <td>${s.delivery_day ? 'всяко ' + esc(s.delivery_day) + '-о число' : '<span class="note">не е зададен ден</span>'}</td>
          <td>${nd ? esc(fmtDay(nd)) : '—'}</td><td>${badge(SUB_ST, s.status)}</td></tr>`; }).join('') + '</tbody></table></div>'
        : '<div class="empty">Още няма заявки за абонамент.</div>') + '</div>';
  }

  function viewCalendar() {
    if (!S.calMonth) { const t = today0(); S.calMonth = new Date(t.getFullYear(), t.getMonth(), 1); }
    const m0 = S.calMonth, y = m0.getFullYear(), m = m0.getMonth();
    const last = new Date(y, m + 1, 0);
    const dues = duesBetween(m0, last), tKey = dayKey(today0());
    const lead = (m0.getDay() + 6) % 7;   /* седмицата започва в понеделник */
    let cells = '';
    for (let i = 0; i < lead; i++) cells += '<div class="cal__day cal__day--out"></div>';
    for (let d = 1; d <= last.getDate(); d++) {
      const key = dayKey(new Date(y, m, d));
      const evs = dues.filter(x => x.key === key);
      cells += `<div class="cal__day${key === tKey ? ' cal__day--today' : ''}"><span class="cal__num">${d}</span>` +
        evs.map(x => `<button class="cal__ev${x.done ? ' cal__ev--done' : x.late ? ' cal__ev--late' : ''}" data-sub="${esc(x.sub.id)}" title="${esc(x.sub.customer_name + ' — ' + x.sub.plan)}">${esc(x.sub.customer_name.split(' ')[0])} · ${esc(x.sub.kg || '')} кг</button>`).join('') + '</div>';
    }
    const rem = reminders();
    const monthList = dues.length ? `<div class="tablewrap"><table><thead><tr><th>Дата</th><th>На кого</th><th>Какво</th><th>Адрес</th><th></th></tr></thead><tbody>` +
      dues.map(x => `<tr><td>${esc(fmtDay(x.date))}${x.late ? '<small>закъсняла</small>' : x.today ? '<small>днес</small>' : ''}</td>
        <td>${esc(x.sub.customer_name)}<small>${esc(x.sub.phone)}</small></td><td>${esc(x.sub.plan)}</td><td>${esc(x.sub.address || '—')}</td>
        <td class="num"><button class="btn ${x.done ? 'btn--ghost' : 'btn--green'} btn--sm" data-deliver="${esc(x.sub.id)}|${x.key}">${x.done ? 'Върни' : 'Изпратено'}</button></td></tr>`).join('') + '</tbody></table></div>'
      : '<div class="empty">Няма доставки през този месец.</div>';
    return (rem.length ? remindCard(rem) : '') +
      `<div class="card"><div class="card__head"><div class="cal__nav"><button class="btn btn--ghost btn--sm" data-cal="-1" aria-label="Предишен месец">←</button>
          <h2>${esc(m0.toLocaleDateString('bg-BG', { month: 'long', year: 'numeric' }))}</h2>
          <button class="btn btn--ghost btn--sm" data-cal="1" aria-label="Следващ месец">→</button></div>
          <button class="btn btn--ghost btn--sm" data-ics>Добави в календара на телефона</button></div>
        <div class="cal">${['Пон', 'Вт', 'Ср', 'Чет', 'Пет', 'Съб', 'Нед'].map(d => `<div class="cal__dow">${d}</div>`).join('')}${cells}</div>
        <div class="legend"><span><i style="background:var(--viz-soft)"></i>предстои</span><span><i style="background:color-mix(in srgb,var(--red) 14%,#fff)"></i>закъсняла</span><span><i style="background:var(--cream-2)"></i>изпратена</span></div>
      </div>
      <div class="card"><div class="card__head"><h2>Доставки през месеца</h2><small>кога, на кого и какво</small></div>${monthList}</div>`;
  }

  function viewMessages() {
    if (!S.msgs.length) return '<div class="card"><div class="empty">Още няма запитвания от формата за контакт.</div></div>';
    return '<div class="msgs">' + S.msgs.map(m => `<article class="msg${m.status === 'new' ? ' msg--new' : ''}">
      <div class="msg__head"><b>${esc(m.customer_name || 'Без име')}</b><span class="note">${esc(fmtDT(m.created_at))} ${m.status === 'new' ? badge({ new: ['Ново', 'new'] }, 'new') : ''}</span></div>
      <p class="msg__text">${esc(m.message)}</p>
      <div class="msg__foot">${m.phone ? `<a class="btn btn--ghost btn--sm" href="tel:${esc(digits(m.phone))}">Обади се: ${esc(m.phone)}</a>` : ''}
        ${m.email ? `<a class="btn btn--ghost btn--sm" href="mailto:${esc(m.email)}">Пиши: ${esc(m.email)}</a>` : ''}
        ${m.status === 'new' ? `<button class="btn btn--green btn--sm" data-msgread="${esc(m.id)}" title="Отбележи като прочетено">Прочетено ✓</button>` : ''}
        <button class="btn btn--danger btn--sm" data-msgdel="${esc(m.id)}">Изтрий</button></div></article>`).join('') + '</div>';
  }

  function viewStats() {
    const st = S.stats;
    const fLabels = ['Посетиха сайта', 'Разгледаха магазина', 'Сложиха в кошницата', 'Отвориха поръчката', 'Поръчаха'];
    const funnel = st.funnel.map((v, i) => ({ label: fLabels[i], v, text: num(v), sub: i ? pct(v, st.funnel[i - 1]) + '% от предната стъпка' : '100%' }));
    const hoursPts = st.hours.map((v, h) => ({ label: pad(h), tip: pad(h) + ':00–' + pad(h) + ':59', v }));
    return `<div class="tiles">
        <div class="tile"><span class="tile__label">Посещения</span><span class="tile__value">${num(st.visits)}</span><span class="tile__sub">${rangeLabel()}</span></div>
        <div class="tile"><span class="tile__label">Уникални посетители</span><span class="tile__value">${num(st.visitors)}</span><span class="tile__sub">${num(st.returning)} се връщат отново</span></div>
        <div class="tile"><span class="tile__label">Средно време на сайта</span><span class="tile__value">${fmtDur(st.avgDur)}</span><span class="tile__sub">активно време</span></div>
        <div class="tile"><span class="tile__label">Докъде скролват</span><span class="tile__value">${Math.round(st.avgScroll)}%</span><span class="tile__sub">от страницата, средно</span></div>
        <div class="tile"><span class="tile__label">Излизат веднага</span><span class="tile__value">${pct(st.bounces, st.visits)}%</span><span class="tile__sub">под 10 сек, без клик</span></div>
        <div class="tile"><span class="tile__label">Разгледани страници</span><span class="tile__value">${num(st.pages)}</span><span class="tile__sub">${st.visits ? (st.pages / st.visits).toFixed(1) : 0} на посещение</span></div>
      </div>
      <div class="card"><div class="card__head"><h2>Посещения ${S.range === 1 ? 'по часове' : 'по дни'}</h2><small>${rangeLabel()}</small></div>${columns(dailyPoints(), 'посещения')}</div>
      <div class="card funnel"><div class="card__head"><h2>Път до поръчката</h2><small>къде се отказват хората</small></div>${hbars(funnel, { max: st.funnel[0] || 1 })}</div>
      <div class="grid2">
        <div class="card"><div class="card__head"><h2>Къде гледат и колко време</h2><small>средно на посещение</small></div>${sectionBars()}</div>
        <div class="card"><div class="card__head"><h2>Какво натискат</h2><small>брой кликове</small></div>${hbars(top(st.clicks, 14).map(r => ({ label: r.k, v: r.v })))}</div>
      </div>
      <div class="grid2">
        <div class="card"><div class="card__head"><h2>Откъде идват</h2><small>посещения</small></div>${hbars(top(st.refs, 8).map(r => ({ label: r.k === 'direct' ? 'Директно / от линк' : r.k, v: r.v, sub: pct(r.v, st.visits) + '%' })))}</div>
        <div class="card"><div class="card__head"><h2>От какво устройство</h2><small>посещения</small></div>${hbars(top(st.devices, 3).map(r => ({ label: DEVICES[r.k] || r.k, v: r.v, sub: pct(r.v, st.visits) + '%' })))}</div>
      </div>
      <div class="grid2">
        <div class="card"><div class="card__head"><h2>В кои часове влизат</h2><small>посещения по час от денонощието</small></div>${columns(hoursPts, 'посещения')}</div>
        <div class="card"><div class="card__head"><h2>Най-добавяни в кошницата</h2><small>брой</small></div>${hbars(top(st.products, 8).map(r => ({ label: r.k, v: r.v })))}</div>
      </div>
      <p class="note">Статистиката е анонимна: не се пазят имена, имейли или IP адреси. Вашите собствени посещения от този браузър не се броят.</p>`;
  }

  function viewCarts() {
    const st = S.stats;
    return `<div class="tiles">
        <div class="tile"><span class="tile__label">Изоставени кошници</span><span class="tile__value">${num(st.abandoned.length)}</span><span class="tile__sub">${rangeLabel()}</span></div>
        <div class="tile"><span class="tile__label">Пропуснат оборот</span><span class="tile__value">${money(st.abandonedValue)}</span><span class="tile__sub">стойност на кошниците</span></div>
        <div class="tile"><span class="tile__label">Отказали се на формата</span><span class="tile__value">${num(st.abandoned.filter(s => s.checkout).length)}</span><span class="tile__sub">отвориха поръчката, но не я изпратиха</span></div>
        <div class="tile"><span class="tile__label">Завършили поръчка</span><span class="tile__value">${pct(st.funnel[4], st.funnel[2])}%</span><span class="tile__sub">от сложилите в кошницата</span></div>
      </div>
      <div class="card"><div class="card__head"><h2>Какво са оставили</h2><small>посетителите са анонимни — няма данни за връзка</small></div>` +
      (st.abandoned.length ? `<div class="tablewrap"><table><thead><tr><th>Кога</th><th>В кошницата</th><th class="num">Стойност</th><th>Докъде стигна</th><th>Устройство</th><th>Откъде дойде</th></tr></thead><tbody>` +
        st.abandoned.slice(0, 200).map(s => `<tr><td>${esc(fmtDT(s.end))}</td><td>${s.cart.map(i => esc(i.n) + ' × ' + esc(i.q)).join('<br>')}</td>
          <td class="num">${money(s.cartTotal)}</td><td>${s.checkout ? badge({ x: ['Отвори формата за поръчка', 'warn'] }, 'x') : badge({ x: ['Само сложи в кошницата', 'off'] }, 'x')}</td>
          <td>${esc(DEVICES[s.device] || s.device)}</td><td>${esc(s.ref === 'direct' ? 'Директно' : s.ref)}</td></tr>`).join('') + '</tbody></table></div>'
        : '<div class="empty">Няма изоставени кошници за този период.</div>') + '</div>';
  }

  /* ====================================================================== продукти, промоции и планове */
  const CATS = { variety: 'Сортове ябълки', 'mix-juice': 'Сок, оцет и миксове' };
  const todayKey = () => dayKey(new Date());
  const promoOn = p => +p.promo_percent > 0 && (!p.promo_until || p.promo_until >= todayKey());
  const priceNow = p => Math.round(p.price * (100 - (promoOn(p) ? +p.promo_percent : 0))) / 100;
  const priceLine = p => p.sale_type === 'kg'
    ? money(priceNow(p)) + ' / кг · ' + ((p.weights || []).join(', ') || '—') + ' кг'
    : money(priceNow(p)) + ' / ' + (p.unit_label || 'бр.');
  const lines = v => String(v || '').split('\n').map(x => x.trim()).filter(Boolean);
  const val = id => { const el = $('#' + id); return el ? el.value.trim() : ''; };
  const checked = id => { const el = $('#' + id); return !!(el && el.checked); };
  const numOr = (v, d) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : d; };

  function viewProducts() {
    const b = S.banner || { active: false, text: '', until: null };
    const promos = S.products.filter(promoOn).length;
    return `<div class="card">
        <div class="card__head"><h2>Промоционална лента</h2><small>показва се над продуктите в магазина</small></div>
        <div class="fields2">
          <label class="field">Текст на промоцията<input id="bnText" maxlength="160" value="${esc(b.text || '')}" placeholder="напр. −10% на всички сортове до неделя" /></label>
          <label class="field">Валидна до (по желание)<input id="bnUntil" type="date" value="${esc(b.until || '')}" /></label>
        </div>
        <div class="actions" style="margin-top:.9rem;align-items:center">
          <label class="check"><input type="checkbox" id="bnActive"${b.active ? ' checked' : ''} /> Показвай лентата на сайта</label>
          <button class="btn btn--primary btn--sm" data-bnsave>Запази лентата</button>
        </div>
      </div>
      <div class="card"><div class="card__head"><h2>Продукти</h2><div class="actions"><small>${num(S.products.length)} продукта · ${num(promos)} в промоция</small>
          <button class="btn btn--green btn--sm" data-pnew>+ Нов продукт</button></div></div>
        ${S.products.length ? `<div class="pgrid">${S.products.map(p => `<button class="pcard${p.active ? '' : ' pcard--off'}" data-product="${esc(p.id)}">
            <span class="pcard__img"><img src="${esc(p.image_url || 'img/apples.jpg')}" alt="" loading="lazy" /></span>
            <span class="pcard__body"><b>${esc(p.name)}</b><span>${esc(priceLine(p))}</span>
              <span class="pcard__tags">${p.active ? '' : badge({ x: ['Скрит', 'off'] }, 'x')}${promoOn(p) ? badge({ x: ['Промоция −' + String(+p.promo_percent).replace('.', ',') + '%', 'new'] }, 'x') : ''}${p.featured ? badge({ x: ['Голяма карта', 'info'] }, 'x') : ''}</span></span>
          </button>`).join('')}</div>` : '<div class="empty">Още няма продукти. Натиснете „Нов продукт“.</div>'}
      </div>`;
  }
  function productDrawer(id) {
    const p = id ? S.products.find(x => x.id === id) : null;
    const d = p || { name: '', description: '', tag: '', color: '#c1272d', image_url: '', category: 'variety', sale_type: 'kg', price: 2, weights: [5, 10, 20],
      unit_label: 'бр.', unit_kg: 1, featured: false, badge: '', lead: '', note: '', bullets: [], promo_percent: null, promo_label: '', promo_until: null, active: true,
      sort: (S.products.reduce((m, x) => Math.max(m, +x.sort || 0), 0) + 10) };
    openDrawer(`<div class="drawer__head"><div><h2>${p ? esc(p.name) : 'Нов продукт'}</h2><span class="note">${p ? 'промените се виждат на сайта веднага след запазване' : 'попълнете и запазете'}</span></div><button class="drawer__close" data-close-drawer aria-label="Затвори">✕</button></div>
      <div class="upload"><img id="pImgPrev" src="${esc(d.image_url || 'img/apples.jpg')}" alt="" />
        <label class="btn btn--ghost btn--sm">Смени снимката<input type="file" id="pImg" accept="image/*" hidden /></label>
        <span class="note">Снимката се смалява автоматично преди качване.</span></div>
      <label class="field">Име<input id="pName" maxlength="120" value="${esc(d.name)}" /></label>
      <label class="field">Описание<textarea id="pDesc" maxlength="600">${esc(d.description || '')}</textarea></label>
      <div class="fields2">
        <label class="field">Етикет върху снимката<input id="pTag" maxlength="80" value="${esc(d.tag || '')}" placeholder="напр. Сладка · Хрупкава" /></label>
        <label class="field">Раздел в магазина<select id="pCat">${Object.keys(CATS).map(k => `<option value="${k}"${d.category === k ? ' selected' : ''}>${CATS[k]}</option>`).join('')}</select></label>
      </div>
      <div class="fields2">
        <label class="field">Продава се<select id="pSale"><option value="kg"${d.sale_type === 'kg' ? ' selected' : ''}>На килограм (с грамажи)</option><option value="unit"${d.sale_type === 'unit' ? ' selected' : ''}>На брой</option></select></label>
        <label class="field"><span id="pPriceLbl">Цена</span><input id="pPrice" inputmode="decimal" value="${esc(String(d.price).replace('.', ','))}" /></label>
      </div>
      <div data-sale="kg"><label class="field">Грамажи за избор (кг, разделени със запетая)<input id="pWeights" value="${esc((d.weights || []).join(', '))}" placeholder="5, 10, 20" /></label></div>
      <div data-sale="unit" class="fields2">
        <label class="field">Мерна единица<input id="pUnit" maxlength="20" value="${esc(d.unit_label || 'бр.')}" placeholder="бр." /></label>
        <label class="field">Тегло на 1 бр. в кг (за доставката)<input id="pUnitKg" inputmode="decimal" value="${esc(String(d.unit_kg == null ? 1 : d.unit_kg).replace('.', ','))}" /></label>
      </div>
      <fieldset class="fieldset"><legend>Промоция</legend>
        <div class="fields2">
          <label class="field">Намаление в %<input id="pPromo" inputmode="decimal" value="${d.promo_percent ? esc(String(+d.promo_percent).replace('.', ',')) : ''}" placeholder="напр. 15" /></label>
          <label class="field">Валидна до (по желание)<input id="pPromoUntil" type="date" value="${esc(d.promo_until || '')}" /></label>
        </div>
        <label class="field">Надпис на значката (по желание)<input id="pPromoLabel" maxlength="40" value="${esc(d.promo_label || '')}" placeholder="ако е празно, излиза „−15%“" /></label>
        <p class="note" id="pPromoNote"></p>
      </fieldset>
      <fieldset class="fieldset"><legend>Голяма карта (като сока)</legend>
        <label class="check"><input type="checkbox" id="pFeat"${d.featured ? ' checked' : ''} /> Покажи продукта като голяма карта на цял ред</label>
        <div data-feat>
          <div class="fields2">
            <label class="field">Значка над името<input id="pBadge" maxlength="60" value="${esc(d.badge || '')}" placeholder="Премиум продукт" /></label>
            <label class="field">Стикер върху снимката<input id="pNote" maxlength="60" value="${esc(d.note || '')}" placeholder="без добавена захар!" /></label>
          </div>
          <label class="field">Въвеждащ текст<textarea id="pLead" maxlength="800">${esc(d.lead || '')}</textarea></label>
          <label class="field">Акценти — по един на ред: Заглавие | текст<textarea id="pBullets" style="min-height:120px">${esc((d.bullets || []).map(b => (b.title || '') + ' | ' + (b.text || '')).join('\n'))}</textarea></label>
        </div>
      </fieldset>
      <div class="fields2">
        <label class="field">Цвят на рамката<input id="pColor" type="color" value="${esc(/^#[0-9a-f]{6}$/i.test(d.color || '') ? d.color : '#c1272d')}" /></label>
        <label class="field">Подредба (по-малко = по-напред)<input id="pSort" inputmode="numeric" value="${esc(d.sort)}" /></label>
      </div>
      <label class="check"><input type="checkbox" id="pActive"${d.active ? ' checked' : ''} /> Показвай продукта в магазина</label>
      <p class="login__error" id="pError" role="alert" hidden></p>
      <div class="actions"><button class="btn btn--primary btn--sm" data-psave="${p ? esc(p.id) : ''}">Запази продукта</button>
        ${p ? `<button class="btn btn--danger btn--sm" data-pdel="${esc(p.id)}">Изтрий</button>` : ''}</div>`);
    syncProductForm();
  }
  function syncProductForm() {
    if (!$('#pSale')) return;
    const kg = $('#pSale').value === 'kg';
    $$('[data-sale]').forEach(el => { el.hidden = el.dataset.sale !== (kg ? 'kg' : 'unit'); });
    $('#pPriceLbl').textContent = kg ? 'Цена за 1 кг (€)' : 'Цена за 1 бр. (€)';
    $$('[data-feat]').forEach(el => { el.hidden = !checked('pFeat'); });
    const price = numOr(val('pPrice'), 0), pr = numOr(val('pPromo'), 0);
    $('#pPromoNote').textContent = pr > 0 ? 'Цена с намалението: ' + money(Math.round(price * (100 - pr)) / 100) + (kg ? ' / кг' : '') + ' вместо ' + money(price) : 'Без промоция.';
  }
  /* смалява снимката в браузъра (до 1400 px) преди качване */
  function shrinkImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, 1400 / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src);
        c.toBlob(b => b ? resolve(b) : reject(new Error('Снимката не можа да се обработи.')), 'image/jpeg', 0.86);
      };
      img.onerror = () => reject(new Error('Файлът не е снимка.'));
      img.src = URL.createObjectURL(file);
    });
  }
  function uploadPicked(inputId, prefix) {
    const f = $('#' + inputId) && $('#' + inputId).files[0];
    if (!f) return Promise.resolve(null);
    return shrinkImage(f).then(blob => D.upload('products', prefix + '-' + Date.now().toString(36) + '.jpg', blob));
  }
  function saveProduct(id) {
    const err = $('#pError'), show = m => { err.textContent = m; err.hidden = false; };
    err.hidden = true;
    const kg = val('pSale') === 'kg';
    const weights = val('pWeights').split(/[,;\s]+/).map(x => numOr(x, 0)).filter(x => x > 0);
    const promo = numOr(val('pPromo'), 0);
    const row = {
      name: val('pName'), description: val('pDesc') || null, tag: val('pTag') || null, category: val('pCat'), sale_type: kg ? 'kg' : 'unit',
      price: numOr(val('pPrice'), -1), weights: kg ? weights : [], unit_label: val('pUnit') || 'бр.', unit_kg: numOr(val('pUnitKg'), 1),
      promo_percent: promo > 0 ? promo : null, promo_label: val('pPromoLabel') || null, promo_until: val('pPromoUntil') || null,
      featured: checked('pFeat'), badge: val('pBadge') || null, note: val('pNote') || null, lead: val('pLead') || null,
      bullets: lines($('#pBullets').value).map((l, i) => { const k = l.indexOf('|'); return { icon: ['drop', 'shield', 'box'][i % 3], title: (k < 0 ? l : l.slice(0, k)).trim(), text: k < 0 ? '' : l.slice(k + 1).trim() }; }),
      color: val('pColor') || '#c1272d', sort: Math.round(numOr(val('pSort'), 0)), active: checked('pActive')
    };
    if (!row.name) return show('Въведете име на продукта.');
    if (row.price < 0) return show('Въведете цена.');
    if (kg && !weights.length) return show('Въведете поне един грамаж, напр. 5, 10, 20.');
    if (promo > 90) return show('Намалението може да е най-много 90%.');
    const btn = $('[data-psave]'); btn.disabled = true;
    guard(uploadPicked('pImg', 'product').then(url => {
      if (url) row.image_url = url;
      return id ? D.update('products', id, row) : D.adminInsert('products', row);
    }).then(() => D.select('products', { order: 'sort.asc' })))
      .then(rows => { S.products = rows; closeDrawer(); render(); toast('Продуктът е запазен'); })
      .catch(e => { btn.disabled = false; if (!(e && e.auth)) show(e && e.message || 'Продуктът не беше запазен.'); });
  }

  function viewPlans() {
    return `<div class="card"><div class="card__head"><h2>Абонаментни планове</h2><div class="actions"><small>показват се в раздел „Абонамент“ на сайта</small>
        <button class="btn btn--green btn--sm" data-plnew>+ Нов план</button></div></div>
      ${S.plans.length ? `<div class="pgrid">${S.plans.map(p => `<button class="pcard${p.active ? '' : ' pcard--off'}" data-plan="${esc(p.id)}">
          <span class="pcard__img"><img src="${esc(p.image_url || 'img/apples.jpg')}" alt="" loading="lazy" /></span>
          <span class="pcard__body"><b>${esc(p.tier)} — ${esc(p.title)}</b><span>${money(p.price)} на месец · ${esc(String(p.kg).replace('.', ','))} кг</span>
            <span class="pcard__tags">${p.active ? '' : badge({ x: ['Скрит', 'off'] }, 'x')}${p.hot ? badge({ x: ['Откроен', 'warn'] }, 'x') : ''}${p.badge ? badge({ x: [p.badge, 'info'] }, 'x') : ''}</span></span>
        </button>`).join('')}</div>` : '<div class="empty">Още няма планове.</div>'}
      <p class="note" style="margin-top:1rem">Промяната на план не засяга вече записаните абонати — те остават с цената, на която са се записали.</p></div>`;
  }
  function planDrawer(id) {
    const p = id ? S.plans.find(x => x.id === id) : null;
    const d = p || { tier: '', title: '', kg: 10, price: 18, description: '', perks: [], save_note: '', badge: '', hot: false, image_url: '', active: true,
      sort: (S.plans.reduce((m, x) => Math.max(m, +x.sort || 0), 0) + 10) };
    openDrawer(`<div class="drawer__head"><div><h2>${p ? esc(p.tier) : 'Нов план'}</h2><span class="note">абонаментен план</span></div><button class="drawer__close" data-close-drawer aria-label="Затвори">✕</button></div>
      <div class="upload"><img id="plImgPrev" src="${esc(d.image_url || 'img/apples.jpg')}" alt="" />
        <label class="btn btn--ghost btn--sm">Смени снимката<input type="file" id="plImg" accept="image/*" hidden /></label></div>
      <div class="fields2">
        <label class="field">Име на плана<input id="plTier" maxlength="40" value="${esc(d.tier)}" placeholder="Семейно" /></label>
        <label class="field">Заглавие<input id="plTitle" maxlength="80" value="${esc(d.title)}" placeholder="20 кг / месец" /></label>
      </div>
      <div class="fields2">
        <label class="field">Килограми на месец<input id="plKg" inputmode="decimal" value="${esc(String(d.kg).replace('.', ','))}" /></label>
        <label class="field">Цена на месец (€)<input id="plPrice" inputmode="decimal" value="${esc(String(d.price).replace('.', ','))}" /></label>
      </div>
      <label class="field">Описание<textarea id="plDesc" maxlength="400">${esc(d.description || '')}</textarea></label>
      <label class="field">Предимства — по едно на ред<textarea id="plPerks" style="min-height:110px">${esc((d.perks || []).join('\n'))}</textarea></label>
      <label class="field">Ред под цената (по желание)<input id="plSave" maxlength="120" value="${esc(d.save_note || '')}" placeholder="Спестявате 6 € спрямо еднократна поръчка" /></label>
      <div class="fields2">
        <label class="field">Значка (по желание)<input id="plBadge" maxlength="40" value="${esc(d.badge || '')}" placeholder="Най-популярен" /></label>
        <label class="field">Подредба<input id="plSort" inputmode="numeric" value="${esc(d.sort)}" /></label>
      </div>
      <label class="check"><input type="checkbox" id="plHot"${d.hot ? ' checked' : ''} /> Открои плана (златна рамка)</label>
      <label class="check"><input type="checkbox" id="plActive"${d.active ? ' checked' : ''} /> Показвай плана на сайта</label>
      <p class="login__error" id="plError" role="alert" hidden></p>
      <div class="actions"><button class="btn btn--primary btn--sm" data-plsave="${p ? esc(p.id) : ''}">Запази плана</button>
        ${p ? `<button class="btn btn--danger btn--sm" data-pldel="${esc(p.id)}">Изтрий</button>` : ''}</div>`);
  }
  function savePlan(id) {
    const err = $('#plError'), show = m => { err.textContent = m; err.hidden = false; };
    err.hidden = true;
    const row = { tier: val('plTier'), title: val('plTitle'), kg: numOr(val('plKg'), 0), price: numOr(val('plPrice'), -1), description: val('plDesc') || null,
      perks: lines($('#plPerks').value), save_note: val('plSave') || null, badge: val('plBadge') || null, hot: checked('plHot'), active: checked('plActive'),
      sort: Math.round(numOr(val('plSort'), 0)) };
    if (!row.tier || !row.title) return show('Въведете име и заглавие на плана.');
    if (row.price < 0) return show('Въведете цена.');
    const btn = $('[data-plsave]'); btn.disabled = true;
    guard(uploadPicked('plImg', 'plan').then(url => {
      if (url) row.image_url = url;
      return id ? D.update('plans', id, row) : D.adminInsert('plans', row);
    }).then(() => D.select('plans', { order: 'sort.asc' })))
      .then(rows => { S.plans = rows; closeDrawer(); render(); toast('Планът е запазен'); })
      .catch(e => { btn.disabled = false; if (!(e && e.auth)) show(e && e.message || 'Планът не беше запазен.'); });
  }
  function saveBanner() {
    const value = { active: checked('bnActive'), text: val('bnText'), until: val('bnUntil') || null };
    if (value.active && !value.text) return toast('Напишете текст на промоцията');
    guard(D.adminUpsert('site_settings', { key: 'promo_banner', value: value }, 'key')).then(() => { S.banner = value; render(); toast('Лентата е запазена'); });
  }
  document.addEventListener('change', e => {
    if (e.target.id === 'pSale' || e.target.id === 'pFeat') syncProductForm();
    if (e.target.id === 'pImg' || e.target.id === 'plImg') {
      const f = e.target.files[0], prev = $(e.target.id === 'pImg' ? '#pImgPrev' : '#plImgPrev');
      if (f && prev) prev.src = URL.createObjectURL(f);
    }
  });
  document.addEventListener('input', e => { if (e.target.id === 'pPrice' || e.target.id === 'pPromo') syncProductForm(); });

  /* ====================================================================== чекмедже */
  const drawer = $('#drawer'), panel = $('#drawerPanel');
  function openDrawer(html) { panel.innerHTML = html; drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); const c = $('.drawer__close', panel); if (c) c.focus(); }
  function closeDrawer() { drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); }
  const contactBtns = (phone, email) => `<div class="actions">
      ${phone ? `<a class="btn btn--green btn--sm" href="tel:${esc(digits(phone))}">Обади се</a>
      <a class="btn btn--ghost btn--sm" href="viber://chat?number=${encodeURIComponent(intl(phone))}">Viber</a>
      <a class="btn btn--ghost btn--sm" href="https://wa.me/${esc(intl(phone).replace('+', ''))}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
      ${email ? `<a class="btn btn--ghost btn--sm" href="mailto:${esc(email)}">Имейл</a>` : ''}</div>`;

  function orderDrawer(id) {
    const o = S.orders.find(x => x.id === id); if (!o) return;
    openDrawer(`<div class="drawer__head"><div><h2>Поръчка ${esc(o.code)}</h2><span class="note">${esc(fmtDT(o.created_at))}</span></div><button class="drawer__close" data-close-drawer aria-label="Затвори">✕</button></div>
      <div>${badge(ORDER_ST, o.status)}</div>
      <dl class="kv"><dt>Клиент</dt><dd>${esc(o.customer_name)}</dd><dt>Телефон</dt><dd>${esc(o.phone)}</dd>${o.email ? `<dt>Имейл</dt><dd>${esc(o.email)}</dd>` : ''}
        <dt>Получаване</dt><dd>${esc(deliveryText(o))}</dd>
        ${o.delivery === 'office' ? `<dt>Офис</dt><dd>${esc(o.office_name || '—')}${o.office_code ? ' <span class="note">(код ' + esc(o.office_code) + ')</span>' : ''}</dd>` : ''}
        ${o.delivery === 'address' ? `<dt>Адрес</dt><dd>${esc([o.city, o.address].filter(Boolean).join(', ') || '—')}</dd>` : ''}
        ${o.weight_kg ? `<dt>Тегло</dt><dd>${esc(String(o.weight_kg).replace('.', ','))} кг</dd>` : ''}
        <dt>Доставка</dt><dd>${esc(shipText(o))}</dd>${o.note ? `<dt>Бележка</dt><dd>${esc(o.note)}</dd>` : ''}</dl>
      ${contactBtns(o.phone, o.email)}
      <ul class="items">${(o.items || []).map(i => `<li><span>${esc(i.name)}<small>${esc(i.meta || '')} × ${esc(i.qty)}</small></span><b>${money((+i.price || 0) * (+i.qty || 1))}</b></li>`).join('')}
        <li><span>Стоки</span><b>${money(o.total)}</b></li>
        ${o.delivery_price ? `<li><span>Доставка</span><b>${money(o.delivery_price)}</b></li>` : ''}
        <li><span>Общо</span><b class="sum">${money((+o.total || 0) + (+o.delivery_price || 0))}</b></li></ul>
      <div class="field">Смени статуса<div class="actions">${Object.keys(ORDER_ST).map(k => `<button class="btn ${o.status === k ? 'btn--green' : 'btn--ghost'} btn--sm" data-ostatus="${k}" data-id="${esc(o.id)}">${esc(ORDER_ST[k][0])}</button>`).join('')}</div></div>
      <label class="field">Вътрешна бележка (вижда я само собственикът)<textarea id="oNote" maxlength="2000">${esc(o.admin_note || '')}</textarea></label>
      <div class="actions"><button class="btn btn--primary btn--sm" data-onote="${esc(o.id)}">Запази бележката</button>
        <button class="btn btn--danger btn--sm" data-odel="${esc(o.id)}">Изтрий поръчката</button></div>`);
  }
  function subDrawer(id) {
    const s = S.subs.find(x => x.id === id); if (!s) return;
    const nd = nextDue(s);
    const days = Array.from({ length: 28 }, (_, i) => `<option value="${i + 1}"${+s.delivery_day === i + 1 ? ' selected' : ''}>${i + 1}-о число</option>`).join('');
    openDrawer(`<div class="drawer__head"><div><h2>${esc(s.customer_name)}</h2><span class="note">заявка от ${esc(fmtDT(s.created_at))}</span></div><button class="drawer__close" data-close-drawer aria-label="Затвори">✕</button></div>
      <div>${badge(SUB_ST, s.status)}</div>
      <dl class="kv"><dt>План</dt><dd>${esc(s.plan)}</dd><dt>Цена</dt><dd>${money(s.price)} на месец</dd><dt>Телефон</dt><dd>${esc(s.phone)}</dd>${s.email ? `<dt>Имейл</dt><dd>${esc(s.email)}</dd>` : ''}
        ${s.variety ? `<dt>Сорт</dt><dd>${esc(s.variety)}</dd>` : ''}<dt>Адрес</dt><dd>${esc(s.address || '—')}</dd>${s.note ? `<dt>Бележка от клиента</dt><dd>${esc(s.note)}</dd>` : ''}${s.start_pref ? `<dt>Желано начало</dt><dd>${esc(s.start_pref)}</dd>` : ''}
        <dt>Следваща доставка</dt><dd>${nd ? esc(fmtDay(nd)) : 'няма (не е активен или няма зададен ден)'}</dd></dl>
      ${contactBtns(s.phone, s.email)}
      <div class="field">Статус<div class="actions">${Object.keys(SUB_ST).map(k => `<button class="btn ${s.status === k ? 'btn--green' : 'btn--ghost'} btn--sm" data-sstatus="${k}" data-id="${esc(s.id)}">${esc(SUB_ST[k][0])}</button>`).join('')}</div></div>
      <div class="fields2">
        <label class="field">Ден за доставка всеки месец<select id="sDay"><option value="">— изберете —</option>${days}</select></label>
        <label class="field">Първа доставка<input type="date" id="sStart" value="${esc(s.started_on || '')}" /></label>
      </div>
      <label class="field">Вътрешна бележка<textarea id="sNote" maxlength="2000">${esc(s.admin_note || '')}</textarea></label>
      <p class="note">За да излезе в календара с напомняне, абонаментът трябва да е „Активен" и да има зададен ден за доставка.</p>
      <div class="actions"><button class="btn btn--primary btn--sm" data-ssave="${esc(s.id)}">Запази</button>
        <button class="btn btn--danger btn--sm" data-sdel="${esc(s.id)}">Изтрий</button></div>`);
  }

  /* ====================================================================== действия */
  function patchLocal(list, id, patch) { const r = list.find(x => x.id === id); if (r) Object.assign(r, patch); }
  function csv() {
    const head = ['Номер', 'Дата', 'Статус', 'Клиент', 'Телефон', 'Имейл', 'Получаване', 'Адрес / офис / обект', 'Тегло (кг)', 'Продукти', 'Стоки (€)', 'Доставка (€)', 'Бележка'];
    const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const lines = [head.map(q).join(';')].concat(S.orders.map(o => [o.code, fmtDT(o.created_at), (ORDER_ST[o.status] || [o.status])[0], o.customer_name, o.phone, o.email,
      deliveryText(o), o.delivery === 'pickup' ? o.pickup_place : o.delivery === 'office' ? o.office_name : [o.city, o.address].filter(Boolean).join(', '),
      o.weight_kg == null ? '' : String(o.weight_kg).replace('.', ','),
      (o.items || []).map(i => i.name + ' ' + (i.meta || '') + ' x' + i.qty).join(' | '), String(o.total).replace('.', ','),
      o.delivery_price == null ? '' : String(o.delivery_price).replace('.', ','), o.note].map(q).join(';')));
    download('porachki-' + dayKey(new Date()) + '.csv', '﻿' + lines.join('\r\n'), 'text/csv;charset=utf-8');
  }
  function ics() {
    const act = S.subs.filter(s => s.status === 'active' && s.delivery_day);
    if (!act.length) return toast('Няма активни абонаменти със зададен ден');
    const z = s => String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\r?\n/g, '\\n');
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const body = act.map(s => {
      const nd = nextDue(s) || clampDay(today0().getFullYear(), today0().getMonth() + 1, s.delivery_day);
      const d0 = nd.getFullYear() + pad(nd.getMonth() + 1) + pad(nd.getDate());
      const e = new Date(nd); e.setDate(e.getDate() + 1);
      const d1 = e.getFullYear() + pad(e.getMonth() + 1) + pad(e.getDate());
      return ['BEGIN:VEVENT', 'UID:' + s.id + '@umarevska-yabalka', 'DTSTAMP:' + stamp, 'DTSTART;VALUE=DATE:' + d0, 'DTEND;VALUE=DATE:' + d1,
        'RRULE:FREQ=MONTHLY;BYMONTHDAY=' + s.delivery_day, 'SUMMARY:' + z('Абонамент: ' + s.customer_name + ' — ' + s.plan),
        'DESCRIPTION:' + z('Телефон: ' + s.phone + '\nАдрес: ' + (s.address || '—')), 'BEGIN:VALARM', 'ACTION:DISPLAY',
        'DESCRIPTION:' + z('Утре: доставка по абонамент — ' + s.customer_name), 'TRIGGER:-PT15H', 'END:VALARM', 'END:VEVENT'].join('\r\n');
    }).join('\r\n');
    download('abonamenti-dostavki.ics', 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Umarevska Yabalka//Admin//BG\r\nCALSCALE:GREGORIAN\r\n' + body + '\r\nEND:VCALENDAR\r\n', 'text/calendar;charset=utf-8');
  }
  function download(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  let toastT;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }

  document.addEventListener('click', e => {
    const t = e.target.closest('[data-view],[data-go],[data-range],[data-order],[data-sub],[data-close-drawer],[data-ofilter],[data-csv],[data-ics],[data-cal],[data-deliver],[data-ostatus],[data-onote],[data-odel],[data-sstatus],[data-ssave],[data-sdel],[data-msgread],[data-msgdel],[data-push],[data-install],[data-product],[data-pnew],[data-psave],[data-pdel],[data-plan],[data-plnew],[data-plsave],[data-pldel],[data-bnsave]');
    if (!t) return;
    const ds = t.dataset;
    if (ds.view || ds.go) { S.view = ds.view || ds.go; try { history.replaceState(null, '', '#' + S.view); } catch (err) {} render(); window.scrollTo(0, 0); }
    else if (ds.push) ({ on: pushOn, off: pushOff, test: pushTest })[ds.push]();
    else if ('install' in ds) { if (installEvt) { installEvt.prompt(); installEvt = null; } }
    else if (ds.range) { S.range = +ds.range; $$('#range button').forEach(b => b.classList.toggle('active', b === t)); loadAll(); }
    else if ('closeDrawer' in ds) closeDrawer();
    else if (ds.deliver) { const p = ds.deliver.split('|'); toggleDelivered(p[0], p[1]); }
    else if ('pnew' in ds) productDrawer(null);
    else if (ds.product) productDrawer(ds.product);
    else if ('psave' in ds) saveProduct(ds.psave || null);
    else if (ds.pdel) { if (confirm('Да изтрия ли този продукт завинаги? Ако искате само да го скриете, махнете отметката „Показвай продукта“.')) guard(D.remove('products', ds.pdel)).then(() => { S.products = S.products.filter(p => p.id !== ds.pdel); closeDrawer(); render(); toast('Продуктът е изтрит'); }); }
    else if ('plnew' in ds) planDrawer(null);
    else if (ds.plan) planDrawer(ds.plan);
    else if ('plsave' in ds) savePlan(ds.plsave || null);
    else if (ds.pldel) { if (confirm('Да изтрия ли този план завинаги?')) guard(D.remove('plans', ds.pldel)).then(() => { S.plans = S.plans.filter(p => p.id !== ds.pldel); closeDrawer(); render(); toast('Планът е изтрит'); }); }
    else if ('bnsave' in ds) saveBanner();
    else if (ds.order) orderDrawer(ds.order);
    else if (ds.sub) subDrawer(ds.sub);
    else if (ds.ofilter) { S.orderFilter = ds.ofilter; render(); }
    else if ('csv' in ds) csv();
    else if ('ics' in ds) ics();
    else if (ds.cal) { S.calMonth = new Date(S.calMonth.getFullYear(), S.calMonth.getMonth() + (+ds.cal), 1); render(); }
    else if (ds.ostatus) guard(D.update('orders', ds.id, { status: ds.ostatus })).then(() => { patchLocal(S.orders, ds.id, { status: ds.ostatus }); render(); orderDrawer(ds.id); toast('Статусът е сменен'); });
    else if (ds.onote) { const v = $('#oNote').value; guard(D.update('orders', ds.onote, { admin_note: v })).then(() => { patchLocal(S.orders, ds.onote, { admin_note: v }); toast('Бележката е запазена'); }); }
    else if (ds.odel) { if (confirm('Да изтрия ли тази поръчка завинаги? Това не може да се върне.')) guard(D.remove('orders', ds.odel)).then(() => { S.orders = S.orders.filter(o => o.id !== ds.odel); closeDrawer(); render(); toast('Поръчката е изтрита'); }); }
    else if (ds.sstatus) guard(D.update('subscriptions', ds.id, { status: ds.sstatus })).then(() => { patchLocal(S.subs, ds.id, { status: ds.sstatus }); render(); subDrawer(ds.id); toast('Статусът е сменен'); });
    else if (ds.ssave) {
      const patch = { delivery_day: +$('#sDay').value || null, started_on: $('#sStart').value || null, admin_note: $('#sNote').value };
      guard(D.update('subscriptions', ds.ssave, patch)).then(() => { patchLocal(S.subs, ds.ssave, patch); render(); subDrawer(ds.ssave); toast('Запазено'); });
    }
    else if (ds.sdel) { if (confirm('Да изтрия ли този абонамент завинаги?')) guard(D.remove('subscriptions', ds.sdel)).then(() => { S.subs = S.subs.filter(s => s.id !== ds.sdel); closeDrawer(); render(); toast('Абонаментът е изтрит'); }); }
    else if (ds.msgread) guard(D.update('messages', ds.msgread, { status: 'read' })).then(() => { patchLocal(S.msgs, ds.msgread, { status: 'read' }); render(); });
    else if (ds.msgdel) { if (confirm('Да изтрия ли това запитване?')) guard(D.remove('messages', ds.msgdel)).then(() => { S.msgs = S.msgs.filter(m => m.id !== ds.msgdel); render(); }); }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeDrawer();
    if (e.key === 'Enter' && e.target.matches && e.target.matches('tr.rowlink')) e.target.click();
  });
  document.addEventListener('input', e => {
    if (e.target.id !== 'orderSearch') return;
    S.orderSearch = e.target.value;
    const pos = e.target.selectionStart;
    render();
    const n = $('#orderSearch'); if (n) { n.focus(); n.setSelectionRange(pos, pos); }
  });
  /* --- смяна на парола --- */
  $('#pwBtn').addEventListener('click', () => {
    openDrawer(`<div class="drawer__head"><div><h2>Смяна на парола</h2><span class="note">за входа в админ панела</span></div><button class="drawer__close" data-close-drawer aria-label="Затвори">✕</button></div>
      <form id="pwForm" style="display:flex;flex-direction:column;gap:1rem">
        <label class="field">Нова парола<input type="password" name="p1" autocomplete="new-password" minlength="8" required /></label>
        <label class="field">Повторете новата парола<input type="password" name="p2" autocomplete="new-password" minlength="8" required /></label>
        <p class="note">Поне 8 знака. След смяната оставате влезли на това устройство.</p>
        <p class="login__error" id="pwError" role="alert" hidden></p>
        <div class="actions"><button type="submit" class="btn btn--primary btn--sm">Запази новата парола</button></div>
      </form>`);
  });
  document.addEventListener('submit', e => {
    if (e.target.id !== 'pwForm') return;
    e.preventDefault();
    const f = e.target, err = $('#pwError'), btn = f.querySelector('button[type="submit"]');
    const show = m => { err.textContent = m; err.hidden = false; };
    err.hidden = true;
    if (f.p1.value !== f.p2.value) return show('Двете пароли не съвпадат.');
    btn.disabled = true;
    D.updatePassword(f.p1.value).then(() => { closeDrawer(); toast('Паролата е сменена'); })
      .catch(er => { if (er && er.auth) showLogin(er.message); else show(er && er.message || 'Паролата не беше сменена.'); })
      .finally(() => { btn.disabled = false; });
  });

  $('#refreshBtn').addEventListener('click', () => loadAll().then(() => toast('Данните са обновени')));

  /* ====================================================================== рисуване */
  function render() {
    const views = { home: viewHome, orders: viewOrders, subs: viewSubs, calendar: viewCalendar, messages: viewMessages, stats: viewStats, carts: viewCarts, products: viewProducts, plans: viewPlans };
    $('#viewTitle').textContent = TITLES[S.view];
    $('#range').hidden = !(S.view === 'home' || S.view === 'stats' || S.view === 'carts');
    $$('#nav button').forEach(b => b.classList.toggle('active', b.dataset.view === S.view));
    const navEl = document.getElementById('nav'), act = navEl && navEl.querySelector('button.active');      /* на телефон: избраният таб да се вижда в лентата */
    if (act && navEl.scrollWidth > navEl.clientWidth) navEl.scrollTo({ left: Math.max(0, act.offsetLeft - navEl.offsetLeft - 44), behavior: 'smooth' });
    const badges = { orders: S.orders.filter(o => o.status === 'new').length, subs: S.subs.filter(s => s.status === 'new').length,
                     messages: S.msgs.filter(m => m.status === 'new').length, calendar: reminders().filter(x => x.late || x.today).length };
    $$('[data-badge]').forEach(i => { const n = badges[i.dataset.badge] || 0; i.textContent = n; i.classList.toggle('on', n > 0); });
    $('#view').innerHTML = views[S.view]();
  }

  /* ====================================================================== примерни данни (само в демо режим) */
  $('#seedBtn').addEventListener('click', () => {
    if (D.mode !== 'demo') return;
    let seed = 20261116; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
    const pick = (arr, w) => { if (!w) return arr[Math.floor(rnd() * arr.length)]; let r = rnd() * w.reduce((a, b) => a + b, 0); for (let i = 0; i < arr.length; i++) { r -= w[i]; if (r <= 0) return arr[i]; } return arr[0]; };
    const names = ['Иван Петров', 'Мария Георгиева', 'Георги Димитров', 'Елена Николова', 'Стефан Тодоров', 'Десислава Иванова', 'Николай Стоянов', 'Виктория Маринова', 'Петър Колев', 'Анна Христова'];
    const towns = ['гр. Плевен, ул. Примерна 12', 'гр. Ловеч, ж.к. Здравец, бл. 3', 'гр. София, ул. Тестова 45, ап. 8', 'гр. Троян, ул. Образцова 7', 'гр. Велико Търново, ул. Демо 21'];
    const catalog = [['Ябълки Фуджи', '5 кг', 10], ['Ябълки Пинова', '10 кг', 20], ['Свежи ябълки (микс)', '5 кг', 10], ['Натурален ябълков сок', '10 € / бр.', 10], ['Ябълки Златна превъзходна', '10 кг', 20], ['Ябълки Флорина', '5 кг', 10]];
    const clickPool = ['Меню › Магазин', 'Начален екран › Към магазина', 'Магазин › Поръчай', 'Магазин › Сок, оцет и миксове', 'Галерия › Снимка', 'Меню › Галерия', 'В медиите › Пусни видеото „От търговец до овощар“',
      'Абонамент › Абонирай се', 'Обекти › Виж в Google Maps', 'Плаващ бутон › Viber', 'Меню › Контакти', 'Блог › Статия: Кой сорт ябълка да изберете?', 'Кошница › Завърши поръчката', 'Начален екран › Нашата история'];
    const events = [], orders = [], now = Date.now();
    const vids = [];
    for (let d = 89; d >= 0; d--) {
      const day = new Date(now - d * 86400000); const wk = day.getDay();
      const n = Math.round((7 + rnd() * 9) * (wk === 0 || wk === 6 ? 1.35 : 1) * (1 + (89 - d) / 220));
      for (let k = 0; k < n; k++) {
        const t = new Date(day); t.setHours(pick([8, 9, 10, 11, 12, 13, 14, 16, 17, 18, 19, 20, 21, 22], [2, 3, 5, 5, 4, 3, 3, 3, 4, 6, 8, 9, 7, 3]), Math.floor(rnd() * 60), Math.floor(rnd() * 60));
        if (t.getTime() > now) continue;
        const sid = 's' + d + '_' + k, ret = vids.length > 5 && rnd() < .22;
        const vid = ret ? pick(vids) : 'v' + d + '_' + k; if (!ret) vids.push(vid);
        const device = pick(['mobile', 'desktop', 'tablet'], [62, 30, 8]);
        const ref = pick(['direct', 'google.com', 'facebook.com', 'instagram.com', 'agri.bg'], [40, 25, 20, 10, 5]);
        const base = { session_id: sid, visitor_id: vid, device, referrer: ref, path: 'index.html' };
        const ev = (off, type, name, data) => events.push(Object.assign({ id: D.uid(), created_at: new Date(t.getTime() + off * 1000).toISOString(), type, name: name || null, data: data || null }, base));
        ev(0, 'visit', null, { ret, w: device === 'mobile' ? 390 : 1440 });
        const bounce = rnd() < .24;
        const dwell = { hero: bounce ? 3 + Math.floor(rnd() * 5) : 5 + Math.floor(rnd() * 12) }, clicks = {};
        if (!bounce) {
          [['story', .72, 55], ['values', .55, 18], ['shop', .6, 80], ['subscribe', .36, 30], ['gallery', .33, 45], ['media', .2, 40], ['blog', .16, 25], ['locations', .2, 22], ['contact', .13, 20]]
            .forEach(s => { if (rnd() < s[1]) dwell[s[0]] = 3 + Math.floor(rnd() * s[2]); });
          const nc = Math.floor(rnd() * 5);
          for (let c = 0; c < nc; c++) { const l = pick(clickPool, [9, 8, 9, 4, 6, 4, 3, 4, 3, 3, 2, 2, 3, 3]); clicks[l] = (clicks[l] || 0) + 1; }
        }
        const dur = Object.keys(dwell).reduce((a, x) => a + dwell[x], 0);
        ev(dur, 'beat', null, { dur, dwell, clicks, scroll: bounce ? Math.floor(rnd() * 12) : 20 + Math.floor(rnd() * 80) });
        if (!bounce && dwell.shop && rnd() < .3) {
          const it = pick(catalog), qty = 1 + Math.floor(rnd() * 2);
          const cart = [{ n: it[0] + ' · ' + it[1].split(' · ')[0], q: qty, p: it[2] }];
          if (rnd() < .3) { const it2 = pick(catalog); cart.push({ n: it2[0] + ' · ' + it2[1], q: 1, p: it2[2] }); }
          const total = cart.reduce((a, c) => a + c.q * c.p, 0);
          ev(dur + 5, 'cart', 'add', { item: it[0], qty, cart, total });
          if (rnd() < .55) {
            ev(dur + 20, 'checkout_open', null, { cart, total });
            if (rnd() < .6) {
              const code = 'UY-' + Math.floor(rnd() * 1e9).toString(36).toUpperCase().slice(0, 5).padStart(5, '7');
              ev(dur + 70, 'order', code, { total, items: cart.length });
              const pickup = rnd() < .25, age = d;
              orders.push({ id: D.uid(), created_at: new Date(t.getTime() + (dur + 70) * 1000).toISOString(), code, customer_name: pick(names), phone: '0888 ' + (100 + Math.floor(rnd() * 899)) + ' ' + (100 + Math.floor(rnd() * 899)),
                email: rnd() < .5 ? 'klient' + Math.floor(rnd() * 99) + '@example.com' : null, delivery: pickup ? 'pickup' : 'address', address: pickup ? null : pick(towns),
                pickup_place: pickup ? pick(['с. Умаревци (обект 1)', 'с. Брестовец, Плевен (обект 2)', 'с. Калейца, на пътя за Троян (обект 3)']) : null,
                note: rnd() < .2 ? 'Моля, обадете се преди доставка.' : null, items: cart.map(c => ({ name: c.n.split(' · ')[0], meta: c.n.split(' · ')[1] || '', qty: c.q, price: c.p })), total,
                status: age === 0 ? 'new' : age < 2 ? pick(['new', 'confirmed']) : age < 5 ? pick(['confirmed', 'shipped']) : pick(['done', 'done', 'done', 'cancelled'], [5, 5, 5, 2]), admin_note: null, session_id: sid });
            }
          }
        }
      }
    }
    const iso = off => { const x = today0(); x.setDate(x.getDate() + off); return dayKey(x); };
    const tday = today0().getDate();
    const dayIn = off => { const x = today0(); x.setDate(x.getDate() + off); return Math.min(28, x.getDate()); };
    const subs = [
      { plan: 'Семеен — 10 кг / месец', price: 18, kg: 10, customer_name: 'Мария Георгиева', phone: '0888 111 222', email: 'maria@example.com', address: 'гр. Плевен, ул. Примерна 12', status: 'active', delivery_day: dayIn(0), started_on: iso(-70) },
      { plan: 'Стандарт — 5 кг / месец', price: 10, kg: 5, customer_name: 'Георги Димитров', phone: '0888 333 444', email: null, address: 'гр. Ловеч, ж.к. Здравец, бл. 3', status: 'active', delivery_day: dayIn(3), started_on: iso(-40) },
      { plan: 'Бизнес — 30 кг / месец', price: 48, kg: 30, customer_name: 'Ресторант „Демо“', phone: '0888 555 666', email: 'office@example.com', address: 'гр. Троян, ул. Образцова 7', status: 'active', delivery_day: dayIn(-4), started_on: iso(-100) },
      { plan: 'Семеен — 10 кг / месец', price: 18, kg: 10, customer_name: 'Елена Николова', phone: '0888 777 888', email: null, address: 'гр. София, ул. Тестова 45', status: 'new', delivery_day: null, started_on: null, start_pref: 'Следващия месец' },
      { plan: 'Стандарт — 5 кг / месец', price: 10, kg: 5, customer_name: 'Петър Колев', phone: '0888 999 000', email: null, address: 'гр. Велико Търново, ул. Демо 21', status: 'paused', delivery_day: 15, started_on: iso(-120) }
    ].map((s, i) => Object.assign({ id: D.uid(), created_at: new Date(now - (20 - i * 3) * 86400000).toISOString(), admin_note: null, start_pref: null }, s));
    const msgs = [
      { customer_name: 'Николай Стоянов', phone: '0888 121 212', email: null, message: 'Здравейте, предлагате ли доставка на 50 кг за заведение всяка седмица?', status: 'new' },
      { customer_name: 'Анна Христова', phone: null, email: 'anna@example.com', message: 'Имате ли още от сорта Флорина и до кога?', status: 'new' },
      { customer_name: 'Стефан Тодоров', phone: '0888 343 434', email: null, message: 'Много вкусен сок, благодаря! Кога ще има нова партида?', status: 'read' }
    ].map((m, i) => Object.assign({ id: D.uid(), created_at: new Date(now - (i * 2 + 1) * 43200000).toISOString() }, m));
    /* по-старите абонаментни доставки вече са „изпратени“; последните остават за напомняне */
    const sent = [], lim = today0(); lim.setDate(lim.getDate() - 6);
    subs.filter(s => s.status === 'active').forEach(s => {
      const first = parseDay(s.started_on);
      for (let i = 0; i < 5; i++) {
        const dd = clampDay(today0().getFullYear(), today0().getMonth() - i, s.delivery_day);
        if (dd >= first && dd < lim) sent.push({ id: D.uid(), created_at: dd.toISOString(), subscription_id: s.id, due_date: dayKey(dd), note: null });
      }
    });
    orders.sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, 3).forEach(o => { o.status = 'new'; });
    D.demoReplace('events', events); D.demoReplace('orders', orders); D.demoReplace('subscriptions', subs);
    D.demoReplace('messages', msgs); D.demoReplace('sub_deliveries', sent);
    S.calMonth = null;
    loadAll().then(() => toast('Заредени са примерни данни'));
  });

  window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (TITLES[h] && !appEl.hidden) { S.view = h; loadAll(); } });

  start();
})();
