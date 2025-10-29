// Serverless proxy to YGOPRODeck cardinfo endpoint (free service).
// Returns minimal JSON with `card_images` (small + large URLs).
// IMPORTANT: We now return 200 with { card_images: [] } when not found,
// so the client can handle it gracefully without treating it as a hard error.

export default async function handler(req, res) {
  // CORS for browser fetches from your domain or local dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { name } = req.query || {};
  if (!name) return res.status(400).json({ error: 'Missing name' });

  const trim = (s) => String(s || '').trim().replace(/\s+/g, ' ');
  const q = trim(name);

  const strictURL = `https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${encodeURIComponent(q)}`;
  const fuzzyURL  = `https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(q)}`;

  try {
    // Try strict first
    let r = await fetch(strictURL);
    if (!r.ok) r = await fetch(fuzzyURL);

    if (!r.ok) {
      res.setHeader('Cache-Control','s-maxage=600, stale-while-revalidate=600');
      return res.status(200).json({ card_images: [] });
    }

    const data = await r.json();
    const card = Array.isArray(data?.data) ? data.data[0] : null;
    if (!card) {
      res.setHeader('Cache-Control','s-maxage=600, stale-while-revalidate=600');
      return res.status(200).json({ card_images: [] });
    }

    res.setHeader('Cache-Control','s-maxage=86400, stale-while-revalidate=43200');
    return res.status(200).json({
      id: card.id,
      name: card.name,
      card_images: card.card_images || [],
    });
  } catch (e) {
    // Return 200 with no images – keeps client logic simple
    res.setHeader('Cache-Control','s-maxage=600, stale-while-revalidate=600');
    return res.status(200).json({ card_images: [] });
  }
}
