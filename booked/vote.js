// Group vote: each person ranks the active stays; the results use a Borda count and refresh live.
// Ballots are stored by the alps-votes Worker (../votes-worker). Uses ACTIVE, esc and money from app.js.
(() => {
const API = 'https://alps-votes.sshireto.workers.dev/api/votes', POLL = 'booked-2027', REFRESH_MS = 10000;
const STAYS = ACTIVE, N = STAYS.length, byId = Object.fromEntries(STAYS.map(h => [h.id, h]));
const root = document.querySelector('#vote');
const COUNT_WORD = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'][N] || N;
if (!root || !N) return;

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} },
};
const keyOf = n => String(n).toLocaleLowerCase('en').replace(/\s+/g, '');
const cleanName = s => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, 32);
const same = (a, b) => !!a && !!b && a.length === b.length && a.every((x, i) => x === b[i]);
const normalize = ids => { const seen = new Set((ids || []).filter(id => byId[id])); return [...seen, ...STAYS.map(h => h.id).filter(id => !seen.has(id))]; };
const ppn = h => money(h.total / h.people / (h.nights || 6));
const thumb = h => h.photos[0] ? `<img src="${esc(h.photos[0].src)}" alt="" width="96" height="64" loading="lazy">` : '<span class="thumb-blank"></span>';
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const HUES = ['#226476', '#b0662c', '#6a4c93', '#2f7d4f', '#a23b5b', '#3d5a99', '#8a6d1d', '#1f7a80'];
const colorOf = n => { let h = 0; for (const c of keyOf(n)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return HUES[h % HUES.length]; };
const initials = n => n.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const avatar = (n, extra = '') => `<span class="voter-dot ${extra}" style="--c:${colorOf(n)}" title="${esc(n)}">${esc(initials(n))}</span>`;
const ago = t => { const s = Math.round((Date.now() - t) / 1000); if (s < 45) return 'just now'; const m = Math.round(s / 60); if (m < 60) return `${m} min ago`; const h = Math.round(m / 60); if (h < 24) return `${h} h ago`; return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); };

let votes = [], loaded = false, loadFailed = false, saving = false, statusMsg = '';
let name = cleanName(store.get('alps-vote-name'));
let order = normalize(JSON.parse(store.get('alps-vote-draft') || 'null'));
let note = store.get('alps-vote-note') || '';
let saved = null; // { order, note, at } of this person's ballot on the server
const mine = () => name ? votes.find(v => keyOf(v.name) === keyOf(name)) : null;
const dirty = () => !saved || !same(order, saved.order) || note.trim() !== saved.note;

root.innerHTML = `
<div class="section-head vote-head"><div><div class="eyebrow">GROUP VOTE</div><h2 id="vote-heading">Rank the stays</h2></div><p class="vote-sub">Put the ${COUNT_WORD} in your order, best at the top. Everyone's rankings add up to the group result, which updates live.</p></div>
<div class="vote-grid">
  <section class="vote-card ballot" aria-labelledby="ballot-title">
    <div class="vote-card-head"><h3 id="ballot-title">Your ranking</h3><div id="voter-line" class="voter-line"></div></div>
    <div id="name-box" class="name-box"></div>
    <p class="rank-hint">Drag a stay to move it, or use the arrows.</p>
    <ol class="rank-list" id="rank-list" aria-describedby="rank-live"></ol>
    <p id="new-stays" class="new-stays" hidden></p>
    <label class="note-field"><span>Why your #1? <small>optional</small></span><input id="vote-note" maxlength="160" autocomplete="off" placeholder="Closest to the lift, biggest sauna…"></label>
    <div class="ballot-actions"><button type="button" class="vote-submit" id="vote-submit"></button><span class="vote-status" id="vote-status" aria-live="polite"></span></div>
    <button type="button" class="vote-withdraw" id="vote-withdraw" hidden>Withdraw my vote</button>
    <span class="sr-only" id="rank-live" aria-live="assertive"></span>
  </section>
  <section class="vote-card results" aria-labelledby="results-title">
    <div class="vote-card-head"><h3 id="results-title">Where the group stands</h3><span class="live-pill" id="live-pill"><span></span>Live</span></div>
    <div class="voter-row" id="voter-row"></div>
    <div class="vote-toast" id="vote-toast" aria-live="polite"></div>
    <ol class="result-list" id="result-list"></ol>
    <p class="results-empty" id="results-empty" hidden></p>
    <details class="vote-more" id="ballots-more" hidden><summary>Every ballot</summary><div class="matrix-scroll" id="vote-matrix"></div></details>
    <div class="vote-notes" id="vote-notes"></div>
    <p class="vote-scoring">Scoring: first place earns ${N - 1} points, second ${N - 2}, and so on down to 0 for last. A tie goes to the stay with more first-place votes.</p>
  </section>
</div>`;

