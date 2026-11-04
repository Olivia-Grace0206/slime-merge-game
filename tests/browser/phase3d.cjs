/* Phase3D: real production rendering; fixtures are isolated from public/user saves. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright')
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process')
const dir=process.env.D_DIR||'docs/validation/phase3d/browser',key='slime-merge-normal-v2',checks=[],errors=[],metrics=[]
fs.mkdirSync(dir,{recursive:true})
async function check(name,fn){try{await fn();checks.push({name,result:'PASS'});console.log('PASS',name)}catch(e){checks.push({name,result:'FAIL',error:String(e)});throw e}}
async function until(fn){for(let i=0;i<120;i++){if(await fn())return;await new Promise(r=>setTimeout(r,15))}throw Error('condition timeout')}
async function center(p,s){const b=await p.locator(s).boundingBox();assert(b);return{x:b.x+b.width/2,y:b.y+b.height/2}}
const snap=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),key)
function fixture(now,tiers=[1,2],attrs=[[],[]],cap=40){const caps=[5,10,15,20,25,29,30,31,32,33,34,35,36,37,38,39,40];return{version:5,savedAtMs:now,sequence:0,nextId:tiers.length+1,researchLevel:caps.indexOf(cap),researchMaxTier:cap,goldCellUnlocked:false,goldFrequencyLevel:0,goldFormat:'full',eventSequence:0,nextEventAtMs:now+60000,event:null,lastEvent:null,protectedIds:tiers.length?['p-1']:[],reducedEffects:true,game:{bounds:{origin:{x:0,y:0},width:4,height:4},highestTierReached:Math.max(1,...tiers),revision:0,slimes:tiers.map((tier,i)=>({id:`p-${i+1}`,tier,position:{x:i%4,y:Math.floor(i/4)},attributes:attrs[i]||[]}))},wallet:{gold:1234,upgrades:{speed:0,tap:0,storage:0}},generator:{storedTiers:[1,1],storedAttributes:[[{id:'ice',level:2}],[]],totalGenerated:2,progressMs:0,updatedAtMs:now}}}
async function pointer(p,cdp,touch,kind,a){if(touch)await cdp.send('Input.dispatchTouchEvent',{type:{down:'touchStart',move:'touchMove',up:'touchEnd',cancel:'touchCancel'}[kind],touchPoints:kind==='up'||kind==='cancel'?[]:[{...a,id:0}]});else if(kind==='down'){await p.mouse.move(a.x,a.y);await p.mouse.down()}else if(kind==='move')await p.mouse.move(a.x,a.y,{steps:3});else if(kind==='cancel'){await p.keyboard.press('Escape');await p.mouse.up()}else await p.mouse.up()}
async function drag(p,cdp,touch,from,to,preview){await pointer(p,cdp,touch,'down',await center(p,from));await pointer(p,cdp,touch,'move',await center(p,to));if(preview&&await preview()===false)return;await pointer(p,cdp,touch,'up')}

async function run(){let server,browser
try{
 server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','5180','--strictPort',...(process.env.D_DIST?['--outDir',process.env.D_DIST]:[])])
 await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('Local:'))resolve()});server.on('exit',reject)})
 browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 for(const [width,height] of [[1366,768],[320,568]]){
 const ctx=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:width<500}),p=await ctx.newPage();p.on('pageerror',e=>errors.push(String(e)))
 await p.clock.install({time:new Date('2026-11-04T03:00:00Z')});await p.clock.pauseAt(new Date('2026-11-04T03:00:01Z'))
 await p.goto('http://127.0.0.1:5180/slime-merge-game/');await p.getByTestId('board').waitFor()
 const rows=['fire','ice','nature'].flatMap(id=>[[{id,level:1}],[{id,level:1,awakened:true}]]);rows.push(['fire','ice','nature'].map(id=>({id,level:1})),['fire','ice','nature'].map(id=>({id,level:1,awakened:true})))
 const now=await p.evaluate(()=>Date.now()),s=fixture(now,[...Array(8).fill(1),...Array(8).fill(40)],[...rows,...rows])
 Object.assign(s,{version:7,generationMode:'normal',focusedGenerated:0,nature:{progressMs:0,updatedAtMs:now,totalGenerated:0},protectedIds:[],reducedEffects:true,specials:{sequence:0,nextPurpleAtMs:now+300000,nextBlueAtMs:now+180000,events:[],lastAwakening:null}})
 await p.evaluate(([k,s])=>localStorage.setItem(k,JSON.stringify(s)),[key,s]);await p.reload();await p.getByTestId('board').waitFor();await p.waitForTimeout(50)
 await check(`${width}x${height} prototype: fire/ice/nature normal/awake and triple at Tier1/40`,async()=>{
 assert.equal(await p.locator('.storage-error').count(),0);assert.equal(await p.locator('[data-decoration]').count(),24)
 for(let i=0;i<16;i++){const art=p.locator(`[data-slime-id="p-${i+1}"] .slime-art`);assert.equal(await art.locator('[data-decoration]').count(),s.game.slimes[i].attributes.length);assert(await art.locator('.eyes').isVisible());assert(await art.locator('.tier-pill').isVisible())}
 assert.deepEqual(await p.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.scrollHeight]),[width,height]);await p.screenshot({path:path.join(dir,`prototype-${width}x${height}.png`)})
 const b=await p.getByTestId('board').boundingBox();metrics.push({width,height,board:b,fixture:s.game});assert.deepEqual((await snap(p)).game,s.game)
 });await ctx.close()
 }
 assert.deepEqual(errors,[])
}finally{fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify({checks,errors,metrics,browser:browser?.version(),realDevices:false},null,2));await browser?.close();server?.kill()}}
run().catch(e=>{console.error(e);process.exitCode=1})
