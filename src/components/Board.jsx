import React, { useEffect, useMemo, useRef } from 'react'
import { useGame } from '../game/state'
import Sprite from './Sprite'
import { motion } from 'framer-motion'
import { useNet } from '../game/net'

export default function Board(){
  const { board, phase, tryDimensionAt, placeSummonAt, selectFrom, tryMove, tryAttack, turn } = useGame()
  const { mode, isOnlineTurnOwner, broadcast } = useNet()

  function tap(x,y){
    if(phase==='action'){
      if(tryDimensionAt(x,y)){ broadcast({type:'DIMENSION', x,y}); return }
      if(placeSummonAt(x,y)){ broadcast({type:'PLACE_SUMMON', x,y}); return }
    }
    selectFrom(x,y)
  }
  function moveTo(x,y){ if(tryMove(x,y)) broadcast({type:'MOVE', x,y}) }
  function attackTo(x,y){ if(tryAttack(x,y)) broadcast({type:'ATTACK', x,y}) }

  return (
    <div className="grid gap-1 p-1 rounded-xl bg-slate-900/70" style={{gridTemplateColumns:`repeat(${board[0].length}, minmax(0,1fr))`}}>
      {board.flat().map(cell => (
        <BoardCell key={`${cell.x}-${cell.y}-${cell.monster?.id || 'empty'}`}
          cell={cell} phase={phase}
          onTap={tap}
          onTryMove={moveTo}
          onTryAttack={attackTo}
          canInteract={mode!=='online' || isOnlineTurnOwner}
        />
      ))}
    </div>
  )
}

function BoardCell({cell, phase, onTap, onTryMove, onTryAttack, canInteract}){
  let bg = 'bg-slate-800'
  let border = 'border-slate-700'
  if(cell.type==='heart') bg = cell.owner===0? 'bg-rose-800' : 'bg-indigo-800'
  else if(cell.type==='path') bg = cell.owner===0? 'bg-rose-700/60' : 'bg-indigo-700/60'

  const spawnedRecently = !!cell.monster?.__spawnTick && (Date.now() - cell.monster.__spawnTick) < 500

  return (
    <button
      onClick={()=> canInteract && onTap(cell.x,cell.y)}
      className={`relative aspect-square ${bg} border ${border} flex items-center justify-center overflow-hidden ${canInteract?'active:scale-[.98]':''}`}
    >
      {/* Summon aura */}
      {spawnedRecently && <div className="absolute inset-0 ddm-aura" />}

      {cell.type==='heart' && (
        <div className="text-[10px] font-bold text-slate-100">{cell.owner===0? 'P1':'P2'} Heart</div>
      )}

      {cell.monster && (
        <motion.div
          initial={spawnedRecently ? { scale: 0.6, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="text-center text-slate-100"
        >
          <div className="leading-none"><Sprite kind={cell.monster.sprite||'magus'} size={24}/></div>
          <div className="text-[10px]">HP {cell.monster.hp}</div>
          <div className="text-[10px]">ATK {cell.monster.atk}</div>
        </motion.div>
      )}
    </button>
  )
}
