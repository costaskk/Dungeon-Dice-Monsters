import React from 'react'

export default function Sprite({ kind='magus', size=28 }) {
  const common = { width:size, height:size, viewBox:'0 0 24 24', className:'inline-block align-middle fill-current' }
  switch(kind){
    case 'magus': return (<svg {...common}><path d="M12 2l2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4zM5 22l7-5 7 5"/></svg>)
    case 'wyrm': return (<svg {...common}><path d="M3 12c3-6 9-6 12-3 2 2 2 6-1 8-2 2-5 2-8 1l-3 4 1-5c-1-2-1-4-1-5z"/></svg>)
    case 'golem': return (<svg {...common}><path d="M4 10l4-5h8l4 5v6l-4 3H8l-4-3v-6zM8 10h8M7 14h10"/></svg>)
    case 'ranger': return (<svg {...common}><path d="M2 12l10-9 10 9-4 0-6 7-6-7zM12 5v7"/></svg>)
    case 'phantom': return (<svg {...common}><path d="M12 3c4 0 7 3 7 7v7l-3-2-4 4-4-4-3 2v-7c0-4 3-7 7-7z"/></svg>)
    default: return (<svg {...common}><circle cx="12" cy="12" r="10"/></svg>)
  }
}
