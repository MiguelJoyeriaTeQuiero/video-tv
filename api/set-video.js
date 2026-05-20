const { put } = require('@vercel/blob');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Password');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const password = req.headers['x-admin-password'];
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  const { url, filename } = req.body;
  if (!url) return res.status(400).json({ error: 'Falta la URL del vídeo' });

  try {
    await put(
      'config/current-video.json',
      JSON.stringify({ url, filename, updatedAt: new Date().toISOString() }),
      { access: 'public', addRandomSuffix: false, contentType: 'application/json' }
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error('Set video error:', err);
    return res.status(500).json({ error: err.message });
  }
};
