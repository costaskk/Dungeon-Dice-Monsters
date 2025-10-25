export function rot([x,y], deg){
  const n = ((deg/90)%4+4)%4
  if(n===0) return [x,y]
  if(n===1) return [-y, x]
  if(n===2) return [-x,-y]
  return [ y,-x ]
}
export function neighbors(x,y){ return [[x+1,y],[x-1,y],[x,y+1],[x,y-1]] }
export function mulberry32(a){
  return function(){
    let t = a += 0x6D2B79F5
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}
