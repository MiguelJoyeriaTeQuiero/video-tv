const { put, list, del } = require('@vercel/blob');

module.exports.config = { maxDuration: 300 };

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Password');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const password = req.headers['x-admin-password'];
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  const { uploadId, filename, totalParts } = req.body;
  if (!uploadId || !filename || !totalParts) {
    return res.status(400).json({ error: 'Faltan parámetros' });
  }

  try {
    // Recuperar todos los trozos en orden
    const { blobs } = await list({ prefix: `temp/${uploadId}/` });

    if (blobs.length !== totalParts) {
      return res.status(400).json({ error: `Se esperaban ${totalParts} partes, se encontraron ${blobs.length}` });
    }

    blobs.sort((a, b) => {
      const aIdx = parseInt(a.pathname.split('/').pop(), 10);
      const bIdx = parseInt(b.pathname.split('/').pop(), 10);
      return aIdx - bIdx;
    });

    // Descargar y concatenar trozos
    const buffers = [];
    for (const blob of blobs) {
      const response = await fetch(blob.url);
      const arrayBuffer = await response.arrayBuffer();
      buffers.push(Buffer.from(arrayBuffer));
    }
    const videoBuffer = Buffer.concat(buffers);

    // Subir vídeo final
    const videoBlob = await put(`videos/${filename}`, videoBuffer, {
      access: 'public',
      contentType: 'video/mp4',
      addRandomSuffix: false,
    });

    // Guardar como vídeo activo
    await put(
      'config/current-video.json',
      JSON.stringify({ url: videoBlob.url, filename, updatedAt: new Date().toISOString() }),
      { access: 'public', addRandomSuffix: false, contentType: 'application/json' }
    );

    // Limpiar trozos temporales
    await Promise.allSettled(blobs.map(b => del(b.url)));

    return res.status(200).json({ url: videoBlob.url });
  } catch (err) {
    console.error('Final assembly error:', err);
    return res.status(500).json({ error: err.message });
  }
};
