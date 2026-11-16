/* Анонимна статистика за собственика: посещения, време по секции, кликове, кошница.
   Не се пазят имена, имейли, IP адреси или въведен текст — само случаен номер на посещението.
   Данните се изпращат на малки порции, когато страницата се скрие или затвори.

   Статистиката тръгва САМО след съгласие на посетителя (лентата долу на екрана). Изборът се пази
   в localStorage като um_consent = 'yes' | 'no'; без „yes“ нищо не се записва и не се изпраща.
   Връзка с атрибут data-consent-open (във футъра) показва лентата отново. */
(function () {
  'use strict';
  var D = window.UMData;
  var noop = { event: function () {}, sid: null };
  window.UMTrack = noop;
  var off = !D || D.mode === 'off';
  try { if (localStorage.getItem('um_no_track') === '1') off = true; } catch (e) {}
  var bot = /bot|crawl|spider|lighthouse|headless|preview/i.test(navigator.userAgent);

  function choice() { try { return localStorage.getItem('um_consent'); } catch (e) { return null; } }
  function forget() { try { localStorage.removeItem('um_vid'); sessionStorage.removeItem('um_sid'); } catch (e) {} }
  var started = false, bar = null;
  function decide(yes) {
    try { localStorage.setItem('um_consent', yes ? 'yes' : 'no'); } catch (e) {}
    if (bar) { bar.remove(); bar = null; }
    if (yes) { if (!off && !bot && !started) { started = true; start(); } }
    else { forget(); if (started) location.reload(); }       /* спира вече тръгналата статистика */
  }
  function showBar() {
    if (bar) return;
    bar = document.createElement('div');
    bar.className = 'consent';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'Съгласие за статистика');
    bar.innerHTML = '<p><strong>Статистика на сайта</strong>Може ли да записваме анонимна статистика за посещенията? За нея в браузъра ви се пази случаен номер — без име, телефон или реклами. <a href="poveritelnost.html">Поверителност</a></p>'
      + '<div class="consent__btns"><button type="button" class="btn btn--sm consent__no">Отказвам</button><button type="button" class="btn btn--sm consent__yes">Приемам</button></div>';
    bar.querySelector('.consent__yes').addEventListener('click', function () { decide(true); });
    bar.querySelector('.consent__no').addEventListener('click', function () { decide(false); });
    document.body.appendChild(bar);
  }
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('[data-consent-open]') : null;
    if (a) { e.preventDefault(); showBar(); }
  });
  if (off || bot) return;
  var c = choice();
  if (c === 'yes') { started = true; start(); }
  else { forget(); if (c !== 'no') showBar(); }

  function start() {
  function rid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
  var sid, vid, firstPage = false, returning = false;
  try {
    sid = sessionStorage.getItem('um_sid');
    if (!sid) { sid = rid(); sessionStorage.setItem('um_sid', sid); firstPage = true; }
    vid = localStorage.getItem('um_vid');
    if (vid) returning = firstPage; else { vid = rid(); localStorage.setItem('um_vid', vid); }
  } catch (e) { sid = sid || rid(); vid = vid || sid; firstPage = true; }

  var W = window.innerWidth;
  var device = W < 680 ? 'mobile' : (W < 1024 ? 'tablet' : 'desktop');
  var path = (location.pathname.split('/').pop() || 'index.html') + (/article\.html/.test(location.pathname) ? location.search.replace(/&.*/, '') : '');
  var ref = 'direct';
  try {
    var q = new URLSearchParams(location.search);
    var utm = q.get('utm_source');
    if (utm) ref = utm.slice(0, 60);
    else if (document.referrer) { var h = new URL(document.referrer).hostname.replace(/^www\./, ''); if (h && h !== location.hostname) ref = h; }
  } catch (e) {}

  function send(type, name, data, keepalive) {
    D.insert('events', {
      session_id: sid, visitor_id: vid, type: type, name: name ? String(name).slice(0, 150) : null,
      path: path.slice(0, 190), device: device, referrer: ref, data: data || null
    }, { keepalive: !!keepalive });
  }

  /* --- посещение / страница --- */
  if (firstPage) send('visit', null, { ret: returning, w: W, h: window.innerHeight, lang: (navigator.language || '').slice(0, 8) });
  else send('page', null, null);

  /* --- време по секции, скрол, кликове (събират се и се пращат на порции) --- */
  var NAMES = { hero: 'Начален екран', story: 'Нашата история', values: 'Нашето обещание', shop: 'Магазин', subscribe: 'Абонамент',
                gallery: 'Галерия', media: 'В медиите', blog: 'Блог', locations: 'Обекти', contact: 'Контакти' };
  function secKey(s) { return s.id || (s.className || '').split(' ')[0] || 'section'; }
  var sections = Array.prototype.slice.call(document.querySelectorAll('section'));
  var isArticle = !sections.length;
  var dwell = {}, clicks = {}, active = 0, maxScroll = 0, dirty = false;
  var lastAct = Date.now();
  ['scroll', 'pointerdown', 'keydown', 'pointermove', 'touchstart'].forEach(function (ev) {
    window.addEventListener(ev, function () { lastAct = Date.now(); }, { passive: true });
  });

  setInterval(function () {
    if (document.hidden || Date.now() - lastAct > 60000) return;   /* брои само когато човекът наистина е тук */
    active++; dirty = true;
    var mid = window.innerHeight / 2, key = isArticle ? 'article' : null;
    for (var i = 0; i < sections.length && !key; i++) {
      var r = sections[i].getBoundingClientRect();
      if (r.top <= mid && r.bottom > mid) key = secKey(sections[i]);
    }
    if (!key && !isArticle) key = 'footer';
    dwell[key] = (dwell[key] || 0) + 1;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (max > 0) maxScroll = Math.max(maxScroll, Math.min(100, Math.round(window.scrollY / max * 100)));
  }, 1000);

  function clickLabel(target) {
    var t = target.closest('[data-track]');
    if (t) return t.getAttribute('data-track');
    var el = target.closest('a,button,.gal__item,.post');
    if (!el) return null;
    var where = el.closest('.nav') ? 'Меню' : el.closest('.footer') ? 'Футър' : el.closest('.cart') ? 'Кошница'
      : el.closest('.wa-float') ? 'Плаващ бутон' : el.closest('.lightbox') ? 'Преглед на снимка'
      : el.closest('.modal,.sub-modal') ? 'Форма' : null;
    if (!where) { var s = el.closest('section'); where = s ? (NAMES[secKey(s)] || secKey(s)) : 'Друго'; }
    var text;
    if (el.classList.contains('gal__item')) text = 'Снимка';
    else if (el.classList.contains('post')) { var h = el.querySelector('.post__title'); text = 'Статия: ' + (h ? h.textContent : ''); }
    else text = el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '';
    text = text.replace(/\s+/g, ' ').trim().slice(0, 44);
    return text ? where + ' › ' + text : null;
  }
  document.addEventListener('click', function (e) {
    var l = e.target && e.target.closest ? clickLabel(e.target) : null;
    if (!l) return;
    clicks[l] = (clicks[l] || 0) + 1; dirty = true;
  }, true);

  function flush(keepalive) {
    if (!dirty) return;
    send('beat', null, { dur: active, dwell: dwell, clicks: clicks, scroll: maxScroll }, keepalive);
    dwell = {}; clicks = {}; active = 0; dirty = false;
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) flush(true); });
  window.addEventListener('pagehide', function () { flush(true); });
  setInterval(function () { flush(false); }, 45000);

  /* --- именувани събития от сайта (кошница, поръчка, абонамент …) --- */
  window.UMTrack = {
    sid: sid,
    event: function (type, name, data) { flush(false); send(type, name, data, true); }
  };
  }
})();
