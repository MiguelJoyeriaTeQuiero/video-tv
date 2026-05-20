const { generateClientTokenFromReadWriteToken } = require('@vercel/blob');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Password');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  const password = req.headers['x-admin-password'];
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  const filename = req.query.filename || `video-${Date.now()}.mp4`;

  try {
    const clientToken = await generateClientTokenFromReadWriteToken({
      token: process.env.BLOB_READ_WRITE_TOKEN,
      pathname: `videos/${filename}`,
      allowedContentTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
      maximumSizeInBytes: 500 * 1024 * 1024,
      addRandomSuffix: false,
    });

    return res.json({ clientToken });
  } catch (err) {
    console.error('Token error:', err);
    return res.status(500).json({ error: err.message });
  }
};
