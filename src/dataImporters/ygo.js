function toInt(x, fallback=0){
  if(x===undefined||x===null) return fallback
  if(typeof x==='number') return x
  const s = String(x).trim()
  if(s==='?'||s==='') return fallback
  const n = parseInt(s,10)
  return Number.isFinite(n)? n : fallback
}

function isMonster(entry){
  const attr = (entry.attribute||'').toUpperCase()
  if(attr==='SPELL' || attr==='TRAP') return false
  return true
}

export function importYGOFromObject(obj){
  const cards = Object.values(obj||{})
  const monsters = cards.filter(isMonster)
  return monsters.map(c=>{
    const level = toInt(c.level, 1)
    const atk = toInt(c.attack, 0)
    const def = toInt(c.defense, 0)
    const move = level>=7?1: level>=5?1: level>=3?2:3
    return {
      id: (c.passcode || c.name || 'card').toString().toLowerCase().replace(/[^a-z0-9]+/g,'_'),
      name: c.name,
      stars: level,
      attr: c.attribute,
      type: c.type,
      atk, def, move,
      cost:{ summon: Math.max(1, Math.ceil(level/2)), attack: 1, move: 1 },
      effect: c.card_text? { text: c.card_text } : null,
      sprite: (/(Dragon|Wyrm|Wyvern)/i.test(c.type||c.name))? 'wyrm'
            : (/(Spellcaster|Magician|Wizard)/i.test(c.type||c.name))? 'magus'
            : (/(Rock|Golem)/i.test(c.type||c.name))? 'golem'
            : (/(Warrior|Soldier|Ranger)/i.test(c.type||c.name))? 'ranger'
            : (/(Fiend|Demon|Phantom)/i.test(c.type||c.name))? 'phantom'
            : 'magus'
    }
  })
}
