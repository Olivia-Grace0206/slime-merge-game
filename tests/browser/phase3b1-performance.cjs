/* Real performance clock; independent from deterministic interaction fixtures. Same-value localStorage hot I/O. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process')
const dir=process.env.BROWSER_ARTIFACT_DIR||'docs/validation/phase3b1/performance-browser',key='slime-merge-normal-v2',checks=[],samples=[]
fs.mkdirSync(dir,{recursive:true})
async function run(){let server,browser
try{
 server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','5173','--strictPort',...(process.env.BROWSER_DIST?['--outDir',process.env.BROWSER_DIST]:[])])
 await new Promise((res,rej)=>{server.stdout.on('data',d=>{if(String(d).includes('Local:'))res()});server.on('exit',rej)})
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),p=await ctx.newPage();await p.goto('http://127.0.0.1:5173/slime-merge-game/')
 for(const count of [10,58,100,160]){
  const name=`${count} stock,16 Tier40 individuals with3 Lv99 traits,real localStorage and clock`
  const s=await p.evaluate(([key,count])=>{const now=Date.now(),s=JSON.parse(localStorage.getItem(key))||{version:6,goldFormat:'full',reducedEffects:true},a=[{id:'ice',level:99},{id:'nature',level:99},{id:'mutation',level:99}];Object.assign(s,{savedAtMs:now,sequence:0,nextId:17,researchLevel:16,researchMaxTier:40,goldCellUnlocked:false,goldFrequencyLevel:0,eventSequence:0,event:null,lastEvent:null,nextEventAtMs:now+60000,protectedIds:[],nature:{progressMs:0,updatedAtMs:now,totalGenerated:0},generationMode:'normal',focusedGenerated:0,wallet:{gold:1000000,upgrades:{speed:0,tap:0,storage:Math.ceil((count-10)/5)}},game:{bounds:{origin:{x:0,y:0},width:4,height:4},highestTierReached:40,revision:0,slimes:Array.from({length:16},(_,i)=>({id:`p-${i+1}`,tier:40,position:{x:i%4,y:Math.floor(i/4)},attributes:a}))},generator:{storedTiers:Array(count).fill(40),storedAttributes:Array.from({length:count},()=>a),progressMs:0,totalGenerated:count,updatedAtMs:now}});localStorage.setItem(key,JSON.stringify(s));return s},[key,count])
  const at=performance.now();await p.reload();await p.getByTestId('board').waitFor();assert.equal(await p.locator('.storage-error').count(),0);assert((await p.getByTestId('storage-count').innerText()).startsWith(String(count)+' /'))
  const reloadDriverMs=performance.now()-at
  const measured=await p.evaluate(k=>{const raw=localStorage.getItem(k),iterations=1000,measure=fn=>{const start=performance.now();for(let i=0;i<iterations;i++)fn();const elapsedMs=performance.now()-start;return{iterations,elapsedMs,meanMs:elapsedMs/iterations}};return{jsonUTF8Bytes:new TextEncoder().encode(raw).length,read:measure(()=>localStorage.getItem(k)),parse:measure(()=>JSON.parse(raw)),writeSameValue:measure(()=>localStorage.setItem(k,raw))}},key)
  assert(measured.jsonUTF8Bytes<100000);assert(measured.parse.elapsedMs>0,'real performance clock required');assert(measured.writeSameValue.elapsedMs>0);assert.equal(s.game.slimes.length,16)
  samples.push({count,capacity:10+s.wallet.upgrades.storage*5,reloadDriverMs,...measured});checks.push({name,result:'PASS'});console.log('PASS',name)
 }
 await ctx.close()
}finally{fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify({checks,samples,browser:browser?.version(),realDevices:false,limitations:'Hot same-value direct I/O, not disk flush or Web Locks latency. Reload includes driver/network. No fake clock. No hardware performance claim.'},null,2));await browser?.close();server?.kill()}}
run().catch(e=>{console.error(e);process.exitCode=1})
