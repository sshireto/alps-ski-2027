// Ranked-vote API for https://sshireto.github.io/alps-ski-2027/booked/
//   GET    /api/votes?poll=booked-2027          -> { votes: [{ name, ranking, note, updatedAt }] }
//   PUT    /api/votes { poll, name, ranking, note } -> saves or replaces that person's ballot
//   DELETE /api/votes { poll, name }               -> removes that person's ballot
//   POST   /api/polls { poll, published } + X-Admin-Key -> publishes or re-seals a sealed poll
// Sealed polls (a row in the polls table, e.g. aviv-2027): until published, GET returns only who voted,
// never what they chose. Sending the poll's X-Admin-Key returns the full ballots.
// No accounts: anyone with the page can vote under any name, which is fine for a group of friends.

const ALLOWED_ORIGINS = [/^https:\/\/sshireto\.github\.io$/, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];
const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;

const corsHeaders = origin => {
  const ok = origin && ALLOWED_ORIGINS.some(r => r.test(origin));
  return {
    'Access-Control-Allow-Origin': ok ? origin : 'https://sshireto.github.io',
    'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
};

const json = (body, status, origin) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...corsHeaders(origin) },
  });

const cleanName = s => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, 32);
const voterKey = name => name.toLocaleLowerCase('en').replace(/\s+/g, '');
const sameKey = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};
const pollMeta = (env, poll) => env.DB.prepare('SELECT published, admin_key FROM polls WHERE poll = ?').bind(poll).first();

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
    const adminKey = request.headers.get('X-Admin-Key');

    if (url.pathname === '/api/polls' && request.method === 'POST') {
      let body;
      try { body = await request.json(); } catch { return json({ error: 'Bad JSON' }, 400, origin); }
      const poll = String(body.poll ?? '');
      if (!ID.test(poll)) return json({ error: 'Bad poll' }, 400, origin);
      const meta = await pollMeta(env, poll);
      if (!meta || !sameKey(adminKey, meta.admin_key)) return json({ error: 'Forbidden' }, 403, origin);
      const published = body.published ? 1 : 0;
      await env.DB.prepare('UPDATE polls SET published = ? WHERE poll = ?').bind(published, poll).run();
      return json({ ok: true, published: !!published }, 200, origin);
    }
    if (url.pathname !== '/api/votes') return json({ error: 'Not found' }, 404, origin);

    if (request.method === 'GET') {
      const poll = url.searchParams.get('poll') || '';
      if (!ID.test(poll)) return json({ error: 'Bad poll' }, 400, origin);
      const meta = await pollMeta(env, poll);
      const admin = !!meta && sameKey(adminKey, meta.admin_key);
      const sealed = !!meta && !meta.published && !admin;
      const { results } = await env.DB.prepare(
        'SELECT name, ranking, note, updated_at FROM ballots WHERE poll = ? ORDER BY updated_at'
      ).bind(poll).all();
      const votes = sealed
        ? results.map(r => ({ name: r.name, updatedAt: r.updated_at }))
        : results.map(r => ({ name: r.name, ranking: JSON.parse(r.ranking), note: r.note, updatedAt: r.updated_at }));
      return json(meta ? { votes, sealed, published: !!meta.published, admin } : { votes }, 200, origin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Bad JSON' }, 400, origin);
    }
    const poll = String(body.poll ?? '');
    const name = cleanName(body.name);
    if (!ID.test(poll)) return json({ error: 'Bad poll' }, 400, origin);
    if (!name) return json({ error: 'Name required' }, 400, origin);

    if (request.method === 'DELETE') {
      await env.DB.prepare('DELETE FROM ballots WHERE poll = ? AND voter_key = ?').bind(poll, voterKey(name)).run();
      return json({ ok: true }, 200, origin);
    }

    if (request.method === 'PUT') {
      const ranking = Array.isArray(body.ranking) ? body.ranking.map(String) : [];
      if (!ranking.length || ranking.length > 40 || !ranking.every(id => ID.test(id)) || new Set(ranking).size !== ranking.length)
        return json({ error: 'Bad ranking' }, 400, origin);
      const note = String(body.note ?? '').trim().slice(0, 160);
      const now = Date.now();
      await env.DB.prepare(
        `INSERT INTO ballots (poll, voter_key, name, ranking, note, updated_at) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (poll, voter_key) DO UPDATE SET name = excluded.name, ranking = excluded.ranking,
           note = excluded.note, updated_at = excluded.updated_at`
      ).bind(poll, voterKey(name), name, JSON.stringify(ranking), note, now).run();
      return json({ ok: true, updatedAt: now }, 200, origin);
    }

    return json({ error: 'Method not allowed' }, 405, origin);
  },
};
