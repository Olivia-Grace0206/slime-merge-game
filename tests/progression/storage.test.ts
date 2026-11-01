import { describe, expect, it } from 'vitest'
import { freshSession, reduceSession, sessionRules } from '../../src/core/progression/session'
import { generationRules, legacyGenerationRules, purchaseUpgrade, upgradeCost, isWallet, isLegacyWallet, UPGRADE_MAX_LEVEL } from '../../src/core/progression/economy'
import { encodeSession, decodeSession, isSession } from '../../src/core/progression/persistence'
const quiet=()=>.99
const wallet=(storage=0,speed=0,tap=0)=>({gold:1_000_000,upgrades:{storage,speed,tap}})
describe('independent storage limits and compatible schema6',()=>{
 it.each([0,1,5,10,16,20,30])('storage Lv%i gives10+5/Lv, independent of speed/tap',lv=>{
  expect(generationRules(wallet(lv)).capacity).toBe(10+5*lv)
  expect(generationRules(wallet(lv)).intervalMs).toBe(15000);expect(generationRules(wallet(lv)).tapAdvanceMs).toBe(1000)
  expect(isWallet(wallet(lv))).toBe(true)
  if(lv<=16)expect(legacyGenerationRules(wallet(lv)).capacity).toBe(10+3*lv)
  else{expect(isLegacyWallet(wallet(lv))).toBe(false);expect(()=>legacyGenerationRules(wallet(lv))).toThrow()}
 })
 it.each(['speed','tap','storage'] as const)('%s purchase refuses at its own maximum and never charges on failure',key=>{
  const w={...wallet(),upgrades:{...wallet().upgrades,[key]:UPGRADE_MAX_LEVEL[key]}}
  expect(purchaseUpgrade(w,key)).toEqual({ok:false,wallet:w,cost:0})
  const beyond={...w,upgrades:{...w.upgrades,[key]:UPGRADE_MAX_LEVEL[key]+1}}
  expect(isWallet(beyond)).toBe(false);expect(()=>upgradeCost(key,UPGRADE_MAX_LEVEL[key]+1)).toThrow()
 })
 it('storage Lv29→30 is affordable at its own curve, not the old shared exponential',()=>{
  const s=freshSession(0),funded={...s,wallet:wallet(29)},cost=upgradeCost('storage',29),n=reduceSession(funded,{type:'buy',key:'storage',expectedLevel:29},0,quiet)
  expect(cost).toBe(Math.ceil(20*1.35**29));expect(cost).toBeLessThan(Math.ceil(20*1.7**29))
  expect(n.wallet.gold).toBe(funded.wallet.gold-cost);expect(n.wallet.upgrades.storage).toBe(30);expect(sessionRules(n).capacity).toBe(160)
  expect(reduceSession(n,{type:'buy',key:'storage',expectedLevel:29},0,quiet)).toBe(n)
  const poor={...funded,wallet:{...funded.wallet,gold:cost-1}};expect(reduceSession(poor,{type:'buy',key:'storage',expectedLevel:29},0,quiet)).toBe(poor)
 })
 it.each([0,1,5,10,16])('existing schema6 storage Lv%i keeps paid levels/FIFO/traits/GOLD and old progress',lv=>{
  const s=freshSession(0),tiers=Array(10+3*lv).fill(1),attrs=tiers.map((_,i)=>i%2?[{id:'fire',level:3}]:[]),data={...s,wallet:wallet(lv,3,4),generator:{...s.generator,storedTiers:tiers,storedAttributes:attrs,totalGenerated:tiers.length}}
  const d=decodeSession(JSON.stringify(data),0);expect(d.ok).toBe(true);if(!d.ok)throw Error(d.reason)
  expect(d.session.version).toBe(7);expect(d.migrated).toBe(false);expect(d.session.generator).toEqual(data.generator);expect(d.session.wallet).toEqual(data.wallet)
  expect(sessionRules(d.session).capacity).toBe(10+5*lv);expect(encodeSession(d.session)).toBe(JSON.stringify(data))
 })
 it.each([1,2,3,4,5])('legacy schema%i rejects storage Lv17 even if modern capacity could contain it',version=>{
  const s=freshSession(0),data={...s,version,wallet:wallet(17),generator:{...s.generator,storedTiers:[1],storedAttributes:[[]],totalGenerated:1}}
  expect(decodeSession(JSON.stringify(data),0).ok).toBe(false)
 })
 it.each([1,2,3,4,5])('legacy schema%i preserves full58 queue at Lv16 without deletion or re-roll',version=>{
  const s=freshSession(0),tiers=Array(58).fill(1),attrs=tiers.map(()=>[]),old={...s,version,wallet:wallet(16),generator:{...s.generator,storedTiers:tiers,storedAttributes:attrs,totalGenerated:58}}
  const d=decodeSession(JSON.stringify(old),0);expect(d.ok).toBe(true);if(!d.ok)throw Error(d.reason)
  expect(d.session.generator.storedTiers).toEqual(tiers);expect(d.session.generator.storedAttributes).toEqual(attrs);expect(d.session.wallet).toEqual(old.wallet);expect(sessionRules(d.session).capacity).toBe(90)
 })
 it('160 stock pauses both clocks, offline remains bounded, and mode consumes FIFO10 at large capacity',()=>{
  const s={...freshSession(0),wallet:wallet(30)},full=reduceSession(s,{type:'tick'},86400000,quiet)
  expect(full.generator.storedTiers).toHaveLength(160);expect(full.generator.progressMs).toBe(0);expect(full.nature.progressMs).toBe(0);expect(isSession(full)).toBe(true)
  const again=reduceSession(full,{type:'tick'},172800000,quiet);expect(again.generator.totalGenerated).toBe(160)
  const focus=reduceSession(again,{type:'generation-mode',value:'focused'},172800000,quiet),out=reduceSession(focus,{type:'withdraw',expectedId:1,expectedMode:'focused'},172800000,quiet)
  expect(out.generator.storedTiers).toEqual(focus.generator.storedTiers.slice(10));expect(out.generator.storedAttributes).toEqual(focus.generator.storedAttributes!.slice(10));expect(out.generator.storedTiers).toHaveLength(150)
  expect(out.focusedGenerated).toBe(1);expect(decodeSession(encodeSession(out),172800000).ok).toBe(true)
 })
})
