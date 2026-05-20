const { put } = require('@vercel/blob');

module.exports.config = { api: { bodyParser: false } };

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Password, X-Upload-Id, X-Part-Index');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const password = req.headers['x-admin-password'];
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  const uploadId = req.headers['x-upload-id'];
  const partIndex = req.headers['x-part-index'];

  if (!uploadId || partIndex === undefined) {
    return res.status(400).json({ error: 'Faltan cabeceras x-upload-id o x-part-index' });
  }

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    await put(`temp/${uploadId}/${partIndex}`, buffer, {
      access: 'public',
      contentType: 'application/octet-stream',
      addRandomSuffix: false,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Chunk upload error:', err);
    return res.status(500).json({ error: err.message });
  }
};
