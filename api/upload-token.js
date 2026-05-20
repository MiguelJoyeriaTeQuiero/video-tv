module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Password');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { handleUpload } = await import('@vercel/blob/client');
    const { put } = await import('@vercel/blob');

    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (clientPayload !== process.env.ADMIN_PASSWORD) {
          throw new Error('Contraseña incorrecta');
        }
        return {
          allowedContentTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
          maximumSizeInBytes: 500 * 1024 * 1024,
        };
      },
      onUploadCompleted: async ({ blob }) => {
        await put(
          'config/current-video.json',
          JSON.stringify({
            url: blob.url,
            filename: blob.pathname.split('/').pop(),
            updatedAt: new Date().toISOString(),
          }),
          { access: 'public', addRandomSuffix: false, contentType: 'application/json' }
        );
      },
    });

    return res.json(jsonResponse);
  } catch (err) {
    console.error('Upload token error:', err);
    return res.status(400).json({ error: err.message });
  }
};
