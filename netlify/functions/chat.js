// Kurir: menyimpan API key NVIDIA di server, bukan di halaman web.
const hits = new Map();
const LIMIT = 20, WINDOW = 10 * 60 * 1000; // 20 pesan / 10 menit / IP (best effort)
const SYS = 'Kamu asisten AI yang ramah dan jelas. Jawab dalam bahasa yang dipakai pengguna, ringkas, dan jujur kalau tidak tahu.';
const reply = (code, obj) => ({ statusCode: code, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) });

exports.handler = async (event) => {
  const MODEL = process.env.NVIDIA_MODEL || 'meta/llama-3.3-70b-instruct';
  if (event.httpMethod === 'GET') { // buka .../chat?q=llama untuk melihat model yang tersedia
    const k = process.env.NVIDIA_API_KEY;
    if (!k) return reply(500, { error: 'NVIDIA_API_KEY belum diisi di pengaturan Netlify.' });
    try {
      const r = await fetch('https://integrate.api.nvidia.com/v1/models', { headers: { Authorization: 'Bearer ' + k } });
      if (!r.ok) return reply(502, { error: 'Gagal mengambil daftar model (kode ' + r.status + ').' });
      const d = await r.json();
      const q = ((event.queryStringParameters || {}).q || '').toLowerCase();
      const ids = (d.data || []).map(m => m.id).filter(id => id.toLowerCase().includes(q)).sort();
      return reply(200, { model_dipakai_sekarang: MODEL, jumlah: ids.length, model: ids });
    } catch { return reply(500, { error: 'Gagal menghubungi NVIDIA.' }); }
  }
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Metode tidak diizinkan.' });
  const key = process.env.NVIDIA_API_KEY;
  if (!key) return reply(500, { error: 'NVIDIA_API_KEY belum diisi di pengaturan Netlify.' });

  const ip = event.headers['x-nf-client-connection-ip'] || event.headers['x-forwarded-for'] || '?';
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < WINDOW);
  if (recent.length >= LIMIT) return reply(429, { error: 'Terlalu banyak pesan. Tunggu beberapa menit.' });
  recent.push(now); hits.set(ip, recent);

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return reply(400, { error: 'Format permintaan salah.' }); }
  const msgs = (Array.isArray(body.messages) ? body.messages : []).slice(-20)
    .filter(m => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return reply(400, { error: 'Pesan kosong.' });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9000); // batas fungsi gratis Netlify ~10 detik
  try {
    const r = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: SYS }, ...msgs],
        max_tokens: 700,
        temperature: 0.6
      })
    });
    if (!r.ok) return reply(502, { error: 'NVIDIA menolak permintaan (kode ' + r.status + ') untuk model ' + MODEL + '.' });
    const d = await r.json();
    return reply(200, { reply: d.choices?.[0]?.message?.content || '(jawaban kosong)' });
  } catch (e) {
    if (e.name === 'AbortError') return reply(504, { error: 'AI terlalu lama menjawab. Coba pertanyaan lebih pendek atau ganti model.' });
    return reply(500, { error: 'Gagal menghubungi NVIDIA.' });
  } finally { clearTimeout(timer); }
};
