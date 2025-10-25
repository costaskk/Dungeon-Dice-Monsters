import React, { useEffect, useState } from 'react'
import { useGame } from '../game/state'
import { useNet } from '../game/net'
import Sprite from './Sprite'
import Dice from './dice/Dice'
import { searchCardImages } from '../services/ygo'

const CrestIcon = ({type, size=16}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className="inline fill-current">
    {type==='move' && <path d="M12 2l4 4h-3v6h-2V6H8l4-4zM12 22l-4-4h3v-6h2v6h3l-4 4z"/>}
    {type==='attack' && <path d="M2 21l9-3 9-9-6-6-9 9-3 9zm14-16l3 3"/>}
    {type==='defense' && <path d="M12 2l8 4v6c0 5-3.5 9.74-8 10-4.5-.26-8-5-8-10V6l8-4z"/>}
    {type==='summon' && <path d="M12 2v8M8 6h8M4 22h16M6 10l-2 12M18 10l2 12"/>}
    {type==='magic' && <path d="M12 2l2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4zM3 21l6-6"/>}
  </svg>
)

function CrestPill({type, val}) {
  return (
    <div className="px-2 py-1 rounded-full bg-slate-700 text-xs text-slate-100 flex items-center gap-1">
      <CrestIcon type={type} />
      <span className="capitalize">{type}</span>
      <b className="ml-1">{val}</b>
    </div>
  )
}

function Hearts({hp}){
  const MAX_HP = 3
  return (
    <div className="flex gap-1">
      {Array.from({length:MAX_HP}, (_,i)=> (
        <div key={i} className={`w-3 h-3 rounded-full ${i<hp? 'bg-rose-400':'bg-slate-600'}`}></div>
      ))}
    </div>
  )
}

function DieBadge({family='monster', rarity='normal'}){
  const fam = (family||'').toLowerCase()
  const rar = (rarity||'').toLowerCase()
  const bg =
    rar.includes('black') ? 'bg-yellow-500 text-black' :
    fam.includes('trap') ? 'bg-purple-500' :
    fam.includes('spell') || fam.includes('magic') ? 'bg-blue-500' :
    'bg-rose-500'
  const ring = rar.includes('ultra') || rar.includes('rare') ? 'ring-2 ring-amber-300' : 'ring-1 ring-slate-600'
  return <span className={`text-[10px] px-2 py-0.5 rounded-full text-white ${bg} ${ring}`}>{family}{rar.includes('black')? ' • Black':''}</span>
}

