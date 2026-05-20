import { put } from '@vercel/blob';
import { Readable } from 'node:stream';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Password, X-Filename');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const password = req.headers['x-admin-password'];
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  try {
    const filename = req.headers['x-filename'] || `video-${Date.now()}.mp4`;
    const contentType = req.headers['content-type'] || 'video/mp4';

    const stream = Readable.toWeb(req);
    const videoBlob = await put(`videos/${filename}`, stream, {
      access: 'public',
      contentType,
    });

    await put(
      'config/current-video.json',
      JSON.stringify({
        url: videoBlob.url,
        filename,
        updatedAt: new Date().toISOString(),
      }),
      {
        access: 'public',
        addRandomSuffix: false,
        contentType: 'application/json',
      }
    );

    return res.status(200).json({ url: videoBlob.url });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: 'Error al subir el vídeo: ' + err.message });
  }
}
