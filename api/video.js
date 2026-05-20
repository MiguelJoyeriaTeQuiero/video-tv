const { list } = require('@vercel/blob');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method !== 'GET') return res.status(405).end();

  try {
    const { blobs } = await list({ prefix: 'config/' });
    const configBlob = blobs.find((b) => b.pathname === 'config/current-video.json');

    if (!configBlob) {
      return res.status(200).json({ url: null });
    }

    const response = await fetch(`${configBlob.url}?t=${Date.now()}`);
    if (!response.ok) return res.status(200).json({ url: null });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('Video fetch error:', err);
    return res.status(200).json({ url: null });
  }
};