export default function HUD(){
  const {
    turn, phase, rolledDice, players, roll, endTurn,
    setOrientation, orientation, toggleRehost, rehostImages,
    castSpell, setTrap, magicBuffered,
    showCardModal, hideCardModal
  } = useGame()
  const { mode, isOnlineTurnOwner, broadcast } = useNet()
  const me = players[turn]
  const you = players[1-turn]
  const [rolling, setRolling] = useState(false)

  const summonLevels = (()=> {
    const counts = new Map()
    for(const r of rolledDice){
      if(r?.face?.type==='summon') counts.set(r.face.level,(counts.get(r.face.level)||0)+1)
      if(r?.face?.type==='black')  counts.set('WILD',(counts.get('WILD')||0)+1)
    }
    return Array.from(counts.entries()).filter(([lvl,c])=>c>=2 || lvl==='WILD').map(([lvl])=>lvl)
  })()

  async function onRoll(){
    setRolling(true)
    setTimeout(()=> setRolling(false), 900)
    roll()
  }

  const canAct = mode!=='online' || isOnlineTurnOwner

  return (
    <div className="flex flex-col gap-3 text-slate-200">
      <div className="rounded-2xl p-3 bg-slate-900/75 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="text-lg font-bold">{turn===0? 'Player 1':'Player 2'} Turn</div>
          <Hearts hp={you.hp} />
        </div>
        <div className="text-sm mt-1">
          {phase==='roll' ? 'Roll 3 dice'
           : phase==='action' ? 'Act (Dimension, Summon, Move/Attack, Magic/Trap)'
           : 'Game Over'}
        </div>

        <div className="mt-2 grid grid-cols-3 gap-2">
          {[0,1,2].map(i=> (
            <Dice key={i} rolling={rolling && phase==='roll'} result={rolledDice[i]} />
          ))}
        </div>

        {phase==='roll' && (
          <button
            onClick={onRoll}
            className="mt-2 w-full min-h-10 rounded-xl bg-emerald-600 text-slate-50 font-semibold active:scale-95"
            disabled={!canAct}
          >
            Roll 3 Dice
          </button>
        )}

        {phase==='action' && (
          <>
            {summonLevels.length>0 && (
              <div className="mt-2 text-xs">Summon available for: <b>{summonLevels.join(', ')}</b></div>
            )}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                onClick={()=>{ castSpell(); broadcast({type:'CAST_SPELL'}) }}
                className="min-h-9 rounded-lg bg-indigo-600 text-slate-50 font-semibold px-2 py-2 text-xs leading-tight break-words"
                disabled={me.crests.magic<=0 || !canAct}
                title="Cast Spell: +2 ATK to your monsters this turn (costs 1 Magic Crest)"
              >
                Cast Spell (+2 ATK, -1 Magic)
              </button>
              <button
                onClick={()=>{ setTrap(); broadcast({type:'SET_TRAP'}) }}
                className="min-h-9 rounded-lg bg-amber-600 text-slate-900 font-semibold px-2 py-2 text-xs leading-tight break-words"
                disabled={me.crests.magic<=0 || !canAct}
                title="Set Trap: reduce next damage to you by 3, once this turn (costs 1 Magic Crest)"
              >
                Set Trap (Reduce next dmg by 3)
              </button>
            </div>
            {magicBuffered>0 && <div className="text-xs mt-1">Active Spell: +2 ATK this turn</div>}
          </>
        )}

        {phase!=='gameover' && (
          <button
            onClick={()=>{ endTurn(); broadcast({type:'END_TURN'}) }}
            className="mt-2 w-full min-h-10 rounded-xl bg-slate-700 text-slate-100 font-semibold active:scale-95"
            disabled={!canAct}
          >
            End Turn
          </button>
        )}

        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs">Rotate (for dimension placement)</span>
          <div className="flex gap-2">
            {[0,90,180,270].map(d=>(
              <button key={d} onClick={()=>setOrientation(d)} className={`px-2 py-1 rounded-md ${orientation===d? 'bg-amber-600 text-slate-900 font-semibold':'bg-slate-700'}`}>{d}°</button>
            ))}
          </div>
        </div>

        {/* Rehost toggle */}
        <div className="mt-2 flex items-center justify-between text-xs">
          <span>Rehost images via your domain</span>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <span className="min-w-[2ch] text-right">{rehostImages? 'On':'Off'}</span>
            <input type="checkbox" checked={rehostImages} onChange={toggleRehost}/>
          </label>
        </div>
      </div>

      <div className="bg-slate-900/75 rounded-2xl p-3 shadow-lg">
        <div className="text-sm font-semibold mb-2">Crests</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {['move','attack','defense','summon','magic'].map(k=> (
            <CrestPill key={k} type={k} val={me.crests[k]||0} />
          ))}
        </div>
      </div>

      <div className="bg-slate-900/75 rounded-2xl p-3 shadow-lg">
        <div className="text-sm font-semibold mb-2">Summon</div>
        <div className="text-xs mb-2">
          1) Dimension with ★★ (same level) or WILD from this roll. 2) Hover a card to preview; tap a card, then tap a friendly path to place.
        </div>
        <div className="grid grid-cols-1 gap-2">
          {me.hand.length===0 && <div className="text-sm opacity-80">No monsters in hand.</div>}
          {me.hand.map(m => <SummonCard key={m.id} m={m} showCardModal={showCardModal} hideCardModal={hideCardModal} />)}
        </div>
      </div>

      {/* Compact sticky HUD for phones */}
      <div className="fixed bottom-2 left-0 right-0 px-3 md:hidden">
        <div className="mx-auto max-w-md rounded-2xl bg-slate-900/95 backdrop-blur p-2 shadow-xl flex items-center justify-between text-xs">
          <div>Turn: <b>{turn+1}</b></div>
          <div className="flex gap-2 items-center">
            {['move','attack','defense','summon'].map(k=> (
              <div key={k} className="px-2 py-1 rounded-full bg-slate-700">{k[0].toUpperCase()}: {me.crests[k]||0}</div>
            ))}
          </div>
          <button onClick={()=>window.scrollTo({top:0,behavior:'smooth'})} className="px-2 py-1 rounded-md bg-slate-700">Top</button>
        </div>
      </div>
    </div>
  )
}

function SummonCard({m, showCardModal, hideCardModal}){
  const [thumb, setThumb] = useState(null)
  const [large, setLarge] = useState(null)
  const { rehostImages } = useGame()

  useEffect(()=>{
    let alive = true
    ;(async()=>{
      const imgs = await searchCardImages(m.name, rehostImages)
      if(!alive) return
      setThumb(imgs?.small || null)
      setLarge(imgs?.large || imgs?.small || null)
    })()
    return ()=>{ alive=false }
  },[m.name, rehostImages])

  const open = () => {
    showCardModal(
      { ...m, thumb:large||thumb, large:large||thumb },
      m.id
    )
  }
  const closeSoon = () => {
    hideCardModal(m.id, 100)
  }

  const fam = (m.type||'').toLowerCase().includes('trap') ? 'trap'
    : (m.type||'').toLowerCase().includes('spell') || (m.type||'').toLowerCase().includes('magic') ? 'spell'
    : 'monster'

  return (
    <div
      className="w-full text-left bg-slate-800/90 rounded-xl p-3 hover:bg-slate-700/90"
      onPointerEnter={open}
      onPointerLeave={closeSoon}
      onClick={open}
    >
      <div className="flex items-center justify-between">
        <div className="font-semibold flex items-center gap-2 text-slate-50">
          {thumb ? <img src={thumb} alt="thumb" className="w-8 h-12 object-cover rounded"/> : <Sprite kind={m.sprite||'magus'} />}
          <span className="leading-tight">{m.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <DieBadge family={fam} rarity={m.rarity||''} />
          <div className="text-xs text-slate-200">★{m.stars||1}</div>
        </div>
      </div>
      <div className="mt-1 text-xs text-slate-200">ATK {m.atk} • DEF {m.def}</div>
      {m.effect?.text && <div className="mt-2 text-[12px] text-slate-300 italic line-clamp-3">{m.effect.text}</div>}
    </div>
  )
}
