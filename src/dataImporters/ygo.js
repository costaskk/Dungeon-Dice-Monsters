// Robust YGO→DDM adapter

function toInt(x, fallback = 0) {
  if (x === undefined || x === null) return fallback;
  if (typeof x === 'number' && Number.isFinite(x)) return x;
  const s = String(x).trim();
  if (s === '' || s === '?') return fallback;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : fallback;
}

function isMonster(entry = {}) {
  // Many dumps encode non-monsters via attribute or type
  const attr = String(entry.attribute || '').toUpperCase();
  const type = String(entry.type || '').toUpperCase();
  if (attr === 'SPELL' || attr === 'TRAP') return false;
  if (type.includes('SPELL') || type.includes('TRAP')) return false;
  return true;
}

function normalizeIdFromName(name = '', passcode) {
  // If passcode exists, prefer it (it’s stable & unique)
  if (passcode) return String(passcode).trim();
  return String(name)
    .toLowerCase()
    .replace(/['’`"]/g, '')             // drop quotes
    .replace(/[^a-z0-9]+/g, '_')        // normalize to snake
    .replace(/^_+|_+$/g, '')            // trim _
    || 'card';
}

function pickMove(level) {
  // Very light heuristic: tougher monsters move less
  // You can later replace with PDF-accurate values per archetype
  if (level >= 7) return 1;
  if (level >= 5) return 1;
  if (level >= 3) return 2;
  return 3;
}

function spriteFromNameType(name = '', type = '') {
  const src = `${name} ${type}`.toLowerCase();
  if (/(dragon|wyrm|wyvern)/.test(src)) return 'wyrm';
  if (/(spellcaster|magician|wizard)/.test(src)) return 'magus';
  if (/(rock|golem|statue)/.test(src)) return 'golem';
  if (/(warrior|soldier|ranger|knight)/.test(src)) return 'ranger';
  if (/(fiend|demon|phantom|ghost|spirit|zombie)/.test(src)) return 'phantom';
  return 'magus';
}

export function importYGOFromObject(obj) {
  // Accept either { data:[...] } or {id:card,...} shapes
  const rawList = Array.isArray(obj?.data) ? obj.data : Object.values(obj || {});
  const monsters = rawList.filter(isMonster);

  // Deduplicate by id (passcode or normalized name)
  const seen = new Set();

  const out = [];
  for (const c of monsters) {
    const id = normalizeIdFromName(c.name, c.passcode);
    if (seen.has(id)) continue;
    seen.add(id);

    const level = toInt(c.level, 1);
    const atk = toInt(c.attack, 0);
    const def = toInt(c.defense, 0);
    const move = pickMove(level);

    out.push({
      id,
      name: c.name,
      stars: level,
      level,                        // keep both for convenience
      attr: c.attribute,
      type: c.type,
      atk,
      def,
      move,
      // Light crest costs; tune alongside rules expansion
      cost: { summon: Math.max(1, Math.ceil(level / 2)), attack: 1, move: 1 },
      effect: c.card_text ? { text: c.card_text } : null,
      sprite: spriteFromNameType(c.name, c.type),
      rarity: c.race || c.frameType || undefined, // optional hint for UI color
    });
  }
  return out;
}
