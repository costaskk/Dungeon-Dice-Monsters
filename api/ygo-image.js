// Optional: rehost image through your Vercel domain to avoid hotlinking issues.
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url } = req.query || {};
  if (!url) return res.status(400).send('Missing url');
  try {
    const r = await fetch(url);
    if (!r.ok) return res.status(404).send('Not found');

    // Pass-through content type; default to jpeg
    const ct = r.headers.get('Content-Type') || 'image/jpeg';
    const ab = await r.arrayBuffer();

    res.setHeader('Cache-Control','s-maxage=86400, stale-while-revalidate=43200');
    res.setHeader('Content-Type', ct);
    res.setHeader('Content-Disposition', 'inline'); // display, not download
    res.status(200).send(Buffer.from(ab));
  } catch (e) {
    res.status(500).send('Error');
  }
}
