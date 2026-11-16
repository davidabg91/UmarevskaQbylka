/* Слой за данни: поръчки, абонаменти, запитвания и статистика.
   Режими:
     supabase — има попълнен config.js → всичко отива в базата
     demo     — няма конфигурация И сайтът е отворен локално → данните стоят в този браузър (за преглед)
     off      — няма конфигурация на живия сайт → нищо не се записва */
(function () {
  'use strict';
  var C = window.UM_CONFIG || {};
  var BASE = String(C.supabaseUrl || '').trim().replace(/\/+$/, '');
  var KEY = String(C.supabaseKey || '').trim();
  var isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  var mode = BASE && KEY ? 'supabase' : (isLocal ? 'demo' : 'off');
  var SESSION_KEY = 'um_admin_session';
  var DEMO_PREFIX = 'um_demo_';

  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16);
    });
  }

  /* ---------- demo (локално хранилище) ---------- */
  function demoRead(t) { try { return JSON.parse(localStorage.getItem(DEMO_PREFIX + t)) || []; } catch (e) { return []; } }
  function demoWrite(t, rows) { try { localStorage.setItem(DEMO_PREFIX + t, JSON.stringify(rows)); } catch (e) {} }
  function demoMatch(row, f) {
    var v = row[f[0]], x = f[2];
    switch (f[1]) {
      case 'eq': return String(v) === String(x);
      case 'gte': return v >= x;
      case 'lte': return v <= x;
      case 'lt': return v < x;
      default: return true;
    }
  }

  /* ---------- supabase (REST) ---------- */
  function headers(token, extra) {
    var h = { 'apikey': KEY, 'Content-Type': 'application/json' };
    /* новите publishable ключове вървят само в apikey; старите anon ключове (JWT) — и като Bearer */
    var bearer = token || (KEY.indexOf('eyJ') === 0 ? KEY : '');
    if (bearer) h.Authorization = 'Bearer ' + bearer;
    if (extra) for (var k in extra) h[k] = extra[k];
    return h;
  }
  function readSession() { try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) { return null; } }
  function writeSession(s) { try { s ? localStorage.setItem(SESSION_KEY, JSON.stringify(s)) : localStorage.removeItem(SESSION_KEY); } catch (e) {} }
  function packSession(j) {
    return { access_token: j.access_token, refresh_token: j.refresh_token,
             expires_at: Date.now() + (j.expires_in || 3600) * 1000, email: j.user && j.user.email };
  }
  function refresh(s) {
    return fetch(BASE + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST', headers: headers(), body: JSON.stringify({ refresh_token: s.refresh_token })
    }).then(function (r) { if (!r.ok) throw new Error('refresh'); return r.json(); })
      .then(function (j) { var n = packSession(j); if (!n.email) n.email = s.email; writeSession(n); return n; });
  }
  /* валидна сесия (обновява я, ако изтича) или null */
  function getSession() {
    var s = readSession();
    if (!s) return Promise.resolve(null);
    if (mode !== 'supabase') return Promise.resolve(s.demo ? s : null);
    if (s.demo) { writeSession(null); return Promise.resolve(null); }
    if (s.expires_at - Date.now() > 60000) return Promise.resolve(s);
    return refresh(s).catch(function () { writeSession(null); return null; });
  }
  function authed(fn) {
    return getSession().then(function (s) {
      if (!s) { var e = new Error('Сесията е изтекла. Влезте отново.'); e.auth = true; throw e; }
      return fn(s);
    });
  }
  function fail(r) {
    return r.text().then(function (t) {
      var msg = t; try { var j = JSON.parse(t); msg = j.message || j.msg || j.error_description || j.error || t; } catch (e) {}
      var err = new Error(msg || ('HTTP ' + r.status)); err.status = r.status;
      if (r.status === 401) err.auth = true;
      throw err;
    });
  }

  var API = {
    mode: mode,

    /* публично: запис на ред (поръчка, абонамент, запитване, събитие) */
    insert: function (table, row, opts) {
      if (mode === 'off') return Promise.resolve({ ok: false, error: 'not-configured' });
      if (mode === 'demo') {
        var rows = demoRead(table), r = {};
        for (var k in row) r[k] = row[k];
        if (!r.id) r.id = uid();
        if (!r.created_at) r.created_at = new Date().toISOString();
        rows.push(r); demoWrite(table, rows);
        return Promise.resolve({ ok: true });
      }
      return authedOrAnon().then(function (token) {
        return fetch(BASE + '/rest/v1/' + table, {
          method: 'POST', headers: headers(token, { Prefer: 'return=minimal' }),
          body: JSON.stringify(row), keepalive: !!(opts && opts.keepalive)
        });
      }).then(function (r) { return r.ok ? { ok: true } : { ok: false, error: 'HTTP ' + r.status }; })
        .catch(function (e) { return { ok: false, error: String(e && e.message || e) }; });
    },

    /* --- вход на собственика --- */
    signIn: function (email, password) {
      if (mode === 'demo') { var d = { demo: true, email: email || 'demo@local' }; writeSession(d); return Promise.resolve(d); }
      if (mode === 'off') return Promise.reject(new Error('Базата данни още не е свързана (config.js).'));
      return fetch(BASE + '/auth/v1/token?grant_type=password', {
        method: 'POST', headers: headers(), body: JSON.stringify({ email: email, password: password })
      }).then(function (r) {
        if (!r.ok) return r.json().catch(function () { return {}; }).then(function (j) {
          throw new Error(r.status === 400 ? 'Грешен имейл или парола.' : (j.msg || j.error_description || 'Неуспешен вход.'));
        });
        return r.json();
      }).then(function (j) { var s = packSession(j); writeSession(s); return s; });
    },
    signOut: function () {
      var s = readSession(); writeSession(null);
      if (mode === 'supabase' && s && s.access_token) {
        return fetch(BASE + '/auth/v1/logout', { method: 'POST', headers: headers(s.access_token) }).catch(function () {});
      }
      return Promise.resolve();
    },
    getSession: getSession,
    /* собственикът сменя собствената си парола (въвежда я сам в панела) */
    updatePassword: function (password) {
      if (mode !== 'supabase') return Promise.reject(new Error('Смяната на парола работи само с истинската база.'));
      return authed(function (s) {
        return fetch(BASE + '/auth/v1/user', { method: 'PUT', headers: headers(s.access_token), body: JSON.stringify({ password: password }) })
          .then(function (r) { return r.ok ? true : fail(r); });
      });
    },

    /* --- админ: четене/промяна --- */
    /* q: { columns, filters:[[col,op,val]], order:'created_at.desc', limit } — без limit чете всичко на страници */
    select: function (table, q) {
      q = q || {};
      if (mode === 'demo') {
        var rows = demoRead(table).filter(function (r) { return (q.filters || []).every(function (f) { return demoMatch(r, f); }); });
        var ord = (q.order || 'created_at.desc').split('.');
        rows.sort(function (a, b) { var x = a[ord[0]], y = b[ord[0]]; return (x < y ? -1 : x > y ? 1 : 0) * (ord[1] === 'desc' ? -1 : 1); });
        return Promise.resolve(q.limit ? rows.slice(0, q.limit) : rows);
      }
      return authed(function (s) {
        var base = BASE + '/rest/v1/' + table + '?select=' + encodeURIComponent(q.columns || '*');
        (q.filters || []).forEach(function (f) { base += '&' + encodeURIComponent(f[0]) + '=' + f[1] + '.' + encodeURIComponent(f[2]); });
        base += '&order=' + (q.order || 'created_at.desc');
        var PAGE = 1000, out = [];
        function page(off) {
          var lim = q.limit ? Math.min(PAGE, q.limit - off) : PAGE;
          return fetch(base + '&limit=' + lim + '&offset=' + off, { headers: headers(s.access_token) })
            .then(function (r) { return r.ok ? r.json() : fail(r); })
            .then(function (rows) {
              out = out.concat(rows);
              if (rows.length < lim || (q.limit && out.length >= q.limit) || out.length >= 200000) return out;
              return page(off + rows.length);
            });
        }
        return page(0);
      });
    },
    update: function (table, id, patch) {
      if (mode === 'demo') {
        var rows = demoRead(table);
        rows.forEach(function (r) { if (r.id === id) for (var k in patch) r[k] = patch[k]; });
        demoWrite(table, rows); return Promise.resolve(true);
      }
      return authed(function (s) {
        return fetch(BASE + '/rest/v1/' + table + '?id=eq.' + encodeURIComponent(id), {
          method: 'PATCH', headers: headers(s.access_token, { Prefer: 'return=minimal' }), body: JSON.stringify(patch)
        }).then(function (r) { return r.ok ? true : fail(r); });
      });
    },
    remove: function (table, id) {
      if (mode === 'demo') { demoWrite(table, demoRead(table).filter(function (r) { return r.id !== id; })); return Promise.resolve(true); }
      return authed(function (s) {
        return fetch(BASE + '/rest/v1/' + table + '?id=eq.' + encodeURIComponent(id), {
          method: 'DELETE', headers: headers(s.access_token, { Prefer: 'return=minimal' })
        }).then(function (r) { return r.ok ? true : fail(r); });
      });
    },

    /* админ: запис, който изисква вход (напр. отметка „изпратено“) */
    adminInsert: function (table, row) {
      if (mode === 'demo') return API.insert(table, row).then(function () { return true; });
      return authed(function (s) {
        return fetch(BASE + '/rest/v1/' + table, {
          method: 'POST', headers: headers(s.access_token, { Prefer: 'return=minimal' }), body: JSON.stringify(row)
        }).then(function (r) { return r.ok ? true : fail(r); });
      });
    },

    /* админ: извикване на функция в Supabase (напр. пробно известие) */
    callFunction: function (name, query) {
      if (mode !== 'supabase') return Promise.reject(new Error('Работи само с истинската база.'));
      return authed(function (s) {
        return fetch(BASE + '/functions/v1/' + name + (query || ''), { method: 'POST', headers: headers(s.access_token), body: '{}' })
          .then(function (r) { return r.ok ? r.json() : fail(r); });
      });
    },
    vapidPublicKey: String(C.vapidPublicKey || ''),

    /* публично четене (продукти, планове, настройки) — с публичния ключ */
    publicSelect: function (table, q) {
      q = q || {};
      if (mode === 'off') return Promise.reject(new Error('not-configured'));
      if (mode === 'demo') return API.select(table, q);
      var url = BASE + '/rest/v1/' + table + '?select=' + encodeURIComponent(q.columns || '*');
      (q.filters || []).forEach(function (f) { url += '&' + encodeURIComponent(f[0]) + '=' + f[1] + '.' + encodeURIComponent(f[2]); });
      url += '&order=' + (q.order || 'created_at.desc');
      if (!q.all) return fetch(url, { headers: headers() }).then(function (r) { return r.ok ? r.json() : fail(r); });
      /* q.all: таблици с над 1000 реда се четат на страници */
      var out = [];
      var page = function (from) {
        return fetch(url + '&limit=1000&offset=' + from, { headers: headers() })
          .then(function (r) { return r.ok ? r.json() : fail(r); })
          .then(function (rows) { out = out.concat(rows); return rows.length === 1000 ? page(from + 1000) : out; });
      };
      return page(0);
    },
    /* админ: запис „добави или замени“ по ключ (напр. настройки) */
    adminUpsert: function (table, row, conflict) {
      if (mode === 'demo') {
        var rows = demoRead(table).filter(function (r) { return r[conflict] !== row[conflict]; });
        rows.push(row); demoWrite(table, rows); return Promise.resolve(true);
      }
      return authed(function (s) {
        return fetch(BASE + '/rest/v1/' + table + '?on_conflict=' + encodeURIComponent(conflict), {
          method: 'POST', headers: headers(s.access_token, { Prefer: 'resolution=merge-duplicates,return=minimal' }), body: JSON.stringify(row)
        }).then(function (r) { return r.ok ? true : fail(r); });
      });
    },
    /* админ: качва снимка и връща публичния ѝ адрес */
    upload: function (bucket, path, blob) {
      if (mode === 'demo') return new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.readAsDataURL(blob); });
      return authed(function (s) {
        return fetch(BASE + '/storage/v1/object/' + bucket + '/' + path, {
          method: 'POST', body: blob,
          headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + s.access_token, 'Content-Type': blob.type || 'image/jpeg', 'cache-control': '31536000' }
        }).then(function (r) { return r.ok ? BASE + '/storage/v1/object/public/' + bucket + '/' + path : fail(r); });
      });
    },

    /* само за демо режима */
    demoReplace: function (table, rows) { if (mode === 'demo') demoWrite(table, rows); },
    uid: uid
  };

  /* вмъкване: ако собственикът е влязъл, ползва неговия токен; иначе — публичния ключ */
  function authedOrAnon() {
    var s = readSession();
    if (!s || s.demo || !s.access_token || s.expires_at - Date.now() < 60000) return Promise.resolve('');
    return Promise.resolve(s.access_token);
  }

  window.UMData = API;
})();