const $ = s => root.querySelector(s);
const list = $('#rank-list'), resultList = $('#result-list'), noteInput = $('#vote-note');
noteInput.value = note;

/* ---------- Ballot ---------- */
function renderNameBox() {
  const box = $('#name-box'), line = $('#voter-line');
  if (name) {
    box.hidden = true; box.innerHTML = '';
    line.innerHTML = `${avatar(name, 'is-me')}<span>Voting as <strong>${esc(name)}</strong></span><button type="button" class="link-button" id="change-name">Not you?</button>`;
    return;
  }
  line.innerHTML = '';
  box.hidden = false;
  const others = votes.map(v => v.name), sig = others.join('\n');
  if (box.dataset.sig === sig && box.querySelector('#voter-name')) return; // keep what the person is typing
  box.dataset.sig = sig;
  const prev = box.querySelector('#voter-name'), typed = prev?.value || '', focused = prev && document.activeElement === prev;
  box.innerHTML = `<label for="voter-name">Your name</label><input id="voter-name" maxlength="32" autocomplete="given-name" placeholder="So we know whose vote it is">${others.length ? `<div class="pick-name"><span>Already voted? Pick your name to change your ranking:</span>${others.map(n => `<button type="button" class="name-chip" data-name="${esc(n)}">${avatar(n)}${esc(n)}</button>`).join('')}</div>` : ''}`;
  const input = box.querySelector('#voter-name'); input.value = typed; if (focused) input.focus();
}

function renderList() {
  list.innerHTML = order.map(id => { const h = byId[id]; return `<li class="rank-item" data-id="${esc(id)}"><span class="rank-num"></span>${thumb(h)}<div class="rank-text"><strong>${esc(h.name)}</strong><small>${esc(h.location)} · ${ppn(h)} pp/night</small></div><div class="rank-move"><button type="button" data-move="-1" aria-label="Move ${esc(h.name)} up"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg></button><button type="button" data-move="1" aria-label="Move ${esc(h.name)} down"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button></div><button type="button" class="rank-handle" aria-label="Reorder ${esc(h.name)} with the up and down arrow keys"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/></svg></button></li>`; }).join('');
  renumber();
}

function renumber() {
  [...list.children].forEach((li, i) => {
    li.querySelector('.rank-num').textContent = i + 1;
    li.classList.remove('r1', 'r2', 'r3'); if (i < 3) li.classList.add(`r${i + 1}`);
    li.querySelector('[data-move="-1"]').disabled = i === 0;
    li.querySelector('[data-move="1"]').disabled = i === list.children.length - 1;
  });
}

function orderChanged() {
  order = [...list.children].map(li => li.dataset.id);
  store.set('alps-vote-draft', JSON.stringify(order));
  statusMsg = '';
  renderActions();
}

