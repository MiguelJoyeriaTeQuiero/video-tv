module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store');
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN || '';
    const storeId = token.split('_')[3];
    if (!storeId) return res.status(200).json({});

    const r = await fetch(
      `https://${storeId}.public.blob.vercel-storage.com/config/status.json?t=${Date.now()}`
    );
    if (!r.ok) return res.status(200).json({});

    const data = await r.json();
    return res.status(200).json(data);
  } catch {
    return res.status(200).json({});
  }
};
