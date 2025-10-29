import React, { memo } from 'react'

/**
 * Map any imported/JSON card to a sprite "kind".
 * - Looks at card.type (e.g., "Dragon / Effect", "Spell Card", "Trap Card")
 * - Also checks race/archetype/name for heuristics
 * - Defaults to "magus"
 */
export function spriteForCard(card) {
  if (!card) return 'magus'
  const raw = `${card.type || ''} ${card.race || ''} ${card.archetype || ''} ${card.name || ''}`.toLowerCase()

  // Spells / Traps first
  if (raw.includes('trap')) return 'trap'
  if (raw.includes('spell') || raw.includes('magic')) return 'spell'

  // Common monster families
  if (raw.includes('dragon') || raw.includes('wyrm') || raw.includes('wyvern')) return 'wyrm'
  if (raw.includes('rock') || raw.includes('golem')) return 'golem'
  if (raw.includes('warrior') || raw.includes('soldier') || raw.includes('knight') || raw.includes('ranger')) return 'ranger'
  if (raw.includes('fiend') || raw.includes('phantom') || raw.includes('spirit') || raw.includes('demon')) return 'phantom'

  if (raw.includes('zombie')) return 'zombie'
  if (raw.includes('machine')) return 'machine'
  if (raw.includes('beast') || raw.includes('beast-warrior')) return 'beast'
  if (raw.includes('aqua') || raw.includes('sea serpent') || raw.includes('fish')) return 'aqua'
  if (raw.includes('pyro') || raw.includes('fire')) return 'pyro'
  if (raw.includes('thunder') || raw.includes('lightning')) return 'thunder'
  if (raw.includes('insect')) return 'insect'
  if (raw.includes('plant')) return 'plant'
  if (raw.includes('dinosaur')) return 'dino'
  if (raw.includes('reptile')) return 'reptile'
  if (raw.includes('winged beast') || raw.includes('harpie')) return 'winged'
  if (raw.includes('fairy') || raw.includes('angel')) return 'fairy'
  if (raw.includes('psychic')) return 'psychic'
  if (raw.includes('spellcaster') || raw.includes('mage') || raw.includes('wizard')) return 'magus'

  return 'magus'
}

/** Handy list of supported kinds (could drive filters/legends) */
export const SPRITE_KINDS = [
  'magus','wyrm','golem','ranger','phantom',
  'trap','spell','zombie','machine','beast','aqua','pyro','thunder',
  'insect','plant','dino','reptile','winged','fairy','psychic'
]

/** Human-readable label for accessibility / tooltips */
export function titleForKind(kind) {
  switch (kind) {
    case 'magus': return 'Spellcaster'
    case 'wyrm': return 'Dragon'
    case 'golem': return 'Rock/Golem'
    case 'ranger': return 'Warrior/Ranger'
    case 'phantom': return 'Fiend/Phantom'
    case 'trap': return 'Trap Card'
    case 'spell': return 'Spell/Magic Card'
    case 'zombie': return 'Zombie'
    case 'machine': return 'Machine'
    case 'beast': return 'Beast'
    case 'aqua': return 'Aqua/Sea Serpent'
    case 'pyro': return 'Pyro/Fire'
    case 'thunder': return 'Thunder/Lightning'
    case 'insect': return 'Insect'
    case 'plant': return 'Plant'
    case 'dino': return 'Dinosaur'
    case 'reptile': return 'Reptile'
    case 'winged': return 'Winged Beast'
    case 'fairy': return 'Fairy/Angel'
    case 'psychic': return 'Psychic'
    default: return 'Monster'
  }
}

/** Optional: suggested Tailwind text color per kind (nice for legends/UI) */
export function colorClassForKind(kind) {
  switch (kind) {
    case 'trap': return 'text-purple-400'
    case 'spell': return 'text-sky-400'
    case 'wyrm': return 'text-indigo-300'
    case 'golem': return 'text-stone-300'
    case 'ranger': return 'text-teal-300'
    case 'phantom': return 'text-rose-300'
    case 'zombie': return 'text-fuchsia-300'
    case 'machine': return 'text-zinc-300'
    case 'beast': return 'text-amber-300'
    case 'aqua': return 'text-cyan-300'
    case 'pyro': return 'text-orange-300'
    case 'thunder': return 'text-yellow-300'
    case 'insect': return 'text-lime-300'
    case 'plant': return 'text-emerald-300'
    case 'dino': return 'text-red-300'
    case 'reptile': return 'text-green-300'
    case 'winged': return 'text-sky-300'
    case 'fairy': return 'text-pink-300'
    case 'psychic': return 'text-violet-300'
    default: return 'text-slate-200'
  }
}

/**
 * Sprite
 * Props:
 *  - kind: one of SPRITE_KINDS (defaults to 'magus')
 *  - size: number (px) or string (e.g., '1.5rem'), default 28
 *  - stroke: number (svg strokeWidth), default 0 (filled)
 *  - className: tailwind classes; note we keep `fill-current`
 *  - title: accessible title (defaults to titleForKind(kind))
 *  - style: inline styles if you want
 */
