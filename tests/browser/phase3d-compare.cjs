/* Byte-exact unattributed comparison against the frozen main build, all40 Tiers. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),{spawn}=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto')
const dir=process.env.D_DIR||'docs/validation/phase3d/compare',key='slime-merge-normal-v2',checks=[],samples=[];fs.mkdirSync(dir,{recursive:true})
const hash=b=>crypto.createHash('sha256').update(b).digest('hex')
async function server(port,dist){const s=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort','--outDir',dist]);await new Promise((yes,no)=>{s.stdout.on('data',d=>{if(String(d).includes('Local:'))yes()});s.on('exit',no)});return s}
async function seed(p,tiers,attributes){
 const s=await p.evaluate(()=>{const now=Date.now();return{version:7,savedAtMs:now,sequence:0,nextId:17,researchLevel:16,researchMaxTier:40,goldCellUnlocked:false,goldFrequencyLevel:0,goldFormat:'full',eventSequence:0,nextEventAtMs:now+60000,event:null,lastEvent:null,protectedIds:[],reducedEffects:true,generationMode:'normal',focusedGenerated:0,nature:{progressMs:0,updatedAtMs:now,totalGenerated:0},game:{bounds:{origin:{x:0,y:0},width:4,height:4},highestTierReached:40,revision:0,slimes:[]},wallet:{gold:1234,upgrades:{speed:0,tap:0,storage:0}},generator:{storedTiers:[1,1],storedAttributes:[[],[]],totalGenerated:2,progressMs:0,updatedAtMs:now},specials:{sequence:0,nextPurpleAtMs:now+300000,nextBlueAtMs:now+180000,events:[],lastAwakening:null}}})
 s.game.slimes=tiers.map((tier,i)=>({id:`p-${i+1}`,tier,position:{x:i%4,y:Math.floor(i/4)},attributes:attributes[i]||[]}));await p.evaluate(([k,s])=>localStorage.setItem(k,JSON.stringify(s)),[key,s]);await p.reload();await p.getByTestId('board').waitFor();await p.waitForTimeout(60);assert.equal(await p.locator('.storage-error').count(),0)
}
async function boardShot(p,file){
 if(!process.env.D_PHASE4A)return p.getByTestId('board').screenshot(file?{path:file}:{})
 const a=await p.locator('[data-cell="0,0"]').boundingBox(),b=await p.locator('[data-cell="3,3"]').boundingBox()
 return p.screenshot({...file?{path:file}:{},clip:{x:a.x,y:a.y,width:b.x+b.width-a.x,height:b.y+b.height-a.y}})
}
async function sameArt(pages){
 const snapshots=[]
 for(const p of pages)snapshots.push(await p.locator('[data-slime-id] .slime-art').evaluateAll(nodes=>nodes.map(n=>({html:n.outerHTML,rect:n.getBoundingClientRect().toJSON()}))))
 assert.equal(snapshots[0].length,snapshots[1].length)
 for(let i=0;i<snapshots[0].length;i++){assert.equal(snapshots[0][i].html,snapshots[1][i].html);for(const key of ['x','y','width','height'])assert(Math.abs(snapshots[0][i].rect[key]-snapshots[1][i].rect[key])<=.05,'art geometry '+key)}
}
async function run(){const servers=[];let b
try{
 servers.push(await server(5181,process.env.D_MAIN_DIST||'/tmp/slime3d-main-dist'),await server(5182,process.env.D_DIST||'dist'));b=await chromium.launch({headless:true,args:['--no-sandbox']})
 for(const [width,height]of [[1366,768],[320,568]]){
 const pages=[]
 for(const port of [5181,5182]){const ctx=await b.newContext({viewport:{width,height},hasTouch:true,isMobile:width<500}),p=await ctx.newPage();await p.clock.install({time:new Date('2026-11-04T03:00:00Z')});await p.clock.pauseAt(new Date('2026-11-04T03:00:01Z'));await p.goto(`http://127.0.0.1:${port}/slime-merge-game/`);await p.getByTestId('board').waitFor();pages.push(p)}
 for(let batch=0;batch<3;batch++){
 const tiers=Array.from({length:16},(_,i)=>Math.min(40,batch*16+i+1)),shots=[]
 for(const [i,p]of pages.entries()){await seed(p,tiers,Array.from({length:16},()=>[]));assert.equal(await p.locator('[data-decoration]').count(),0);shots.push(await boardShot(p,path.join(dir,`unattributed-${i?'after':'before'}-${width}x${height}-${batch}.png`)))}
 if(process.env.D_PHASE4A)await sameArt(pages);else assert.equal(hash(shots[0]),hash(shots[1]),'unattributed Tier body pixels changed');samples.push({width,height,tiers,sha256:hash(shots[0])});checks.push({name:`${width}x${height} batch${batch}: Tier${tiers[0]}-${tiers[15]} appearance invariants`,result:'PASS'})
 }
 const tiers=[...Array(4).fill(1),...Array(4).fill(21),...Array(4).fill(30),...Array(4).fill(40)],rows=tiers.map((_,i)=>['fire','gold','nature'].map((id,j)=>({id,level:1,awakened:j<i%4}))),shots=[]
 for(const [i,p]of pages.entries()){await seed(p,tiers,rows);shots.push(await boardShot(p));await p.screenshot({path:path.join(dir,`decorated-${i?'after':'before'}-${width}x${height}.png`)});assert.equal(await p.locator('[data-decoration]').count(),process.env.D_PHASE4A?48:i?48:0)}
 if(process.env.D_PHASE4A)await sameArt(pages);else assert.notEqual(hash(shots[0]),hash(shots[1]));checks.push({name:`${width}x${height} sameTier/sameattributes/sameawakening before/after appearance comparison`,result:'PASS'})
 for(const p of pages)await p.context().close()
 }
}finally{fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify({checks,samples,browser:b?.version(),realDevices:false},null,2));console.log(checks);await b?.close();servers.forEach(s=>s.kill())}}
run().catch(e=>{console.error(e);process.exitCode=1})
