import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useGame } from '../game/state'
import { useNet } from '../game/net'
import Sprite from './Sprite'
import { spriteUrlForCard } from '../services/ygo'

export default function Board() {
  const {
    board,
    phase,
    tryDimensionAt,
    placeSummonAt,
    selectFrom,
    tryMove,
    tryAttack,
  } = useGame()
  const { mode, isOnlineTurnOwner, sendAction, role } = useNet()

  // Emit only when online; offline just performs local action
  const emit = (action) => {
    if (mode === 'online') {
      sendAction({ ...action, role }).catch(() => {})
    }
  }

  const tap = (x, y) => {
    if (phase === 'action') {
      if (tryDimensionAt(x, y)) {
        emit({ type: 'DIMENSION', x, y })
        return
      }
      if (placeSummonAt(x, y)) {
        emit({ type: 'PLACE_SUMMON', x, y })
        return
      }
    }
    selectFrom(x, y)
  }

  const moveTo = (x, y) => {
    if (tryMove(x, y)) emit({ type: 'MOVE', x, y })
  }
  const attackTo = (x, y) => {
    if (tryAttack(x, y)) emit({ type: 'ATTACK', x, y })
  }

  const canInteract = mode !== 'online' || isOnlineTurnOwner

  return (
    <div
      className="grid gap-1 p-1 rounded-xl bg-slate-900/70 select-none"
      style={{
        gridTemplateColumns: `repeat(${board[0].length}, minmax(0,1fr))`,
      }}
    >
      {board.flat().map((cell) => (
        <BoardCell
          key={`${cell.x}-${cell.y}-${cell.monster?.id || 'empty'}`}
          cell={cell}
          phase={phase}
          onTap={tap}
          onTryMove={moveTo}
          onTryAttack={attackTo}
          canInteract={canInteract}
        />
      ))}
    </div>
  )
}

function BoardCell({ cell, phase, onTap, onTryMove, onTryAttack, canInteract }) {
  let bg = 'bg-slate-800'
  let border = 'border-slate-700'

  if (cell.type === 'heart')
    bg = cell.owner === 0 ? 'bg-rose-800' : 'bg-indigo-800'
  else if (cell.type === 'path')
    bg = cell.owner === 0 ? 'bg-rose-700/60' : 'bg-indigo-700/60'

  const spawnedRecently =
    !!cell.monster?.__spawnTick &&
    Date.now() - cell.monster.__spawnTick < 500

  // UX helpers: alt/option-click => move, right-click => attack
  const handleClick = (e) => {
    if (!canInteract) return
    if (e.altKey) {
      onTryMove(cell.x, cell.y)
      return
    }
    onTap(cell.x, cell.y)
  }
  const handleContext = (e) => {
    if (!canInteract) return
    e.preventDefault()
    onTryAttack(cell.x, cell.y)
  }

  const label =
    cell.type === 'heart'
      ? `${cell.owner === 0 ? 'P1' : 'P2'} Heart`
      : cell.type === 'path'
      ? `Path (${cell.owner === 0 ? 'P1' : 'P2'})`
      : 'Empty'

  // Pick best image or fallback sprite URL
  const boardImg =
    cell.monster?.boardIconUrl || cell.monster?.thumb || null

  const spriteKind = cell.monster?.sprite || 'magus'

  const spriteUrl = useMemo(() => {
    if (boardImg) return null
    if (cell.monster?.name || cell.monster?.type)
      return spriteUrlForCard(cell.monster.name, cell.monster.type)
    return null
  }, [cell.monster, boardImg])

  return (
    <button
      onClick={handleClick}
      onContextMenu={handleContext}
      aria-label={label}
      title={label}
      className={`relative aspect-square ${bg} border ${border} flex items-center justify-center overflow-hidden
        ${
          canInteract
            ? 'active:scale-[.98] focus:outline-none focus:ring-2 focus:ring-amber-400/60'
            : 'cursor-default opacity-95'
        }`}
    >
      {/* Summon aura */}
      {spawnedRecently && <div className="absolute inset-0 ddm-aura" />}

      {/* Heart cell */}
      {cell.type === 'heart' && (
        <div className="text-[10px] font-bold text-slate-100">
          {cell.owner === 0 ? 'P1' : 'P2'} Heart
        </div>
      )}

      {/* Monster cell */}
      {cell.monster && (
        <motion.div
          initial={spawnedRecently ? { scale: 0.6, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="text-center text-slate-100"
        >
          <div className="leading-none mb-0.5">
            {boardImg ? (
              <img
                src={boardImg}
                alt={cell.monster?.name || 'monster'}
                className="w-7 h-7 rounded object-cover shadow-sm pointer-events-none"
                draggable={false}
              />
            ) : spriteUrl ? (
              <img
                src={spriteUrl}
                alt={cell.monster?.name || 'icon'}
                className="w-6 h-6 opacity-90 pointer-events-none"
                draggable={false}
              />
            ) : (
              <Sprite kind={spriteKind} size={24} />
            )}
          </div>

          <div className="text-[10px] leading-tight">
            HP {cell.monster.hp}
          </div>
          <div className="text-[10px] leading-tight">
            ATK {cell.monster.atk}
          </div>
        </motion.div>
      )}
    </button>
  )
}
