// Optional: rehost image through your Vercel domain to avoid hotlinking issues.
export default async function handler(req, res){
  const { url } = req.query || {}
  if(!url) return res.status(400).send('Missing url')
  try{
    const r = await fetch(url)
    if(!r.ok) return res.status(404).send('Not found')
    res.setHeader('Cache-Control','s-maxage=86400, stale-while-revalidate=43200')
    res.setHeader('Content-Type', r.headers.get('Content-Type')||'image/jpeg')
    const buf = Buffer.from(await r.arrayBuffer())
    res.status(200).send(buf)
  }catch(e){
    res.status(500).send('Error')
  }
}
