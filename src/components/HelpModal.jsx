import React, { useEffect } from 'react'
import { SpriteLegend } from './Sprite'

export default function HelpModal({ open, onClose }){
  // Close on ESC
  useEffect(()=>{
    if(!open) return
    const onKey = (e)=> { if(e.key==='Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return ()=> window.removeEventListener('keydown', onKey)
  },[open, onClose])

  if(!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onMouseDown={(e)=> {
        // click outside to close
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <div className="w-full max-w-3xl bg-slate-900/90 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <div className="text-lg font-bold text-slate-100">Help &amp; Rules</div>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-700 text-slate-100 hover:bg-slate-600 active:scale-95"
          >
            Close
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-5 text-slate-200">
          {/* Quick start */}
          <section>
            <h3 className="text-base font-semibold mb-1 text-slate-100">Quick Start</h3>
            <ul className="list-disc pl-5 text-sm space-y-1">
              <li><b>Hearts:</b> Each player has a Heart at their corner of the board. Reduce the opponent to 0 HP to win.</li>
              <li><b>Roll Phase:</b> Roll 3 dice. Crests (Move, Attack, Defense, Magic) are added to your crest pool.</li>
              <li><b>Action Phase:</b> Use crests to <b>Dimension</b> (place path), <b>Summon</b> a monster, <b>Move</b>, <b>Attack</b>, or <b>cast Magic/Trap</b>.</li>
              <li><b>Summoning:</b> Requires 2 matching Summon faces of the monster’s ★ level (or a Black “WILD” die).</li>
              <li><b>Damage:</b> Attacking a monster deals (ATK − DEF − Traps). Attacking the enemy Heart removes 1 HP.</li>
            </ul>
          </section>

          {/* Controls */}
          <section>
            <h3 className="text-base font-semibold mb-1 text-slate-100">Controls &amp; Shortcuts</h3>
            <ul className="list-disc pl-5 text-sm space-y-1">
              <li><b>Click</b> a tile to Dimension/Summon/Select.</li>
              <li><b>Alt/Option + Click</b> a tile to attempt a <b>Move</b>.</li>
              <li><b>Right-click</b> a tile to attempt an <b>Attack</b>.</li>
              <li>Use HUD buttons to <b>Roll</b>, <b>Cast Spell</b> (+2 ATK this turn), <b>Set Trap</b> (reduce next damage by 3), or <b>End Turn</b>.</li>
            </ul>
          </section>

          {/* Crest & Dice */}
          <section>
            <h3 className="text-base font-semibold mb-1 text-slate-100">Crests &amp; Dice</h3>
            <ul className="list-disc pl-5 text-sm space-y-1">
              <li><b>Move / Attack / Defense / Magic</b> crests are spent for actions (caps at 10 each).</li>
              <li><b>Summon faces</b> don’t go to the pool — they’re consumed when you Dimension/Summon this turn.</li>
              <li><b>Black (WILD)</b> counts as any Summon level for Dimension/Summon requirements.</li>
            </ul>
          </section>

          {/* Online play */}
          <section>
            <h3 className="text-base font-semibold mb-1 text-slate-100">Online Play</h3>
            <ol className="list-decimal pl-5 text-sm space-y-1">
              <li>From the landing screen, choose <b>Create Room</b> (Host) or enter a code to <b>Join</b> (Guest).</li>
              <li>Host and Guest share the same game state via Firebase; only the active player can take actions.</li>
              <li>If a move doesn’t reflect, refresh the page; your state re-subscribes automatically.</li>
            </ol>
          </section>

          {/* Sprite legend */}
          <section>
            <h3 className="text-base font-semibold mb-2 text-slate-100">Card Family Icons</h3>
            <SpriteLegend className="mt-1" columns={5} dense iconSize={20} />
          </section>

          {/* Tips */}
          <section>
            <h3 className="text-base font-semibold mb-1 text-slate-100">Tips</h3>
            <ul className="list-disc pl-5 text-sm space-y-1">
              <li>Hover a card in your hand to preview its artwork.</li>
              <li>Click a card once to select it; then click a friendly path tile to place the summon.</li>
              <li>Use <b>Rotate</b> in the HUD while Dimensioning to fit shapes better.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
