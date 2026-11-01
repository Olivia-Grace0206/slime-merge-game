import { ATTRIBUTE_IDS, isAttributes, type AttributeId, type Attributes, type AwakeningAllocation } from '../../domain/attributes'
export const MAX_AWAKENINGS = 3
export const awakeningCount=(a:Attributes=[])=>a.filter(x=>x.awakened).length
export const awakeningCandidates=(a:Attributes=[])=>awakeningCount(a)<MAX_AWAKENINGS?a.filter(x=>!x.awakened):[]
/** Exact matching: retain maximum, concentrate first, then stable ID order. No randomness. */
export function allocateAwakenings(inputs:readonly Attributes[],outputs:readonly Attributes[]):AwakeningAllocation {
 if(inputs.some(a=>!isAttributes(a))||outputs.some(a=>!isAttributes(a))||outputs.length<1||outputs.length>2)throw new RangeError('Invalid awakening allocation')
 const counts=ATTRIBUTE_IDS.map(id=>inputs.reduce((n,a)=>n+a.filter(x=>x.id===id&&x.awakened).length,0))
 type Match={held:number;first:number;ids:AttributeId[][]}
 const memo=new Map<string,Match>()
 function solve(index:number,used:readonly number[]):Match{
  if(index===ATTRIBUTE_IDS.length)return{held:0,first:0,ids:outputs.map(()=>[])}
  const key=[index,...used].join(',');if(memo.has(key))return memo.get(key)!
  const id=ATTRIBUTE_IDS[index]!,count=counts[index]!;let best:Match|undefined
  for(const mask of outputs.length===2?[3,1,2,0]:[1,0]){
   const chosen=outputs.map((_,i)=>(mask>>i)&1),n=chosen.reduce((a,b)=>a+b,0)
   if(n>count||chosen.some((v,i)=>v&&(used[i]!>=MAX_AWAKENINGS||!outputs[i]!.some(a=>a.id===id))))continue
   const tail=solve(index+1,used.map((v,i)=>v+chosen[i]!))
   const candidate={held:tail.held+n,first:tail.first+chosen[0]!,ids:tail.ids.map((ids,i)=>chosen[i]?[id,...ids]:ids)}
   if(!best||candidate.held>best.held||(candidate.held===best.held&&candidate.first>best.first))best=candidate
  }
  memo.set(key,best!);return best!
 }
 const ids=solve(0,outputs.map(()=>0)).ids
 return{outputs:ids,surplus:ATTRIBUTE_IDS.flatMap((id,i)=>{const count=counts[i]!-ids.filter(a=>a.includes(id)).length;return count?[{id,count}]:[]})}
}
export function withAwakenings(attributes:Attributes,ids:readonly AttributeId[]):Attributes{
 return attributes.map(({id,level})=>({id,level,...(ids.includes(id)?{awakened:true}:{})}))
}