function renderActions() {
  const btn = $('#vote-submit'), st = $('#vote-status');
  btn.disabled = saving || (saved && !dirty());
  btn.textContent = saving ? 'Saving…' : !saved ? 'Submit my ranking' : dirty() ? 'Update my ranking' : 'Vote saved';
  btn.classList.toggle('is-saved', !!saved && !dirty() && !saving);
  st.textContent = statusMsg || (saved ? (dirty() ? 'You have changes that are not saved yet' : `Saved ${ago(saved.at)}`) : '');
  st.classList.toggle('is-warn', !!saved && dirty() && !statusMsg);
  $('#vote-withdraw').hidden = !saved;
  const m = mine(), missing = m ? STAYS.filter(h => !m.ranking.includes(h.id)) : [];
  const ns = $('#new-stays');
  ns.hidden = !missing.length;
  if (missing.length) ns.textContent = `Added since you voted: ${missing.map(h => h.name).join(', ')}. ${missing.length > 1 ? 'They are' : 'It is'} at the bottom of your list until you move ${missing.length > 1 ? 'them' : 'it'} and update.`;
}

function adoptServerBallot(force) {
  const m = mine();
  if (!m) { if (saved) saved = null; return; }
  const serverOrder = normalize(m.ranking);
  const untouched = !saved ? force : same(order, saved.order) && note.trim() === saved.note;
  saved = { order: serverOrder, note: m.note || '', at: m.updatedAt };
  if (untouched || force) {
    order = serverOrder; note = m.note || ''; noteInput.value = note;
    store.set('alps-vote-draft', JSON.stringify(order)); store.set('alps-vote-note', note);
    renderList();
  }
}

function setName(n, loadBallot) {
  name = cleanName(n); store.set('alps-vote-name', name || null);
  saved = null;
  if (name && loadBallot) adoptServerBallot(true);
  else if (name) adoptServerBallot(false);
  renderNameBox(); renderActions();
}

async function submit() {
  if (!name) {
    const input = $('#voter-name'), n = cleanName(input?.value);
    if (!n) { input?.focus(); statusMsg = 'Add your name first'; renderActions(); input?.classList.add('shake'); setTimeout(() => input?.classList.remove('shake'), 500); return; }
    const existing = votes.find(v => keyOf(v.name) === keyOf(n));
    if (existing && !confirm(`${existing.name} has already voted. Replace that ranking with this one?`)) return;
    name = n; store.set('alps-vote-name', name);
    const m = mine(); saved = m ? { order: normalize(m.ranking), note: m.note || '', at: m.updatedAt } : null;
    renderNameBox();
  }
  saving = true; statusMsg = ''; renderActions();
  try {
    const res = await fetch(API, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ poll: POLL, name, ranking: order, note: note.trim() }) });
    if (!res.ok) throw new Error(res.status);
    const { updatedAt } = await res.json();
    const first = !saved;
    saved = { order: order.slice(), note: note.trim(), at: updatedAt };
    votes = votes.filter(v => keyOf(v.name) !== keyOf(name)).concat({ name, ranking: order.slice(), note: note.trim(), updatedAt });
    seen.set(keyOf(name), updatedAt);
    renderResults();
    if (first) snow($('#vote-submit'));
  } catch {
    statusMsg = 'Could not save. Check your connection and try again.';
  }
  saving = false; renderActions();
}

async function withdraw() {
  if (!name || !confirm('Remove your ranking from the group vote?')) return;
  try {
    const res = await fetch(API, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ poll: POLL, name }) });
    if (!res.ok) throw new Error(res.status);
    votes = votes.filter(v => keyOf(v.name) !== keyOf(name));
    saved = null; statusMsg = 'Your vote was removed';
    renderResults(); renderActions();
  } catch { statusMsg = 'Could not remove your vote. Try again.'; renderActions(); }
}

function move(li, delta) {
  const items = [...list.children], i = items.indexOf(li), j = i + delta;
  if (j < 0 || j >= items.length) return;
  const other = items[j];
  flip([li, other], () => list.insertBefore(li, delta < 0 ? other : other.nextSibling));
  renumber(); orderChanged();
  $('#rank-live').textContent = `${byId[li.dataset.id].name}, now number ${j + 1} of ${items.length}`;
}

function flip(nodes, mutate, ms = 200) {
  const first = new Map(nodes.map(n => [n, n.getBoundingClientRect().top]));
  mutate();
  if (reduceMotion) return;
  nodes.forEach(n => { const dy = first.get(n) - n.getBoundingClientRect().top; if (dy) n.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: ms, easing: 'cubic-bezier(.2,.7,.3,1)' }); });
}

