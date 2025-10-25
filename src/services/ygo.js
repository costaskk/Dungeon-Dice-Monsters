// Returns { small, large } image URLs for a given card name.
// Uses the free YGOPRODeck API, with robust fallbacks for local dev.
const CACHE = new Map()
const isDev = typeof window !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')

async function fetchFromVercel(name){
  try{
    const res = await fetch(`/api/ygo-cardinfo?name=${encodeURIComponent(name)}`)
    if(!res.ok) return null
    const json = await res.json()
    return json?.card_images?.[0] || null
  }catch(_){ return null }
}

async function fetchDirect(name){
  // strict by name first
  const strictURL = `https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${encodeURIComponent(name)}`
  try{
    let r = await fetch(strictURL)
    if(r.ok){
      const data = await r.json()
      if(data?.data?.[0]?.card_images?.[0]) return data.data[0].card_images[0]
    }
  }catch(_){/* continue */}
  // fallback fuzzy search
  const fuzzyURL = `https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(name)}`
  try{
    let r = await fetch(fuzzyURL)
    if(r.ok){
      const data = await r.json()
      if(data?.data?.[0]?.card_images?.[0]) return data.data[0].card_images[0]
    }
  }catch(_){/* ignore */}
  return null
}

export async function searchCardImages(name, rehost=false){
  if(!name) return null
  const key = `imgs:${name}:${rehost?'1':'0'}:${isDev?'dev':'prod'}`
  if(CACHE.has(key)) return CACHE.get(key)

  // try serverless (Vercel) first, then direct
  let img = await fetchFromVercel(name)
  if(!img) img = await fetchDirect(name)
  if(!img) return null

  let small = img.image_url_small || img.image_url
  let large = img.image_url || img.image_url_small || small

  // rehost disabled during local dev to avoid missing /api routes
  if(rehost && !isDev){
    const wrap = url => url ? `/api/ygo-image?url=${encodeURIComponent(url)}` : null
    small = wrap(small)
    large = wrap(large)
  }

  const out = { small, large }
  CACHE.set(key, out)
  return out
}
