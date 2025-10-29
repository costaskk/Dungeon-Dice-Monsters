// Public image search + safe sprite suggestions for cards
// - Tries your Vercel API first, then YGOPRODeck directly (strict then fuzzy).
// - Provides a free, attribution-friendly sprite URL fallback via game-icons.net.

const CACHE = new Map();
const isBrowser =
  typeof window !== 'undefined' && typeof fetch !== 'undefined';
const isDev =
  isBrowser && (location.hostname === 'localhost' || location.hostname === '127.0.0.1');

// Small helper: timeout fetch (prevents hangs in prod)
async function fetchWithTimeout(url, { timeoutMs = 6000, ...opts } = {}) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: ac.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
}

async function fetchFromVercel(name) {
  try {
    const res = await fetchWithTimeout(
      `/api/ygo-cardinfo?name=${encodeURIComponent(name)}`
    );
    if (!res.ok) return null;
    const json = await res.json();
    // Support either { data:[{card_images:[...] }]} or { card_images:[...] }
    const img =
      json?.card_images?.[0] ||
      (Array.isArray(json?.data) && json.data[0]?.card_images?.[0]) ||
      null;
    return img;
  } catch {
    return null;
  }
}

async function fetchDirect(name) {
  // strict by exact name
  const strictURL = `https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${encodeURIComponent(
    name
  )}`;
  try {
    let r = await fetchWithTimeout(strictURL);
    if (r.ok) {
      const data = await r.json();
      const img = data?.data?.[0]?.card_images?.[0];
      if (img) return img;
    }
  } catch {
    /* noop */
  }

  // fuzzy by fname
  const fuzzyURL = `https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(
    name
  )}`;
  try {
    let r = await fetchWithTimeout(fuzzyURL);
    if (r.ok) {
      const data = await r.json();
      const img = data?.data?.[0]?.card_images?.[0];
      if (img) return img;
    }
  } catch {
    /* noop */
  }

  return null;
}

/**
 * searchCardImages(name, rehost?)
 * Returns { small, large } or null
 * - If `rehost` is true (and not dev), image URLs are proxied through /api/ygo-image
 */
export async function searchCardImages(name, rehost = false) {
  if (!name) return null;
  const key = `imgs:${name}:${rehost ? '1' : '0'}:${isDev ? 'dev' : 'prod'}`;
  if (CACHE.has(key)) return CACHE.get(key);

  // Try your serverless endpoint first (handles CORS/rate-limiting better), then direct
  let img = await fetchFromVercel(name);
  if (!img) img = await fetchDirect(name);
  if (!img) return null;

  let small = img.image_url_small || img.image_url;
  let large = img.image_url || img.image_url_small || small;

  // Rehost disabled locally (to avoid 404 if /api not wired in dev)
  if (rehost && !isDev) {
    const wrap = (url) =>
      url ? `/api/ygo-image?url=${encodeURIComponent(url)}` : null;
    small = wrap(small);
    large = wrap(large);
  }

  const out = { small, large };
  CACHE.set(key, out);
  return out;
}

/**
 * spriteUrlForCard(name, type)
 * Returns a FREE, hotlink-safe icon (SVG) URL from game-icons.net
 * mapping common archetypes to decent-looking symbols.
 * (Game Icons by Delapouite/Lorc/others — CC BY 3.0)
 */
export function spriteUrlForCard(name = '', type = '') {
  const src = `${name} ${type}`.toLowerCase();

  // Decide an icon slug; you can extend this map anytime.
  // Browse: https://game-icons.net/ for more options.
  let slug = 'wizard-staff'; // default
  if (/(dragon|wyrm|wyvern)/.test(src)) slug = 'dragon-head';
  else if (/(spellcaster|magician|wizard)/.test(src)) slug = 'wizard-staff';
  else if (/(rock|golem|statue)/.test(src)) slug = 'rock';
  else if (/(warrior|soldier|ranger|knight)/.test(src)) slug = 'swordman';
  else if (/(fiend|demon|phantom|ghost|spirit|zombie)/.test(src)) slug = 'spectre';
  else if (/(beast|wolf|tiger|lion|bear)/.test(src)) slug = 'wolf-head';
  else if (/(machine|robot|gear)/.test(src)) slug = 'robot-golem';
  else if (/(fairy|angel)/.test(src)) slug = 'angel-outfit';

  // The CDN renders icons as SVG; color=ffffff on bg-current in your UI is nice.
  return `https://game-icons.net/icons/ffffff/000000/1x/lorc/${slug}.svg`;
}
