import React, { useEffect, useMemo, useState } from 'react'
import { searchCardImages } from '../services/ygo'

/** Simple rules (tweak freely or extend from PDF Items in advanced mode)
 * - Min 10, Max 15 monsters
 * - Min 3 Magic-like (we map to "Spell" in imported data), Max 5
 * - Min 2 Trap-like, Max 5
 * - Total 20–25
 */
const LIMITS = {
  monster: { min:10, max:15 },
  spell:   { min:3,  max:5  },
  trap:    { min:2,  max:5  },
  total:   { min:20, max:25 }
}

export default function DeckBuilder({ allCards, onClose }){
  const [query, setQuery] = useState('')
  const [deck, setDeck]   = useState(()=> JSON.parse(localStorage.getItem('ddm-deck-v1')||'{"cards":[]}').cards || [])

  const pool = useMemo(()=>{
    if(!query) return allCards
    const q = query.toLowerCase()
    return allCards.filter(c => c.name?.toLowerCase().includes(q) || (c.type||'').toLowerCase().includes(q))
  },[allCards, query])

  const counts = useMemo(()=>{
    const t = { monster:0, spell:0, trap:0, total:deck.length }
    for(const c of deck){
      const kind = normalizeKind(c)
      if (t[kind]!==undefined) t[kind]++
    }
    return t
  },[deck])

  function normalizeKind(card){
    const t = (card.type||'').toLowerCase()
    if (t.includes('trap')) return 'trap'
    if (t.includes('spell') || t.includes('magic')) return 'spell'
    return 'monster'
  }

  function canAdd(card){
    const kind = normalizeKind(card)
    const next = { ...counts, total:counts.total+1, [kind]:counts[kind]+1 }
    return next.total<=LIMITS.total.max && next[kind]<=LIMITS[kind].max
  }

  function addCard(card){
    if(!canAdd(card)) return
    setDeck(d => d.concat([card]))
  }
  function removeCard(idx){ setDeck(d => d.filter((_,i)=>i!==idx)) }

  function save(){
    localStorage.setItem('ddm-deck-v1', JSON.stringify({ cards: deck }))
    onClose?.()
  }

  const okToSave =
    counts.total>=LIMITS.total.min &&
    counts.monster>=LIMITS.monster.min &&
    counts.spell>=LIMITS.spell.min &&
    counts.trap>=LIMITS.trap.min

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 w-full max-w-6xl rounded-2xl shadow-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-bold">Deck Builder</div>
          <button onClick={onClose} className="px-3 py-1 rounded-lg bg-slate-700">Close</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-4">
          {/* Search + Pool */}
          <div>
            <input
              value={query}
              onChange={e=>setQuery(e.target.value)}
              placeholder="Search name/type..."
              className="w-full mb-2 px-3 py-2 rounded-lg bg-slate-800 outline-none"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[60vh] overflow-auto pr-1">
              {pool.map(c => <PoolCard key={c.id} card={c} onAdd={()=>addCard(c)} />)}
            </div>
          </div>

          {/* Deck column */}
          <div className="bg-slate-800 rounded-xl p-3">
            <div className="text-sm mb-2 font-semibold">Your Deck</div>
            <div className="text-xs mb-2">
              {counts.total}/{LIMITS.total.max} total • Monsters {counts.monster}/{LIMITS.monster.max} • Spells {counts.spell}/{LIMITS.spell.max} • Traps {counts.trap}/{LIMITS.trap.max}
            </div>
            <div className="max-h-[52vh] overflow-auto pr-1 space-y-2">
              {deck.map((c,i)=>(
                <div key={i} className="flex items-center justify-between bg-slate-900/70 rounded-lg p-2">
                  <div className="truncate">{c.name}</div>
                  <button onClick={()=>removeCard(i)} className="text-xs px-2 py-1 bg-rose-600 rounded-md">Remove</button>
                </div>
              ))}
              {deck.length===0 && <div className="opacity-70 text-sm">No cards yet. Add from the left.</div>}
            </div>
            <button
              onClick={save}
              disabled={!okToSave}
              className={`mt-3 w-full py-2 rounded-xl ${okToSave? 'bg-emerald-600':'bg-slate-700'} font-semibold`}
            >
              Save Deck
            </button>
            {!okToSave && (
              <div className="text-[12px] mt-2 opacity-80">
                Need: total ≥ {LIMITS.total.min}, monsters ≥ {LIMITS.monster.min}, spells ≥ {LIMITS.spell.min}, traps ≥ {LIMITS.trap.min}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function PoolCard({card, onAdd}){
  const [thumb, setThumb] = useState(null)
  useEffect(()=>{ (async()=>{
    const imgs = await searchCardImages(card.name, false)
    setThumb(imgs?.small || null)
  })() },[card.name])

  return (
    <div className="bg-slate-800 rounded-lg p-2">
      <div className="flex gap-2">
        {thumb
          ? <img src={thumb} alt="" className="w-12 h-16 rounded object-cover"/>
          : <div className="w-12 h-16 rounded bg-slate-700" />
        }
        <div className="text-sm leading-tight">
          <div className="font-semibold">{card.name}</div>
          <div className="text-xs opacity-80">★{card.stars||card.level||1} • ATK {card.atk} / DEF {card.def}</div>
          <div className="text-[11px] opacity-70 truncate">{(card.type||'').replaceAll('_',' ')}</div>
        </div>
      </div>
      <button onClick={onAdd} className="mt-2 w-full text-xs py-1 rounded-md bg-emerald-600">Add</button>
    </div>
  )
}
