// Default stand-ins (non-infringing) used only if no JSON is provided.
export const MONSTERS = [
  { id:'spellblade', name:'Spellblade Adept', stars:2, atk:1500, def:800, move:2, cost:{summon:2, attack:1, move:1}, sprite:'magus', effect:{ text:'On Summon: +1 attack crest.' } },
  { id:'wyrmling',  name:'Azure Wyrmling',   stars:2, atk:1200, def:1200, move:1, cost:{summon:2, attack:1, move:1}, sprite:'wyrm' },
  { id:'golem',     name:'Runic Golem',      stars:3, atk:1800, def:1800, move:1, cost:{summon:3, attack:2, move:1}, sprite:'golem', effect:{ text:'Passive: +1 defense while on friendly path.' } },
  { id:'ranger',    name:'Crest Ranger',     stars:1, atk:900,  def:700,  move:3, cost:{summon:1, attack:1, move:1}, sprite:'ranger', effect:{ text:'Can move diagonally.' } },
  { id:'phantom',   name:'Night Phantom',    stars:3, atk:1600, def:900,  move:3, cost:{summon:3, attack:1, move:1}, sprite:'phantom', effect:{ text:'On Hit: Opponent -1 random crest.' } },
]
