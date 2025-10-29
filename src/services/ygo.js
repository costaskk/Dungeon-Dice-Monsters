// Public image search scoped to your local official card list.
// - Loads and indexes /yugioh_card_database.json once (name -> entry).
// - Uses local card_images immediately if present.
// - Otherwise queries your Vercel API (then YGOPRODeck) **only for official names**.
// - Non-official names return null immediately (no network).
//
// Also exports a tiny helper to check whether a name is official.

const CACHE = new Map();
const NEG_CACHE = new Set();

const isBrowser =
  typeof window !== 'undefined' && typeof fetch !== 'undefined';
const isDev =
  isBrowser && (location.hostname === 'localhost' || location.hostname === '127.0.0.1');

// ---------- helpers ----------
function normName(s = '') {
  return String(s).trim().replace(/\s+/g, ' ').toLowerCase();
}

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

// ---------- local DB (loaded once) ----------
let CARDLIST_PROMISE = null;
let NAME_INDEX = null;

async function ensureCardList() {
  if (CARDLIST_PROMISE) return CARDLIST_PROMISE;
  CARDLIST_PROMISE = (async () => {
    try {
      // Vite serves files from /public at the root
      const res = await fetch('/yugioh_card_database.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('db json not found');
      const json = await res.json();
      const rows = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      const idx = new Map();
      for (const c of rows) {
        if (!c?.name) continue;
        idx.set(normName(c.name), c);
      }
      NAME_INDEX = idx;
      return idx;
    } catch (e) {
      // If the file is missing or malformed, we keep an empty map.
      NAME_INDEX = new Map();
      return NAME_INDEX;
    }
  })();
  return CARDLIST_PROMISE;
}

export async function isOfficialCardName(name) {
  await ensureCardList();
  return NAME_INDEX?.has(normName(name)) || false;
}

function extractLocalImages(entry) {
  // YGOPRODeck schema typically: entry.card_images: [{ image_url, image_url_small, ... }]
  const img = entry?.card_images?.[0];
  if (!img) return null;
  return {
    small: img.image_url_small || img.image_url || null,
    large: img.image_url || img.image_url_small || null,
  };
}

// ---------- remote fetchers (only used for official names) ----------
async function fetchFromVercel(name) {
  try {
    const res = await fetchWithTimeout(`/api/ygo-cardinfo?name=${encodeURIComponent(name)}`);
    if (!res.ok) return null;
    const json = await res.json();
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
  const strictURL = `https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${encodeURIComponent(name)}`;
  try {
    let r = await fetchWithTimeout(strictURL);
    if (r.ok) {
      const data = await r.json();
      const img = data?.data?.[0]?.card_images?.[0];
      if (img) return img;
    }
  } catch { /* noop */ }

  const fuzzyURL = `https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(name)}`;
  try {
    let r = await fetchWithTimeout(fuzzyURL);
    if (r.ok) {
      const data = await r.json();
      const img = data?.data?.[0]?.card_images?.[0];
      if (img) return img;
    }
  } catch { /* noop */ }

  return null;
}

// ---------- main API ----------
/**
 * searchCardImages(name, rehost?)
 * Returns { small, large } or null
 * - Only searches for official names present in /yugioh_card_database.json.
 * - If local DB has card_images, uses those without any network.
 * - Otherwise queries your serverless endpoint then YGOPRODeck.
 */
export async function searchCardImages(name, rehost = false) {
  if (!name) return null;

  const n = normName(name);

  // Negative cache: skip repeated misses
  const negKey = `neg:${n}`;
  if (NEG_CACHE.has(negKey)) return null;

  // Load known cards once
  await ensureCardList();

  const entry = NAME_INDEX?.get(n);
  if (!entry) {
    // not an official card -> no network fetch
    NEG_CACHE.add(negKey);
    return null;
  }

  // Cache (keyed by exact name + env + rehost flag)
  const cacheKey = `imgs:${entry.name}:${rehost ? '1' : '0'}:${isDev ? 'dev' : 'prod'}`;
  if (CACHE.has(cacheKey)) return CACHE.get(cacheKey);

  // 1) If local JSON already has images, prefer them
  let out = extractLocalImages(entry);

  // 2) Otherwise try serverless then direct
  if (!out || (!out.small && !out.large)) {
    let img = await fetchFromVercel(entry.name);
    if (!img) img = await fetchDirect(entry.name);
    if (!img) {
      NEG_CACHE.add(negKey);
      return null;
    }
    out = {
      small: img.image_url_small || img.image_url || null,
      large: img.image_url || img.image_url_small || null,
    };
  }

  // Rehost disabled locally (to avoid dev 404 on /api)
  if (rehost && !isDev) {
    const wrap = (url) => (url ? `/api/ygo-image?url=${encodeURIComponent(url)}` : null);
    out = { small: wrap(out.small), large: wrap(out.large) };
  }

  CACHE.set(cacheKey, out);
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

  let slug = 'wizard-staff'; // default
  if (/(dragon|wyrm|wyvern)/.test(src)) slug = 'dragon-head';
  else if (/(spellcaster|magician|wizard)/.test(src)) slug = 'wizard-staff';
  else if (/(rock|golem|statue)/.test(src)) slug = 'rock';
  else if (/(warrior|soldier|ranger|knight)/.test(src)) slug = 'swordman';
  else if (/(fiend|demon|phantom|ghost|spirit|zombie)/.test(src)) slug = 'spectre';
  else if (/(beast|wolf|tiger|lion|bear)/.test(src)) slug = 'wolf-head';
  else if (/(machine|robot|gear)/.test(src)) slug = 'robot-golem';
  else if (/(fairy|angel)/.test(src)) slug = 'angel-outfit';

  return `https://game-icons.net/icons/ffffff/000000/1x/lorc/${slug}.svg`;
}
