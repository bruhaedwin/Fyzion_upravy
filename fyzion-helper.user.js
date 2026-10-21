// ==UserScript==
// @name         Fyzion+
// @namespace    local.fyzion.helpers
// @version      1.7.49
// @homepageURL  https://github.com/bruhaedwin/Fyzion_upravy
// @description  Fyzion+ – společné menu vzhledu a volných termínů, nastavení a přenos mezi počítači.
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
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(days) || days < 1 || days > 180)
      throw Error('Vyberte datum a rozsah 1–180 dní.');
    const chunks = [];
    for (let i = 0; i < days; i += 7) chunks.push({ from: localMs(addDays(date, i), '00:00:00'),
      to: localMs(addDays(date, Math.min(days, i + 7)), '00:00:00') });
    return chunks;
  }
  function availabilityOnly(values) {
    return values.map(e => ({ start: e.start, end: e.end, resourceId: e.resourceId,
      resourceIds: e.resourceIds, display: e.display, recurrence_settings: e.recurrence_settings,
      extendedProps: { user_id: e.extendedProps?.user_id, event_type: e.extendedProps?.event_type } }));
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
    if(Date.now()-loaded>=MAX_AGE)throw Error('Načtená data jsou příliš stará. Zopakujte hledání.');
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
  function workRules(resource) {
    const name=String(resource.title||resource.id||'Terapeut');
    if(!Array.isArray(resource.businessHours))throw Error(`${name}: chybí pracovní rozvrh.`);
    const rules=[];
    for(const rule of resource.businessHours){
      if(!rule||!Array.isArray(rule.daysOfWeek))throw Error(`${name}: neočekávaný seznam pracovních dnů (${JSON.stringify(rule?.daysOfWeek)??'chybí'}).`);
      if(!rule.daysOfWeek.length)continue;
      const days=rule.daysOfWeek.map(d=>typeof d==='string'&&/^[0-6]$/.test(d)?Number(d):d);
      if(days.some(d=>!Number.isInteger(d)||d<0||d>6))throw Error(`${name}: neplatné dny pracovního rozvrhu (${JSON.stringify(rule.daysOfWeek).slice(0,100)}).`);
      rules.push({...rule,daysOfWeek:days});
    }
    return rules;
  }
  function validatePatientPreferences(prefs){
    if(!prefs||!Array.isArray(prefs.days)||!prefs.days.length||prefs.days.some(d=>!Number.isInteger(d)||d<0||d>6))throw Error('V možnostech pacienta vyberte alespoň jeden platný den.');
    for(const value of [prefs.from,prefs.to])if(typeof value!=='string'||value!==''&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))throw Error('Neplatný čas v možnostech pacienta.');
    if(prefs.from&&prefs.to&&prefs.from>=prefs.to)throw Error('Čas Od musí být dříve než Do.');
    return{days:[...new Set(prefs.days)],from:prefs.from,to:prefs.to};
  }
  function patientAllows(slot,prefs){
    if(!prefs)return true;
    const start=parts(slot.start),end=parts(slot.end),day=new Date(start.date+'T12:00:00Z').getUTCDay();
    if(!prefs.days.includes(day)||start.date!==end.date)return false;
    const seconds=time=>{const [h,m,s=0]=time.split(':').map(Number);return h*3600+m*60+s;};
    return seconds(start.time)>=(prefs.from?seconds(prefs.from):0)&&seconds(end.time)<=(prefs.to?seconds(prefs.to):86400);
  }
  function findSlots({ resource, events, from, to, duration, now = Date.now(), limit = 150, patientPreferences=null }) {
    if(patientPreferences)patientPreferences=validatePatientPreferences(patientPreferences);
    if (!Number.isInteger(duration) || duration < 1 || duration > 480) throw Error('Délka musí být 1–480 minut.');
    if (!(from < to) || to - from > 180 * 86400000 + 3600000) throw Error('Podporované období je nejvýše 180 dnů.');
    if (!Array.isArray(resource.businessHours)) throw Error('Chybí pracovní rozvrh terapeuta.');
    const rules = workRules(resource);
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
      if (!ids.length || ids.some(id => typeof id !== 'string' || !id)) throw Error('Některé události nelze přiřadit terapeutovi.');
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
        if (!blocked.some(([x, y]) => start < y && end > x)&&patientAllows({start,end},patientPreferences)) {
          if (output.length === limit) { more = true; break; }
          output.push({ start, end });
        }
      }
      if (more) break;
    }
    return { slots: output, more };
  }
  function findAllSlots({ resources, events, from, to, duration, now = Date.now(), limit = 10000, patientPreferences=null }) {
    const slots = [], ids = new Set();
    let more = false;
    for (const resource of resources) {
      if (!resource || typeof resource.id !== 'string' || !resource.id || ids.has(resource.id)) throw Error('Neplatný seznam terapeutů.');
      ids.add(resource.id);
      let result;
      try { result = findSlots({ resource, events, from, to, duration, now, limit, patientPreferences }); }
      catch (e) { throw Error(`${resource.title || 'Terapeut'}: ${e.message}`); }
      more ||= result.more;
      slots.push(...result.slots.map(slot => ({ ...slot, resourceId: resource.id, title: String(resource.title || 'Terapeut') })));
    }
    slots.sort((a, b) => a.start - b.start || a.title.localeCompare(b.title, 'cs') || a.resourceId.localeCompare(b.resourceId));
    return { slots: slots.slice(0, limit), more: more || slots.length > limit };
  }
  const PLUS_TIME_CSS = "/* Fyzion: casy pod udalostmi a nepruhlednym volnem.\n   Zkusebni varianta pro osu 00:00-24:00 po 15 minutach.\n   Pridat do existujiciho stylu omezeneho na web Fyzionu. */\n.fc:has(.fc-timegrid-slots tr:first-child [data-time=\"00:00:00\"]):has(.fc-timegrid-slots tr:last-child [data-time=\"23:45:00\"]):has(.fc-timegrid-slots tr:nth-child(96):last-child) .fc-timegrid-col:not(.fc-timegrid-axis) .fc-timegrid-col-frame::before {\n  content: \"\";\n  position: absolute;\n  inset: 0;\n  z-index: 0;\n  pointer-events: none;\n  background-image: url(\"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22240%22%20height%3D%222765%22%20viewBox%3D%220%200%20240%202765%22%20preserveAspectRatio%3D%22none%22%3E%3Cg%20font-family%3D%22Arial%2Csans-serif%22%20font-size%3D%2210%22%20fill%3D%22%23777777%22%3E%3Ctext%20x%3D%226%22%20y%3D%2212%22%3E00%3A00%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%2240.802%22%3E00%3A15%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%2269.604%22%3E00%3A30%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%2298.406%22%3E00%3A45%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%22127.208%22%3E01%3A00%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%22156.01%22%3E01%3A15%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%22184.812%22%3E01%3A30%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%22213.615%22%3E01%3A45%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%22242.417%22%3E02%3A00%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%22271.219%22%3E02%3A15%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%22300.021%22%3E02%3A30%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%22328.823%22%3E02%3A45%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%22357.625%22%3E03%3A00%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%22386.427%22%3E03%3A15%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%22415.229%22%3E03%3A30%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%22444.031%22%3E03%3A45%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%22472.833%22%3E04%3A00%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%22501.635%22%3E04%3A15%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%22530.437%22%3E04%3A30%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%22559.24%22%3E04%3A45%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%22588.042%22%3E05%3A00%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%22616.844%22%3E05%3A15%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%22645.646%22%3E05%3A30%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%22674.448%22%3E05%3A45%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%22703.25%22%3E06%3A00%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%22732.052%22%3E06%3A15%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%22760.854%22%3E06%3A30%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%22789.656%22%3E06%3A45%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%22818.458%22%3E07%3A00%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%22847.26%22%3E07%3A15%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%22876.062%22%3E07%3A30%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%22904.865%22%3E07%3A45%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%22933.667%22%3E08%3A00%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%22962.469%22%3E08%3A15%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%22991.271%22%3E08%3A30%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%221020.073%22%3E08%3A45%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%221048.875%22%3E09%3A00%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%221077.677%22%3E09%3A15%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%221106.479%22%3E09%3A30%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%221135.281%22%3E09%3A45%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%221164.083%22%3E10%3A00%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%221192.885%22%3E10%3A15%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%221221.687%22%3E10%3A30%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%221250.49%22%3E10%3A45%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%221279.292%22%3E11%3A00%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%221308.094%22%3E11%3A15%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%221336.896%22%3E11%3A30%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%221365.698%22%3E11%3A45%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%221394.5%22%3E12%3A00%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%221423.302%22%3E12%3A15%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%221452.104%22%3E12%3A30%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%221480.906%22%3E12%3A45%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%221509.708%22%3E13%3A00%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%221538.51%22%3E13%3A15%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%221567.312%22%3E13%3A30%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%221596.115%22%3E13%3A45%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%221624.917%22%3E14%3A00%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%221653.719%22%3E14%3A15%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%221682.521%22%3E14%3A30%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%221711.323%22%3E14%3A45%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%221740.125%22%3E15%3A00%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%221768.927%22%3E15%3A15%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%221797.729%22%3E15%3A30%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%221826.531%22%3E15%3A45%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%221855.333%22%3E16%3A00%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%221884.135%22%3E16%3A15%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%221912.937%22%3E16%3A30%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%221941.74%22%3E16%3A45%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%221970.542%22%3E17%3A00%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%221999.344%22%3E17%3A15%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%222028.146%22%3E17%3A30%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%222056.948%22%3E17%3A45%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%222085.75%22%3E18%3A00%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%222114.552%22%3E18%3A15%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%222143.354%22%3E18%3A30%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%222172.156%22%3E18%3A45%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%222200.958%22%3E19%3A00%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%222229.76%22%3E19%3A15%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%222258.562%22%3E19%3A30%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%222287.365%22%3E19%3A45%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%222316.167%22%3E20%3A00%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%222344.969%22%3E20%3A15%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%222373.771%22%3E20%3A30%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%222402.573%22%3E20%3A45%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%222431.375%22%3E21%3A00%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%222460.177%22%3E21%3A15%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%222488.979%22%3E21%3A30%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%222517.781%22%3E21%3A45%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%222546.583%22%3E22%3A00%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%222575.385%22%3E22%3A15%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%222604.187%22%3E22%3A30%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%222632.99%22%3E22%3A45%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%222661.792%22%3E23%3A00%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%222690.594%22%3E23%3A15%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%222719.396%22%3E23%3A30%3C%2Ftext%3E%3Ctext%20x%3D%226%22%20y%3D%222748.198%22%3E23%3A45%3C%2Ftext%3E%3C%2Fg%3E%3C%2Fsvg%3E\");\n  background-repeat: no-repeat;\n background-size: 240px 100%;\nbackground-position: left top;\n}";
  const PLUS_VERSION = '1.7.49';
  const PLUS_KEY = 'fyzion-plus-preferences-v1';
  const PLUS_DEFAULTS = Object.freeze({rangeExpanded:true,firstWithin40:false,seriesModule:false,seriesCount:5,seriesSingle:true,therapistsModule:true,bookingModule:true,hideNativeVisitButton:false,showPreparationMessages:true,contrast:true,hidePopup:true,timeLabels:true,hideVisitStatus:true,hatch:true,
    offColor:'#bfc3ca',hatchColor:'#b9ddf5',duration:30,days:90,position:null});
  function validatePreferences(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('Neplatné nastavení.');
    // Starší exporty mohou obsahovat rozestup; nově výpočet neomezuje.
    const {seriesSpacing:legacySpacing,nativeTherapistPicker:legacyNativePicker,...current}=input;
    if (Object.keys(current).some(k => !Object.hasOwn(PLUS_DEFAULTS,k))) throw Error('Soubor obsahuje neznámé nastavení.');
    const out = {...PLUS_DEFAULTS,...current};
    for (const k of ['rangeExpanded','firstWithin40','seriesModule','seriesSingle','therapistsModule','bookingModule','hideNativeVisitButton','showPreparationMessages','contrast','hidePopup','timeLabels','hideVisitStatus','hatch']) if (typeof out[k] !== 'boolean') throw Error('Neplatný přepínač nastavení.');
    if(!Number.isInteger(out.seriesCount)||out.seriesCount<1||out.seriesCount>30)throw Error('Počet termínů musí být 1–30.');
    for (const k of ['offColor','hatchColor']) if (!/^#[0-9a-f]{6}$/i.test(out[k])) throw Error('Neplatná barva.');
    if (![15,30,45,60].includes(out.duration) || !Number.isInteger(out.days) || out.days<1 || out.days>180) throw Error('Neplatná délka nebo rozsah hledání.');
    if (out.position !== null && (typeof out.position !== 'object' || Array.isArray(out.position) ||
      Object.keys(out.position).sort().join(',') !== 'x,y' || ![out.position.x,out.position.y].every(v=>Number.isFinite(v)&&v>=0&&v<=100000))) throw Error('Neplatná poloha panelu.');
    return out;
  }
  function validateBundle(body) {
    if (!body || body.app !== 'Fyzion+' || body.schema !== 1) throw Error('Vyberte export nastavení Fyzion+.');
    if (!Array.isArray(body.hiddenTherapistIds) || body.hiddenTherapistIds.length>1000 ||
      body.hiddenTherapistIds.some(id=>typeof id!=='string'||!id||id.length>200)) throw Error('Neplatný seznam terapeutů.');
    return {settings:validatePreferences(body.settings), hiddenTherapistIds:[...new Set(body.hiddenTherapistIds)]};
  }
  function makeAppearance(settings, href) {
    const path=new URL(href).pathname;
    let css='';
    if(path.startsWith('/calendar/physiotherapists')) {
      if(settings.contrast) css+=`.fc{--fc-non-business-color:${settings.offColor}}.fc .fc-non-business{background:${settings.offColor}!important;opacity:1!important}\n`;
      if(settings.hidePopup) css+='.bubble:has(.bubble__actions):has(.bubble__name){display:none!important}\n';
      if(settings.timeLabels) css+=PLUS_TIME_CSS+'\n';
      if(settings.hatch) css+=`.fc-timegrid-event:has(.hatched-overlay){background-color:${settings.hatchColor}!important;border-color:#6ba9d1!important}.fc-timegrid-event:has(.hatched-overlay) .fc-event-main{color:#172b3a!important}\n`;
    }
    if(path.startsWith('/patients')&&settings.hideVisitStatus) css+='.visit-status-selector-wrap{display:none!important}\n';
    return css;
  }

  function workingResourceStatus(resource,events,now=Date.now()){
    const date=parts(now).date,day=new Date(date+'T12:00:00Z').getUTCDay();
    const from=localMs(date,'00:00:00'),to=localMs(nextDay(date),'00:00:00');
    // Probíhající návštěva je důvodem k zobrazení i mimo pravidelný rozvrh.
    // Samotné volno/přestávka se za práci nepovažuje.
    for(const event of events){
      if(event.extendedProps?.event_type==='time_off'||event.display==='background'||event.display==='inverse-background')continue;
      const ids=Array.isArray(event.resourceIds)?event.resourceIds:[event.resourceId||event.extendedProps?.user_id];
      if(!ids.includes(resource.id))continue;
      const start=instant(event.start),end=instant(event.end);
      if(start>=end)throw Error('Událost terapeuta má neplatný čas.');
      if(start<=now&&now<end)return{working:true,reason:'Právě má probíhající událost ('+parts(start).time.slice(0,5)+'–'+parts(end).time.slice(0,5)+'), včetně událostí mimo pracovní dobu.'};
    }
    const rules=workRules(resource);
    try{findSlots({resource:{...resource,businessHours:rules},events:[],from,to,duration:1,now:from,limit:1});}
    catch(e){throw Error((resource.title||resource.id||'Terapeut')+': '+e.message);}
    const today=rules.filter(r=>r.daysOfWeek.includes(day));
    const hours=today.map(r=>r.startTime.slice(0,5)+'–'+r.endTime.slice(0,5)).join(', ');
    if(!today.length)return{working:false,reason:'Dnes nemá nastavenou pracovní dobu.'};
    if(!today.some(r=>localMs(date,r.startTime)<=now&&now<localMs(date,r.endTime)))return{working:false,reason:'Mimo dnešní pracovní dobu ('+hours+').'};
    for(const e of events){
      if(e.extendedProps?.event_type!=='time_off')continue;
      const ids=Array.isArray(e.resourceIds)?e.resourceIds:[e.resourceId||e.extendedProps?.user_id];
      if(!ids.length||ids.some(id=>typeof id!=='string'||!id))throw Error('Blokaci volna nelze přiřadit terapeutovi.');
      if(!ids.includes(resource.id))continue;
      const start=instant(e.start),end=instant(e.end);
      if(start>=end)throw Error('Blokace volna má neplatný čas.');
      if(start<=now&&now<end)return{working:false,reason:'Právě má volno nebo přestávku ('+parts(start).time.slice(0,5)+'–'+parts(end).time.slice(0,5)+').'};
    }
    return{working:true,reason:'Právě pracuje ('+hours+').'};
  }
  function workingResources(resources,events,now=Date.now()){
    return resources.filter(resource=>workingResourceStatus(resource,events,now).working);
  }
  function seriesSeparated(earlier,later){
    return later.start>=earlier.end&&parts(later.start).date>=addDays(parts(earlier.end-1).date,2);
  }
  function planSeries(slots,count,singleTherapist,firstBefore=Infinity) {
    if(!Number.isInteger(count)||count<1||count>30)throw Error('Počet termínů musí být 1–30.');
    if(typeof singleTherapist!=='boolean')throw Error('Neplatná volba terapeuta pro sérii.');
    if(firstBefore!==Infinity&&!Number.isFinite(firstBefore))throw Error('Neplatný limit první návštěvy.');
    const sorted=[...slots].sort((a,b)=>a.start-b.start||String(a.title).localeCompare(String(b.title),'cs')||String(a.resourceId).localeCompare(String(b.resourceId)));
    const groups=new Map();
    for(const slot of sorted){
      if(!Number.isFinite(slot.start)||!Number.isFinite(slot.end)||slot.end<=slot.start||typeof slot.resourceId!=='string'||!slot.resourceId)
        throw Error('Série obsahuje neplatný termín.');
      const key=singleTherapist?slot.resourceId:'combined';
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(slot);
    }
    const plans=[],partialCandidates=[];let availableCount=0;
    const record=selected=>{
      availableCount=Math.max(availableCount,selected.length);
      if(selected.length===count){plans.push(selected);return true;}
      if(selected.length)partialCandidates.push(selected);
      return false;
    };
    for(const candidates of groups.values()){
      const days=new Set(),selected=[];
      for(const slot of candidates){
        if(!selected.length&&slot.start>=firstBefore)break;
        const date=parts(slot.start).date;
        if(days.has(date))continue;
        if(selected.length&&!seriesSeparated(selected[selected.length-1],slot))continue;
        selected.push({...slot,seriesPosition:selected.length+1});days.add(date);
        if(selected.length===count)break;
      }
      record(selected);
    }
    plans.sort((a,b)=>a[a.length-1].end-b[b.length-1].end||a[0].start-b[0].start||String(a[0].title).localeCompare(String(b[0].title),'cs'));
    partialCandidates.sort((a,b)=>b.length-a.length||a[a.length-1].end-b[b.length-1].end||a[0].start-b[0].start);
    const seen=new Set(),perResource=new Map(),partialPlans=[];
    for(const plan of partialCandidates){
      const signature=plan.map(s=>`${s.resourceId}:${s.start}`).join('|'),key=singleTherapist?plan[0].resourceId:'combined';
      if(seen.has(signature)||(perResource.get(key)||0)>=(singleTherapist?3:5))continue;
      seen.add(signature);perResource.set(key,(perResource.get(key)||0)+1);partialPlans.push(plan);
      if(partialPlans.length===10)break;
    }
    return{plans,partialPlans,availableCount};
  }
  function groupSlotsByDay(slots) {
    const groups=new Map();
    for(const slot of [...slots].sort((a,b)=>a.start-b.start||String(a.title).localeCompare(String(b.title),'cs'))){
      const date=parts(slot.start).date;
      if(!groups.has(date))groups.set(date,{date,slots:[],times:new Map(),therapists:new Set()});
      const group=groups.get(date);group.slots.push(slot);group.times.set(parts(slot.start).time,slot.start);group.therapists.add(slot.resourceId);
    }
    return [...groups.values()].map(g=>({date:g.date,slots:g.slots,preview:[...g.times.values()].slice(0,3),moreTimes:Math.max(0,g.times.size-3),therapistCount:g.therapists.size}));
  }
  function seriesStatus(plan,count,firstBefore=Infinity){
    const positions=plan.map(s=>s.seriesPosition);
    const validPositions=positions.every((p,i)=>Number.isInteger(p)&&p>=1&&p<=count&&(i===0||p>positions[i-1]));
    const validOrder=plan.every((s,i)=>Number.isFinite(s.start)&&Number.isFinite(s.end)&&s.end>s.start&&(i===0||seriesSeparated(plan[i-1],s)));
    const firstLate=!!plan.length&&plan[0].start>=firstBefore;
    return{complete:plan.length===count&&validPositions&&validOrder&&!firstLate,firstLate};
  }
  function seriesAdditions(slots,plan,count,firstBefore=Infinity){
    const found=[];
    for(let position=1;position<=count;position++){
      if(plan.some(s=>s.seriesPosition===position))continue;
      const before=plan.filter(s=>s.seriesPosition<position).at(-1),after=plan.find(s=>s.seriesPosition>position);
      for(const candidate of slots){
        if(before&&!seriesSeparated(before,candidate)||after&&!seriesSeparated(candidate,after))continue;
        if((!before)&&candidate.start>=firstBefore)continue;
        if(plan.some(s=>parts(s.start).date===parts(candidate.start).date||candidate.start<s.end&&candidate.end>s.start))continue;
        found.push({...candidate,seriesPosition:position});
      }
    }
    return found.sort((a,b)=>a.seriesPosition-b.seriesPosition||a.start-b.start);
  }
  function alternativeAllowed(candidate,current,plan,index,firstBefore=Infinity,mode=null) {
    if(candidate.resourceId===current.resourceId&&candidate.start===current.start&&candidate.end===current.end)return false;
    const sameDay=parts(candidate.start).date===parts(current.start).date;
    if(mode==='time'&&(!sameDay||candidate.start===current.start))return false;
    if(mode==='day'&&sameDay)return false;
    if(!plan)return candidate.start<firstBefore;
    if(index===0&&candidate.start>=firstBefore)return false;
    const date=parts(candidate.start).date;
    for(let i=0;i<plan.length;i++)if(i!==index){
      if(parts(plan[i].start).date===date)return false;
      if(candidate.start<plan[i].end&&candidate.end>plan[i].start)return false;
    }
    if(index>0&&!seriesSeparated(plan[index-1],candidate))return false;
    if(index+1<plan.length&&!seriesSeparated(candidate,plan[index+1]))return false;
    return true;
  }
  function patientCardKey(pathname) {
    const match = /^\/patients\/(?:detail\/)?([0-9]+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/|$)/i.exec(pathname);
    return match ? match[1] : null;
  }
  function previewModel(slot, resource, events, now = Date.now()) {
    if (!slot || slot.resourceId !== resource.id || !Number.isFinite(slot.start) || !Number.isFinite(slot.end) || slot.end <= slot.start)
      throw Error('Neplatný termín náhledu.');
    const date = parts(slot.start).date;
    const from = localMs(date, '00:00:00'), to = localMs(nextDay(date), '00:00:00');
    const duration = (slot.end - slot.start) / MIN;
    const result = findSlots({ resource, events, from: slot.start, to: slot.end, duration, now, limit: 2 });
    const free = result.slots.some(s => s.start === slot.start && s.end === slot.end);
    const busy = events.filter(e => (Array.isArray(e.resourceIds) ? e.resourceIds : [e.resourceId || e.extendedProps?.user_id]).includes(resource.id))
      .map(e => ({ start: instant(e.start), end: instant(e.end) }))
      .filter(e => e.start < to && e.end > from).map(e => ({start: Math.max(from,e.start),end: Math.min(to,e.end)}));
    const weekday=new Date(date+'T12:00:00Z').getUTCDay();
    const working=merge(workRules(resource).filter(rule=>rule.daysOfWeek.includes(weekday))
      .map(rule=>[Math.max(from,localMs(date,rule.startTime)),Math.min(to,localMs(date,rule.endTime))])
      .filter(([start,end])=>start<end)).map(([start,end])=>({start,end}));
    return { date, from, to, free, busy, working };
  }
  if (typeof window === 'undefined') {
    if (typeof module !== 'undefined') module.exports = { patientCardKey, previewModel, seriesSeparated, workingResourceStatus, seriesStatus, seriesAdditions, validatePatientPreferences, patientAllows, alternativeAllowed, groupSlotsByDay, planSeries, workingResources, validatePreferences, validateBundle, makeAppearance, PLUS_DEFAULTS, findSlots, findAllSlots, localMs, arrayOf, parts, rangeChunks, loadRange, pickerPeriod, choosePickerDate };
    return;
  }
  if (window.__fyzionFreeSlotsInstalled) return;
  window.__fyzionFreeSlotsInstalled = true;
  const RESOURCE_CACHE_KEY='fyzion-plus-therapist-directory-v1';
  function readTherapistDirectory(){
    try{
      const value=JSON.parse(localStorage.getItem(RESOURCE_CACHE_KEY)||'null');
      if(!value||!Number.isFinite(value.saved)||Date.now()-value.saved>7*86400000||!Array.isArray(value.resources))return null;
      if(value.resources.some(r=>!r||typeof r.id!=='string'||typeof r.title!=='string'))return null;
      if(new Set(value.resources.map(r=>r.id)).size!==value.resources.length)return null;
      return value.resources.map(r=>({id:r.id,title:r.title}));
    }catch(_){return null;}
  }
  function saveTherapistDirectory(resources){
    try{localStorage.setItem(RESOURCE_CACHE_KEY,JSON.stringify({saved:Date.now(),resources:resources.map(r=>({id:r.id,title:r.title}))}));}catch(_){}
  }
  const state = { resources: readTherapistDirectory(), batch: null, transport: null, pending: new Set(), error: '', revision: 0, changes: 0, seq: 0, latestEvents: 0, latestResources: 0 };
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
    else { state.latestResources = token; }
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
        saveTherapistDirectory(state.resources);
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
      if (info.type === 'events') state.batch = null;
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
    if (!info) {
      let authRequest;
      try {const request=new Request(input,init);if(new URL(request.url).origin==='https://api.fyzion.cz'&&request.method==='GET')authRequest=transportOf(request);}catch(_){}
      const result=originalFetch.apply(this,arguments);
      if(authRequest)result.then(response=>{if(response.ok){state.transport=authRequest;render();}},()=>{});
      return result;
    }
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
    let info = classify(String(url), method);
    if(!info){try{const u=new URL(String(url),location.href);if(u.origin==='https://api.fyzion.cz'&&String(method).toUpperCase()==='GET')info={type:'auth'};}catch(_){}}
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
      if(info.type==='auth'){
        this.addEventListener('loadend',()=>{if(this.status>=200&&this.status<300){state.transport=info.transport;render();}},{once:true});
        return originalSend.apply(this,arguments);
      }
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
  async function closeTherapistMenu(combo) {
    if(combo.getAttribute('aria-expanded')!=='true')return;
    combo.focus();
    for(const type of ['keydown','keyup'])combo.dispatchEvent(new KeyboardEvent(type,{key:'Escape',code:'Escape',keyCode:27,which:27,bubbles:true}));
    await new Promise(resolve=>setTimeout(resolve,150));
    if(combo.getAttribute('aria-expanded')==='true')for(const type of ['mousedown','mouseup','click'])
      document.body.dispatchEvent(new MouseEvent(type,{bubbles:true,composed:true,button:0}));
    await waitFor(()=>combo.getAttribute('aria-expanded')!=='true','Nabídku terapeutů se nepodařilo zavřít.');
  }
  async function setTherapistSelection(resources, desiredIds, check, progress) {
    const names=new Map(),wanted=new Set(desiredIds);
    for(const r of resources){
      const name=normalize(r.title).replace(/\s+/g,' ');
      if(!r.id||!name||names.has(name))throw Error('Seznam obsahuje nejednoznačná jména terapeutů. Výběr proveďte ručně.');
      names.set(name,r.id);
    }
    const visible=e=>e.getClientRects().length>0;
    const fields=[...document.querySelectorAll('label.q-select--multiple')].filter(e=>visible(e)&&
      /^(terapeuti|therapists)\b/.test(normalize(e.querySelector('.q-field__native .ellipsis')?.textContent)));
    if(fields.length!==1)throw Error('Otevřete Kalendář. Filtr terapeutů se nepodařilo jednoznačně najít.');
    const field=fields[0],combo=field.querySelector('input[role="combobox"]');
    if(!combo)throw Error('Chybí ovládání filtru terapeutů.');
    let list;
    try{
      if(combo.getAttribute('aria-expanded')!=='true')field.querySelector('.q-field__control').click();
      list=await waitFor(()=>{const l=document.getElementById(combo.getAttribute('aria-controls'));return l&&visible(l)&&l.querySelector('[role="option"]')?l:null;},'Nabídka terapeutů se neotevřela.');
      let scroller=null;
      for(let e=list;e&&e!==document.body;e=e.parentElement){
        if(e.scrollHeight>e.clientHeight+2&&/(auto|scroll|overlay)/.test(getComputedStyle(e).overflowY)){scroller=e;break;}
      }
      const readOptions=()=>[...list.querySelectorAll('[role="option"]')].map(element=>{
        const name=normalize(element.querySelector('.q-item__label')?.textContent).replace(/\s+/g,' '),id=names.get(name),selected=element.getAttribute('aria-selected');
        if(!id)throw Error('Nabídka obsahuje neznámou položku. Výběr proveďte ručně.');
        if(!['true','false'].includes(selected))throw Error('Nelze určit stav výběru terapeuta.');
        return{element,id,selected:selected==='true',disabled:element.getAttribute('aria-disabled')==='true'};
      });
      async function scan(visit){
        const seen=new Set();
        if(scroller){scroller.scrollTop=0;scroller.dispatchEvent(new Event('scroll'));await new Promise(r=>setTimeout(r,100));}
        for(let page=0;page<250;page++){
          check();
          for(const option of readOptions())if(!seen.has(option.id)){seen.add(option.id);await visit(option);}
          if(!scroller||scroller.scrollTop+scroller.clientHeight>=scroller.scrollHeight-2)return seen;
          const before=scroller.scrollTop;scroller.scrollTop+=Math.max(1,Math.floor(scroller.clientHeight*.65));scroller.dispatchEvent(new Event('scroll'));
          await new Promise(r=>setTimeout(r,100));
          if(scroller.scrollTop===before)throw Error('Nelze projít celý seznam terapeutů.');
        }
        throw Error('Seznam terapeutů je příliš dlouhý.');
      }
      const available=await scan(async option=>{
        if(option.disabled&&option.selected!==wanted.has(option.id))throw Error('Některého terapeuta nelze přepnout.');
      });
      if([...wanted].some(id=>!available.has(id)))throw Error('Požadovaný terapeut chybí v aktuálním filtru. Zkontrolujte pracoviště.');
      let changed=0;
      await scan(async option=>{
        if(option.selected===wanted.has(option.id))return;
        check();
        const currentOption=readOptions().find(o=>o.id===option.id);
        if(!currentOption)throw Error('Položka terapeuta zmizela. Zkontrolujte částečný výběr ve filtru.');
        currentOption.element.click();changed++;progress(changed);
        await waitFor(()=>{
          const current=readOptions().find(o=>o.id===option.id);
          return current&&current.selected===wanted.has(option.id);
        },'Přepnutí terapeuta nebylo potvrzeno. Seznam může být změněn částečně.');
      });
      const actual=new Set();await scan(async option=>{if(option.selected)actual.add(option.id);});
      if(actual.size!==wanted.size||[...wanted].some(id=>!actual.has(id)))throw Error('Výběr neodpovídá zadání. Zkontrolujte filtr terapeutů.');
      return actual.size;
    }finally{await closeTherapistMenu(combo);}
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
  // Přenos probíhá přes skutečné ovládací prvky; nikdy neodesílá formulář.
  const visitVisible = node => !!node && node.getClientRects().length > 0;
  function visitField(form, name) {
    const matches=[...form.querySelectorAll('label.q-field')].filter(label=>
      normalize(label.querySelector('.q-field__before p')?.textContent).replace(/\*/g,'').trim()===normalize(name));
    if(matches.length!==1)throw Error('Pole '+name+' není jednoznačné.');
    return matches[0];
  }
  function visitForm() {
    const forms=[...document.querySelectorAll('form.q-form')].filter(form=>visitVisible(form)&&
      form.querySelector('.date-time__input-group')&&[...form.querySelectorAll('.q-field__before p')].some(p=>normalize(p.textContent).replace(/\*/g,'').trim()==='klient'));
    if(forms.length>1)throw Error('Je otevřeno více formulářů návštěvy.');
    return forms[0];
  }
  function visitInput(input,value) {
    if(!input||input.disabled||input.readOnly)throw Error('Pole návštěvy nelze upravit.');
    input.focus();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));input.blur();
  }
  async function visitSelect(field, title, patientId=null, matchesTitle=null, matchesOption=null, check=()=>{}) {
    check();
    const matchesText=matchesTitle||((text)=>normalize(text)===normalize(title));
    const combo=field.querySelector('[role="combobox"]');
    if(!combo)throw Error('Výběrové pole není dostupné.');
    const current=field.querySelector('.q-field__native .ellipsis')?.textContent.trim();
    if(!patientId&&!matchesOption&&matchesText(current))return true;
    field.querySelector('.q-field__control').click();
    try {
      await waitFor(()=>{check();return combo.getAttribute('aria-expanded')==='true';},'Nabídka se neotevřela.');
      const matches=await waitFor(()=>{
        check();
        let list=document.getElementById(combo.getAttribute('aria-controls'));
        if(!list||!visitVisible(list)){
          const lists=[...document.querySelectorAll('[role="listbox"]')].filter(visitVisible);
          if(lists.length!==1)return null;
          list=lists[0];
        }
        let options=[...list.querySelectorAll('[role="option"]')].filter(visitVisible);
        if(!options.length)options=[...list.querySelectorAll('.q-item--clickable')].filter(visitVisible);
        const found=options.filter(option=>patientId ?
          option.getAttribute('data-patient-id')===patientId||[...option.querySelectorAll('a[href]')].some(a=>patientCardKey(new URL(a.href,location.href).pathname)===patientId) :
          matchesOption?matchesOption(option):matchesText(option.querySelector('.q-item__label:not(.q-item__label--caption)')?.textContent||option.textContent));
        if(found.length>1)throw Error('Nabídka obsahuje více shodných položek. Vyberte položku ručně.');
        return found.length===1?found:null;
      },'Požadovaná položka se v nabídce nenačetla nebo není dostupná. Vyberte jej ručně.',10000);
      check();matches[0].click();
      await waitFor(()=>{check();return combo.getAttribute('aria-expanded')!=='true';},'Výběr nebyl potvrzen.');
      await waitFor(()=>{check();return patientId ? !!field.querySelector('.q-field__native .ellipsis')?.textContent.trim() :
        matchesText(field.querySelector('.q-field__native .ellipsis')?.textContent);},
        'Formulář nepotvrdil vybranou položku.',10000);
      return true;
    } catch(error){if(matchesTitle)error.noRetry=true;throw error;}
    finally {
      // Escape a klikání na body mohou zavřít celý dialog nové návštěvy.
      // Nabídku zavíráme jen jejím vlastním ovládáním uvnitř formuláře.
      if(field.isConnected&&combo.getAttribute('aria-expanded')==='true'){
        check();
        const control=field.querySelector('.q-field__control');
        if(!control)throw Error('Nabídku nelze bezpečně zavřít. Zavřete ji ručně.');
        control.click();
        await waitFor(()=>{check();return combo.getAttribute('aria-expanded')!=='true';},'Nabídka zůstala otevřená. Zavřete ji ručně.',2000);
      }
    }
  }
  function newVisitButtonText(button) {
    const explicit=button.getAttribute('aria-label');
    if(explicit)return normalize(explicit).replace(/^\+\s*/, '').trim();
    const copy=button.cloneNode(true);
    copy.querySelectorAll('i,.q-icon,svg,.q-focus-helper').forEach(node=>node.remove());
    return normalize(copy.textContent).replace(/^\+\s*/, '').replace(/\s+/g,' ').trim();
  }
  function visitPatientId(form) {
    const field=visitField(form,'Klient');
    const ids=new Set([...field.querySelectorAll('[data-patient-id],a[href]')].map(node=>
      node.getAttribute('data-patient-id')||patientCardKey(new URL(node.href,location.href).pathname)).filter(Boolean));
    if(ids.size>1)throw Error('Totožnost klienta ve formuláři není jednoznačná.');
    return [...ids][0]||null;
  }
  async function openVisitFromCard(patientId, check=()=>{}, onOpening=()=>{}) {
    check();
    const currentId=patientCardKey(location.pathname);
    if(patientId&&currentId!==patientId)throw Error('Tento návrh pochází z jiné karty klienta. Otevřete Fyzion+ z aktuální karty a vyberte termín znovu.');
    let form=visitForm();
    const existing=!!form;
    if(existing&&(!patientId||visitPatientId(form)!==patientId))throw Error('Otevřený formulář nelze bezpečně přiřadit klientovi. Zavřete jej a spusťte přípravu z karty klienta.');
    if(!form){
      const buttons=[...document.querySelectorAll('button,a')].filter(button=>
        (visitVisible(button)||button.hasAttribute('data-fyzion-plus-hidden-new-visit'))&&!button.closest('form,[role="dialog"],.q-dialog')&&!button.disabled&&button.getAttribute('aria-disabled')!=='true'&&
        ['nova navsteva','navsteva'].includes(newVisitButtonText(button)));
      if(buttons.length!==1)throw Error('Tlačítko + Návštěva / Nová návštěva nebylo jednoznačně nalezeno na kartě. Otevřete formulář ručně a klikněte na Připravit návštěvu znovu.');
      check();onOpening();buttons[0].click();
      form=await waitFor(()=>{check();return visitForm();},'Formulář Nová návštěva se po kliknutí neotevřel.',15000);
    }
    await waitFor(()=>{
      check();
      const live=visitForm();if(!live)return false;
      try {
        const fields=['Klient','Terapeut','Délka (min.)'].map(name=>visitField(live,name));
        const inputs=[...live.querySelectorAll('.date-time__input-group input.q-field__native')];
        const controls=[fields[1].querySelector('[role="combobox"]'),fields[2].querySelector('input.q-field__native'),...inputs];
        if(inputs.length!==2||controls.some(input=>!input||input.disabled||input.getAttribute('aria-disabled')==='true'))return false;
        if(currentId&&!fields[0].querySelector('.q-field__native .ellipsis')?.textContent.trim())return false;
        // Před zahájením zápisu může Vue úvodní formulář nahradit po načtení dat.
        form=live;
        const id=visitPatientId(live);
        if(id&&id!==patientId)return false;
        return true;
      }catch(_){return false;}
    },'Formulář nebo předvyplnění klienta ještě není připravené. Údaje termínu nebyly změněny.',15000);
    return form;
  }
  async function waitForVisitSettled(check=()=>{}) {
    let last=null,lastInputs=[],signature='',stableSince=Date.now();
    return waitFor(()=>{
      check();
      const form=visitForm();if(!form)return false;
      try {
        const inputs=[...form.querySelectorAll('.date-time__input-group input.q-field__native'),visitField(form,'Délka (min.)').querySelector('input.q-field__native'),visitField(form,'Terapeut').querySelector('[role="combobox"]')];
        if(inputs.length!==4||inputs.some(input=>!input||!input.isConnected||input.disabled))return false;
        const next=inputs.map(input=>input.value||'').join('|')+'|'+['Klient','Služba','Terapeut','Místnost'].map(name=>visitField(form,name).querySelector('.q-field__native .ellipsis')?.textContent||'').join('|');
        if(form!==last||inputs.some((input,i)=>input!==lastInputs[i])||next!==signature){last=form;lastInputs=inputs;signature=next;stableSince=Date.now();return false;}
        return Date.now()-stableSince>=1000?form:false;
      }catch(_){return false;}
    },'Formulář se nedokončil načítat. Zkuste přípravu znovu.',15000);
  }
  async function retryVisitPreparation(attempt, canRetry) {
    for(let number=0;number<3;number++){
      try{return await attempt(number);}
      catch(error){if(number===2||!canRetry(error))throw error;}
    }
  }
  async function settleVisitValues(checkValues) {
    const deadline=Date.now()+12000;let stableSince=Date.now();
    while(Date.now()<deadline){
      await new Promise(resolve=>setTimeout(resolve,100));
      if(!checkValues())stableSince=Date.now();
      else if(Date.now()-stableSince>=3000)return;
    }
    throw Error('Fyzion opakovaně přepisuje datum, čas nebo délku. Údaje nejsou potvrzené; zkontrolujte formulář ručně.');
  }
  function serviceNameMatches(actual, expected, duration=null) {
    const clean=text=>normalize(text).replace(/\s+/g,'').replace(/[().]/g,'');
    const candidate=clean(actual),target=clean(expected),minutes=/(15|30|45)min$/.exec(target)?.[1];
    return candidate===target||!!minutes&&candidate===target+minutes+'min'||target==='terapie'&&[15,30].includes(duration)&&candidate==='terapie'+duration+'min';
  }
  function serviceOptionMatches(option, expected, minutes) {
    const name=option.querySelector('.q-item__label:not(.q-item__label--caption)')?.textContent||'';
    if(!serviceNameMatches(name,expected,minutes))return false;
    const durations=[...String(option.textContent||'').matchAll(/(?:^|[^\d])(\d+)\s*min(?:ut(?:a|y)?|utes?)?\b/gi)].map(match=>Number(match[1]));
    // U shodných názvů je rozhodující délka v celé položce, včetně pravého sloupce.
    return durations.length>0&&durations.every(value=>value===minutes);
  }
  function serviceForDuration(minutes) {
    return ({15:'Terapie',30:'Terapie',45:'komplexní terapie 45min'})[minutes]||null;
  }
  async function verifyVisitSlot(slot, signal, check) {
    check();
    if(!slot||!Number.isFinite(slot.start)||slot.start<=Date.now())throw Error('Termín již začal nebo není platný. Vyhledejte nový.');
    if(!state.transport)throw Error('Chybí přihlášení. Otevřete kalendář.');
    const auth={headers:new Headers(state.transport.headers),credentials:state.transport.credentials};
    const resources=arrayOf(await readApi('https://api.fyzion.cz/v1/calendar-users/resources/',auth,signal));check();
    const resource=resources.find(r=>r.id===slot.resourceId);
    if(!resource||normalize(resource.title)!==normalize(slot.title)||resources.filter(r=>normalize(r.title)===normalize(slot.title)).length!==1)
      throw Error('Terapeuta nelze jednoznačně ověřit podle jména a ID. Vyberte jej ručně.');
    const date=parts(slot.start).date,url=new URL('https://api.fyzion.cz/v1/calendar-users/events/');
    url.searchParams.set('start',new Date(localMs(date,'00:00:00')).toISOString());
    url.searchParams.set('end',new Date(localMs(nextDay(date),'00:00:00')).toISOString());url.searchParams.append('user_ids',slot.resourceId);
    const events=availabilityOnly(arrayOf(await readApi(url,auth,signal)));check();
    if(!previewModel(slot,resource,events).free)throw Error('Termín již není volný. Spusťte nové hledání.');
  }
  async function prepareVisit(slot, patientId, progress=()=>{}, signal) {
    const path=location.pathname,deadline=Date.now()+60000;
    if(!patientId||patientCardKey(path)!==patientId)throw Error('Spusťte přípravu z karty požadovaného klienta.');
    let boundForm=null,clientSignature=null,contextPath=path,openingFromCard=false;
    let form,cancelled=false,serviceAttempted=false,serviceSelected=false;
    const requestedService=serviceForDuration((slot.end-slot.start)/MIN);
    // focus()/blur() mohou vyvolat důvěryhodné change události i při našem zápisu.
    // Ruční zásah rozpoznáváme podle uživatelského záměru před samotnou změnou.
    const onEdit=event=>{
      if(!event.isTrusted)return;
      const target=event.target;
      if(event.type==='pointerdown'||event.type==='keydown'||
        event.type==='beforeinput'&&target?.closest?.('form.q-form,[role="listbox"],.q-menu'))cancelled=true;
    };
    const events=['beforeinput','pointerdown','keydown'];
    events.forEach(type=>document.addEventListener(type,onEdit,true));
    const check=()=>{
      if(cancelled||signal?.aborted)throw Error('Příprava přerušena uživatelem.');
      if(Date.now()>=deadline)throw Error('Vypršel celkový limit přípravy (60 sekund).');
      const currentPatient=patientCardKey(location.pathname);
      if(currentPatient&&currentPatient!==patientId)throw Error('Otevřela se karta jiného klienta. Příprava byla zastavena.');
      if(openingFromCard&&location.pathname!==contextPath&&
        (currentPatient!==patientId||!/\/new\/?$/.test(location.pathname)))throw Error('Otevřela se neočekávaná stránka místo nové návštěvy.');
      const queryPatient=new URLSearchParams(location.search||'').get('patientId');
      if(queryPatient&&queryPatient!==patientId)throw Error('Formulář v adrese odkazuje na jiného klienta.');
      // Vlastní otevření nové návštěvy může přejít z karty na jinou adresu.
      // Přechod povolujeme pouze mezi naším kliknutím a ustálením formuláře.
      if(!openingFromCard&&location.pathname!==contextPath)throw Error('Stránka se během přípravy změnila. Spusťte přípravu znovu.');
      if(boundForm){
        if(visitForm()!==boundForm||!boundForm.isConnected)throw Error('Formulář byl zavřen nebo nahrazen.');
        const id=visitPatientId(boundForm),name=visitField(boundForm,'Klient').querySelector('.q-field__native .ellipsis')?.textContent.trim();
        if(id&&id!==patientId||name!==clientSignature)throw Error('Klient ve formuláři se změnil.');
      }
    };
    try {
      progress('Ověřuji aktuální dostupnost termínu…');
      await verifyVisitSlot(slot,signal,check);check();
      progress('Otevírám formulář návštěvy…');
      await openVisitFromCard(patientId,check,()=>{openingFromCard=true;});
      progress('Čekám na dokončení načítání formuláře…');
      // Totožnost DOM uzlu a klienta uzamkneme až po dokončení úvodního překreslení.
      boundForm=await waitForVisitSettled(check);
      clientSignature=visitField(boundForm,'Klient').querySelector('.q-field__native .ellipsis')?.textContent.trim();
      if(!clientSignature)throw Error('Fyzion dosud nepředvyplnil klienta. Zavřete formulář a zkuste přípravu znovu.');
      contextPath=location.pathname;openingFromCard=false;
      check();
      await retryVisitPreparation(async()=>{
        check();form=await waitForVisitSettled(check);
    if(requestedService&&!serviceAttempted){
      serviceAttempted=true;progress('Vybírám službu '+requestedService+'…');
      try{serviceSelected=await visitSelect(visitField(form,'Služba'),requestedService,null,text=>serviceNameMatches(text,requestedService,(slot.end-slot.start)/MIN),option=>serviceOptionMatches(option,requestedService,(slot.end-slot.start)/MIN),check);}
      catch(error){check();progress('Službu se nepodařilo vybrat. Pokračuji v doplnění termínu…');}
      check();form=await waitForVisitSettled(check);
    }
    progress('Doplňuji terapeuta, délku, datum a čas…');
    const therapist=visitField(form,'Terapeut');
    if(!await visitSelect(therapist,slot.title,null,null,null,check))throw Error('Terapeut nebyl jednoznačně nalezen v nabídce. Vyberte jej ručně.');
    check();form=await waitForVisitSettled(check);
    const duration=String((slot.end-slot.start)/MIN);
    visitInput(visitField(form,'Délka (min.)').querySelector('input.q-field__native'),duration);
    // Služba a délka mohou ve Vue spustit přepočet času. Čas zapisujeme až po něm.
    form=await waitForVisitSettled(check);
    const {date,time}=parts(slot.start),[y,m,d]=date.split('-');
    function currentInputs(){
      const live=visitForm();if(!live)throw Error('Formulář byl během přípravy zavřen.');
      const inputs=[...live.querySelectorAll('.date-time__input-group input.q-field__native')];
      if(inputs.length!==2)throw Error('Datum a čas nemají očekávanou strukturu.');
      form=live;return inputs;
    }
    const old=currentInputs()[0].value;
    const dateValue=/^\d{4}-\d{2}-\d{2}$/.test(old)?date:
      /^\d{2}\.\d{2}\.\d{4}$/.test(old)?`${d}.${m}.${y}`:`${Number(d)}. ${Number(m)}. ${y}`;
    visitInput(currentInputs()[0],dateValue);
    await new Promise(resolve=>setTimeout(resolve,250));check();
    visitInput(currentInputs()[1],time.slice(0,5));
    // Potvrzení vyžaduje 3 sekundy beze změny. Pozdní přepis služby opravíme automaticky.
    await settleVisitValues(()=>{
      check();const inputs=currentInputs();
      if(serviceSelected&&!serviceNameMatches(visitField(form,'Služba').querySelector('.q-field__native .ellipsis')?.textContent,requestedService,(slot.end-slot.start)/MIN))serviceSelected=false;
      if(normalize(visitField(form,'Terapeut').querySelector('.q-field__native .ellipsis')?.textContent)!==normalize(slot.title))throw Error('Formulář změnil terapeuta.');
      let changed=false;
      const length=visitField(form,'Délka (min.)').querySelector('input.q-field__native');
      if(Number(length.value)!==Number(duration)){visitInput(length,duration);changed=true;}
      if(inputs[0].value!==dateValue){visitInput(inputs[0],dateValue);changed=true;}
      if(inputs[1].value!==time.slice(0,5)){visitInput(inputs[1],time.slice(0,5));changed=true;}
      return !changed;
    });
      },error=>!error.noRetry&&!cancelled&&!!visitForm()&&!/více|nejednoznač|ruční úprav/.test(error.message));
    // Pomocné POST požadavky formuláře také mění state.changes. Dostupnost proto
    // potvrzujeme čerstvým čtením místo záměny každého POST za změnu kalendáře.
    const valueSignature=()=>JSON.stringify([
      ...[...form.querySelectorAll('.date-time__input-group input.q-field__native')].map(input=>input.value),
      visitField(form,'Délka (min.)').querySelector('input.q-field__native')?.value,
      ...['Klient','Služba','Terapeut','Místnost'].map(name=>visitField(form,name).querySelector('.q-field__native .ellipsis')?.textContent||'')
    ]);
    check();const confirmedValues=valueSignature();
    progress('Znovu ověřuji dostupnost připraveného termínu…');
    await verifyVisitSlot(slot,signal,check);check();
    if(valueSignature()!==confirmedValues)throw Error('Údaje formuláře se během závěrečného ověření změnily. Zkontrolujte je a spusťte přípravu znovu.');
    const client=visitField(form,'Klient').querySelector('.q-field__native .ellipsis')?.textContent.trim();
    return 'Předvyplněno datum, čas, délka a terapeut. '+(client?'Klient předvyplněný Fyzionem zůstal zachovaný.':'Klient není vybraný — doplňte jej nebo otevřete návštěvu z karty klienta.')+(serviceSelected?' Služba: '+requestedService+'.':' POZOR: služba není automaticky ověřená — vyberte ji ručně a zkontrolujte potom čas i délku.')+' Zkontrolujte místnost a všechny údaje. Návštěva není uložená.';
    } finally {events.forEach(type=>document.removeEventListener(type,onEdit,true));}
  }
  function mount() {
    const host = document.createElement('div');
    document.documentElement.append(host);
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>
      :host{all:initial;font-family:Arial,sans-serif;color:#20232a;font-size:14px}
      #activity{position:sticky;bottom:0;height:3px;margin:12px 0 0;z-index:1;border-radius:3px;background:#ed437425;pointer-events:none;overflow:hidden}
      #activity span{display:block;width:35%;height:100%;background:#ed4374;opacity:0}
      #activity[data-active="true"] span{opacity:1;animation:fyzion-progress 1.3s ease-in-out infinite}
      @keyframes fyzion-progress{from{transform:translateX(-110%)}to{transform:translateX(395%)}}
      @media(prefers-reduced-motion:reduce){#activity[data-active="true"] span{animation:none;width:100%}}
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
      details{border-bottom:1px solid #eee;padding:10px 0}summary{cursor:pointer;font-weight:bold}
      .plus-switches label:has(input){display:flex;align-items:center;gap:8px}.plus-switches input[type="checkbox"]{width:auto;margin:0}
      input[type="color"]{height:36px;padding:3px;width:80px}#settings button{margin:5px 4px 5px 0;padding:7px;border:1px solid #ccc;border-radius:6px;background:white}
      #settings a{color:#b52854}#settings summary:focus-visible{outline:2px solid #ed4374}
      #tile-row{display:flex;gap:8px;flex-wrap:wrap;max-width:calc(100vw - 16px)}
      #therapists-toggle{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:#fafbfc;color:#4b5563;border:1px solid #d7dde2;border-radius:5px;padding:5px 9px;font-weight:500;box-shadow:none}
      #therapists-toggle:hover{background:#f0f3f5;border-color:#b7c1ca;color:#263d49}
      #therapists-toggle[aria-expanded="true"]{background:#edf2f4;border-color:#aebec6;color:#263d49}
      #therapists-toggle:focus-visible{outline:2px solid #657e8b;outline-offset:2px}
      #therapists-toggle::after{content:'';width:5px;height:5px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:translateY(-2px) rotate(45deg);opacity:.7}
      #therapists-toggle[aria-expanded="true"]::after{transform:translateY(1px) rotate(225deg)}
      #therapists-panel{background:white;border:1px solid #ddd;border-radius:12px;padding:16px;width:min(420px,calc(100vw - 16px));max-height:60vh;overflow:auto;box-shadow:0 8px 32px #0003}
      #therapists-panel button{display:block;width:100%;text-align:left;margin-top:8px;background:#f4f6f5;border:1px solid #dbe0de;padding:10px;border-radius:7px}
      #therapists-panel button:hover{background:#fff0f5}#therapists-now{color:#b52854;font-weight:bold}
      #settings{border:1px solid #ddd;border-radius:8px;padding:10px;margin:12px 0}
      #settings-list{max-height:180px;overflow:auto}#settings-list label{display:flex;align-items:center;gap:8px;margin:8px 0}
      #settings-list input{width:auto;margin:0}#settings-toggle,#settings-reset{background:white;border:1px solid #ccc;border-radius:5px;padding:6px 9px;margin:6px 0}
      #series-fields{margin:12px 0;padding:12px;background:#fff5f8;border:1px solid #f0d0db;border-radius:8px}
      #series-fields label:has(input[type="checkbox"]){display:flex;align-items:center;gap:8px}#series-fields input[type="checkbox"]{width:auto;margin:0}
      .series-plan{margin:12px 0;padding:12px;border:1px solid #ead8df;border-radius:9px;background:#fffafb}.series-plan ol{list-style:none;padding:0;margin:5px 0}
      #results>li.day-group{padding:0;border:1px solid #e4e6e5;border-radius:9px;margin:7px 0;overflow:hidden}
      #results details.day-result{padding:0;border:0}#results .day-result>summary{padding:10px 12px;cursor:pointer;list-style:none;background:#f8f9f8}
      #results .day-result>summary::-webkit-details-marker{display:none}.day-title{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:14px}
      .day-count{font-size:11px;font-weight:normal;color:#666}.day-preview{display:block;margin-top:3px;font-size:12px;color:#666;font-weight:normal}
      .day-chevron{font-size:12px;color:#b52854;display:inline-block;margin-right:5px}.day-result[open] .day-chevron{transform:rotate(90deg)}
      .day-options{list-style:none;margin:0;padding:0 6px}.day-options .slot-link{font-size:13px;padding:9px 6px}
      .slot-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;padding:8px;background:#f8faf9;border:1px solid #e0e7e4;border-radius:9px}
      .slot-actions .slot-link{grid-column:1/-1;min-width:0;padding:10px!important;background:white;border:1px solid #e2e9e6;display:flex;flex-direction:column;gap:5px}
      .slot-date{font-size:14px;font-weight:400;color:#243e47;line-height:1.4}
      .slot-time{font-size:17px;font-weight:500;color:#a52352;line-height:1.25;font-variant-numeric:tabular-nums}
      .slot-therapist{font-size:13px;color:#52646b;line-height:1.4;overflow-wrap:anywhere}
      .slot-actions .alternative-btn{width:100%;min-width:0;min-height:34px;white-space:normal;line-height:1.35}
      :host(.booking-disabled) .prepare-visit,:host(.no-booking-context) .prepare-visit{display:none!important}
      .slot-actions .prepare-visit{grid-column:1/-1;background:#a52352;color:white;font-weight:700;border-color:#a52352;font-size:13px}
      .slot-actions .remove-slot{grid-column:2;justify-self:end;width:36px}
      @media(max-width:360px){.slot-actions{grid-template-columns:minmax(0,1fr)}.slot-actions .remove-slot{grid-column:1}.slot-time{font-size:16px}}
      .remove-slot{width:28px;min-width:28px;height:28px;padding:0!important;font-size:19px!important;line-height:1}
      .alternative-btn{flex:none;font-size:11px;padding:7px;border:1px solid #dab8c6;border-radius:6px;background:white;color:#a52352}
      .alternative-options{list-style:none;margin:8px 0;padding:8px;border:1px solid #e8d5dd;border-radius:7px;background:#fff6f9}
      .alternative-choice{width:100%;text-align:left;border:0;background:transparent;padding:7px;color:#a52352;font-size:12px}
      #patient-options{margin:10px 0;padding:10px;border:1px solid #e2e5e3;border-radius:8px;background:#f9faf9}
      #patient-weekdays{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}#patient-weekdays label{display:flex;align-items:center;gap:4px;margin:0;font-size:12px;padding:6px;background:white;border-radius:5px}
      #patient-weekdays input{width:auto;margin:0}.patient-times{display:flex;gap:10px}.patient-times>div{flex:1;min-width:0}
    </style><div id="widget"><div id="tile-row"><button id="toggle" title="Kliknutím otevřete nebo zavřete; tažením přesunete celý panel">Volné termíny</button><button id="therapists-toggle" type="button" aria-expanded="false" aria-controls="therapists-panel">Zobrazit terapeuty</button></div>
    <section id="therapists-panel" hidden aria-label="Zobrazení terapeutů"><strong>Zobrazit terapeuty</strong>
      <button id="therapists-now" type="button">Právě pracují</button><button id="therapists-all" type="button">Zobrazit všechny terapeuty</button><button id="therapists-none" type="button">Skrýt všechny terapeuty</button>
      <p class="muted">Pracuje pouze s terapeuty povolenými v Nastavení Fyzion+. Právě pracují: skutečný dnešní čas v Praze. Zahrnuje terapeuty v pracovní době bez volna a terapeuty s právě probíhající návštěvou či jinou událostí i mimo rozvrh. Samotné volno nebo přestávka se za práci nepočítá. Volba nahradí aktuální výběr sloupců.</p><p id="therapists-message" class="muted" role="status"></p><details id="therapists-diagnostics" hidden><summary>Proč se terapeut zobrazuje nebo nezobrazuje?</summary><p id="therapists-check-time" class="muted"></p><ul id="therapists-reasons"></ul></details></section>
    <section id="panel" hidden><div id="heading" title="Přetažením přesunete okno"><h2>Volné termíny <small style="font-size:11px;color:#777">Fyzion+ ${PLUS_VERSION}</small></h2><button id="close" aria-label="Zavřít">×</button></div>
      <p class="muted">Běžný týdenní rozvrh bez nepravidelné pracovní doby. Praha. Začátky po 15 minutách. Nic se automaticky nerezervuje.</p>
      <button id="settings-toggle" type="button" aria-expanded="false">Nastavení Fyzion+</button>
      <div id="settings" hidden>
      <details open><summary>Moduly</summary><div class="plus-switches"><label><input id="plus-bookingModule" type="checkbox">Objednání z karty klienta</label><label><input id="plus-showPreparationMessages" type="checkbox">Zobrazovat hlášky přípravy návštěvy</label><label><input id="plus-therapistsModule" type="checkbox">Zobrazit terapeuty</label><label><input id="plus-seriesModule" type="checkbox">Naplánovat sérii termínů</label></div><p class="muted">Série přidá do Volných termínů počet návštěv a volbu jednoho terapeuta. Vypnutí zobrazení terapeutů nezmění aktuální výběr sloupců.</p></details>
      <details open><summary>Vzhled Fyzionu</summary><div class="plus-switches">
        <label><input id="plus-hideNativeVisitButton" type="checkbox">Skrýt původní tlačítko + Návštěva</label>
        <label><input id="plus-contrast" type="checkbox">Výraznější volno</label>
        <label for="plus-offColor">Barva volna</label><input id="plus-offColor" type="color">
        <label><input id="plus-hidePopup" type="checkbox">Skrýt náhled při najetí myší</label>
        <label><input id="plus-timeLabels" type="checkbox">Časové popisky v kalendáři</label>
        <label><input id="plus-hideVisitStatus" type="checkbox">Skrýt nabídku Stav návštěvy</label>
        <label><input id="plus-hatch" type="checkbox">Odlišit šrafované události</label>
        <label for="plus-hatchColor">Barva šrafovaných událostí</label><input id="plus-hatchColor" type="color">
      </div></details>
      <details><summary>Výchozí hledání</summary>
        <label for="plus-duration">Délka návštěvy</label><select id="plus-duration"><option value="15">15 min</option><option value="30">30 min</option><option value="45">45 min</option><option value="60">1 h</option></select>
        <label for="days">Rozsah prohledávání (kalendářní dny)</label><input id="days" type="number" min="1" max="180" step="1" value="90">
        <p class="muted">Celé prohledávané období od data Hledat od. Určuje i to, jak daleko mohou pokračovat série. Maximum 180 dní.</p>
      </details>
      <details><summary>Přenos na jiný počítač</summary><p class="muted">Na novém počítači nainstalujte Fyzion+ a poté importujte nastavení. Import nahrazuje zdejší nastavení.</p>
        <button id="plus-export" type="button">Export nastavení</button><button id="plus-import" type="button">Import nastavení</button>
        <input id="plus-file" type="file" accept=".json,application/json" hidden>
        <button id="plus-reset-position" type="button">Vrátit polohu panelu</button>
        <p><a href="https://raw.githubusercontent.com/bruhaedwin/Fyzion_upravy/main/fyzion-helper.user.js" target="_blank" rel="noopener noreferrer">Instalační odkaz Fyzion+</a></p>
      </details><p id="plus-message" class="muted" aria-live="polite"></p><details id="search-therapists-settings"><summary>Terapeuti dostupní pro hledání</summary><p class="muted">Odškrtnuté terapeuty skryji z nabídky i z volby Všichni. Nastavení se ukládá v tomto prohlížeči.</p>
        <div id="settings-list"></div><button id="settings-reset" type="button">Obnovit všechny terapeuty</button><p id="settings-message" class="muted" aria-live="polite"></p></details></div>
      <p id="status"></p><label for="therapist">Terapeut pro hledání</label><select id="therapist"></select><p class="muted">Pro výběr více terapeutů zvolte Všichni a zaškrtněte požadované terapeuty níže. Výběr funguje i na kartě klienta.</p>
      <div id="therapist-selection" hidden><p class="muted">Zrušte zaškrtnutí terapeutů, které chcete z hledání vynechat.</p>
        <div id="selection-actions"><button id="select-all" type="button">Vybrat všechny</button><button id="select-none" type="button">Zrušit výběr</button></div>
        <div id="therapist-list"></div><p id="selection-count" class="muted"></p></div>
      <label for="duration">Délka návštěvy</label><select id="duration"><option value="15">15 min</option><option value="30" selected>30 min</option><option value="45">45 min</option><option value="60">1 h</option></select>
      <label for="from">Hledat od</label><input id="from" type="date">
      <details id="patient-options"><summary>Možnosti pacienta</summary><div id="patient-weekdays"></div><div class="patient-times">
        <div><label for="patient-from">Nejdříve od</label><input id="patient-from" type="time"></div><div><label for="patient-to">Nejpozději do</label><input id="patient-to" type="time"></div></div>
        <p class="muted">Prázdný čas neomezuje daný okraj dne. Celá návštěva se musí vejít do zvolených hodin v Praze. Platí pro termíny, série i alternativy. Po obnovení stránky se možnosti pacienta vymažou.</p></details>
      <div class="plus-switches"><label><input id="first-within40" type="checkbox">První návštěva do 40 dní</label></div>
      <p class="muted">První návštěva nejpozději 40 kalendářních dní ode dneška. Další termíny série mohou být později, v nastaveném rozsahu hledání.</p><p id="search-range-note" class="muted"></p>
      <div id="series-fields" hidden><label for="series-count">Počet termínů</label><input id="series-count" type="number" min="1" max="30" step="1" value="5">
        <label><input id="series-single" type="checkbox" checked>Pouze u jednoho terapeuta</label>
        <p class="muted">Nejbližší dostupné termíny, mezi návštěvami alespoň jeden celý volný den.</p><p class="muted">Bez automatické rezervace. Pro kombinování terapeutů vyberte v poli Terapeut možnost Všichni. Hodina návštěv se může lišit.</p></div>
      <button id="search">Načíst období a najít termíny</button><button id="cancel" hidden>Zrušit hledání</button>
      <p id="message" aria-live="polite"></p><p id="snapshot" aria-live="polite"></p><p id="navigation" aria-live="polite"></p><ul id="results"></ul><div id="activity" role="progressbar" aria-label="Fyzion+ pracuje" aria-hidden="true"><span></span></div>
      <p class="muted">Výsledky platí pro načtená data. Před rezervací obnovte kalendář a proveďte hledání znovu. Konečnou dostupnost ověřuje Fyzion při uložení.</p>
    </section></div>`;
    const dockHost=document.createElement('div');
    document.documentElement.append(dockHost);
    const dockRoot=dockHost.attachShadow({mode:'open'});
    const dockStyle=document.createElement('style');
    dockStyle.textContent=root.querySelector('style').textContent+`
      #therapists-dock{position:fixed;z-index:2147483645;display:flex;flex-direction:column;align-items:flex-start;gap:8px}
      #therapists-toggle{width:auto;max-width:100%;min-height:28px;padding:5px 9px;font-size:12px;line-height:18px;border-radius:5px;box-shadow:none}
      #therapists-panel{max-height:min(55vh,calc(100vh - 100px));margin:0;padding:10px;border-radius:8px;font-size:12px}
      #therapists-panel button{padding:7px 8px;margin-top:5px;border-radius:5px}
      #therapists-panel>strong,#therapists-panel>p,#therapists-panel>details{display:none!important}
      #therapists-panel button:first-of-type{margin-top:0}
      #therapists-panel p{margin:7px 0}
      #therapists-panel li{padding:6px 0}
    `;
    const dock=document.createElement('div');dock.id='therapists-dock';dock.hidden=true;
    dock.append(root.getElementById('therapists-toggle'));dock.append(root.getElementById('therapists-panel'));
    dockRoot.append(dockStyle);dockRoot.append(dock);
    const settingsHost=document.createElement('div');
    document.documentElement.append(settingsHost);
    const settingsRoot=settingsHost.attachShadow({mode:'open'}),settingsStyle=document.createElement('style');
    settingsStyle.textContent=root.querySelector('style').textContent+`
      #settings-dock{position:fixed;z-index:2147483647;display:flex;flex-direction:column;align-items:flex-start;gap:8px}
      #settings-toggle{margin:0;width:32px;height:32px;padding:0;border:0;border-radius:8px;background:#ed4374;color:white;font-size:27px;line-height:1;box-shadow:0 2px 8px #0002}
      #settings{margin:0;padding:16px;width:min(420px,calc(100vw - 16px));max-height:calc(100vh - 65px);overflow:auto;background:white;border-radius:12px;box-shadow:0 8px 32px #0003}
      #settings-header{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}
      #settings-header h2{margin:0;font-size:18px}#settings-header button{border:0;background:none;font-size:22px;padding:0 5px}
    `;
    const settingsDock=document.createElement('div');settingsDock.id='settings-dock';
    const settingsToggle=root.getElementById('settings-toggle');
    settingsToggle.textContent='+';settingsToggle.title='Nastavení Fyzion+';
    settingsToggle.setAttribute('aria-label','Otevřít nastavení Fyzion+');settingsToggle.setAttribute('aria-controls','settings');
    const settingsBody=root.getElementById('settings');
    const settingsHeader=document.createElement('div');settingsHeader.id='settings-header';
    const settingsTitle=document.createElement('h2');settingsTitle.textContent='Nastavení Fyzion+';
    const settingsClose=document.createElement('button');settingsClose.id='settings-close';settingsClose.type='button';settingsClose.textContent='×';settingsClose.setAttribute('aria-label','Zavřít nastavení Fyzion+');
    settingsHeader.append(settingsTitle);settingsHeader.append(settingsClose);settingsBody.prepend(settingsHeader);
    settingsDock.append(settingsToggle);settingsDock.append(settingsBody);settingsRoot.append(settingsStyle);settingsRoot.append(settingsDock);
    const el = id => root.getElementById(id)||dockRoot.getElementById(id)||settingsRoot.getElementById(id);
    const patientDays=new Map();
    for(const [day,text]of [[1,'Po'],[2,'Út'],[3,'St'],[4,'Čt'],[5,'Pá']]){
      const label=document.createElement('label'),input=document.createElement('input'),caption=document.createElement('span');
      input.type='checkbox';input.checked=true;caption.textContent=text;input.setAttribute('aria-label',`Možnosti pacienta: ${text}`);
      label.append(input);label.append(caption);el('patient-weekdays').append(label);patientDays.set(day,input);
    }
    function readPatientPreferences(){return validatePatientPreferences({days:[...patientDays].filter(([,input])=>input.checked).map(([day])=>day),from:el('patient-from').value,to:el('patient-to').value});}
    function positionSettingsDock(){
      const logos=[...document.querySelectorAll('img')].filter(image=>{
        const box=image.getBoundingClientRect();
        return image.getClientRects().length&&box.left<300&&box.top>=0&&box.top<180&&box.width>=70&&box.height>=15&&/fyzion|logo/i.test(`${image.alt} ${image.getAttribute('src')||''}`);
      }).sort((a,b)=>a.getBoundingClientRect().top-b.getBoundingClientRect().top);
      const logo=logos[0]?.getBoundingClientRect();
      const left=Math.max(8,Math.min(logo?.left??8,innerWidth-40));
      const top=Math.max(4,Math.min(logo?logo.top-38:8,innerHeight-40));
      settingsDock.style.left=left+'px';settingsDock.style.top=top+'px';
      settingsBody.style.width=Math.max(150,Math.min(420,innerWidth-left-8))+'px';
      settingsBody.style.maxHeight=Math.max(100,innerHeight-top-50)+'px';
    }
    window.addEventListener('resize',positionSettingsDock);window.addEventListener('scroll',positionSettingsDock,true);
    positionSettingsDock();
    let therapistModuleEnabled=true;
    function positionTherapistDock(){
      if(!therapistModuleEnabled){
        dock.hidden=true;dockRoot.getElementById('therapists-panel').hidden=true;
        dockRoot.getElementById('therapists-toggle').setAttribute('aria-expanded','false');return;
      }
      const fields=[...document.querySelectorAll('label.q-select--multiple')].filter(e=>e.getClientRects().length&&
        /^(terapeuti|therapists)\b/.test(normalize(e.querySelector('.q-field__native .ellipsis')?.textContent)));
      if(fields.length!==1){dock.hidden=true;return;}
      const box=fields[0].getBoundingClientRect();
      if(box.bottom<0||box.bottom>innerHeight-40||box.right<=0||box.left>=innerWidth){dock.hidden=true;return;}
      dock.hidden=false;
      const width=Math.min(Math.max(180,box.width),innerWidth-16);
      const left=Math.max(8,Math.min(box.left,innerWidth-width-8));
      dock.style.left=left+'px';dock.style.top=(box.bottom+6)+'px';dock.style.width=width+'px';
      const menu=dockRoot.getElementById('therapists-panel');
      menu.style.width=Math.min(300,innerWidth-left-8)+'px';
      menu.style.maxHeight=Math.max(80,innerHeight-box.bottom-62)+'px';
    }
    window.addEventListener('resize',positionTherapistDock);
    window.addEventListener('scroll',positionTherapistDock,true);
    const dockObserver=new ResizeObserver(positionTherapistDock);
    dockObserver.observe(document.documentElement);
    positionTherapistDock();
    el('from').value = parts(Date.now()).date;
    let previewSequence = 0;
    async function openSlotPreview(slot, returnFocus) {
      const sequence = ++previewSequence, previousFocus = returnFocus || root.activeElement;
      const old = root.getElementById('slot-preview'); if(old)old.remove();
      const overlay = document.createElement('div'); overlay.id='slot-preview';
      overlay.style.cssText='position:fixed;inset:0;background:#0006;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:12px';
      const dialog=document.createElement('section');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','Kontrolní náhled termínu');
      dialog.style.cssText='background:white;color:#203743;border-radius:12px;width:min(650px,95vw);max-height:92vh;overflow:auto;padding:20px;box-shadow:0 12px 50px #0005';
      const title=document.createElement('h2');title.textContent='Kontrolní náhled · '+slot.title;
      const close=document.createElement('button');close.type='button';close.textContent='Zavřít náhled';
      const note=document.createElement('p');note.setAttribute('role','status');note.textContent='Načítám aktuální rozvrh a obsazenost dne…';
      const content=document.createElement('div');
      const go=document.createElement('button');go.type='button';go.textContent='Otevřít v kalendáři';go.disabled=true;
      const info=document.createElement('p');info.style.fontSize='12px';info.textContent='Pouze obsazenost vybraného terapeuta. Bez jmen pacientů. Kolize klienta u jiných terapeutů nejsou ověřeny. Náhled nic nerezervuje ani nepředvyplňuje klienta.';
      dialog.append(title,close,note,content,info,go);overlay.append(dialog);root.append(overlay);
      const controller=new AbortController();let timer=null;
      const dismiss=()=>{controller.abort();clearInterval(timer);overlay.remove();if(sequence===previewSequence)previewSequence++;previousFocus?.focus();};
      close.onclick=dismiss;overlay.onclick=e=>{if(e.target===overlay)dismiss();};
      overlay.onkeydown=e=>{if(e.key==='Escape'){e.stopPropagation();dismiss();}if(e.key==='Tab'){const buttons=[close,...(!go.disabled?[go]:[])];if(e.shiftKey&&root.activeElement===buttons[0]){e.preventDefault();buttons.at(-1).focus();}else if(!e.shiftKey&&root.activeElement===buttons.at(-1)){e.preventDefault();buttons[0].focus();}}};close.focus();
      const timeout=setTimeout(()=>controller.abort(),30000);
      try {
        if(!state.transport)throw Error('Nejprve otevřete kalendář Fyzionu pro načtení přihlášení.');
        const changes=state.changes,loaded=Date.now(),auth=state.transport,date=parts(slot.start).date;
        const resources=arrayOf(await readApi('https://api.fyzion.cz/v1/calendar-users/resources/',auth,controller.signal));
        const resource=resources.find(r=>r.id===slot.resourceId);if(!resource)throw Error('Terapeut již není dostupný.');
        const url=new URL('https://api.fyzion.cz/v1/calendar-users/events/');
        url.searchParams.set('start',new Date(localMs(date,'00:00:00')).toISOString());url.searchParams.set('end',new Date(localMs(nextDay(date),'00:00:00')).toISOString());url.searchParams.append('user_ids',slot.resourceId);
        const events=availabilityOnly(arrayOf(await readApi(url.href,auth,controller.signal)));
        if(sequence!==previewSequence||!overlay.isConnected)return;
        if(changes!==state.changes||Date.now()-loaded>=MAX_AGE)throw Error('Data se během načítání změnila. Otevřete náhled znovu.');
        const model=previewModel(slot,resource,events);
        note.textContent=date+' · '+parts(slot.start).time.slice(0,5)+'–'+parts(slot.end).time.slice(0,5)+' · '+(model.free?'Termín je podle aktuálních dat volný.':'Termín již není dostupný nebo je mimo pracovní rozvrh.');
        note.style.color=model.free?'#14734f':'#ae3030';
        const hours=document.createElement('p');hours.style.cssText='padding:10px 12px;border:2px solid #176b50;border-radius:6px;background:#edf8f1;color:#124d3a;font-weight:700';
        const hourText=ms=>ms===model.to?'24:00':parts(ms).time.slice(0,5);
        hours.textContent='Pracovní doba · '+slot.title+': '+(model.working.length?model.working.map(period=>hourText(period.start)+'–'+hourText(period.end)).join(' a '):'V tento den nemá pravidelnou pracovní dobu.');content.append(hours);
        const legend=document.createElement('p');legend.style.cssText='font-size:12px;color:#475569';legend.textContent='Zelené pozadí: pravidelná pracovní doba. Šedé pozadí: mimo pracovní dobu. Rozvrh nezahrnuje nepravidelné změny; obsazenost je zobrazena samostatně.';content.append(legend);
        const scroller=document.createElement('div');scroller.style.cssText='height:360px;overflow:auto;border:1px solid #cbdadc;border-radius:8px;margin:12px 0';
        const timeline=document.createElement('div');const total=(model.to-model.from)/MIN;timeline.style.cssText='position:relative;background:#e5e7eb;margin-left:52px;height:'+total+'px';scroller.append(timeline);content.append(scroller);
        for(const period of model.working){const shade=document.createElement('div');shade.style.cssText='position:absolute;left:0;right:0;background:#edf8f1;top:'+((period.start-model.from)/MIN)+'px;height:'+((period.end-period.start)/MIN)+'px';timeline.append(shade);}
        for(let t=model.from;t<model.to;t+=30*MIN){const line=document.createElement('div');line.style.cssText='position:absolute;left:0;right:0;border-top:1px solid #e4e9eb;top:'+((t-model.from)/MIN)+'px';const label=document.createElement('span');label.style.cssText='position:absolute;left:-48px;top:0;font-size:11px';label.textContent=parts(t).time.slice(0,5);line.append(label);timeline.append(line);}
        function block(start,end,label,color,left,right){const b=document.createElement('div');b.style.cssText='position:absolute;overflow:hidden;border:1px solid #577b86;border-radius:4px;padding:3px;font-size:12px;top:'+((start-model.from)/MIN)+'px;height:'+((end-start)/MIN)+'px;background:'+color+';left:'+left+';right:'+right;b.textContent=label+' '+parts(start).time.slice(0,5)+'–'+parts(end).time.slice(0,5);timeline.append(b);}
        for(const event of model.busy)block(event.start,event.end,'Obsazeno','#dce9f1','4px','48%');
        block(slot.start,slot.end,'Návrh',model.free?'#c8f4db':'#ffd2d2','54%','4px');scroller.scrollTop=Math.max(0,(slot.start-model.from)/MIN-100);
        for(const period of model.working){
          for(const [time,label,isStart] of [[period.start,'Začátek pracovní doby',true],[period.end,'Konec pracovní doby',false]]){
            const boundary=document.createElement('div');boundary.style.cssText='position:absolute;left:0;right:0;border-top:3px solid #176b50;z-index:3;pointer-events:none;top:'+((time-model.from)/MIN)+'px';
            const caption=document.createElement('span');caption.style.cssText='position:absolute;right:2px;padding:2px 6px;background:#176b50;color:white;font-size:12px;font-weight:700;border-radius:3px;'+(isStart&&time>model.from||time===model.to?'bottom:3px':'top:1px');
            caption.textContent=label+' '+hourText(time);boundary.append(caption);timeline.append(boundary);
          }
        }
        go.disabled=!model.free;
        timer=setInterval(()=>{if(changes!==state.changes||Date.now()-loaded>=MAX_AGE){go.disabled=true;note.style.color='#ae3030';note.textContent='Náhled již není aktuální. Zavřete jej a otevřete znovu.';clearInterval(timer);}},500);
        go.onclick=async()=>{if(changes!==state.changes||Date.now()-loaded>=MAX_AGE){go.disabled=true;note.textContent='Data zastarala. Otevřete náhled znovu.';return;}dismiss();navigating=true;render();try{el('navigation').textContent=await navigateToSlot(slot,slot.resourceId);}catch(e){el('navigation').textContent=e.message;}finally{navigating=false;render();}};
      } catch(e){if(sequence===previewSequence&&overlay.isConnected)note.textContent='Náhled nelze ověřit: '+(controller.signal.aborted?'Načítání bylo zrušeno nebo vypršel čas.':e.message);}
      finally{clearTimeout(timeout);}
    }
    const clear = () => { el('results').replaceChildren(); el('message').textContent = ''; el('snapshot').textContent = ''; el('navigation').textContent = ''; };
    let navigating = false, preparationController=null;
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
    const SELECTION_KEY='fyzion-plus-therapist-selection-v1';
    const excluded = new Set();
    let rememberedTherapist='__all__';
    try{
      const saved=JSON.parse(localStorage.getItem(SELECTION_KEY)||'null');
      if(saved&&Array.isArray(saved.excluded)&&saved.excluded.every(id=>typeof id==='string')&&typeof saved.selected==='string'){
        saved.excluded.forEach(id=>excluded.add(id));rememberedTherapist=saved.selected;
      }
    }catch(_){}
    function saveTherapistSelection(){
      rememberedTherapist=el('therapist').value||rememberedTherapist;
      try{localStorage.setItem(SELECTION_KEY,JSON.stringify({selected:rememberedTherapist,excluded:[...excluded]}));}
      catch(_){el('navigation').textContent='Výběr terapeutů nelze uložit. Prohlížeč nepovolil zápis.';}
    }
    const checkboxes = new Map();
    let selectionKey = null;
    let searching = false, controller = null, resultLoaded = null, progressText = '';
    let resultChanges = 0;
    let plusMessage='';
    let preferences={...PLUS_DEFAULTS};
    try {
      const stored=JSON.parse(localStorage.getItem(PLUS_KEY)||'{}');
      if(!Object.hasOwn(stored,'rangeExpanded')&&stored.days===40)stored.days=90;
      preferences=validatePreferences(stored);
    }
    catch(_){plusMessage='Nastavení Fyzion+ nelze přečíst; používám výchozí hodnoty.';}
    const appearance=document.createElement('style');
    appearance.id='fyzion-plus-appearance';
    document.documentElement.append(appearance);
    let lastAppearance='';
    function applyAppearance(){
      const css=makeAppearance(preferences,location.href);
      if(css!==lastAppearance){appearance.textContent=css;lastAppearance=css;}
    }
    function syncPreferenceControls(){
      for(const key of ['seriesModule','therapistsModule','bookingModule','hideNativeVisitButton','showPreparationMessages','contrast','hidePopup','timeLabels','hideVisitStatus','hatch']) el('plus-'+key).checked=preferences[key];
      for(const key of ['offColor','hatchColor','duration','days']) el(key==='days'?'days':'plus-'+key).value=String(preferences[key]);
      el('first-within40').checked=preferences.firstWithin40;
      el('series-count').value=String(preferences.seriesCount);el('series-single').checked=preferences.seriesSingle;
      therapistModuleEnabled=preferences.therapistsModule;positionTherapistDock();
    }
    function persistPreferences(){
      try{localStorage.setItem(PLUS_KEY,JSON.stringify(preferences));plusMessage='Nastavení Fyzion+ uloženo.';}
      catch(_){plusMessage='Nastavení nelze uložit. Změny platí pouze do obnovení stránky.';}
      el('plus-message').textContent=plusMessage;
      therapistModuleEnabled=preferences.therapistsModule;positionTherapistDock();
      applyAppearance();
    }
    syncPreferenceControls();
    el('duration').value=String(preferences.duration);el('days').value=String(preferences.days);
    applyAppearance();
    for(const key of ['seriesModule','therapistsModule','bookingModule','hideNativeVisitButton','showPreparationMessages','contrast','hidePopup','timeLabels','hideVisitStatus','hatch','offColor','hatchColor','duration','days']){
      el(key==='days'?'days':'plus-'+key).onchange=()=>{
        try{
          let value=el(key==='days'?'days':'plus-'+key).value;
          if(typeof PLUS_DEFAULTS[key]==='boolean')value=el('plus-'+key).checked;
          if(key==='duration'||key==='days')value=Number(value);
          preferences=validatePreferences({...preferences,[key]:value});
          if(key==='seriesModule'){clear();resultLoaded=null;render();}
          if(key==='bookingModule'||key==='hideNativeVisitButton'){syncPatientTile();render();}
          if(key==='showPreparationMessages')render();
          if(key==='duration'||key==='days'){el(key).value=String(value);clear();resultLoaded=null;}
          persistPreferences();
        }catch(e){el('plus-message').textContent=e.message;syncPreferenceControls();}
      };
    }
    el('plus-export').onclick=()=>{
      const body={app:'Fyzion+',schema:1,version:PLUS_VERSION,settings:preferences,hiddenTherapistIds:[...permanentlyHidden]};
      const url=URL.createObjectURL(new Blob([JSON.stringify(body,null,2)],{type:'application/json'}));
      const link=document.createElement('a');link.href=url;link.download='fyzion-plus-nastaveni.json';
      root.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
      el('plus-message').textContent='Export obsahuje nastavení a ID skrytých terapeutů, nikoliv údaje pacientů.';
    };
    async function importPreferences(body){
      if(searching||navigating)throw Error('Nejprve dokončete hledání nebo přechod na termín.');
      const bundle=validateBundle(body);
      const beforeConfig=localStorage.getItem(PLUS_KEY),beforeHidden=localStorage.getItem(SETTINGS_KEY);
      try{
        localStorage.setItem(PLUS_KEY,JSON.stringify(bundle.settings));
        localStorage.setItem(SETTINGS_KEY,JSON.stringify(bundle.hiddenTherapistIds));
      }catch(e){
        try{if(beforeConfig===null)localStorage.removeItem(PLUS_KEY);else localStorage.setItem(PLUS_KEY,beforeConfig);
          if(beforeHidden===null)localStorage.removeItem(SETTINGS_KEY);else localStorage.setItem(SETTINGS_KEY,beforeHidden);}catch(_){}
        throw Error('Import se nepodařilo uložit. Zkontrolujte dostupnost úložiště prohlížeče.');
      }
      preferences=bundle.settings;permanentlyHidden.clear();excluded.clear();saveTherapistSelection();
      for(const id of bundle.hiddenTherapistIds)permanentlyHidden.add(id);
      settingsKey=null;selectionKey=null;clear();resultLoaded=null;
      syncPreferenceControls();el('duration').value=String(preferences.duration);el('days').value=String(preferences.days);
      restorePosition();applyAppearance();render();
      el('plus-message').textContent='Nastavení bylo importováno. Předchozí nastavení bylo nahrazeno.';
    }
    el('plus-import').onclick=()=>el('plus-file').click();
    el('plus-file').onchange=async()=>{
      try{
        const file=el('plus-file').files[0];if(!file)return;
        if(file.size>65536)throw Error('Soubor nastavení je příliš velký (maximum 64 kB).');
        await importPreferences(JSON.parse(await file.text()));
      }catch(e){el('plus-message').textContent=`Import se nezdařil: ${e.message}`;}
      finally{el('plus-file').value='';}
    };
    function restorePosition(){
      if(!preferences.position)return;
      el('widget').style.left=preferences.position.x+'px';el('widget').style.top=preferences.position.y+'px';el('widget').style.bottom='auto';
      keepInside(el('widget'));
    }
    restorePosition();
    el('plus-reset-position').onclick=()=>{
      preferences.position=null;el('widget').style.left='20px';el('widget').style.top='auto';el('widget').style.bottom='20px';
      keepInside(el('widget'));persistPreferences();
    };

    render = () => {
      const busy=searching||navigating||state.pending.size>0;
      el('activity').dataset.active=String(busy);
      el('activity').setAttribute('aria-hidden',String(!busy));
      el('activity').setAttribute('aria-valuetext',searching?progressText:navigating?'Fyzion+ pracuje…':state.pending.size?'Kalendář načítá data…':'Připraveno');
      for(const input of patientDays.values())input.disabled=searching||navigating;
      el('patient-from').disabled=searching||navigating;el('patient-to').disabled=searching||navigating;
      positionSettingsDock();
      positionTherapistDock();
      applyAppearance();
      for(const id of ['therapists-now','therapists-all','therapists-none'])el(id).disabled=searching||navigating;
      el('plus-import').disabled=searching||navigating;
      for(const k of ['seriesModule','therapistsModule','bookingModule','hideNativeVisitButton','showPreparationMessages','contrast','hidePopup','timeLabels','hideVisitStatus','hatch','offColor','hatchColor','duration','days'])el(k==='days'?'days':'plus-'+k).disabled=searching||navigating;
      el('first-within40').disabled=searching||navigating;
      el('search-range-note').textContent=`Rozsah hledání: ${preferences.days} kalendářních dní. Změníte přes + → Výchozí hledání.`;
      host.classList.toggle('booking-disabled',!preferences.bookingModule);
      host.classList.toggle('no-booking-context',!patientCardKey(location.pathname));
      el('toggle').hidden=!/^\/calendar(?:\/|$)/.test(location.pathname);
      el('tile-row').hidden=el('toggle').hidden;
      const preparationStatus=document.getElementById('fyzion-plus-preparation-status');
      if(preparationStatus&&!preferences.showPreparationMessages)preparationStatus.remove();
      if(!preferences.showPreparationMessages&&el('navigation').dataset.preparation==='true')el('navigation').textContent='';
      el('series-fields').hidden=!preferences.seriesModule;
      el('series-count').disabled=searching||navigating;el('series-single').disabled=searching||navigating;
      el('search').textContent='Najít termíny';
      if (searching && resultChanges !== state.changes) controller?.abort();
      const selected = el('therapist').value||rememberedTherapist;
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
            saveTherapistSelection();
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
      el('therapist-selection').hidden = !allMode;
      el('selection-count').textContent = `Vybráno ${includedCount} z ${options.length} terapeutů.`;
      for (const input of checkboxes.values()) input.disabled = searching || navigating;
      el('select-all').disabled = searching || navigating;
      el('select-none').disabled = searching || navigating;
      el('search').disabled = searching || navigating || !ready || !options.length || allMode && !includedCount;
      for (const id of ['therapist', 'duration', 'from', 'days']) el(id).disabled = searching || navigating;
      el('cancel').hidden = !searching&&!preparationController;
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
    // Dlaždice používá pouze rozpoznanou cestu detailu, nečte jména ani zdravotní údaje.
    const cardTileHost=document.createElement('div');cardTileHost.id='fyzion-plus-patient-tile';
    const tileRoot=cardTileHost.attachShadow({mode:'open'});
    tileRoot.innerHTML=`<style>
      :host{display:block;font-family:Arial,sans-serif;max-width:100%}
      button{box-sizing:border-box;width:100%;min-height:44px;display:flex;align-items:center;justify-content:center;gap:10px;padding:8px 13px;border:1px solid #e8b5c5;border-radius:10px;background:linear-gradient(120deg,#fff7fa,#fceaf0);color:#842344;font:700 13px/20px Arial,sans-serif;cursor:pointer;box-shadow:0 2px 5px #8423440c,inset 0 1px 0 #ffffff;transition:background .16s ease,border-color .16s ease,box-shadow .16s ease,transform .16s ease}
      button:hover{background:linear-gradient(120deg,#fff0f5,#f9dce7);border-color:#d77c9b;box-shadow:0 4px 10px #8423441a;transform:translateY(-1px)}
      button:active{transform:translateY(0);box-shadow:0 1px 3px #84234416}
      button:focus-visible{outline:3px solid #a52352;outline-offset:3px}
      .icon{display:flex;align-items:center;justify-content:center;flex:0 0 28px;width:28px;height:28px;border-radius:8px;background:#a52352;color:white;box-shadow:0 2px 4px #84234420}
      .icon svg{width:17px;height:17px;display:block}
      .arrow{font-size:17px;font-weight:400;color:#a52352;line-height:1;transition:transform .16s ease}
      button:hover .arrow{transform:translateX(2px)}
      @media(prefers-reduced-motion:reduce){button,.arrow{transition:none}button:hover,button:active,button:hover .arrow{transform:none}}
      @media(forced-colors:active){button{border-color:ButtonText;background:ButtonFace;color:ButtonText}.icon,.arrow{background:ButtonFace;color:ButtonText}}
    </style><button type="button" title="Volné termíny, série a kontrolní náhled kalendáře"><span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 10h18m-13 5 3 3 5-5"/></svg></span><span>Najít termín</span><span class="arrow" aria-hidden="true">→</span></button>`;
    let cardButtonStack=null;
    function detachCardTile(){
      cardTileHost.remove();
      if(cardButtonStack){
        const parent=cardButtonStack.parentNode;
        if(parent){while(cardButtonStack.firstChild)parent.insertBefore(cardButtonStack.firstChild,cardButtonStack);cardButtonStack.remove();}
        cardButtonStack=null;
      }
    }

    const cardContext=document.createElement('p');cardContext.style.cssText='padding:10px;background:#edf8f6;border-radius:7px;font-size:12px';cardContext.hidden=true;
    el('heading').after(cardContext);
    let activeCardPath=null, bookingPatientId=null;
    tileRoot.querySelector('button').onclick=()=>{
      const key=patientCardKey(location.pathname);if(!key)return;
      activeCardPath=location.pathname;bookingPatientId=key;
      cardContext.textContent='Otevřeno z karty klienta č. '+key+'. Vyberte termín a klikněte na Připravit návštěvu. Fyzion+ otevře + Návštěva, počká na klienta a doplní údaje termínu.';
      cardContext.hidden=false;el('panel').hidden=false;keepInside(el('widget'));render();
      if(!state.transport)el('navigation').textContent='Pro načtení dostupnosti nejprve otevřete běžný kalendář Fyzionu. Poté se vraťte na kartu klienta.';
      el('close').focus();
    };
    const nativeVisitSearchButtons=new Map();
    function syncNativeVisitSearch(){
      let form;
      try{form=visitForm();}catch(_){return;}
      const targets=new Set(form?[...form.querySelectorAll('button,a[role="button"],a.q-btn')]
        .filter(button=>newVisitButtonText(button)==='najit termin'):[]);
      for(const [button,previous] of nativeVisitSearchButtons){
        if(targets.has(button))continue;
        if(previous.value)button.style.setProperty('display',previous.value,previous.priority);
        else button.style.removeProperty('display');
        nativeVisitSearchButtons.delete(button);
      }
      for(const button of targets){
        if(!nativeVisitSearchButtons.has(button))nativeVisitSearchButtons.set(button,{
          value:button.style.getPropertyValue('display'),priority:button.style.getPropertyPriority('display')
        });
        button.style.setProperty('display','none','important');
      }
    }
    const hiddenNativeVisitButtons=new Map();
    function syncNativeVisitButton(){
      const onCard=!!patientCardKey(location.pathname)&&!/\/new\/?$/.test(location.pathname);
      const targets=new Set(preferences.hideNativeVisitButton&&onCard?[...document.querySelectorAll('button,a')].filter(button=>
        (visitVisible(button)||hiddenNativeVisitButtons.has(button))&&!button.closest('form,[role="dialog"],.q-dialog')&&
        ['nova navsteva','navsteva'].includes(newVisitButtonText(button))):[]);
      for(const [button,previous] of hiddenNativeVisitButtons){
        if(targets.has(button))continue;
        if(previous.value)button.style.setProperty('display',previous.value,previous.priority);
        else button.style.removeProperty('display');
        button.removeAttribute('data-fyzion-plus-hidden-new-visit');hiddenNativeVisitButtons.delete(button);
      }
      for(const button of targets){
        if(!hiddenNativeVisitButtons.has(button))hiddenNativeVisitButtons.set(button,{value:button.style.getPropertyValue('display'),priority:button.style.getPropertyPriority('display')});
        button.setAttribute('data-fyzion-plus-hidden-new-visit','');button.style.setProperty('display','none','important');
      }
    }
    function syncPatientTile(){
      syncNativeVisitSearch();syncNativeVisitButton();
      if(!preferences.bookingModule){detachCardTile();bookingPatientId=null;activeCardPath=null;cardContext.hidden=true;cardContext.textContent='';return;}
      const key=patientCardKey(location.pathname);
      if(key&&bookingPatientId&&key!==bookingPatientId){bookingPatientId=null;activeCardPath=null;cardContext.hidden=true;cardContext.textContent='';}
      if(!key){detachCardTile();return;}
      const buttons=[...document.querySelectorAll('button,a')].filter(button=>(visitVisible(button)||button.hasAttribute('data-fyzion-plus-hidden-new-visit'))&&
        !button.closest('form,[role="dialog"],.q-dialog')&&['nova navsteva','navsteva'].includes(newVisitButtonText(button)));
      if(buttons.length!==1){detachCardTile();return;}
      const anchor=buttons[0];
      if(cardButtonStack&&anchor.parentElement===cardButtonStack){
        if(cardTileHost.parentElement!==cardButtonStack)cardButtonStack.prepend(cardTileHost);return;
      }
      detachCardTile();
      cardButtonStack=document.createElement('div');cardButtonStack.className='fyzion-plus-visit-stack';
      cardButtonStack.style.cssText='display:inline-flex;flex-direction:column;align-items:stretch;gap:6px;max-width:100%;vertical-align:top';
      anchor.before(cardButtonStack);cardButtonStack.append(cardTileHost,anchor);

    }
    syncPatientTile();setInterval(syncPatientTile,800);

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
        suppress = drag.moved;
        if(drag.moved){const box=target.getBoundingClientRect();preferences.position={x:Math.max(0,box.left),y:Math.max(0,box.top)};persistPreferences();}
        drag = null;
        if (handle.hasPointerCapture(e.pointerId)) handle.releasePointerCapture(e.pointerId);
        setTimeout(() => { suppress = false; }, 0);
      };
      handle.addEventListener('pointerup', end); handle.addEventListener('pointercancel', end);
      handle.addEventListener('click', e => { if (suppress) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
    }
    draggable(el('toggle'), el('widget')); draggable(el('heading'), el('widget'));
    window.addEventListener('resize', () => keepInside(el('widget')));
    for (const id of ['therapist', 'duration', 'from', 'days']) el(id).oninput = () => { clear(); resultLoaded = null; render(); };
    el('therapist').onchange = () => {el('therapist').oninput();saveTherapistSelection();};
    for(const input of [...patientDays.values(),el('patient-from'),el('patient-to')])input.onchange=()=>{clear();resultLoaded=null;};
    el('first-within40').onchange=()=>{
      preferences=validatePreferences({...preferences,firstWithin40:el('first-within40').checked});
      clear();resultLoaded=null;persistPreferences();
    };
    el('series-count').oninput=()=>{clear();resultLoaded=null;};
    el('series-count').onchange=()=>{
      try{preferences=validatePreferences({...preferences,seriesCount:Number(el('series-count').value)});persistPreferences();}
      catch(e){el('message').textContent=e.message;}
    };
    el('series-single').onchange=()=>{
      preferences=validatePreferences({...preferences,seriesSingle:el('series-single').checked});
      clear();resultLoaded=null;persistPreferences();
    };
    function setAllSelection(include) {
      for (const [id, input] of checkboxes) { input.checked = include; if (include) excluded.delete(id); else excluded.add(id); }
      clear(); resultLoaded = null; saveTherapistSelection();render();
    }
    el('select-all').onclick = () => setAllSelection(true);
    el('select-none').onclick = () => setAllSelection(false);
    el('settings-toggle').onclick = () => {
      el('settings').hidden = !el('settings').hidden;
      el('settings-toggle').setAttribute('aria-expanded', String(!el('settings').hidden));
      el('settings-toggle').setAttribute('aria-label',el('settings').hidden?'Otevřít nastavení Fyzion+':'Zavřít nastavení Fyzion+');
      positionSettingsDock();
    };
    el('settings-close').onclick=()=>{
      el('settings').hidden=true;el('settings-toggle').setAttribute('aria-expanded','false');el('settings-toggle').setAttribute('aria-label','Otevřít nastavení Fyzion+');
    };
    el('settings-reset').onclick = () => {
      permanentlyHidden.clear();
      for (const input of settingsInputs.values()) input.checked = true;
      saveSettings();
    };
    el('therapists-toggle').onclick=()=>{
      el('therapists-panel').hidden=!el('therapists-panel').hidden;
      el('therapists-toggle').setAttribute('aria-expanded',String(!el('therapists-panel').hidden));
      positionTherapistDock();
    };
    async function changeTherapists(mode){
      if(searching||navigating)return;
      if(!state.transport){el('therapists-message').textContent='Nejprve otevřete kalendář a počkejte na přihlášené načtení dat.';return;}
      navigating=true;render();
      const snapshot=state.changes,abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),90000);
      const check=()=>{if(abort.signal.aborted||snapshot!==state.changes)throw Error('Operace byla přerušena. Zkontrolujte aktuální výběr terapeutů.');};
      const transport={headers:new Headers(state.transport.headers),credentials:state.transport.credentials};
      el('therapists-diagnostics').hidden=true;el('therapists-reasons').replaceChildren();
      el('therapists-message').textContent='Načítám aktuální terapeuty…';
      try{
        const resources=arrayOf(await readApi('https://api.fyzion.cz/v1/calendar-users/resources/',transport,abort.signal));
        check();
        const allowedResources=resources.filter(r=>!permanentlyHidden.has(r.id));
        let desired=mode==='all'?allowedResources.map(r=>r.id):[];
        if(mode==='now'){
          const now=Date.now(),date=parts(now).date;
          const url=new URL('https://api.fyzion.cz/v1/calendar-users/events/');
          url.searchParams.set('start',new Date(localMs(date,'00:00:00')).toISOString());
          url.searchParams.set('end',new Date(localMs(nextDay(date),'00:00:00')).toISOString());
          for(const r of allowedResources)url.searchParams.append('user_ids',r.id);
          el('therapists-message').textContent='Ověřuji pracovní dobu, volno a právě probíhající události…';
          const events=allowedResources.length?availabilityOnly(arrayOf(await readApi(url,transport,abort.signal))):[];
          check();
          const currentNow=Date.now();
          if(parts(currentNow).date!==date)throw Error('Během načítání se změnil den. Zopakujte výběr.');
          const statuses=resources.map(r=>({resource:r,...(permanentlyHidden.has(r.id)?{working:false,reason:'Vypnuto v nastavení Fyzion+.'}:workingResourceStatus(r,events,currentNow))}));
          desired=statuses.filter(item=>item.working).map(item=>item.resource.id);
          el('therapists-check-time').textContent='Posouzeno podle skutečného času: '+new Intl.DateTimeFormat('cs-CZ',{timeZone:ZONE,dateStyle:'short',timeStyle:'medium'}).format(currentNow)+' (Praha).';
          for(const item of statuses){const li=document.createElement('li');li.textContent=item.resource.title+' — '+item.reason;el('therapists-reasons').append(li);}
          el('therapists-diagnostics').hidden=false;
        }
        check();
        const count=await setTherapistSelection(resources,desired,check,n=>{el('therapists-message').textContent=`Upravuji výběr terapeutů: ${n} změn…`;});
        el('therapists-message').textContent=mode==='now'?`Právě pracují: vybráno ${count} terapeutů podle skutečného dnešního času.`:
          mode==='all'?`Vybráni všichni povolení terapeuti (${count}).`:'Všichni terapeuti jsou skrytí.';
      }catch(e){el('therapists-message').textContent=`Výběr se nepodařilo dokončit: ${e.message}`;}
      finally{clearTimeout(timeout);navigating=false;render();}
    }
    for(const mode of ['now','all','none'])el('therapists-'+mode).onclick=()=>{
      el('therapists-panel').hidden=true;
      el('therapists-toggle').setAttribute('aria-expanded','false');
      el('therapists-toggle').focus();
      return changeTherapists(mode);
    };
    el('cancel').onclick = () => {controller?.abort();preparationController?.abort();};
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
      const seriesEnabled=preferences.seriesModule,seriesCount=Number(el('series-count').value),seriesSingle=el('series-single').checked;
      const firstBefore=el('first-within40').checked?localMs(addDays(parts(Date.now()).date,41),'00:00:00'):Infinity;
      const transport = { headers: new Headers(state.transport.headers), credentials: state.transport.credentials };
      let patientPreferences;
      try {
        patientPreferences=readPatientPreferences();
        rangeChunks(date, days);
        if (![15, 30, 45, 60].includes(duration)) throw Error('Vyberte délku 15, 30, 45 minut nebo 1 hodinu.');
        if(seriesEnabled&&(!Number.isInteger(seriesCount)||seriesCount<1||seriesCount>30))throw Error('Počet termínů musí být 1–30.');
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
        const result = findAllSlots({ resources: matches, events: batch.events, from: batch.from, to: batch.to, duration, patientPreferences, limit: seriesEnabled?Math.max(20000,20000*matches.length):10000 });
        if(!seriesEnabled)result.slots=result.slots.filter(slot=>slot.start<firstBefore);
        resultLoaded = batch.loaded;
        const dateFmt = new Intl.DateTimeFormat('cs-CZ', { timeZone: ZONE, weekday: 'short', day: 'numeric', month: 'numeric' });
        const timeFmt = new Intl.DateTimeFormat('cs-CZ', { timeZone: ZONE, hour: '2-digit', minute: '2-digit' });
        const planRevisions=new WeakMap(),planStatuses=new WeakMap();
        const revisionOf=plan=>plan?planRevisions.get(plan)||0:0;
        const touchPlan=plan=>planRevisions.set(plan,revisionOf(plan)+1);
        async function freshAlternatives(current,plan,planIndex,mode){
          const changes=state.changes,loaded=Date.now(),abort=new AbortController(),timer=setTimeout(()=>abort.abort(),90000);
          const checkAlternative=()=>{if(abort.signal.aborted||changes!==state.changes)throw Error('Načítání alternativ bylo přerušeno změnou kalendáře nebo časovým limitem.');};
          try{
            const auth={headers:new Headers(state.transport.headers),credentials:state.transport.credentials};
            const latest=arrayOf(await readApi('https://api.fyzion.cz/v1/calendar-users/resources/',auth,abort.signal));checkAlternative();
            const originalIds=new Set(matches.map(r=>r.id));
            const eligible=latest.filter(r=>originalIds.has(r.id)&&!permanentlyHidden.has(r.id)&&(!plan||!seriesSingle||r.id===current.resourceId));
            if(!eligible.length)throw Error('Žádný povolený terapeut pro alternativu.');
            const currentDate=parts(current.start).date,dayStart=Math.max(batch.from,localMs(currentDate,'00:00:00')),dayEnd=Math.min(batch.to,localMs(nextDay(currentDate),'00:00:00'));
            const chunks=mode==='time'?[{from:dayStart,to:dayEnd}]:[];
            if(mode==='day')for(const chunk of rangeChunks(date,days))chunks.push(chunk);
            const found=[],seen=new Set();
            for(const chunk of chunks){
              if(chunk.from>=chunk.to)continue;
              checkAlternative();
              const url=new URL('https://api.fyzion.cz/v1/calendar-users/events/');url.searchParams.set('start',new Date(chunk.from).toISOString());url.searchParams.set('end',new Date(chunk.to).toISOString());
              for(const r of eligible)url.searchParams.append('user_ids',r.id);
              const events=availabilityOnly(arrayOf(await readApi(url,auth,abort.signal)));checkAlternative();
              const free=findAllSlots({resources:eligible,events,from:chunk.from,to:chunk.to,duration,patientPreferences,limit:Math.max(10000,10000*eligible.length)});
              if(free.more)throw Error('Alternativ je příliš mnoho; úplnost výpočtu nelze potvrdit.');
              for(const candidate of free.slots){
                const key=`${candidate.resourceId}:${candidate.start}:${candidate.end}`;
                if(seen.has(key)||!alternativeAllowed(candidate,current,plan,planIndex,firstBefore,mode))continue;
                seen.add(key);found.push(candidate);
              }
              if(found.length>=8)break;
            }
            found.sort((a,b)=>Number(parts(b.start).date===currentDate)-Number(parts(a.start).date===currentDate)||a.start-b.start||a.title.localeCompare(b.title,'cs'));
            checkAlternative();
            if(Date.now()-loaded>=MAX_AGE)throw Error('Data alternativ jsou příliš stará. Zopakujte hledání.');
            return{slots:found.slice(0,8),loaded,changes};
          }finally{clearTimeout(timer);}
        }
        function slotItem(slot,index=null,plan=null,planIndex=null,onPlanChange=null) {
          const li = document.createElement('li');
          const button = document.createElement('button');
          button.type = 'button'; button.className = 'slot-link';
          const paint=()=>{
            const date=document.createElement('span');date.className='slot-date';date.textContent=`${index===null?'':(index+1)+'. '}${dateFmt.format(slot.start)}`;
            const time=document.createElement('span');time.className='slot-time';time.textContent=`${timeFmt.format(slot.start)}–${timeFmt.format(slot.end)}`;
            const therapist=document.createElement('span');therapist.className='slot-therapist';therapist.textContent=slot.title;
            button.replaceChildren(date,time,therapist);
          };paint();
          button.title = 'Otevřít den a čas v kalendáři';
          button.onclick = async () => {
            if (navigating || searching) return;
            navigating = true; render(); el('navigation').textContent = 'Otevírám termín v kalendáři…';
            try { el('navigation').textContent = await navigateToSlot(slot, slot.resourceId); }
            catch (e) { el('navigation').textContent = `Přechod se nepodařil: ${e.message}`; }
            finally { navigating = false; render(); }
          };
          const actions=document.createElement('div');actions.className='slot-actions';actions.append(button);
          const prepare=document.createElement('button');prepare.type='button';prepare.className='alternative-btn prepare-visit';prepare.textContent='Připravit návštěvu';
          const patientForResult=bookingPatientId;
          prepare.hidden=!patientForResult;
          prepare.onclick=async()=>{if(navigating||searching||!preferences.bookingModule)return;navigating=true;preparationController=new AbortController();const preparationTimer=setTimeout(()=>preparationController?.abort(),60000);prepare.disabled=true;prepare.textContent='Připravuji…';el('navigation').dataset.preparation='true';el('navigation').textContent=preferences.showPreparationMessages?'Otevírám návštěvu a čekám na načtení polí…':'';render();
            document.getElementById('fyzion-plus-preparation-status')?.remove();
            const status=document.createElement('aside');status.id='fyzion-plus-preparation-status';status.hidden=!preferences.showPreparationMessages;status.setAttribute('role','status');status.setAttribute('aria-live','polite');
            status.style.cssText='position:fixed;top:12px;right:12px;z-index:2147483647;max-width:min(460px,calc(100vw - 24px));padding:14px;background:#fff;border:2px solid #176b50;border-radius:8px;box-shadow:0 4px 24px #0004;color:#203743;font:14px/1.5 Arial,sans-serif';
            const message=document.createElement('p');message.style.margin='0 0 8px';
            const dismiss=document.createElement('button');dismiss.type='button';dismiss.textContent='Zrušit přípravu';dismiss.onclick=()=>preparationController?.abort();status.append(message,dismiss);if(preferences.showPreparationMessages)document.documentElement.append(status);
            const report=text=>{el('navigation').dataset.preparation='true';el('navigation').textContent=preferences.showPreparationMessages?text:'';message.textContent='Fyzion+ · '+text;if(!preferences.showPreparationMessages)status.remove();};
            report('Připravuji návštěvu…');
            try{report(await prepareVisit(slot,patientForResult,report,preparationController.signal));}
            catch(e){status.style.borderColor='#ae3030';report('Příprava návštěvy: '+e.message);}
            finally{dismiss.textContent='Zavřít hlášení';dismiss.onclick=()=>status.remove();clearTimeout(preparationTimer);preparationController=null;prepare.disabled=false;prepare.textContent='Připravit návštěvu';navigating=false;render();}};actions.append(prepare);
          const preview=document.createElement('button');preview.type='button';preview.className='alternative-btn';preview.textContent='Náhled';preview.onclick=()=>{if(!navigating&&!searching)openSlotPreview(slot,preview);};actions.append(preview);
          const alternative=document.createElement('button');alternative.type='button';alternative.className='alternative-btn';alternative.textContent='Najít alternativu';
          const options=document.createElement('ul');options.className='alternative-options';options.hidden=true;
          const searchAlternative=async(mode)=>{
            if(navigating||searching)return;
            navigating=true;render();alternative.disabled=true;options.hidden=false;options.replaceChildren();
            const note=document.createElement('li');note.textContent='Ověřuji jiné volné termíny…';options.append(note);
            try{
              const snapshot=await freshAlternatives(slot,plan,planIndex,mode),found=snapshot.slots,loaded=snapshot.loaded,loadedChanges=snapshot.changes,planRevision=revisionOf(plan);options.replaceChildren();
              if(!found.length){note.textContent=mode==='time'?'Pro tento den nebyl nalezen jiný vhodný čas.':'Ve zvoleném rozsahu není jiný vhodný den se zachováním pořadí série a možností pacienta.';options.append(note);}
              for(const candidate of found){
                const option=document.createElement('li'),choose=document.createElement('button');choose.type='button';choose.className='alternative-choice';
                choose.textContent=`${plan?'Použít':'Otevřít'}: ${dateFmt.format(candidate.start)} · ${timeFmt.format(candidate.start)}–${timeFmt.format(candidate.end)} · ${candidate.title}`;
                choose.onclick=async()=>{
                  if(navigating||searching)return;
                  if(plan&&(plan[planIndex]!==slot||revisionOf(plan)!==planRevision)){note.textContent='Návrh série se změnil. Najděte alternativu znovu.';options.prepend(note);return;}
                  if(candidate.start<Date.now()||Date.now()-loaded>=MAX_AGE||loadedChanges!==state.changes){note.textContent='Data alternativ zestárla nebo se změnil kalendář. Klikněte znovu na Najít alternativu.';options.prepend(note);return;}
                  if(plan){
                    if(!alternativeAllowed(candidate,slot,plan,planIndex,firstBefore,mode)){note.textContent='Série se mezitím změnila. Najděte alternativu znovu.';options.prepend(note);return;}
                    const position=slot.seriesPosition;slot={...candidate,seriesPosition:position};plan[planIndex]=slot;touchPlan(plan);paint();options.hidden=true;onPlanChange();
                    el('navigation').textContent='Návrh série byl upraven. Termín zatím není rezervovaný.';
                  }else{
                    navigating=true;render();try{el('navigation').textContent=await navigateToSlot(candidate,candidate.resourceId);}catch(e){el('navigation').textContent=e.message;}finally{navigating=false;render();}
                  }
                };
                option.append(choose);options.append(option);
              }
            }catch(e){options.replaceChildren();note.textContent=`Alternativu nelze ověřit: ${e.message}`;options.append(note);}
            finally{navigating=false;alternative.disabled=false;render();}
          };
          alternative.onclick=()=>{
            if(navigating||searching)return;
            options.replaceChildren();options.hidden=false;
            for(const [mode,label] of [['time','Jiný čas'],['day','Jiný den']]){
              const item=document.createElement('li'),choice=document.createElement('button');choice.type='button';choice.className='alternative-choice';choice.textContent=label;
              choice.onclick=()=>searchAlternative(mode);item.append(choice);options.append(item);
            }
          };
          actions.append(alternative);
          if(plan){
            const remove=document.createElement('button');remove.type='button';remove.className='alternative-btn remove-slot';remove.textContent='×';remove.setAttribute('aria-label','Odebrat termín z návrhu série');
            remove.title='Odebrat pouze z návrhu série';
            remove.onclick=()=>{
              if(navigating||searching||plan[planIndex]!==slot)return;
              plan.splice(planIndex,1);touchPlan(plan);onPlanChange();
              el('navigation').textContent='Termín odebrán z návrhu série. Zbývá '+plan.length+'/'+seriesCount+' termínů. Kalendář se nezměnil.';
            };
            actions.append(remove);
          }
          li.append(actions);li.append(options);
          return li;
        }
        let seriesResult=null;
        if(seriesEnabled){
          if(result.more)throw Error('Pro sérii nebyla zpracována všechna dostupná okna. Zkraťte rozsah hledání.');
          seriesResult=planSeries(result.slots,seriesCount,seriesSingle,firstBefore);
          const displayedPlans=seriesResult.plans.length?seriesResult.plans:seriesResult.partialPlans;
          for(const plan of displayedPlans){
            const wrapper=document.createElement('li');wrapper.className='series-plan';
            const planName=seriesSingle?plan[0].title:'Série',planResource=plan[0].resourceId;
            const status=()=>seriesStatus(plan,seriesCount,firstBefore);
            planStatuses.set(plan,status);
            const renderPlan=(edited=false)=>{
              wrapper.replaceChildren();
              const title=document.createElement('strong');title.textContent=planName+` · ${plan.length}/${seriesCount} termínů`+(plan.length<seriesCount?' · NEÚPLNÁ':'');
              wrapper.append(title);
              const currentStatus=status();
              if(currentStatus.firstLate){
                const warning=document.createElement('p');warning.className='muted';
                warning.textContent='První zbývající návštěva je mimo limit 40 dní. Doplňte dřívější termín.';wrapper.append(warning);
              }
              if(plan.length<seriesCount){const note=document.createElement('p');note.className='muted';note.textContent=plan.length?`Do požadovaného počtu chybí ${seriesCount-plan.length} termínů. Čísla zachovávají původní pořadí série.`:'Z návrhu byly odebrány všechny termíny.';wrapper.append(note);}
              const list=document.createElement('ol');plan.forEach((slot,index)=>list.append(slotItem(slot,(slot.seriesPosition||index+1)-1,plan,index,()=>renderPlan(true))));
              if(plan.length<seriesCount){
                const add=document.createElement('button');add.type='button';add.className='alternative-btn';add.textContent='Přidat termín';
                const options=document.createElement('ul');options.className='alternative-options';options.hidden=true;
                add.onclick=async()=>{
                  if(navigating||searching)return;
                  navigating=true;render();add.disabled=true;options.hidden=false;options.replaceChildren();
                  const note=document.createElement('li');note.textContent='Ověřuji možnosti pro doplnění série…';options.append(note);
                  const changes=state.changes,planRevision=revisionOf(plan),abort=new AbortController(),timer=setTimeout(()=>abort.abort(),90000);
                  const checkAdd=()=>{if(abort.signal.aborted||changes!==state.changes)throw Error('Kalendář se změnil nebo vypršel čas. Zkuste doplnění znovu.');};
                  try{
                    const auth={headers:new Headers(state.transport.headers),credentials:state.transport.credentials};
                    const latest=arrayOf(await readApi('https://api.fyzion.cz/v1/calendar-users/resources/',auth,abort.signal));checkAdd();
                    const allowed=new Set(matches.map(r=>r.id));
                    const eligible=latest.filter(r=>allowed.has(r.id)&&!permanentlyHidden.has(r.id)&&(!seriesSingle||r.id===planResource));
                    if(!eligible.length)throw Error('Žádný povolený terapeut pro doplnění.');
                    const fresh=await loadRange({date,days,resourceId:eligible.map(r=>r.id),check:checkAdd,progress:()=>{},getEvents:(chunk,ids)=>{
                      const url=new URL('https://api.fyzion.cz/v1/calendar-users/events/');url.searchParams.set('start',new Date(chunk.from).toISOString());url.searchParams.set('end',new Date(chunk.to).toISOString());for(const id of ids)url.searchParams.append('user_ids',id);
                      return readApi(url,auth,abort.signal);
                    }});checkAdd();
                    const free=findAllSlots({resources:eligible,events:fresh.events,from:fresh.from,to:fresh.to,duration,patientPreferences,limit:Math.max(20000,20000*eligible.length)});
                    if(free.more)throw Error('Možností je příliš mnoho. Zkraťte rozsah hledání.');
                    const found=seriesAdditions(free.slots,plan,seriesCount,firstBefore).slice(0,12);
                    options.replaceChildren();
                    if(!found.length){note.textContent='V rozsahu hledání není vhodný termín pro doplnění podle možností pacienta a s alespoň jedním celým volným dnem mezi návštěvami.';options.append(note);}
                    for(const candidate of found){
                      const item=document.createElement('li'),choose=document.createElement('button');choose.type='button';choose.className='alternative-choice';
                      choose.textContent=`Přidat ${candidate.seriesPosition}.: ${dateFmt.format(candidate.start)} · ${timeFmt.format(candidate.start)}–${timeFmt.format(candidate.end)} · ${candidate.title}`;
                      choose.onclick=()=>{
                        if(navigating||searching)return;
                        if(candidate.start<Date.now()||Date.now()-fresh.loaded>=MAX_AGE||changes!==state.changes||revisionOf(plan)!==planRevision){note.textContent='Data zestárla nebo se změnil kalendář. Klikněte znovu na Přidat termín.';options.prepend(note);return;}
                        if(!seriesAdditions([candidate],plan,seriesCount,firstBefore).some(s=>s.seriesPosition===candidate.seriesPosition))return;
                        plan.push(candidate);plan.sort((a,b)=>a.seriesPosition-b.seriesPosition);touchPlan(plan);renderPlan(true);
                        el('navigation').textContent='Termín přidán do návrhu série. Zatím není rezervovaný.';
                      };
                      item.append(choose);options.append(item);
                    }
                  }catch(e){options.replaceChildren();note.textContent='Doplnění nelze ověřit: '+e.message;options.append(note);}
                  finally{clearTimeout(timer);navigating=false;add.disabled=false;render();}
                };
                wrapper.append(add);wrapper.append(options);
              }
              wrapper.append(list);
              if(edited){
                const complete=displayedPlans.filter(p=>planStatuses.get(p)().complete).length;
                el('message').textContent=`Návrhy ručně upraveny · kompletní série: ${complete}, neúplné: ${displayedPlans.length-complete}. Odebrané termíny se automaticky nedoplňují.`;
              }
            };
            renderPlan();el('results').append(wrapper);
          }
        }else{
          const dayFmt=new Intl.DateTimeFormat('cs-CZ',{timeZone:ZONE,weekday:'long',day:'numeric',month:'numeric',year:'numeric'});
          for(const group of groupSlotsByDay(result.slots)){
            const wrapper=document.createElement('li');wrapper.className='day-group';
            const details=document.createElement('details');details.className='day-result';
            const summary=document.createElement('summary'),heading=document.createElement('span');heading.className='day-title';
            const label=document.createElement('span'),chevron=document.createElement('span');chevron.className='day-chevron';chevron.textContent='▶';chevron.setAttribute('aria-hidden','true');
            const day=document.createElement('strong');day.textContent=dayFmt.format(group.slots[0].start);label.append(chevron);label.append(day);
            const count=document.createElement('span');count.className='day-count';count.textContent=`Možnosti: ${group.slots.length}`;
            heading.append(label);heading.append(count);
            const preview=document.createElement('span');preview.className='day-preview';
            preview.textContent=group.preview.map(t=>timeFmt.format(t)).join(' · ')+(group.moreTimes?` · +${group.moreTimes} dalších časů`:'')+(group.therapistCount>1?` · Terapeuti: ${group.therapistCount}`:'');
            summary.append(heading);summary.append(preview);details.append(summary);
            let populated=false;
            details.ontoggle=()=>{
              if(!details.open||populated)return;
              const list=document.createElement('ul');list.className='day-options';
              for(const slot of group.slots)list.append(slotItem(slot));
              details.append(list);populated=true;
            };
            wrapper.append(details);el('results').append(wrapper);
          }
        }
        const dateFmtFull = new Intl.DateTimeFormat('cs-CZ', { timeZone: ZONE, dateStyle: 'short' });
        const rangeText = `${dateFmtFull.format(batch.from)}–${dateFmtFull.format(localMs(addDays(date, days - 1), '12:00:00'))}`;
        el('message').textContent = `${rangeText} · ${days} dní ověřeno. ${firstBefore===Infinity?'':'První návštěva do 40 dní ode dneška. '}` + (seriesEnabled?
          (seriesResult.plans.length?`Nalezeno ${seriesResult.plans.length} návrhů kompletní série po ${seriesCount} termínech. Mezi návštěvami alespoň jeden celý volný den. Kliknutí pouze otevře kalendář.`:
            `Kompletní série nenalezena. Zobrazuji ${seriesResult.partialPlans.length} neúplných variant; nejlepší má ${seriesResult.availableCount}/${seriesCount} termínů${seriesSingle?' u jednoho terapeuta':''}. Mezi návštěvami alespoň jeden celý volný den. Zvětšete rozsah nebo upravte zadání.`):
          (result.slots.length ?
          `${result.slots.length} možností${result.more ? ' (zobrazeno prvních 10 000)' : ''}. Kliknutím na den rozbalíte časy. Před použitím porovnejte s kalendářem.` : 'Nebyl nalezen volný termín.'));
      } catch (e) {
        clear(); resultLoaded = null;
        el('message').textContent = `Hledání zastaveno: ${signal.aborted ? 'Zrušeno, vypršel čas načítání nebo se změnil kalendář. Spusťte hledání znovu.' : e.message}`;
      } finally { clearTimeout(timeout); searching = false; controller = null; render(); }
    };
    render(); setInterval(render, 1000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true }); else mount();
})();