/* Drag to reorder. Mouse can grab the whole row; touch uses the handle so the page still scrolls. */
let drag = null;
list.addEventListener('pointerdown', e => {
  const item = e.target.closest('.rank-item'); if (!item || e.button > 0) return;
  const handle = e.target.closest('.rank-handle');
  if (e.target.closest('button') && !handle) return;
  if (e.pointerType !== 'mouse' && !handle) return;
  e.preventDefault();
  drag = { item, id: e.pointerId, grabY: e.clientY - item.getBoundingClientRect().top, start: [...list.children].indexOf(item) };
  item.setPointerCapture(e.pointerId);
  item.classList.add('dragging'); list.classList.add('is-dragging');
});
list.addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.id) return;
  const { item } = drag, y = e.clientY, items = [...list.children], others = items.filter(x => x !== item);
  let idx = others.findIndex(o => { const b = o.getBoundingClientRect(); return y < b.top + b.height / 2; });
  if (idx < 0) idx = others.length;
  if (idx !== items.indexOf(item)) { flip(others, () => list.insertBefore(item, others[idx] || null), 180); renumber(); }
  item.style.transform = 'none';
  item.style.transform = `translateY(${y - drag.grabY - item.getBoundingClientRect().top}px)`;
  if (y < 70) scrollBy(0, -10); else if (y > innerHeight - 70) scrollBy(0, 10);
});
const endDrag = e => {
  if (!drag || e.pointerId !== drag.id) return;
  const { item, start } = drag, from = item.style.transform;
  item.style.transform = '';
  if (!reduceMotion && from) item.animate([{ transform: from }, { transform: 'none' }], { duration: 160, easing: 'ease-out' });
  item.classList.remove('dragging'); list.classList.remove('is-dragging');
  drag = null;
  const now = [...list.children].indexOf(item);
  if (now !== start) { orderChanged(); $('#rank-live').textContent = `${byId[item.dataset.id].name}, now number ${now + 1}`; }
};
list.addEventListener('pointerup', endDrag);
list.addEventListener('pointercancel', endDrag);
list.addEventListener('keydown', e => {
  const h = e.target.closest('.rank-handle'); if (!h || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
  e.preventDefault(); const li = h.closest('.rank-item'); move(li, e.key === 'ArrowUp' ? -1 : 1); li.querySelector('.rank-handle').focus();
});

root.addEventListener('click', e => {
  const mv = e.target.closest('[data-move]');
  if (mv) { const li = mv.closest('.rank-item'); move(li, Number(mv.dataset.move)); const again = li.querySelector(`[data-move="${mv.dataset.move}"]`); (again.disabled ? li.querySelector('.rank-handle') : again).focus(); return; }
  const chip = e.target.closest('[data-name]');
  if (chip) { setName(chip.dataset.name, true); return; }
  if (e.target.closest('#change-name')) { setName('', false); order = normalize(null); note = ''; noteInput.value = ''; store.set('alps-vote-draft', null); store.set('alps-vote-note', null); renderList(); renderActions(); $('#voter-name')?.focus(); return; }
  if (e.target.closest('#vote-submit')) { submit(); return; }
  if (e.target.closest('#vote-withdraw')) withdraw();
});
root.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'voter-name') { e.preventDefault(); submit(); } });
noteInput.addEventListener('input', () => { note = noteInput.value; store.set('alps-vote-note', note); statusMsg = ''; renderActions(); });

