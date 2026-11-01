export type ClientPoint = Readonly<{clientX:number;clientY:number}>
export type DropRect = Readonly<{left:number;right:number;top:number;bottom:number}>
/** Shared by preview/commit. Overlap is refused instead of guessing a destructive operation. */
export function operationZoneAt(point:ClientPoint,zones:Readonly<{strip:DropRect|null|undefined;sale:DropRect|null|undefined}>):'strip'|'sale'|'ambiguous'|null {
  if(!Number.isFinite(point.clientX)||!Number.isFinite(point.clientY))return null
  const inside=(r:DropRect|null|undefined)=>!!r&&[r.left,r.right,r.top,r.bottom].every(Number.isFinite)&&r.right>r.left&&r.bottom>r.top&&point.clientX>=r.left&&point.clientX<r.right&&point.clientY>=r.top&&point.clientY<r.bottom
  const strip=inside(zones.strip),sale=inside(zones.sale)
  return strip&&sale?'ambiguous':strip?'strip':sale?'sale':null
}
