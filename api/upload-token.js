module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Password');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const body = req.body;
  if (!body) return res.status(400).json({ error: 'Body vacío' });

  // El SDK de Vercel Blob envía este tipo para pedir el token
  if (body.type === 'blob.generate-client-token') {
    const { pathname, callbackUrl, clientPayload } = body.payload || {};

    if (clientPayload !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    try {
      const { generateClientTokenFromReadWriteToken } = await import('@vercel/blob/client');

      const clientToken = await generateClientTokenFromReadWriteToken({
        token: process.env.BLOB_READ_WRITE_TOKEN,
        pathname,
        onUploadCompleted: callbackUrl ? { callbackUrl } : undefined,
        allowedContentTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
        maximumSizeInBytes: 500 * 1024 * 1024,
        addRandomSuffix: false,
      });

      return res.json({ clientToken });
    } catch (err) {
      console.error('Token generation error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  // Vercel Blob llama de vuelta aquí cuando la subida termina
  if (body.type === 'blob.upload-completed') {
    const blob = body.blob || (body.payload && body.payload.blob);
    if (blob) {
      try {
        const { put } = await import('@vercel/blob');
        await put(
          'config/current-video.json',
          JSON.stringify({
            url: blob.url,
            filename: blob.pathname.split('/').pop(),
            updatedAt: new Date().toISOString(),
          }),
          { access: 'public', addRandomSuffix: false, contentType: 'application/json' }
        );
      } catch (err) {
        console.error('Config update error:', err);
      }
    }
    return res.json({ ok: true });
  }

  return res.status(400).json({ error: 'Tipo de petición desconocido' });
};