/* ---------- Results ---------- */
function tally() {
  const rows = STAYS.map(h => ({ id: h.id, pts: 0, firsts: [], rankSum: 0, ranked: 0, ranks: {} })), m = Object.fromEntries(rows.map(r => [r.id, r]));
  votes.forEach(v => v.ranking.filter(id => m[id]).forEach((id, i) => { const r = m[id]; r.pts += N - 1 - i; r.rankSum += i + 1; r.ranked++; r.ranks[keyOf(v.name)] = i + 1; if (!i) r.firsts.push(v.name); }));
  rows.sort((a, b) => b.pts - a.pts || b.firsts.length - a.firsts.length || (a.ranked ? a.rankSum / a.ranked : 99) - (b.ranked ? b.rankSum / b.ranked : 99));
  rows.forEach((r, i) => { const p = rows[i - 1]; r.place = p && p.pts === r.pts && p.firsts.length === r.firsts.length ? p.place : i + 1; });
  return rows;
}

const resultNodes = new Map();
function resultNode(id) {
  if (resultNodes.has(id)) return resultNodes.get(id);
  const h = byId[id], li = document.createElement('li');
  li.className = 'result-row'; li.dataset.id = id;
  li.innerHTML = `<span class="result-place"></span>${thumb(h)}<div class="result-main"><div class="result-top"><button type="button" class="result-name" data-open="${esc(id)}">${esc(h.name)}</button><span class="result-pts"></span></div><div class="result-bar"><span></span></div><div class="result-meta"></div></div>`;
  resultNodes.set(id, li); return li;
}

let lastLeader = null;
function renderResults() {
  const rows = tally(), max = Math.max(1, votes.length * (N - 1)), count = votes.length;
  $('#voter-row').innerHTML = count ? `<span class="voter-count"><strong>${count}</strong> ${count === 1 ? 'vote' : 'votes'}</span><span class="voter-dots">${votes.map(v => avatar(v.name, keyOf(v.name) === keyOf(name) ? 'is-me' : '')).join('')}</span>` : '';
  const empty = $('#results-empty');
  empty.hidden = !!count || !loaded && !loadFailed;
  empty.textContent = loadFailed && !count ? 'Could not load the votes. They will appear when the connection is back.' : 'No votes yet. Rank the stays and yours will be the first.';
  resultList.hidden = !count;
  const nodes = rows.map(r => resultNode(r.id));
  flip(nodes.filter(n => n.isConnected), () => nodes.forEach(n => resultList.appendChild(n)), 450);
  const topTied = rows.filter(r => r.place === 1).length > 1;
  rows.forEach(r => {
    const li = resultNode(r.id), lead = count && r.place === 1;
    li.classList.toggle('is-leader', !!lead);
    li.querySelector('.result-place').innerHTML = lead ? `<span class="lead-badge">${topTied ? 'Tied' : 'Leading'}</span>` : r.place;
    li.querySelector('.result-pts').innerHTML = `<strong>${r.pts}</strong> pts`;
    li.querySelector('.result-bar span').style.width = `${(r.pts / max) * 100}%`;
    const avg = r.ranked ? (r.rankSum / r.ranked).toFixed(1).replace(/\.0$/, '') : '–';
    li.querySelector('.result-meta').innerHTML = `<span>Average place ${avg}</span>${r.firsts.length ? `<span class="firsts">${r.firsts.length} × first <span class="voter-dots mini">${r.firsts.map(n => avatar(n)).join('')}</span></span>` : ''}`;
  });
  const leader = count && rows[0].place === 1 && !topTied ? rows[0].id : null;
  if (leader && lastLeader && leader !== lastLeader) toast(`${byId[leader].name} just took the lead`);
  lastLeader = leader;
  renderMatrix(rows); renderNotes(); decorateCards(rows);
}

function renderMatrix(rows) {
  const more = $('#ballots-more');
  more.hidden = votes.length < 1;
  if (!votes.length) return;
  $('#vote-matrix').innerHTML = `<table class="vote-matrix"><thead><tr><th scope="col">Stay</th>${votes.map(v => `<th scope="col">${avatar(v.name)}<span>${esc(v.name)}</span></th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr><th scope="row">${esc(byId[r.id].name)}</th>${votes.map(v => { const k = r.ranks[keyOf(v.name)]; const heat = (N - k) / (N - 1); return k ? `<td class="${heat < .45 ? 'light' : ''}" style="--heat:${heat}"><span>${k}</span></td>` : '<td class="none">–</td>'; }).join('')}</tr>`).join('')}</tbody></table>`;
}

