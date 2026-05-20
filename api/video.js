module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method !== 'GET') return res.status(405).end();

  try {
    // Construir URL directa desde el store ID (evita list() que es lento)
    const token = process.env.BLOB_READ_WRITE_TOKEN || '';
    const storeId = token.split('_')[3];

    if (!storeId) {
      return res.status(200).json({ url: null });
    }

    const configUrl = `https://${storeId}.public.blob.vercel-storage.com/config/current-video.json`;
    const response = await fetch(`${configUrl}?t=${Date.now()}`);

    if (!response.ok) return res.status(200).json({ url: null });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('Video fetch error:', err);
    return res.status(200).json({ url: null });
  }
};
