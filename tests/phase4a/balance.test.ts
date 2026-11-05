/// <reference types="node" />
import { it, expect } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { freshSession, reduceSession, sessionRules, type Command } from '../../src/core/progression/session'
import { LAND_PRICE_CANDIDATES, unlockedCellCount } from '../../src/core/progression/land'
import { baseSaleValue, moneyJSON } from '../../src/core/progression/money'
import { saleValue } from '../../src/core/attributes/effects'
import { researchCost, RESEARCH_CAPS } from '../../src/core/progression/research'
import { upgradeCost } from '../../src/core/progression/economy'
import { emptyCells, tierWeights } from '../../src/core/progression/generation'
import { planDrop, compareNear } from '../../src/core/merge/plan'
import { encodeSession, decodeSession } from '../../src/core/progression/persistence'
const randomFrom=(seed:number)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
function simulate(candidate:keyof typeof LAND_PRICE_CANDIDATES,seed:number,shopFirst:boolean,enableGold=true){
 let s=freshSession(0),sales=0,saleGold=0n,rewardGold=0n,shopSpent=0n,full=0,steps=0,failed=0
 const random=randomFrom(seed),milestones:unknown[]=[],prices=LAND_PRICE_CANDIDATES[candidate]
 function cmd(c:Command,time:number){const prev=s;s=reduceSession(s,c,time,random);if(s===prev){failed++;return}
  const delta=s.wallet.gold-prev.wallet.gold
  if(c.type==='sell'){sales++;saleGold+=delta}else if(delta>0n)rewardGold+=delta
  if(['buy','research','gold-unlock','gold-frequency'].includes(c.type))shopSpent-=delta
 }
 const limit=6*3600000,dt=5000
 for(let now=dt;now<=limit;now+=dt){
  // Receipt timestamp service is explicit: never batch-credit past deadlines.
  while(s.event?.tier!==null&&s.event&&s.event.nextPaymentAtMs<=now)cmd({type:'tick'},Math.max(s.savedAtMs,s.event.nextPaymentAtMs))
  cmd({type:'tick'},now);cmd({type:'tap'},now);steps++;if(!emptyCells(s.game).length)full++
  const source=s.event?.sourceId,slimes=s.game.slimes.filter(x=>x.id!==source),capacity=unlockedCellCount(s.game.bounds)
  let acted=false
  if(s.event?.tier===null&&slimes.length){const best=[...slimes].sort((a,b)=>b.tier-a.tier)[0]!;cmd({type:'drop',plan:planDrop(s.game,best.id,s.event.cell,s.researchMaxTier)},now);acted=true}
  if(!acted){
   const tiers=[...new Set(slimes.map(x=>x.tier))].sort((a,b)=>b-a)
   for(const tier of tiers){const peers=slimes.filter(x=>x.tier===tier);if(peers.length<3||tier>=s.researchMaxTier)continue
    const p=planDrop(s.game,peers[0]!.id,peers[1]!.position,s.researchMaxTier)
    if(p.kind==='merge'&&(p.groups.some(g=>g.consumedIds.length===5)||s.game.slimes.length>=capacity-3||p.outputTier>s.game.highestTierReached)){cmd({type:'drop',plan:p},now);acted=true;break}
    if(p.kind!=='merge'){const near=[...emptyCells(s.game)].sort((a,b)=>compareNear(peers[1]!.position,a,b))[0]
     if(near&&Math.max(Math.abs(peers[0]!.position.x-peers[1]!.position.x),Math.abs(peers[0]!.position.y-peers[1]!.position.y))>1){cmd({type:'drop',plan:planDrop(s.game,peers[0]!.id,near,s.researchMaxTier)},now);acted=true;break}}
   }
  }
  if(!acted&&s.generator.storedTiers.length&&emptyCells(s.game).length)cmd({type:'withdraw',expectedId:s.nextId},now)
  if(slimes.length&&(now%30000===0||!emptyCells(s.game).length||s.game.highestTierReached>=s.researchMaxTier)){
   const blocked=s.game.highestTierReached>=s.researchMaxTier
   const duplicate=[...slimes].sort((a,b)=>b.tier-a.tier).find(x=>slimes.filter(y=>y.tier===x.tier).length>=3)
   const chosen=duplicate??(blocked?slimes.find(x=>x.tier===s.researchMaxTier):!emptyCells(s.game).length?[...slimes].sort((a,b)=>a.tier-b.tier)[0]:undefined)
   if(chosen)cmd({type:'sell',id:chosen.id},now)
  }
  const index=s.game.bounds.plots!.length-1,cost=prices[index]
  const purchase=()=>{if(cost===undefined||s.wallet.gold<cost)return
   // Candidate-only debit uses same production transaction. Restore delta immediately, so net cost is candidate.
   const old=s,defaultCost=([512n,8192n,131072n] as const)[index]!
   s={...s,wallet:{...s.wallet,gold:s.wallet.gold+defaultCost-cost}}
   const plot=index===0?'B':index===1?'C':'D'
   cmd({type:'land',plot,expectedCount:index+1},now)
   if(s.game.bounds.plots!.length!==old.game.bounds.plots!.length+1)throw Error('candidate purchase failed')
   milestones.push({cells:unlockedCellCount(s.game.bounds),atMs:now,H:s.game.highestTierReached,cost,sales,shopSpent,saleGold,rewardGold})
  }
  if(!shopFirst)purchase()
  if(s.researchLevel<RESEARCH_CAPS.length-1&&s.game.highestTierReached>=s.researchMaxTier&&s.wallet.gold>=researchCost(s.researchLevel))cmd({type:'research',expectedLevel:s.researchLevel},now)
  const reserve=shopFirst?0n:cost??0n
  for(const key of ['speed','tap','storage'] as const){const lv=s.wallet.upgrades[key];if(lv<(key==='storage'?2:shopFirst?8:3)&&s.wallet.gold>=upgradeCost(key,lv)+reserve)cmd({type:'buy',key,expectedLevel:lv},now)}
  if(enableGold&&!s.goldCellUnlocked&&s.wallet.gold>=128n+reserve)cmd({type:'gold-unlock'},now)
  if(shopFirst)purchase()
  if(now%300000===0){const loaded=decodeSession(encodeSession(s),now);expect(loaded.ok).toBe(true)}
  if(s.game.bounds.plots!.length===4)break
 }
 return{candidate,seed,policy:shopFirst?'production-first':'land-first',enableGold,milestones,durationMs:s.savedAtMs,highest:s.game.highestTierReached,cells:unlockedCellCount(s.game.bounds),sales,saleGold,rewardGold,shopSpent,endingGold:s.wallet.gold,generated:s.generator.totalGenerated,boardFullRatio:full/steps,storage:s.generator.storedTiers.length,capacity:sessionRules(s).capacity,failedCommands:failed}
}
it('compares three provisional land prices using seeded bounded actual Core play',()=>{
 const results=(['A','B','C'] as const).flatMap(c=>[12,61,210].flatMap(seed=>[false,true].map(shop=>simulate(c,seed,shop))))
 const withoutGold=[12,61,210].flatMap(seed=>[false,true].map(shop=>simulate('B',seed,shop,false)))
 const income=Array.from({length:10},(_,i)=>{const tier=i+1,p=baseSaleValue(tier);return{tier,base:p,sell3:p*3n,merge3:baseSaleValue(tier+1),sell5:p*5n,merge5:baseSaleValue(tier+1)*2n,fireGoldDarkLv1:saleValue({tier,attributes:[{id:'fire',level:1},{id:'gold',level:1},{id:'dark',level:1}]}),generationWeights:tierWeights(tier),salesForEachCandidate:Object.fromEntries(Object.entries(LAND_PRICE_CANDIDATES).map(([name,prices])=>[name,prices.map(price=>(price+p-1n)/p)]))}})
 const output={provisional:true,adopted:'B',prices:LAND_PRICE_CANDIDATES,model:'Actual Session Core with 8-neighbor spatial merges, bounds mask, FIFO stock/capacity15s generator, weighted discovered Tiers, research caps, traits/awakening, one 1s tap and one main decision/5s, exact350ms receipts, six-hour censor. Bot reorganizes one specimen near peers, retains gold source, sells duplicate every30s or to escape full/research cap. 3 fixed seeds and land/production-first purchasing policies. Candidate prices reprice the same atomic production land transaction; shops unchanged. Time is bot behavior, not player forecast. No offline production beyond capacity. WithoutGold B is matched disabled-unlock sensitivity, not all attribute/gold outcomes isolated.',income,results,withoutGold}
 mkdirSync('docs/validation/phase4a/economy',{recursive:true});writeFileSync('docs/validation/phase4a/economy/comparison.json',moneyJSON(output))
 expect(results).toHaveLength(18);expect(results.every(r=>r.cells>=16&&r.cells<=64)).toBe(true)
},240000)
