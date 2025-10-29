import React, { useEffect, useMemo, useRef } from 'react'

/**
 * <Dice rolling={boolean} result={rolledDice[i]} />
 * - Plays a short roll animation & sfx when `rolling` toggles true.
 * - Renders the given `result.face` (summon/black/crest/magic/trap).
 */
export default function Dice({ rolling = false, result }) {
  const dieRef = useRef(null)
  const audioRef = useRef(null)
  const face = result?.face

  useEffect(() => {
    if (rolling) {
      // visual
      dieRef.current?.classList.add('ddm-dice-roll')
      const t = setTimeout(() => dieRef.current?.classList.remove('ddm-dice-roll'), 900)

      // sfx (best-effort; browsers may block autoplay)
      const ensureAudio = () => {
        if (!audioRef.current) {
          try {
            audioRef.current = new Audio('/sfx/dice.mp3')
            audioRef.current.volume = 0.6
          } catch (_) {}
        }
      }
      ensureAudio()
      audioRef.current && audioRef.current.play().catch(() => {})

      return () => clearTimeout(t)
    }
  }, [rolling])

  const svg = useMemo(() => renderFace(face), [face])

  return (
    <div
      ref={dieRef}
      className="aspect-square rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shadow-inner select-none"
      aria-label={face ? `Dice: ${describeFace(face)}` : 'Dice'}
      role="img"
    >
      {svg}
    </div>
  )
}

function describeFace(face) {
  if (!face) return 'blank'
  if (face.type === 'summon') return `summon level ${face.level}`
  if (face.type === 'black') return 'wild black'
  if (face.type === 'crest') return `${face.crest} +${face.amt || 1}`
  if (face.type === 'magic') return `magic +${face.amt || 1}`
  if (face.type === 'trap') return `trap +${face.amt || 1}`
  return face.type
}

function renderFace(face) {
  if (!face) return <span className="text-slate-400 text-xs">?</span>

  switch (face.type) {
    case 'summon':
      return (
        <div className="text-center">
          <DieSummon level={face.level} />
          <div className="text-[10px] mt-1 text-slate-300">★{face.level}</div>
        </div>
      )
    case 'black':
      return <DieBlack />
    case 'crest':
      return <DieCrest crest={face.crest} amt={face.amt} />
    case 'magic':
      return <DieMagic amt={face.amt || 1} />
    case 'trap':
      return <DieTrap amt={face.amt || 1} />
    default:
      return <span className="text-slate-300 text-xs">{face.type}</span>
  }
}

function DieSummon({ level = 1 }) {
  return (
    <svg viewBox="0 0 48 48" className="w-10 h-10" aria-hidden>
      <defs>
        <radialGradient id="g1" cx="50%" cy="50%">
          <stop offset="0%" stopOpacity="1" stopColor="#93c5fd" />
          <stop offset="100%" stopOpacity="0" stopColor="#1e293b" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="22" fill="url(#g1)" />
      <text x="24" y="29" textAnchor="middle" fontSize="18" fill="white" fontWeight="700">
        ★{level}
      </text>
    </svg>
  )
}

function DieBlack() {
  return (
    <svg viewBox="0 0 48 48" className="w-10 h-10" aria-hidden>
      <rect x="6" y="6" width="36" height="36" rx="8" fill="#111827" stroke="#fde68a" strokeWidth="2" />
      <text x="24" y="29" textAnchor="middle" fontSize="16" fill="#fde68a" fontWeight="700">
        WILD
      </text>
    </svg>
  )
}

function DieCrest({ crest = 'move', amt = 1 }) {
  const label = crest === 'move' ? 'M' : crest === 'attack' ? 'A' : crest === 'defense' ? 'D' : 'S'
  return (
    <div className="text-center">
      <svg viewBox="0 0 48 48" className="w-10 h-10" aria-hidden>
        <circle cx="24" cy="24" r="20" fill="#0f172a" stroke="#94a3b8" strokeWidth="2" />
        <text x="24" y="29" textAnchor="middle" fontSize="18" fill="#e2e8f0" fontWeight="800">
          {label}
        </text>
      </svg>
      <div className="text-[10px] text-slate-300">+{amt}</div>
    </div>
  )
}

function DieMagic({ amt = 1 }) {
  return (
    <div className="text-center">
      <svg viewBox="0 0 48 48" className="w-10 h-10" aria-hidden>
        <circle cx="24" cy="24" r="20" fill="#0ea5e9" />
        <path d="M24 10l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="white" />
      </svg>
      <div className="text-[10px] text-slate-100">+{amt}</div>
    </div>
  )
}

function DieTrap({ amt = 1 }) {
  return (
    <div className="text-center">
      <svg viewBox="0 0 48 48" className="w-10 h-10" aria-hidden>
        <rect x="8" y="8" width="32" height="32" rx="6" fill="#7c3aed" />
        <path d="M16 30l8-12 8 12z" fill="white" />
      </svg>
      <div className="text-[10px] text-slate-100">+{amt}</div>
    </div>
  )
}