function renderNotes() {
  const withNotes = votes.filter(v => v.note);
  $('#vote-notes').innerHTML = withNotes.length ? `<h4>Why people picked their #1</h4><ul>${withNotes.map(v => { const top = byId[v.ranking.find(id => byId[id])]; return `<li>${avatar(v.name)}<div><p>${esc(v.note)}</p><small>${esc(v.name)}${top ? ` · #1 ${esc(top.name)}` : ''}</small></div></li>`; }).join('')}</ul>` : '';
}

function decorateCards(rows) {
  const place = Object.fromEntries((rows || tally()).map(r => [r.id, r]));
  document.querySelectorAll('#cards .stay').forEach(card => {
    card.querySelector('.group-chip')?.remove();
    const id = card.querySelector('[data-open]')?.dataset.open, r = place[id];
    if (!votes.length || !r) return;
    const loc = card.querySelector('.location');
    loc?.insertAdjacentHTML('afterend', `<a href="#vote" class="group-chip ${r.place === 1 ? 'is-top' : ''}">Group vote #${r.place} · ${r.pts} pts</a>`);
  });
}
new MutationObserver(() => decorateCards()).observe(document.querySelector('#cards'), { childList: true });

let toastTimer;
function toast(msg) {
  const t = $('#vote-toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 4000);
}

function snow(from) {
  if (reduceMotion) return;
  const b = from.getBoundingClientRect();
  for (let i = 0; i < 22; i++) {
    const s = document.createElement('span');
    s.className = 'snowflake'; s.textContent = '❄';
    s.style.left = `${b.left + b.width / 2}px`; s.style.top = `${b.top + b.height / 2}px`;
    s.style.fontSize = `${10 + Math.random() * 14}px`;
    document.body.appendChild(s);
    const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 110;
    s.animate([{ transform: 'translate(-50%,-50%) scale(.4)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d - 40}px)) rotate(${Math.random() * 360}deg) scale(1)`, opacity: 1, offset: .55 }, { transform: `translate(calc(-50% + ${Math.cos(a) * d * 1.2}px), calc(-50% + ${Math.sin(a) * d + 60}px)) rotate(${Math.random() * 540}deg)`, opacity: 0 }], { duration: 1300 + Math.random() * 500, easing: 'cubic-bezier(.2,.6,.4,1)' }).onfinish = () => s.remove();
  }
}

/* ---------- Loading & live refresh ---------- */
const seen = new Map();
let jumpToVote = false;
async function load() {
  try {
    const res = await fetch(`${API}?poll=${POLL}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    if (loaded) {
      const fresh = data.votes.filter(v => keyOf(v.name) !== keyOf(name) && seen.get(keyOf(v.name)) !== v.updatedAt);
      if (fresh.length) toast(fresh.length === 1 ? `${fresh[0].name} ${seen.has(keyOf(fresh[0].name)) ? 'updated their ranking' : 'just voted'}` : `${fresh.length} new rankings came in`);
    }
    seen.clear(); data.votes.forEach(v => seen.set(keyOf(v.name), v.updatedAt));
    votes = data.votes; loadFailed = false;
    const firstLoad = !loaded; loaded = true;
    if (name) adoptServerBallot(firstLoad && !store.get('alps-vote-draft'));
    if (firstLoad && location.hash === '#vote') jumpToVote = true;
    $('#live-pill').classList.remove('is-off');
  } catch {
    loadFailed = true; $('#live-pill').classList.add('is-off');
  }
  if (!name) renderNameBox();
  renderResults(); renderActions();
  if (jumpToVote) { jumpToVote = false; requestAnimationFrame(() => root.scrollIntoView()); }
}

renderNameBox(); renderList(); renderActions(); renderResults();
load();
setInterval(() => { if (!document.hidden && !drag) load(); }, REFRESH_MS);
document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
setInterval(() => { if (saved && !statusMsg) renderActions(); }, 30000);
})();
