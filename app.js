/* Seventy Thirty app logic. Data lives in this browser's localStorage. */
(function () {
'use strict';

var KEY = 'seventythirty.v1';
var SAVE_RATE = 0.3;

var TIERS = [
  {name: 'Peasant', base: 0}, {name: 'Serf', base: 25}, {name: 'Commoner', base: 100},
  {name: 'Merchant', base: 300}, {name: 'Knight', base: 750}, {name: 'Baron', base: 1500},
  {name: 'Count', base: 3500}, {name: 'Duke', base: 7500}, {name: 'King', base: 20000},
  {name: 'Emperor', base: 50000}
];
var SCALE = {USD: 1, EUR: 1, GBP: 1, INR: 80, NPR: 100};

/* One emblem per rank, drawn on a 48 by 48 grid. */
var EMB = [
  /* Peasant: wheat */
  '<path d="M24 44V8"/><path d="M24 14c-4-1-6-4-6-8 4 1 6 4 6 8z"/><path d="M24 14c4-1 6-4 6-8-4 1-6 4-6 8z"/><path d="M24 26c-4-1-6-4-6-8 4 1 6 4 6 8z"/><path d="M24 26c4-1 6-4 6-8-4 1-6 4-6 8z"/><path d="M24 38c-4-1-6-4-6-8 4 1 6 4 6 8z"/><path d="M24 38c4-1 6-4 6-8-4 1-6 4-6 8z"/>',
  /* Serf: chain links */
  '<rect x="5" y="17" width="23" height="14" rx="7"/><rect x="20" y="17" width="23" height="14" rx="7"/>',
  /* Commoner: cottage */
  '<path d="M5 24L24 8l19 16"/><path d="M10 21v21h28V21"/><path d="M20 42V30h8v12"/>',
  /* Merchant: scales */
  '<path d="M24 8v32M14 40h20M8 14h32"/><path d="M8 14L3 27h10z"/><path d="M40 14l-5 13h10z"/>',
  /* Knight: sword */
  '<path d="M24 4l4 6v22h-8V10z"/><path d="M14 32h20"/><path d="M24 32v10"/><path d="M20 45h8"/>',
  /* Baron: tower */
  '<path d="M12 42h24"/><path d="M15 42V18h18v24"/><path d="M13 18V8h4v5h4V8h6v5h4V8h4v10z"/><path d="M21 42v-8a3 3 0 0 1 6 0v8"/>',
  /* Count: coronet with pearls */
  '<path d="M8 38h32v5H8z"/><path d="M10 38V27h28v11"/><circle cx="14" cy="22" r="3"/><circle cx="24" cy="19" r="3"/><circle cx="34" cy="22" r="3"/>',
  /* Duke: castle */
  '<path d="M6 42V14h8v6h4v-6h12v6h4v-6h8v28z"/><path d="M20 42V32a4 4 0 0 1 8 0v10"/>',
  /* King: crown */
  '<path d="M8 36L6 14l10 9 8-13 8 13 10-9-2 22z"/><path d="M8 41h32"/>',
  /* Emperor: arched crown with orb and cross */
  '<path d="M8 38L6 20l10 8 8-10 8 10 10-8-2 18z"/><path d="M8 43h32"/><path d="M12 24c0-12 24-12 24 0"/><circle cx="24" cy="10.5" r="2.5"/><path d="M24 8V2M21.5 4h5"/>'
];
function emblem(i) {
  return '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + EMB[i] + '</svg>';
}

var GLYPH = {
  coin: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
  stack: '<path d="M5 8h14M5 12h14M5 16h14"/>',
  ledger: '<rect x="6" y="4" width="12" height="16"/><path d="M9 9h6M9 13h6M9 17h3"/>',
  arrow: '<path d="M12 19V6M6 12l6-6 6 6"/>',
  split: '<rect x="4" y="6" width="16" height="12"/><path d="M14 6v12"/>',
  calendar: '<rect x="4" y="6" width="16" height="14"/><path d="M4 10h16M9 4v4M15 4v4"/>',
  diamond: '<path d="M12 4l8 8-8 8-8-8z"/>',
  shield: '<path d="M12 4l7 3v5c0 4-3 7-7 8-4-1-7-4-7-8V7z"/>',
  hex: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><circle cx="12" cy="12" r="2.5"/>',
  crown: '<path d="M4 18L3 8l5 4 4-7 4 7 5-4-1 10z"/>'
};
function glyph(name) {
  return '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">' + GLYPH[name] + '</svg>';
}

var BADGES = [
  {id: 'first', name: 'First Coin', glyph: 'coin', desc: 'Log your first entry.', get: function (s) { return {have: s.count, need: 1}; }},
  {id: 'steady', name: 'Steady Hand', glyph: 'stack', desc: 'Log 5 entries.', get: function (s) { return {have: s.count, need: 5}; }},
  {id: 'keeper', name: 'Ledger Keeper', glyph: 'ledger', desc: 'Log 15 entries.', get: function (s) { return {have: s.count, need: 15}; }},
  {id: 'solo', name: 'Self Starter', glyph: 'arrow', desc: 'Add savings on your own once.', get: function (s) { return {have: s.soloCount, need: 1}; }},
  {id: 'splitter', name: 'Ratio Keeper', glyph: 'split', desc: 'Split 5 amounts at 70/30.', get: function (s) { return {have: s.incomeCount, need: 5}; }},
  {id: 'week', name: 'Week Marker', glyph: 'calendar', desc: 'Log entries on 7 different days.', get: function (s) { return {have: s.dayCount, need: 7}; }},
  {id: 'merchant', name: 'Merchant Mark', glyph: 'diamond', desc: 'Reach the Merchant rank.', get: function (s) { return {have: s.saved, need: s.th[3], money: true}; }},
  {id: 'knight', name: 'Knighted', glyph: 'shield', desc: 'Reach the Knight rank.', get: function (s) { return {have: s.saved, need: s.th[4], money: true}; }},
  {id: 'duke', name: 'Ducal Seal', glyph: 'hex', desc: 'Reach the Duke rank.', get: function (s) { return {have: s.saved, need: s.th[7], money: true}; }},
  {id: 'crown', name: 'Crowned', glyph: 'crown', desc: 'Reach the Emperor rank.', get: function (s) { return {have: s.saved, need: s.th[9], money: true}; }}
];

var TABS = ['home', 'add', 'ranks', 'badges', 'history'];
var VIEWS = ['login', 'home', 'add', 'ranks', 'badges', 'history', 'privacy', 'terms'];

var db = null, greetDismissed = false, armTimer = null, pendingId = null;

/* helpers */
function $(id) { return document.getElementById(id); }
function qsa(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
function esc(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c];
  });
}
function r2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
function pad(n) { return n < 10 ? '0' + n : '' + n; }
function ymd(t) { var d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function money(n, cur) {
  var frac = Math.abs(n % 1) > 0.000001 ? 2 : 0;
  try {
    return new Intl.NumberFormat('en-US', {style: 'currency', currency: cur, minimumFractionDigits: frac, maximumFractionDigits: 2}).format(n);
  } catch (e) {
    return cur + ' ' + n.toFixed(frac);
  }
}
function setText(key, val) { qsa('[data-t="' + key + '"]').forEach(function (e) { e.textContent = val; }); }

/* storage */
function load() {
  if (db) return db;
  try { var raw = localStorage.getItem(KEY); if (raw) db = JSON.parse(raw); } catch (e) {}
  if (!db || typeof db !== 'object' || !db.users || typeof db.users !== 'object') db = {users: {}, current: null};
  return db;
}
function persist() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} }
function me() { var d = load(); return d.current && d.users[d.current] ? d.users[d.current] : null; }

