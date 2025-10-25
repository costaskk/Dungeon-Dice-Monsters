// Proper DDM dice distribution by level for Summon faces
// L1: 4/6, L2: 3/6, L3: 2/6, L4: 1/6
// Remaining faces distribute crests. We also include magic/trap faces.

export const PATH_SHAPES = {
  I: [ [0,0], [1,0], [-1,0] ],
  L: [ [0,0], [1,0], [0,1] ],
  T: [ [0,0], [1,0], [-1,0], [0,1] ],
  X: [ [0,0] ],
}

const CRESTS = ['move','attack','defense']
const COLORS = {
  family: {
    spellcaster: '#5b21b6',
    dragon: '#1e3a8a',
    rock: '#4b5563',
    warrior: '#0f766e',
    fiend: '#7f1d1d',
  },
  rarity: {
    common: '#334155',
    rare: '#2563eb',
    super: '#16a34a',
    ultra: '#a855f7',
    black: '#0b0b0b'
  }
}

function makeDie({ id, level, shape, family='spellcaster', rarity='common' }){
  const faces = []
  const summonCount = level===1?4: level===2?3: level===3?2: 1
  for(let i=0;i<summonCount;i++) faces.push({ type:'summon', level })

  // add magic/trap priority for higher levels
  const filler = []
  while(filler.length + faces.length < 6){
    if(level>=3 && filler.length%3===0) filler.push({ type:'magic', amt:1 })
    else if(level>=2 && filler.length%3===1) filler.push({ type:'trap', amt:1 })
    else {
      const crest = CRESTS[(filler.length)%CRESTS.length]
      filler.push({ type:'crest', crest, amt:1 })
    }
  }
  faces.push(...filler)

  const color = COLORS.family[family] || COLORS.rarity.common
  const edge = COLORS.rarity[rarity] || COLORS.rarity.common
  return { id, level, shape, color, edge, rarity, faces, family }
}

// Rare Black Die: faces can return 'black' wild summon (counts as any level)
function makeBlackDie(id='BLACK-WILD'){
  const faces = [
    { type:'black' }, { type:'black' },
    { type:'magic', amt:1 }, { type:'trap', amt:1 },
    { type:'crest', crest:'attack', amt:1 },
    { type:'crest', crest:'move', amt:1 },
  ]
  return { id, level:4, shape:'X', color:'#0b0b0b', edge:'#f59e0b', rarity:'black', faces, family:'fiend' }
}

export function buildDefaultDicePool(){
  return [
    // Black wild die (1)
    makeBlackDie(),

    // Level 4 (max three)
    makeDie({ id:'L4-T-obsidian', level:4, shape:'T', family:'fiend', rarity:'ultra' }),
    makeDie({ id:'L4-L-obsidian', level:4, shape:'L', family:'dragon', rarity:'super' }),
    makeDie({ id:'L4-I-obsidian', level:4, shape:'I', family:'rock',   rarity:'rare' }),

    // Level 3
    makeDie({ id:'L3-T-crimson',  level:3, shape:'T', family:'fiend', rarity:'rare' }),
    makeDie({ id:'L3-L-crimson',  level:3, shape:'L', family:'warrior' }),
    makeDie({ id:'L3-I-crimson',  level:3, shape:'I', family:'dragon' }),
    makeDie({ id:'L3-T-crimson2', level:3, shape:'T', family:'spellcaster' }),

    // Level 2
    makeDie({ id:'L2-L-azure',    level:2, shape:'L', family:'dragon' }),
    makeDie({ id:'L2-I-azure',    level:2, shape:'I', family:'warrior' }),
    makeDie({ id:'L2-T-azure',    level:2, shape:'T', family:'rock' }),
    makeDie({ id:'L2-L-azure2',   level:2, shape:'L', family:'spellcaster' }),

    // Level 1
    makeDie({ id:'L1-I-emerald',  level:1, shape:'I', family:'warrior' }),
    makeDie({ id:'L1-X-emerald',  level:1, shape:'X', family:'spellcaster' }),
    makeDie({ id:'L1-I-emerald2', level:1, shape:'I', family:'dragon' }),
    makeDie({ id:'L1-L-emerald',  level:1, shape:'L', family:'rock' }),
  ]
}
