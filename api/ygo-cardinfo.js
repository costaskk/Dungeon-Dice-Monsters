// Serverless proxy to YGOPRODeck cardinfo endpoint (free service).
// Returns minimal JSON with `card_images` (small + large URLs).
export default async function handler(req, res) {
  // CORS for browser fetches from your domain or local dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { name } = req.query || {};
  if (!name) return res.status(400).json({ error: 'Missing name' });

  const strictURL = `https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${encodeURIComponent(name)}`;
  const fuzzyURL  = `https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(name)}`;

  try {
    // Try strict first
    let r = await fetch(strictURL);
    if (!r.ok) {
      // Fallback to fuzzy
      r = await fetch(fuzzyURL);
    }
    if (!r.ok) return res.status(404).json({ error: 'Not found' });

    const data = await r.json();
    const card = Array.isArray(data?.data) ? data.data[0] : null;
    if (!card) return res.status(404).json({ error: 'Not found' });

    res.setHeader('Cache-Control','s-maxage=86400, stale-while-revalidate=43200');
    return res.status(200).json({
      id: card.id,
      name: card.name,
      card_images: card.card_images
    });
  } catch (e) {
    return res.status(500).json({ error: 'Upstream error' });
  }
}