/* maths */
function thresholds(cur) { var k = SCALE[cur] || 1; return TIERS.map(function (t) { return t.base * k; }); }
function stats(u) {
  var s = {saved: 0, spend: 0, received: 0, count: u.entries.length, incomeCount: 0, soloCount: 0, cur: u.cur};
  var days = {};
  u.entries.forEach(function (x) {
    s.saved += x.save; s.spend += x.spend;
    if (x.type === 'income') { s.received += x.amount; s.incomeCount++; }
    else { s.soloCount++; if (x.matched) s.received += x.amount; }
    days[x.day] = 1;
  });
  s.saved = r2(s.saved); s.spend = r2(s.spend); s.received = r2(s.received);
  s.dayCount = Object.keys(days).length;
  s.th = thresholds(u.cur);
  s.idx = 0;
  for (var i = 0; i < s.th.length; i++) { if (s.saved >= s.th[i]) s.idx = i; }
  return s;
}
function earned(s) {
  var o = {};
  BADGES.forEach(function (b) { var g = b.get(s); if (g.have >= g.need) o[b.id] = 1; });
  return o;
}
function snap(u) { var s = stats(u); return {idx: s.idx, badges: earned(s)}; }

/* copy */
function hello() {
  var h = new Date().getHours();
  return (h >= 5 && h < 12) ? 'Good morning' : (h >= 12 && h < 17) ? 'Good afternoon' : 'Good evening';
}
function greetMsg(u, s) {
  if (!u.entries.length) return 'Welcome. Enter your first amount in the Add tab. It splits 70 to spend and 30 to save, and your rank starts at Peasant.';
  if (s.idx === TIERS.length - 1) return 'You hold the highest rank, Emperor, with ' + money(s.saved, u.cur) + ' saved.';
  return 'Welcome back. Your rank is ' + TIERS[s.idx].name + ' with ' + money(s.saved, u.cur) + ' saved. ' +
    money(r2(s.th[s.idx + 1] - s.saved), u.cur) + ' more reaches ' + TIERS[s.idx + 1].name + '.';
}

