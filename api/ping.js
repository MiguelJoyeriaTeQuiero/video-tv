const { put } = require('@vercel/blob');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { store } = req.body || {};
  if (!store) return res.status(400).json({ error: 'store required' });

  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN || '';
    const storeId = token.split('_')[3];
    if (!storeId) return res.status(200).json({ ok: true });

    let status = {};
    try {
      const r = await fetch(
        `https://${storeId}.public.blob.vercel-storage.com/config/status.json?t=${Date.now()}`
      );
      if (r.ok) status = await r.json();
    } catch {}

    status[store] = { lastSeen: new Date().toISOString() };

    await put('config/status.json', JSON.stringify(status), {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
