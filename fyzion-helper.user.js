// ==UserScript==
// @name         Fyzion – pomocník pro volné termíny
// @namespace    local.fyzion.helpers
// @version      1.0.0
// @updateURL    https://raw.githubusercontent.com/bruhaedwin/Fyzion_upravy/main/fyzion-helper.user.js
// @downloadURL  https://raw.githubusercontent.com/bruhaedwin/Fyzion_upravy/main/fyzion-helper.user.js
// @homepageURL  https://github.com/bruhaedwin/Fyzion_upravy
// @description  Načte až 90 dní dostupnosti; výchozí rozsah 40 dní. Umožňuje vynechat terapeuty. Nic nerezervuje.
// @match        https://app.fyzion.cz/*
// @run-at       document-start
// @grant        none
// @sandbox      raw
// ==/UserScript==

(() => {
  'use strict';
  const ZONE = 'Europe/Prague';
  const MIN = 60000;
  const MAX_AGE = 120000;
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  });
  function parts(ms) {
    const p = Object.fromEntries(fmt.formatToParts(new Date(ms)).map(x => [x.type, x.value]));
    return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}:${p.second}` };
  }
  function localMs(date, time) {
    const target = Date.parse(`${date}T${time}Z`);
    if (!Number.isFinite(target)) throw Error('Neplatné datum nebo čas.');
    const offsets = new Set();
    for (const delta of [-36, 0, 36]) {
      const sample = target + delta * 3600000;
      const p = parts(sample);
      offsets.add(Date.parse(`${p.date}T${p.time}Z`) - sample);
    }
    const matches = [...offsets].map(o => target - o).filter(ms => {
      const p = parts(ms); return p.date === date && p.time === time;
    });
    if (matches.length !== 1) throw Error('Nejednoznačný nebo neexistující čas při změně letního času.');
    return matches[0];
  }
  function nextDay(date) { return new Date(Date.parse(`${date}T12:00:00Z`) + 86400000).toISOString().slice(0, 10); }
  function addDays(date, count) { return new Date(Date.parse(`${date}T12:00:00Z`) + count * 86400000).toISOString().slice(0, 10); }
  function rangeChunks(date, days) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(days) || days < 1 || days > 90)
      throw Error('Vyberte datum a rozsah 1–90 dní.');
    const chunks = [];
    for (let i = 0; i < days; i += 7) chunks.push({ from: localMs(addDays(date, i), '00:00:00'),
      to: localMs(addDays(date, Math.min(days, i + 7)), '00:00:00') });
    return chunks;
  }
  function availabilityOnly(values) {
    return values.map(e => ({ start: e.start, end: e.end, resourceId: e.resourceId,
      resourceIds: e.resourceIds, display: e.display, recurrence_settings: e.recurrence_settings,
      extendedProps: { user_id: e.extendedProps?.user_id } }));
  }
  async function loadRange({ date, days, resourceId, getEvents, check = () => {}, progress = () => {} }) {
    const chunks = rangeChunks(date, days), events = [];
    let loaded = null;
    for (let i = 0; i < chunks.length; i++) {
      check(); progress(i, chunks.length);
      if (loaded === null) loaded = Date.now();
      const body = await getEvents(chunks[i], resourceId);
      check(); events.push(...availabilityOnly(arrayOf(body)));
    }
    progress(chunks.length, chunks.length);
    return { events, from: chunks[0].from, to: chunks[chunks.length - 1].to, loaded };
  }
  function arrayOf(body) {
    if (Array.isArray(body)) return body;
    if (body && Array.isArray(body.results) && body.next === null &&
        (body.count === undefined || body.count === body.results.length)) return body.results;
    throw Error('Neznámý nebo stránkovaný formát odpovědi. Termíny nelze ověřit.');
  }
  function instant(value) {
    if (typeof value !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/.test(value)) throw Error('Událost nemá jednoznačný čas.');
    const n = Date.parse(value);
    if (!Number.isFinite(n)) throw Error('Událost obsahuje neplatný čas.');
    return n;
  }
  function merge(items) {
    const out = [];
    for (const [a, b] of items.sort((x, y) => x[0] - y[0])) {
      const last = out[out.length - 1];
      if (last && a <= last[1]) last[1] = Math.max(last[1], b);
      else out.push([a, b]);
    }
    return out;
  }
  const normalize = text => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/["']/g, '').trim();
  const monthNames = ['leden', 'unor', 'brezen', 'duben', 'kveten', 'cerven', 'cervenec', 'srpen', 'zari', 'rijen', 'listopad', 'prosinec'];
  const englishMonths = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  function pickerPeriod(picker) {
    const nav = picker.querySelector('.q-date__navigation');
    if (!nav) throw Error('Výběr data nemá ovládání měsíce.');
    const texts = [...nav.querySelectorAll('button')].map(b => normalize(b.textContent));
    const month = texts.map(t => Math.max(monthNames.indexOf(t), englishMonths.indexOf(t))).find(m => m >= 0);
    const years = texts.filter(t => /^\d{4}$/.test(t));
    if (month === undefined || years.length !== 1) throw Error('Nerozpoznaný měsíc nebo rok ve výběru data.');
    return Number(years[0]) * 12 + month;
  }
  async function waitFor(read, message, timeout = 5000) {
    const until = Date.now() + timeout;
    while (Date.now() < until) {
      const value = read();
      if (value) return value;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw Error(message);
  }
  async function choosePickerDate(picker, date) {
    const [year, month, day] = date.split('-').map(Number), target = year * 12 + month - 1;
    for (let step = 0; step < 120; step++) {
      const current = pickerPeriod(picker);
      if (current === target) {
        const buttons = [...picker.querySelectorAll('.q-date__calendar-item--in button')].filter(b => b.textContent.trim() === String(day));
        if (buttons.length !== 1 || buttons[0].disabled || buttons[0].getAttribute('aria-disabled') === 'true')
          throw Error('Požadovaný den nelze ve výběru data zvolit.');
        buttons[0].click();
        return;
      }
      const next = current < target;
      const labels = next ? ['pristi mesic', 'next month'] : ['predchozi mesic', 'previous month'];
      const arrows = [...picker.querySelectorAll('.q-date__navigation button')].filter(b => labels.includes(normalize(b.getAttribute('aria-label'))));
      if (arrows.length !== 1 || arrows[0].disabled) throw Error('Nelze přepnout měsíc ve výběru data.');
      arrows[0].click();
      await waitFor(() => pickerPeriod(picker) !== current, 'Výběr data nereaguje na přepnutí měsíce.');
      // Nechat doběhnout animaci, aby čísla dnů patřila novému měsíci.
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    throw Error('Termín je příliš daleko od otevřeného kalendáře.');
  }
  function findSlots({ resource, events, from, to, duration, now = Date.now(), limit = 150 }) {
    if (!Number.isInteger(duration) || duration < 1 || duration > 480) throw Error('Délka musí být 1–480 minut.');
    if (!(from < to) || to - from > 90 * 86400000 + 3600000) throw Error('Podporované období je nejvýše 90 dnů.');
    if (!Array.isArray(resource.businessHours)) throw Error('Chybí pracovní rozvrh terapeuta.');
    const rules = resource.businessHours;
    for (const r of rules) {
      if (!r || Object.keys(r).some(k => !['daysOfWeek', 'startTime', 'endTime', 'resourceId'].includes(k)))
        throw Error('Pracovní rozvrh obsahuje neověřená omezení.');
      if (!Array.isArray(r.daysOfWeek) || !r.daysOfWeek.length || r.daysOfWeek.some(d => !Number.isInteger(d) || d < 0 || d > 6))
        throw Error('Neplatné dny pracovního rozvrhu.');
      if (![r.startTime, r.endTime].every(t => typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(t)))
        throw Error('Nepodporovaný čas pracovního rozvrhu.');
      if (r.resourceId && r.resourceId !== resource.id) throw Error('Rozvrh neodpovídá terapeutovi.');
      if (r.startTime >= r.endTime) throw Error('Noční nebo nulová směna zatím není podporována.');
    }
    const busy = [];
    for (const e of events) {
      const ids = Array.isArray(e.resourceIds) ? e.resourceIds : [e.resourceId || e.extendedProps?.user_id];
      if (ids.some(id => typeof id !== 'string' || !id)) throw Error('Některé události nelze přiřadit terapeutovi.');
      if (!ids.includes(resource.id)) continue;
      if (e.display === 'inverse-background' || e.recurrence_settings && (!e.start || !e.end))
        throw Error('Událost obsahuje nepodporované pravidlo dostupnosti.');
      const a = instant(e.start), b = instant(e.end);
      if (a >= b) throw Error('Událost má neplatnou délku.');
      busy.push([a, b]); // Každý záznam blokuje čas, bez ohledu na typ, barvu či kapacitu.
    }
    const blocked = merge(busy);
    const work = [];
    for (let date = parts(from).date; localMs(date, '00:00:00') < to; date = nextDay(date)) {
      const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
      for (const r of rules.filter(r => r.daysOfWeek.includes(dow))) {
        const a = Math.max(from, localMs(date, r.startTime));
        const b = Math.min(to, localMs(date, r.endTime));
        if (a < b) work.push([a, b]);
      }
    }
    const output = [];
    let more = false;
    for (const [a, b] of merge(work)) {
      for (let start = Math.ceil(Math.max(a, now) / (15 * MIN)) * 15 * MIN; start + duration * MIN <= b; start += 15 * MIN) {
        const end = start + duration * MIN;
        if (!blocked.some(([x, y]) => start < y && end > x)) {
          if (output.length === limit) { more = true; break; }
          output.push({ start, end });
        }
      }
      if (more) break;
    }
    return { slots: output, more };
  }
  function findAllSlots({ resources, events, from, to, duration, now = Date.now(), limit = 10000 }) {
    const slots = [], ids = new Set();
    let more = false;
    for (const resource of resources) {
      if (!resource || typeof resource.id !== 'string' || !resource.id || ids.has(resource.id)) throw Error('Neplatný seznam terapeutů.');
      ids.add(resource.id);
      let result;
      try { result = findSlots({ resource, events, from, to, duration, now, limit }); }
      catch (e) { throw Error(`${resource.title || 'Terapeut'}: ${e.message}`); }
      more ||= result.more;
      slots.push(...result.slots.map(slot => ({ ...slot, resourceId: resource.id, title: String(resource.title || 'Terapeut') })));
    }
    slots.sort((a, b) => a.start - b.start || a.title.localeCompare(b.title, 'cs') || a.resourceId.localeCompare(b.resourceId));
    return { slots: slots.slice(0, limit), more: more || slots.length > limit };
  }
  if (typeof window === 'undefined') {
    if (typeof module !== 'undefined') module.exports = { findSlots, findAllSlots, localMs, arrayOf, parts, rangeChunks, loadRange, pickerPeriod, choosePickerDate };
    return;
  }
  if (window.__fyzionFreeSlotsInstalled) return;
  window.__fyzionFreeSlotsInstalled = true;
  const state = { resources: null, batch: null, transport: null, pending: new Set(), error: '', revision: 0, changes: 0, seq: 0, latestEvents: 0, latestResources: 0 };
  let render = () => {};
  function classify(raw, method = 'GET') {
    try {
      const u = new URL(raw, location.href);
      if (u.origin !== 'https://api.fyzion.cz') return null;
      if (method.toUpperCase() !== 'GET') {
        state.batch = null; state.revision++; state.changes++; render(); return null;
      }
      if (u.pathname === '/v1/calendar-users/resources/') return { type: 'resources', url: u };
      if (u.pathname === '/v1/calendar-users/events/') return { type: 'events', url: u };
    } catch (_) { /* Nejde o sledovaný požadavek. */ }
    return null;
  }
  function begin(info) {
    const token = ++state.seq;
    state.pending.add(token); state.revision++;
    if (info.type === 'events') { state.latestEvents = token; state.batch = null; }
    else { state.latestResources = token; state.resources = null; }
    state.error = ''; render(); return token;
  }
  function finish(info, token, status, body) {
    state.pending.delete(token);
    const latest = info.type === 'events' ? state.latestEvents : state.latestResources;
    if (token !== latest) { render(); return; }
    try {
      if (status !== 200) throw Error(`Načtení ${info.type} selhalo (${status}). Obnovte kalendář.`);
      if (info.transport) state.transport = info.transport;
      const values = arrayOf(body);
      if (info.type === 'resources') {
        const ids = new Set();
        state.resources = values.map(r => {
          if (!r || typeof r.id !== 'string' || ids.has(r.id)) throw Error('Neplatný seznam terapeutů.');
          ids.add(r.id);
          return { id: r.id, title: String(r.title || 'Terapeut'), businessHours: r.businessHours };
        });
      } else {
        if ([...info.url.searchParams.keys()].some(k => !['start', 'end', 'user_ids'].includes(k)))
          throw Error('Požadavek má neověřené filtry. Úplnost událostí nelze potvrdit.');
        const from = instant(info.url.searchParams.get('start'));
        const to = instant(info.url.searchParams.get('end'));
        const ids = info.url.searchParams.getAll('user_ids');
        if (!ids.length || !(from < to)) throw Error('Požadavek neurčuje ověřitelné období a terapeuty.');
        // Ukládáme pouze dostupnost. Jména pacientů ani poznámky nepřebíráme.
        const events = values.map(e => ({ start: e.start, end: e.end, resourceId: e.resourceId,
          resourceIds: e.resourceIds, display: e.display, recurrence_settings: e.recurrence_settings,
          extendedProps: { user_id: e.extendedProps?.user_id } }));
        state.batch = { from, to, ids, events, loaded: Date.now() };
      }
    } catch (e) {
      state.error = e.message;
      if (info.type === 'events') state.batch = null; else state.resources = null;
    }
    state.revision++; render();
  }
  const originalFetch = window.fetch;
  function transportOf(request) {
    const headers = new Headers(request.headers);
    for (const name of ['if-none-match', 'if-modified-since', 'range', 'content-length', 'content-type']) headers.delete(name);
    return { headers, credentials: request.credentials || 'same-origin' };
  }
  window.fetch = function(input, init) {
    const info = classify(typeof input === 'string' || input instanceof URL ? String(input) : input.url,
      init?.method || input?.method || 'GET');
    if (!info) return originalFetch.apply(this, arguments);
    try { info.transport = transportOf(new Request(input, init)); } catch (_) {}
    const token = begin(info);
    let promise;
    try { promise = originalFetch.apply(this, arguments); }
    catch (e) { finish(info, token, 0, null); throw e; }
    return promise.then(response => {
      response.clone().json().then(body => finish(info, token, response.status, body), () => finish(info, token, response.status, null));
      return response;
    }, e => { finish(info, token, 0, null); throw e; });
  };
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  const originalSetHeader = XMLHttpRequest.prototype.setRequestHeader;
  const xhrInfo = new WeakMap();
  XMLHttpRequest.prototype.open = function(method, url) {
    const info = classify(String(url), method);
    if (info) info.transport = { headers: new Headers(), credentials: 'same-origin' };
    xhrInfo.set(this, info);
    return originalOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
    const info = xhrInfo.get(this);
    if (info) info.transport.headers.append(name, value);
    return originalSetHeader.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function() {
    const info = xhrInfo.get(this);
    if (info) {
      info.transport.credentials = this.withCredentials ? 'include' : 'same-origin';
      const token = begin(info);
      this.addEventListener('loadend', () => {
        let body = null;
        try { body = this.responseType === 'json' ? this.response : JSON.parse(this.responseText); } catch (_) {}
        finish(info, token, this.status, body);
      }, { once: true });
    }
    return originalSend.apply(this, arguments);
  };
  async function readApi(url, transport, signal) {
    const u = new URL(url);
    if (u.origin !== 'https://api.fyzion.cz' || !['/v1/calendar-users/events/', '/v1/calendar-users/resources/'].includes(u.pathname))
      throw Error('Nepovolený zdroj dat.');
    const response = await originalFetch.call(window, u.href, { method: 'GET', headers: new Headers(transport.headers),
      credentials: transport.credentials, cache: 'no-store', signal });
    if (response.status === 401 || response.status === 403)
      throw Error('Přihlášení vypršelo nebo přístup nebyl povolen. Obnovte Fyzion a zkuste hledání znovu.');
    if (response.status !== 200) throw Error(`Načítání selhalo (${response.status}). Výsledky nebyly použity.`);
    return response.json();
  }
  async function ensureTherapistVisible(date, resourceId, title) {
    const visible = element => element.getClientRects().length > 0;
    const hasColumn = () => [...document.querySelectorAll('td.fc-timegrid-col[data-date][data-resource-id]')]
      .some(e => e.dataset.date === date && e.dataset.resourceId === resourceId);
    if (hasColumn()) return;
    const expected = normalize(title).replace(/\s+/g, ' ');
    if (!expected || (state.resources || []).filter(r => normalize(r.title).replace(/\s+/g, ' ') === expected).length !== 1)
      throw Error('Jméno terapeuta není v seznamu jednoznačné. Vyberte jeho sloupec ručně.');
    const fields = [...document.querySelectorAll('label.q-select--multiple')].filter(e => visible(e) &&
      /^(terapeuti|therapists)\b/.test(normalize(e.querySelector('.q-field__native .ellipsis')?.textContent)));
    if (fields.length !== 1) throw Error('Filtr terapeutů se nepodařilo jednoznačně najít.');
    const field = fields[0], combo = field.querySelector('input[role="combobox"]');
    if (!combo) throw Error('Chybí ovládání filtru terapeutů.');
    if (combo.getAttribute('aria-expanded') !== 'true') field.querySelector('.q-field__control').click();
    const list = await waitFor(() => {
      const controlled = document.getElementById(combo.getAttribute('aria-controls'));
      return controlled && visible(controlled) && controlled.querySelector('[role="option"]') ? controlled : null;
    }, 'Nabídka terapeutů se neotevřela.');
    const options = [...list.querySelectorAll('[role="option"]')].filter(e =>
      normalize(e.querySelector('.q-item__label')?.textContent).replace(/\s+/g, ' ') === expected);
    if (options.length !== 1) throw Error('Terapeuta nelze v nabídce jednoznačně určit podle jména. Vyberte ho ručně.');
    const option = options[0], selected = option.getAttribute('aria-selected');
    if (option.getAttribute('aria-disabled') === 'true') throw Error('Terapeuta nyní nelze zapnout.');
    if (selected === 'false') {
      option.click();
      await waitFor(() => hasColumn() || [...list.querySelectorAll('[role="option"]')].some(e =>
        normalize(e.querySelector('.q-item__label')?.textContent).replace(/\s+/g, ' ') === expected && e.getAttribute('aria-selected') === 'true'),
        'Zapnutí terapeuta se nepodařilo potvrdit.');
    } else if (selected !== 'true') throw Error('Neznámý stav výběru terapeuta.');
    if (combo.getAttribute('aria-expanded') === 'true') {
      combo.focus();
      combo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }));
      combo.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 150));
      if (combo.getAttribute('aria-expanded') === 'true') {
        // Kliknutí na samotné tělo stránky zavře nabídku bez kliknutí na buňku kalendáře.
        document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true, button: 0 }));
        document.body.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, composed: true, button: 0 }));
        document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, button: 0 }));
      }
      await waitFor(() => combo.getAttribute('aria-expanded') !== 'true', 'Nabídku terapeutů se nepodařilo zavřít.');
    }
    await waitFor(hasColumn, 'Terapeut byl vybrán, ale jeho sloupec se neobjevil. Zkontrolujte zobrazení kalendáře.', 10000);
  }
  async function navigateToSlot(slot, resourceId) {
    const date = parts(slot.start).date;
    const visible = element => element.getClientRects().length > 0;
    const visiblePickers = () => [...document.querySelectorAll('.q-date__main')].filter(visible);
    let pickers = visiblePickers();
    if (pickers.length > 1) throw Error('Je otevřeno více výběrů data. Zavřete je a zkuste termín znovu.');
    if (!pickers.length) {
      const headers = [...document.querySelectorAll('.switcher__header.cursor-pointer')].filter(e => visible(e) && /\b\d{4}\b/.test(e.textContent));
      if (headers.length !== 1) throw Error('Otevřete stránku Kalendář. Ovládání data se nepodařilo jednoznačně najít.');
      headers[0].click();
      await waitFor(() => visiblePickers().length === 1, 'Výběr data se neotevřel.');
      pickers = visiblePickers();
    }
    const picker = pickers[0];
    await choosePickerDate(picker, date);
    const close = [...picker.querySelectorAll('.q-date__actions button')].find(b => ['zavrit', 'close'].includes(normalize(b.textContent)));
    if (visible(picker) && close && !close.disabled) close.click();
    await waitFor(() => [...document.querySelectorAll('td.fc-timegrid-col[data-date]')].some(e => e.dataset.date === date),
      'Den byl vybrán, ale jeho zobrazení v kalendáři se nepodařilo potvrdit. Zkontrolujte datum ručně.', 10000);
    await waitFor(() => !state.pending.size, 'Kalendář ještě nenačetl události. Zkontrolujte zvolený den.', 10000);
    await ensureTherapistVisible(date, resourceId, slot.title);
    await waitFor(() => !state.pending.size, 'Kalendář ještě načítá události zapnutého terapeuta.', 10000);
    const clock = parts(slot.start).time;
    const rows = [...document.querySelectorAll('.fc-timegrid-slot-lane[data-time]')];
    const row = rows.filter(e => e.dataset.time <= clock).sort((a, b) => b.dataset.time.localeCompare(a.dataset.time))[0];
    if (row) row.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
    const column = [...document.querySelectorAll('td.fc-timegrid-col[data-date][data-resource-id]')].find(e => e.dataset.date === date && e.dataset.resourceId === resourceId);
    if (column) {
      const old = column.style.outline;
      column.style.outline = '2px solid #ed4374';
      setTimeout(() => { column.style.outline = old; }, 4000);
    }
    return column ? 'Kalendář otevřen na vybraném dni; sloupec terapeuta je dočasně zvýrazněn.' :
      'Kalendář otevřen na vybraném dni. Terapeut není v aktuálním zobrazení — vyberte jej ve filtru.';
  }
  function mount() {
    const host = document.createElement('div');
    document.documentElement.append(host);
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>
      :host{all:initial;font-family:Arial,sans-serif;color:#20232a;font-size:14px}
      *{box-sizing:border-box}button,input,select{font:inherit}button{cursor:pointer}
      #widget{position:fixed;bottom:20px;left:20px;z-index:2147483646;display:flex;flex-direction:column;align-items:flex-start;gap:8px;width:max-content;max-width:calc(100vw - 16px)}
      #toggle{background:#ed4374;color:white;border:0;border-radius:9px;padding:12px 16px;box-shadow:0 2px 12px #0003}
      #panel{background:white;border:1px solid #ddd;border-radius:12px;width:min(420px,calc(100vw - 16px));max-height:min(80vh,calc(100vh - 80px));overflow:auto;padding:18px;box-shadow:0 8px 32px #0003}
      [hidden]{display:none!important}h2{font-size:18px;margin:0 0 12px}p{line-height:1.45;margin:10px 0}label{display:block;margin:12px 0 5px}
      select,input{width:100%;padding:9px;border:1px solid #ccc;border-radius:6px;background:white;color:#20232a}
      #search{width:100%;padding:11px;margin-top:14px;background:#ed4374;color:white;border:0;border-radius:6px}
      button:disabled{opacity:.5;cursor:default}.muted{color:#666;font-size:12px}#status{white-space:pre-line}#results{padding:0;list-style:none}li{padding:9px 0;border-bottom:1px solid #eee}
      #close{border:0;background:none;font-size:20px}strong{font-weight:bold}
      #heading{display:flex;align-items:center;justify-content:space-between;gap:8px;position:sticky;top:-18px;background:white;padding:10px 0;cursor:move;touch-action:none;user-select:none}
      #heading h2{margin:0}#toggle{touch-action:none;user-select:none}#snapshot{color:#945900;font-size:12px}
      .slot-link{display:block;width:100%;text-align:left;border:0;background:transparent;color:#b52854;padding:8px;border-radius:6px}
      .slot-link:hover,.slot-link:focus-visible{background:#fff0f5;outline:1px solid #ed4374}
      #therapist-list{max-height:180px;overflow:auto;border:1px solid #ddd;border-radius:6px;padding:6px 10px;margin-top:8px}
      #therapist-list label{display:flex;align-items:center;gap:8px;margin:6px 0;cursor:pointer}
      #therapist-list input{width:auto;margin:0;padding:0}#selection-actions{display:flex;gap:8px;margin:8px 0}
      #selection-actions button{background:white;border:1px solid #ccc;border-radius:5px;padding:5px 8px}
      #settings{border:1px solid #ddd;border-radius:8px;padding:10px;margin:12px 0}
      #settings-list{max-height:180px;overflow:auto}#settings-list label{display:flex;align-items:center;gap:8px;margin:8px 0}
      #settings-list input{width:auto;margin:0}#settings-toggle,#settings-reset{background:white;border:1px solid #ccc;border-radius:5px;padding:6px 9px;margin:6px 0}
    </style><div id="widget"><button id="toggle" title="Kliknutím otevřete nebo zavřete; tažením přesunete celý panel">Volné termíny</button>
    <section id="panel" hidden><div id="heading" title="Přetažením přesunete okno"><h2>Volné termíny</h2><button id="close" aria-label="Zavřít">×</button></div>
      <p class="muted">Běžný týdenní rozvrh bez nepravidelné pracovní doby. Praha. Začátky po 15 minutách. Nic se automaticky nerezervuje.</p>
      <button id="settings-toggle" type="button" aria-expanded="false">Nastavení terapeutů</button>
      <div id="settings" hidden><strong>Terapeuti dostupní pro hledání</strong><p class="muted">Odškrtnuté terapeuty skryji z nabídky i z volby Všichni. Nastavení se ukládá v tomto prohlížeči.</p>
        <div id="settings-list"></div><button id="settings-reset" type="button">Obnovit všechny terapeuty</button><p id="settings-message" class="muted" aria-live="polite"></p></div>
      <p id="status"></p><label for="therapist">Terapeut</label><select id="therapist"></select>
      <div id="therapist-selection" hidden><p class="muted">Zrušte zaškrtnutí terapeutů, které chcete z hledání vynechat.</p>
        <div id="selection-actions"><button id="select-all" type="button">Vybrat všechny</button><button id="select-none" type="button">Zrušit výběr</button></div>
        <div id="therapist-list"></div><p id="selection-count" class="muted"></p></div>
      <label for="duration">Délka návštěvy</label><select id="duration"><option value="15">15 min</option><option value="30" selected>30 min</option><option value="45">45 min</option><option value="60">1 h</option></select>
      <label for="from">Hledat od</label><input id="from" type="date">
      <label for="days">Počet kalendářních dní (včetně prvního dne)</label><input id="days" type="number" min="1" max="90" step="1" value="40">
      <button id="search">Načíst období a najít termíny</button><button id="cancel" hidden>Zrušit hledání</button>
      <p id="message" aria-live="polite"></p><p id="snapshot" aria-live="polite"></p><p id="navigation" aria-live="polite"></p><ul id="results"></ul>
      <p class="muted">Výsledky platí pro načtená data. Před rezervací obnovte kalendář a proveďte hledání znovu. Konečnou dostupnost ověřuje Fyzion při uložení.</p>
    </section></div>`;
    const el = id => root.getElementById(id);
    el('from').value = parts(Date.now()).date;
    const clear = () => { el('results').replaceChildren(); el('message').textContent = ''; el('snapshot').textContent = ''; el('navigation').textContent = ''; };
    let navigating = false;
    const SETTINGS_KEY = 'fyzion-free-slots-hidden-therapists-v1';
    let settingsError = '';
    const permanentlyHidden = new Set();
    try {
      const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '[]');
      if (!Array.isArray(stored) || stored.some(id => typeof id !== 'string')) throw Error('Neplatné uložené nastavení.');
      for (const id of stored) permanentlyHidden.add(id);
    } catch (_) { settingsError = 'Uložené nastavení nelze přečíst. Zkontrolujte výběr terapeutů.'; }
    const settingsInputs = new Map();
    let settingsKey = null;
    function saveSettings() {
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify([...permanentlyHidden]));
        settingsError = 'Nastavení uloženo.';
      } catch (_) { settingsError = 'Prohlížeč nepovolil uložení. Výběr platí jen do obnovení stránky.'; }
      clear(); resultLoaded = null; selectionKey = null; render();
    }
    const excluded = new Set();
    const checkboxes = new Map();
    let selectionKey = null;
    let searching = false, controller = null, resultLoaded = null, progressText = '';
    let resultChanges = 0;
    render = () => {
      if (searching && resultChanges !== state.changes) controller?.abort();
      const selected = el('therapist').value;
      const allResources = state.resources || [];
      const options = allResources.filter(r => !permanentlyHidden.has(r.id));
      const newSettingsKey = allResources.map(r => `${r.id}:${r.title}`).join('|');
      if (state.resources && newSettingsKey !== settingsKey) {
        settingsInputs.clear(); el('settings-list').replaceChildren();
        for (const r of allResources) {
          const label = document.createElement('label'), input = document.createElement('input'), name = document.createElement('span');
          input.type = 'checkbox'; input.checked = !permanentlyHidden.has(r.id); name.textContent = r.title;
          input.onchange = () => { if (input.checked) permanentlyHidden.delete(r.id); else permanentlyHidden.add(r.id); saveSettings(); };
          label.append(input); label.append(name); el('settings-list').append(label); settingsInputs.set(r.id, input);
        }
        settingsKey = newSettingsKey;
      }
      for (const input of settingsInputs.values()) input.disabled = searching || navigating;
      el('settings-reset').disabled = searching || navigating;
      el('settings-message').textContent = settingsError || (allResources.length ? 'Změny se ukládají automaticky.' : 'Nejprve otevřete kalendář pro načtení terapeutů.');
      const newSelectionKey = options.map(r => `${r.id}:${r.title}`).join('|');
      if (!searching && !navigating && state.resources && newSelectionKey !== selectionKey) {
        checkboxes.clear(); el('therapist-list').replaceChildren();
        for (const r of options) {
          const label = document.createElement('label'), input = document.createElement('input'), name = document.createElement('span');
          input.type = 'checkbox'; input.checked = !excluded.has(r.id); name.textContent = r.title;
          input.onchange = () => {
            if (input.checked) excluded.delete(r.id); else excluded.add(r.id);
            clear(); resultLoaded = null; render();
          };
          label.append(input); label.append(name); el('therapist-list').append(label); checkboxes.set(r.id, input);
        }
        selectionKey = newSelectionKey;
      }
      if (!searching && state.resources && el('therapist').dataset.ids !== options.map(r => r.id).join(',')) {
        const all = document.createElement('option'); all.value = '__all__'; all.textContent = 'Všichni';
        el('therapist').replaceChildren(...options.map(r => { const o = document.createElement('option'); o.value = r.id; o.textContent = r.title; return o; }), all);
        el('therapist').dataset.ids = options.map(r => r.id).join(',');
        if (selected === '__all__' || options.some(r => r.id === selected)) el('therapist').value = selected;
      }
      const ready = !!state.resources && !!state.transport && !state.pending.size;
      const allMode = el('therapist').value === '__all__';
      const includedCount = options.filter(r => !excluded.has(r.id)).length;
      el('therapist-selection').hidden = true;
      el('selection-count').textContent = `Vybráno ${includedCount} z ${options.length} terapeutů.`;
      for (const input of checkboxes.values()) input.disabled = searching || navigating;
      el('select-all').disabled = searching || navigating;
      el('select-none').disabled = searching || navigating;
      el('search').disabled = searching || navigating || !ready || !options.length || allMode && !includedCount;
      for (const id of ['therapist', 'duration', 'from', 'days']) el(id).disabled = searching || navigating;
      el('cancel').hidden = !searching;
      el('status').textContent = searching ? progressText : state.pending.size ? 'Kalendář načítá data…' : state.error ||
        (!ready ? 'Čekám na přihlášený kalendář. Obnovte Fyzion a zobrazte vybrané terapeuty.' :
          'Připraveno. Hledání načte zvolené období přímo z Fyzionu, nezávisle na zobrazeném týdnu.');
      if (resultLoaded !== null && Date.now() - resultLoaded >= MAX_AGE) {
        el('snapshot').textContent = 'Výsledky zůstávají zobrazené, ale jsou starší než 2 minuty. Před rezervací spusťte nové hledání.';
      } else if (resultLoaded !== null) el('snapshot').textContent = resultChanges !== state.changes ?
        'Ve Fyzionu proběhla změna. Zobrazené výsledky ponechávám; před rezervací je znovu ověřte hledáním.' :
        'Výsledky jsou z posledního hledání. Procházení kalendáře je nesmaže.';
    };
    function keepInside(element) {
      if (element.hidden) return;
      const box = element.getBoundingClientRect();
      element.style.left = `${Math.max(0, Math.min(box.left, innerWidth - box.width))}px`;
      element.style.top = `${Math.max(0, Math.min(box.top, innerHeight - Math.min(box.height, innerHeight)))}px`;
      element.style.bottom = 'auto';
    }
    const toggle = () => { el('panel').hidden = !el('panel').hidden; keepInside(el('widget')); render(); };
    el('toggle').onclick = toggle; el('close').onclick = toggle;
    function draggable(handle, target) {
      let drag = null, suppress = false;
      handle.addEventListener('pointerdown', e => {
        if (e.button !== 0 || e.target.closest('button') && e.target !== handle) return;
        const box = target.getBoundingClientRect();
        drag = { id: e.pointerId, x: e.clientX, y: e.clientY, left: box.left, top: box.top, moved: false };
        suppress = false; handle.setPointerCapture(e.pointerId);
      });
      handle.addEventListener('pointermove', e => {
        if (!drag || drag.id !== e.pointerId) return;
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (Math.hypot(dx, dy) < 4 && !drag.moved) return;
        drag.moved = true;
        target.style.left = `${drag.left + dx}px`; target.style.top = `${drag.top + dy}px`; target.style.bottom = 'auto';
        keepInside(target);
      });
      const end = e => {
        if (!drag || drag.id !== e.pointerId) return;
        suppress = drag.moved; drag = null;
        if (handle.hasPointerCapture(e.pointerId)) handle.releasePointerCapture(e.pointerId);
        setTimeout(() => { suppress = false; }, 0);
      };
      handle.addEventListener('pointerup', end); handle.addEventListener('pointercancel', end);
      handle.addEventListener('click', e => { if (suppress) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
    }
    draggable(el('toggle'), el('widget')); draggable(el('heading'), el('widget'));
    window.addEventListener('resize', () => keepInside(el('widget')));
    for (const id of ['therapist', 'duration', 'from', 'days']) el(id).oninput = () => { clear(); resultLoaded = null; render(); };
    el('therapist').onchange = el('therapist').oninput;
    function setAllSelection(include) {
      for (const [id, input] of checkboxes) { input.checked = include; if (include) excluded.delete(id); else excluded.add(id); }
      clear(); resultLoaded = null; render();
    }
    el('select-all').onclick = () => setAllSelection(true);
    el('select-none').onclick = () => setAllSelection(false);
    el('settings-toggle').onclick = () => {
      el('settings').hidden = !el('settings').hidden;
      el('settings-toggle').setAttribute('aria-expanded', String(!el('settings').hidden));
      keepInside(el('widget'));
    };
    el('settings-reset').onclick = () => {
      permanentlyHidden.clear();
      for (const input of settingsInputs.values()) input.checked = true;
      saveSettings();
    };
    el('cancel').onclick = () => controller?.abort();
    el('search').onclick = async () => {
      clear(); render();
      if (el('search').disabled) return;
      const changes = state.changes;
      resultChanges = changes;
      controller = new AbortController();
      const signal = controller.signal;
      const timeout = setTimeout(() => controller.abort(), 90000);
      const check = () => {
        if (signal.aborted || changes !== state.changes) throw Error('Hledání bylo zrušeno nebo byla upravena data kalendáře. Spusťte ho znovu.');
      };
      const selected = el('therapist').value, date = el('from').value, days = Number(el('days').value), duration = Number(el('duration').value);
      const transport = { headers: new Headers(state.transport.headers), credentials: state.transport.credentials };
      try {
        rangeChunks(date, days);
        if (![15, 30, 45, 60].includes(duration)) throw Error('Vyberte délku 15, 30, 45 minut nebo 1 hodinu.');
        searching = true; progressText = 'Načítám aktuální pracovní rozvrh…'; render();
        const resources = arrayOf(await readApi('https://api.fyzion.cz/v1/calendar-users/resources/', transport, signal));
        check();
        const matches = resources.filter(r => !permanentlyHidden.has(r.id) && (selected === '__all__' ? !excluded.has(r.id) && checkboxes.has(r.id) : r.id === selected));
        if (!matches.length || selected !== '__all__' && matches.length !== 1) throw Error('Pracovní rozvrh vybraných terapeutů se nepodařilo ověřit.');
        const ids = matches.map(r => r.id);
        if (ids.some(id => typeof id !== 'string' || !id) || new Set(ids).size !== ids.length) throw Error('Neplatný seznam terapeutů.');
        const batch = await loadRange({ date, days, resourceId: ids, check,
          progress: (done, total) => { progressText = `Načítám období: ${done}/${total} částí…`; render(); },
          getEvents: (chunk, userIds) => {
            const url = new URL('https://api.fyzion.cz/v1/calendar-users/events/');
            url.searchParams.set('start', new Date(chunk.from).toISOString());
            url.searchParams.set('end', new Date(chunk.to).toISOString());
            for (const id of userIds) url.searchParams.append('user_ids', id);
            return readApi(url, transport, signal);
          }
        });
        check();
        if (Date.now() - batch.loaded >= MAX_AGE) throw Error('Načítání trvalo příliš dlouho. Zkuste hledání znovu.');
        const result = findAllSlots({ resources: matches, events: batch.events, from: batch.from, to: batch.to, duration, limit: 10000 });
        resultLoaded = batch.loaded;
        const dateFmt = new Intl.DateTimeFormat('cs-CZ', { timeZone: ZONE, weekday: 'short', day: 'numeric', month: 'numeric' });
        const timeFmt = new Intl.DateTimeFormat('cs-CZ', { timeZone: ZONE, hour: '2-digit', minute: '2-digit' });
        for (const slot of result.slots) {
          const li = document.createElement('li');
          const button = document.createElement('button');
          button.type = 'button'; button.className = 'slot-link';
          button.textContent = `${dateFmt.format(slot.start)} · ${timeFmt.format(slot.start)}–${timeFmt.format(slot.end)} · ${slot.title}`;
          button.title = 'Otevřít den a čas v kalendáři';
          button.onclick = async () => {
            if (navigating || searching) return;
            navigating = true; render(); el('navigation').textContent = 'Otevírám termín v kalendáři…';
            try { el('navigation').textContent = await navigateToSlot(slot, slot.resourceId); }
            catch (e) { el('navigation').textContent = `Přechod se nepodařil: ${e.message}`; }
            finally { navigating = false; render(); }
          };
          li.append(button);
          el('results').append(li);
        }
        const dateFmtFull = new Intl.DateTimeFormat('cs-CZ', { timeZone: ZONE, dateStyle: 'short' });
        const rangeText = `${dateFmtFull.format(batch.from)}–${dateFmtFull.format(localMs(addDays(date, days - 1), '12:00:00'))}`;
        el('message').textContent = `${rangeText} · ${days} dní ověřeno. ` + (result.slots.length ?
          `${result.slots.length} možností${result.more ? ' (zobrazeno prvních 10 000)' : ''}. Před použitím porovnejte s kalendářem.` : 'Nebyl nalezen volný termín.');
      } catch (e) {
        clear(); resultLoaded = null;
        el('message').textContent = `Hledání zastaveno: ${signal.aborted ? 'Zrušeno, vypršel čas načítání nebo se změnil kalendář. Spusťte hledání znovu.' : e.message}`;
      } finally { clearTimeout(timeout); searching = false; controller = null; render(); }
    };
    render(); setInterval(render, 1000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true }); else mount();
})();