/* errors and notices */
function showErr(id, msg) { var el = $(id); el.textContent = msg; el.hidden = false; }
function hideErr(id) { $(id).hidden = true; }
function notice(msg) { $('notice-t').textContent = msg; $('notice').hidden = false; }
function afterAdd(u, before, lead) {
  var s = stats(u), parts = [lead], now = earned(s);
  if (s.idx > before.idx) parts.push('Rank up: you are now a ' + TIERS[s.idx].name + '.');
  var nb = BADGES.filter(function (b) { return now[b.id] && !before.badges[b.id]; }).map(function (b) { return b.name; });
  if (nb.length) parts.push((nb.length > 1 ? 'Badges earned: ' : 'Badge earned: ') + nb.join(', ') + '.');
  notice(parts.join(' '));
}
function readAmt(id, errId) {
  var v = r2(parseFloat($(id).value));
  if (!(v > 0) || v > 1e9) { showErr(errId, 'Enter an amount greater than 0.'); return null; }
  hideErr(errId);
  return v;
}

/* dates */
function setDates(force) {
  var t = ymd(Date.now());
  ['f-date', 's-date'].forEach(function (id) {
    var el = $(id);
    el.max = t;
    if (force || !el.value) el.value = t;
  });
}
function entryTs(dateStr) {
  var now = Date.now();
  if (!dateStr || dateStr >= ymd(now)) return now;
  var t = new Date(dateStr + 'T12:00:00').getTime();
  return isNaN(t) ? now : Math.min(t, now);
}