function SpriteBase({ kind = 'magus', size = 28, stroke = 0, className = '', title, style }) {
  const w = typeof size === 'number' ? size : size || 28
  const common = {
    width: w,
    height: w,
    viewBox: '0 0 24 24',
    className: `inline-block align-middle fill-current ${className || ''}`,
    role: 'img',
    'aria-label': title || titleForKind(kind),
    style,
    stroke: 'currentColor',
    strokeWidth: stroke,
  }

  switch (kind) {
    // Core
    case 'magus':
      return (<svg {...common}><path d="M12 2l2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4zM5 22l7-5 7 5"/></svg>)
    case 'wyrm':
      return (<svg {...common}><path d="M3 12c3-6 9-6 12-3 2 2 2 6-1 8-2 2-5 2-8 1l-3 4 1-5c-1-2-1-4-1-5z"/></svg>)
    case 'golem':
      return (<svg {...common}><path d="M4 10l4-5h8l4 5v6l-4 3H8l-4-3v-6zM8 10h8M7 14h10"/></svg>)
    case 'ranger':
      return (<svg {...common}><path d="M2 12l10-9 10 9-4 0-6 7-6-7zM12 5v7"/></svg>)
    case 'phantom':
      return (<svg {...common}><path d="M12 3c4 0 7 3 7 7v7l-3-2-4 4-4-4-3 2v-7c0-4 3-7 7-7z"/></svg>)

    // Cards
    case 'trap':
      return (<svg {...common}><path d="M3 7h18v10H3zM6 10h12M8 13h8"/><circle cx="12" cy="9" r="1.2"/></svg>)
    case 'spell':
      return (<svg {...common}><path d="M12 2l2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4zM3 21l9-6 9 6"/></svg>)

    // Families
    case 'zombie':
      return (<svg {...common}><path d="M5 20l2-6 3-2 3 2 2 6M10 6a2 2 0 104 0 2 2 0 10-4 0"/></svg>)
    case 'machine':
      return (<svg {...common}><path d="M4 10h16v8H4zM8 6h8v4H8zM7 13h2M15 13h2"/></svg>)
    case 'beast':
      return (<svg {...common}><path d="M6 18l-2-6 4-4 4-1 4 1 4 4-2 6H6zM9 10l-1 2M15 10l1 2"/></svg>)
    case 'aqua':
      return (<svg {...common}><path d="M12 3c3 4 6 6 6 9a6 6 0 11-12 0c0-3 3-5 6-9z"/></svg>)
    case 'pyro':
      return (<svg {...common}><path d="M12 2c3 4 4 6 4 8a4 4 0 11-8 0c0-2 1-4 4-8zM8 16a4 4 0 108 0"/></svg>)
    case 'thunder':
      return (<svg {...common}><path d="M10 2L4 14h6l-2 8 8-12h-6l4-8z"/></svg>)
    case 'insect':
      return (<svg {...common}><path d="M12 6a3 3 0 013 3v6a3 3 0 11-6 0V9a3 3 0 013-3zM3 12h6M15 12h6"/></svg>)
    case 'plant':
      return (<svg {...common}><path d="M12 22V10c-4 0-6 2-8 6 3 0 5-1 8-3 3 2 5 3 8 3-2-4-4-6-8-6V2"/></svg>)
    case 'dino':
      return (<svg {...common}><path d="M3 17l2-6 6-5 7 2 3 4-3 5H3zM8 9l3 2"/></svg>)
    case 'reptile':
      return (<svg {...common}><path d="M4 14c3-5 7-7 12-7-2 3-2 5-1 7-3 2-6 3-11 0zM6 16c2 1 4 1 6 0"/></svg>)
    case 'winged':
      return (<svg {...common}><path d="M3 14l6-2 3-6 3 6 6 2-6 2-3 6-3-6-6-2z"/></svg>)
    case 'fairy':
      return (<svg {...common}><path d="M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z"/></svg>)
    case 'psychic':
      return (<svg {...common}><path d="M12 3a9 9 0 100 18 9 9 0 000-18zM8 12h8M12 8v8"/></svg>)

    default:
      return (<svg {...common}><circle cx="12" cy="12" r="10"/></svg>)
  }
}

const Sprite = memo(SpriteBase)
export default Sprite

/**
 * SpriteLegend
 * - Simple grid legend of all sprite kinds (great for help/rules modals)
 * Props:
 *  - kinds?: string[] (defaults to SPRITE_KINDS)
 *  - columns?: number (Tailwind grid-cols-N), default 4
 *  - iconSize?: number, default 22
 *  - dense?: boolean (smaller labels), default false
 *  - className?: string
 */
export function SpriteLegend({
  kinds = SPRITE_KINDS,
  columns = 4,
  iconSize = 22,
  dense = false,
  className = ''
}) {
  const gridClass = `grid grid-cols-2 sm:grid-cols-${columns} gap-2`
  return (
    <div className={className}>
      <div className={gridClass}>
        {kinds.map(k => (
          <div
            key={k}
            className="flex items-center gap-2 rounded-lg bg-slate-800/70 px-2 py-1 border border-slate-700"
            title={titleForKind(k)}
          >
            <span className={colorClassForKind(k)}>
              <Sprite kind={k} size={iconSize} />
            </span>
            <span className={`text-slate-200 ${dense ? 'text-xs' : 'text-sm'}`}>
              {titleForKind(k)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
