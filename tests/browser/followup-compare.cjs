/* Identical Tier2/4, stock10 and GOLD0 fixtures for the PR's before/after images. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright')
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process')
const dir='docs/validation/phase2-polish-followup/compare',checks=[],errors=[]
fs.mkdirSync(dir,{recursive:true})
async function main(){let browser,server
try{
 server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','5173','--strictPort']);await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('Local:'))resolve()});server.on('exit',reject)})
 browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 for(const [width,height] of [[1366,768],[390,844],[320,568]]){
  const ctx=await browser.newContext({viewport:{width,height},hasTouch:true}),p=await ctx.newPage();p.on('pageerror',e=>errors.push(String(e)))
  await p.goto('http://127.0.0.1:5173/slime-merge-game/')
  await p.evaluate(()=>{const now=Date.now();localStorage.setItem('slime-merge-normal-v2',JSON.stringify({version:3,savedAtMs:now,sequence:0,nextId:3,game:{bounds:{origin:{x:0,y:0},width:4,height:4},slimes:[{id:'p-1',tier:2,position:{x:0,y:0}},{id:'p-2',tier:4,position:{x:1,y:0}}],highestTierReached:4,revision:0},wallet:{gold:0,upgrades:{speed:0,tap:0,storage:0}},generator:{storedTiers:Array(10).fill(1),progressMs:0,updatedAtMs:now,totalGenerated:10},eventSequence:0,nextEventAtMs:now+60000,event:null,lastEvent:null,protectedIds:[],reducedEffects:true}))})
  await p.reload();await p.getByTestId('board').waitFor();assert.equal(await p.locator('[data-slime-id]').count(),2);assert.equal(await p.getByTestId('slime-trio').locator('g').count(),3);assert(!(await p.getByTestId('add-slime').isDisabled()));assert(!/Tier/.test(await p.getByTestId('add-slime').innerText()));assert.equal(await p.getByTestId('sale-price').count(),0)
  await p.screenshot({path:path.join(dir,`populated-${width}.png`)});checks.push({name:`${width} matching populated fixture, trio, no forecast or persistent prices`,result:'PASS'})
  if(width===320){await p.evaluate(()=>{const k='slime-merge-normal-v2',s=JSON.parse(localStorage.getItem(k));s.wallet.gold=Number.MAX_SAFE_INTEGER;localStorage.setItem(k,JSON.stringify(s))});await p.reload();await p.screenshot({path:path.join(dir,'max-gold-320.png')})}
  await ctx.close()
 }
 assert.deepEqual(errors,[])
}finally{fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify({checks,errors,browser:browser?.version()},null,2));console.log(checks.length,'PASS');await browser?.close();server?.kill()}}
main().catch(e=>{console.error(e);process.exitCode=1})