/* render */
function figs(pairs) {
  return pairs.map(function (p) { return '<div><dt>' + p[0] + '</dt><dd>' + p[1] + '</dd></div>'; }).join('');
}
function render() {
  var u = me(); if (!u) return;
  var s = stats(u), cur = u.cur, last = TIERS.length - 1, rank = TIERS[s.idx].name;

  /* header and profile picture: the emblem of the current rank */
  $('who').textContent = u.name;
  $('who-rank').textContent = rank;
  qsa('[data-h="avatar"]').forEach(function (el) {
    el.innerHTML = emblem(s.idx);
    el.setAttribute('aria-label', 'Profile picture: ' + rank + ' emblem');
  });
  $('p-name').textContent = u.name;
  $('p-details').textContent = 'Age ' + u.age + ', ' + u.gender + ', amounts in ' + cur;

  /* greeting and summary */
  $('greet').hidden = greetDismissed;
  $('greet-h').textContent = hello() + ', ' + u.name + '.';
  $('greet-p').textContent = greetMsg(u, s);
  $('st-saved').textContent = money(s.saved, cur);
  $('st-spend').textContent = money(s.spend, cur);
  $('st-recv').textContent = money(s.received, cur);
  qsa('[data-cur]').forEach(function (el) { el.textContent = cur; });

  /* rank progress, shown on Home and Ranks */
  var pct = 100, txt = 'Highest rank reached.';
  if (s.idx < last) {
    var span = s.th[s.idx + 1] - s.th[s.idx];
    pct = Math.max(0, Math.min(100, (s.saved - s.th[s.idx]) / span * 100));
    txt = money(r2(s.th[s.idx + 1] - s.saved), cur) + ' more to reach ' + TIERS[s.idx + 1].name + '.';
  }
  setText('rank-level', 'Level ' + (s.idx + 1) + ' of ' + TIERS.length);
  setText('rank-name', rank);
  setText('rank-text', txt);
  qsa('[data-fill]').forEach(function (e) { e.style.width = pct + '%'; });
  qsa('[data-meter]').forEach(function (e) { e.setAttribute('aria-valuenow', String(Math.round(pct))); });

  /* ladder with a logo per level */
  var rows = '';
  for (var i = last; i >= 0; i--) {
    var st = i < s.idx ? 'reached' : (i === s.idx ? 'current' : 'locked');
    rows += '<li class="rung ' + st + '"><span class="avatar">' + emblem(i) + '</span>' +
      '<span class="nm"><strong>' + TIERS[i].name + '</strong><small>Level ' + (i + 1) + ', ' +
      (i === 0 ? 'starting rank' : 'from ' + money(s.th[i], cur)) + '</small></span>' +
      '<span class="stt">' + (st === 'current' ? '<span class="dot"></span>Current' : (st === 'reached' ? 'Reached' : 'Locked')) + '</span></li>';
  }
  $('ladder').innerHTML = rows;
  $('ladder-sub').textContent = 'Rank follows your total saved. Thresholds are set for ' + cur + '.';

  /* badges */
  var bh = '', n = 0;
  BADGES.forEach(function (b) {
    var g = b.get(s), on = g.have >= g.need; if (on) n++;
    var prog = g.money ? money(Math.min(g.have, g.need), cur) + ' of ' + money(g.need, cur) : Math.min(g.have, g.need) + ' of ' + g.need;
    bh += '<li class="badge' + (on ? ' on' : '') + '"><div class="glyph">' + glyph(b.glyph) + '</div><h3>' + esc(b.name) +
      '</h3><p class="bd">' + esc(b.desc) + '</p><p class="bs">' + (on ? '<span class="dot"></span>Earned' : esc(prog)) + '</p></li>';
  });
  $('badges').innerHTML = bh;
  $('badge-sub').textContent = n + ' of ' + BADGES.length + ' earned.';
  $('st-badges').textContent = n + ' of ' + BADGES.length;

  renderHistory(u);
  previewIncome();
  previewSaving();
}
function renderHistory(u) {
  var cur = u.cur;
  var items = u.entries.slice().sort(function (a, b) { return b.ts - a.ts; }), hh = '';
  if (!items.length) {
    hh = '<li class="empty">No entries yet. Add your first one in the Add tab.</li>';
  } else {
    items.forEach(function (x) {
      var date = new Date(x.ts).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'});
      var label, f;
      if (x.type === 'income') { label = 'Split 70/30'; f = figs([['Received', money(x.amount, cur)], ['Spend', money(x.spend, cur)], ['Saved', money(x.save, cur)]]); }
      else if (x.matched) { label = 'Savings with matching spend'; f = figs([['Saved', money(x.save, cur)], ['Matching spend', money(x.spend, cur)]]); }
      else { label = 'Savings on your own'; f = figs([['Saved', money(x.save, cur)]]); }
      var id = esc(x.id);
      hh += '<li><div class="hm"><span class="ht">' + label + '</span><span class="hd">' + date + (x.note ? ', ' + esc(x.note) : '') + '</span></div>';
      if (pendingId === x.id) {
        hh += '<div class="ask" role="group" aria-label="Confirm removal"><span>Remove this entry? This cannot be undone.</span>' +
          '<button class="btn btn-quiet btn-sm" type="button" data-act="no" data-id="' + id + '">Keep it</button>' +
          '<button class="btn btn-sm" type="button" data-act="yes" data-id="' + id + '">Remove</button></div>';
      } else {
        hh += '<dl class="fig">' + f + '</dl>' +
          '<button class="btn btn-quiet btn-sm act" type="button" data-act="ask" data-id="' + id + '" aria-label="Remove entry from ' + date + '">Remove</button>';
      }
      hh += '</li>';
    });
  }
  $('hist').innerHTML = hh;
}
function previewIncome() {
  var u = me(); if (!u) return;
  var v = parseFloat($('f-amt').value); if (!(v > 0) || v > 1e9) v = 0;
  var sv = r2(v * SAVE_RATE);
  $('pv-save').textContent = money(sv, u.cur);
  $('pv-spend').textContent = money(r2(v - sv), u.cur);
}
function previewSaving() {
  var u = me(); if (!u) return;
  var v = parseFloat($('s-amt').value);
  if (!(v > 0) || v > 1e9) { $('s-hint').textContent = 'Enter an amount to see the matching spend allowance.'; return; }
  var tot = r2(v / SAVE_RATE);
  $('s-hint').textContent = 'At 70/30, ' + money(v, u.cur) + ' saved matches ' + money(tot, u.cur) + ' received and a spend allowance of ' + money(r2(tot - v), u.cur) + '.';
}

/* routing: each tab is a hash, so the browser back button and links work */
function route() {
  var h = (location.hash || '').replace(/^#/, ''), u = me(), view;
  if (h === 'privacy' || h === 'terms') view = h;
  else if (!u) view = 'login';
  else view = TABS.indexOf(h) >= 0 ? h : 'home';
  pendingId = null;
  VIEWS.forEach(function (v) { $('view-' + v).hidden = (v !== view); });
  $('tabs').hidden = !u;
  $('acct').hidden = !u;
  document.body.classList.toggle('has-tabs', !!u);
  qsa('#tabs a').forEach(function (a) {
    if (a.getAttribute('data-tab') === view) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  if (u) { setDates(false); render(); }
  try { window.scrollTo(0, 0); } catch (e) {}
}

function defaultCurrency() {
  var tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
  var c = 'USD';
  if (/Kathmandu|Katmandu/i.test(tz)) c = 'NPR';
  else if (/Kolkata|Calcutta/i.test(tz)) c = 'INR';
  else if (/London/i.test(tz)) c = 'GBP';
  $('f-cur').value = c;
}

/* events */
$('login-form').addEventListener('submit', function (ev) {
  ev.preventDefault();
  var name = $('f-name').value.trim(), age = parseInt($('f-age').value, 10), g = $('f-gender').value, cur = $('f-cur').value;
  if (!name) { showErr('err-login', 'Enter your name.'); return; }
  if (!(age >= 10 && age <= 110)) { showErr('err-login', 'Enter an age between 10 and 110.'); return; }
  if (!g) { showErr('err-login', 'Choose a gender, or Prefer not to say.'); return; }
  hideErr('err-login');
  var d = load(), key = name.toLowerCase(), ex = d.users[key];
  if (ex) { ex.name = name; ex.age = age; ex.gender = g; ex.cur = cur; }
  else d.users[key] = {name: name, age: age, gender: g, cur: cur, created: Date.now(), entries: []};
  d.current = key; persist();
  greetDismissed = false;
  $('login-form').reset(); defaultCurrency();
  $('notice').hidden = true;
  if (location.hash && location.hash !== '#home') location.hash = 'home';
  route();
});

$('signout').addEventListener('click', function () {
  var d = load(); d.current = null; persist();
  $('notice').hidden = true;
  if (location.hash) location.hash = '';
  route();
});

$('greet-x').addEventListener('click', function () { greetDismissed = true; $('greet').hidden = true; });
$('f-amt').addEventListener('input', previewIncome);
$('s-amt').addEventListener('input', previewSaving);

$('form-income').addEventListener('submit', function (ev) {
  ev.preventDefault();
  var u = me(); if (!u) return;
  var amt = readAmt('f-amt', 'err-amt'); if (amt === null) return;
  var before = snap(u), sv = r2(amt * SAVE_RATE), sp = r2(amt - sv), ts = entryTs($('f-date').value);
  u.entries.push({id: uid(), ts: ts, day: ymd(ts), type: 'income', amount: amt, spend: sp, save: sv, note: $('f-note').value.trim().slice(0, 60)});
  persist();
  $('form-income').reset(); setDates(true);
  render();
  afterAdd(u, before, 'Split ' + money(amt, u.cur) + ': spend ' + money(sp, u.cur) + ', save ' + money(sv, u.cur) + '.');
});

$('form-saving').addEventListener('submit', function (ev) {
  ev.preventDefault();
  var u = me(); if (!u) return;
  var amt = readAmt('s-amt', 'err-sav'); if (amt === null) return;
  var before = snap(u), ts = entryTs($('s-date').value), match = $('s-match').checked;
  var e = {id: uid(), ts: ts, day: ymd(ts), type: 'saving', amount: amt, spend: 0, save: amt, matched: false, note: $('s-note').value.trim().slice(0, 60)};
  var lead = 'Added ' + money(amt, u.cur) + ' to savings.';
  if (match) {
    var tot = r2(amt / SAVE_RATE);
    e.amount = tot; e.spend = r2(tot - amt); e.matched = true;
    lead = 'Added ' + money(amt, u.cur) + ' to savings and a matching spend allowance of ' + money(e.spend, u.cur) + '.';
  }
  u.entries.push(e);
  persist();
  $('form-saving').reset(); setDates(true);
  render();
  afterAdd(u, before, lead);
});

/* removing an entry always asks first */
$('hist').addEventListener('click', function (ev) {
  var b = ev.target.closest ? ev.target.closest('button[data-act]') : null;
  if (!b) return;
  var u = me(); if (!u) return;
  var act = b.getAttribute('data-act'), id = b.getAttribute('data-id'), el;
  if (act === 'ask') {
    pendingId = id; renderHistory(u);
    el = document.querySelector('#hist button[data-act="no"]'); if (el) el.focus();
  } else if (act === 'no') {
    pendingId = null; renderHistory(u);
    el = document.querySelector('#hist button[data-act="ask"][data-id="' + id + '"]'); if (el) el.focus();
  } else if (act === 'yes') {
    u.entries = u.entries.filter(function (x) { return x.id !== id; });
    pendingId = null; persist(); $('notice').hidden = true; render();
  }
});

$('wipe').addEventListener('click', function () {
  var btn = $('wipe');
  if (btn.getAttribute('data-armed') !== '1') {
    btn.setAttribute('data-armed', '1');
    btn.textContent = 'Confirm: delete everything';
    $('wipe-msg').textContent = 'Select the button again within 6 seconds to delete every profile and entry on this device.';
    clearTimeout(armTimer);
    armTimer = setTimeout(function () {
      btn.removeAttribute('data-armed');
      btn.textContent = 'Delete all data on this device';
      $('wipe-msg').textContent = '';
    }, 6000);
    return;
  }
  clearTimeout(armTimer);
  db = {users: {}, current: null};
  try { localStorage.removeItem(KEY); } catch (e) {}
  btn.removeAttribute('data-armed');
  btn.textContent = 'Delete all data on this device';
  $('wipe-msg').textContent = 'All data on this device was deleted.';
});

window.addEventListener('hashchange', route);

/* start */
try { localStorage.setItem('__st', '1'); localStorage.removeItem('__st'); }
catch (e) { $('storage-note').hidden = false; }
defaultCurrency();
setDates(true);
route();

})();
