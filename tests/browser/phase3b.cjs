/* Production build only; persisted fixtures + actual mouse/native CDP touch input. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright')
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process')
const dir=process.env.BROWSER_ARTIFACT_DIR||'docs/validation/phase3b/browser',key='slime-merge-normal-v2',checks=[],errors=[],measurements=[]
fs.mkdirSync(dir,{recursive:true})
const sizes=[[1920,1080],[1440,900],[1366,768],[1280,720],[1024,768],[768,1024],[390,844],[375,667],[320,568],[844,390]]
async function check(name,fn){try{await fn();checks.push({name,result:'PASS'});console.log('PASS',name)}catch(e){checks.push({name,result:'FAIL',error:String(e)});throw e}}
async function until(fn){for(let i=0;i<120;i++){if(await fn())return;await new Promise(r=>setTimeout(r,15))}throw Error('condition timeout')}
async function center(p,s){const b=await p.locator(s).boundingBox();assert(b);return{x:b.x+b.width/2,y:b.y+b.height/2}}
const snap=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),key)
function fixture(now,tiers=[1,2],attrs=[[],[]],cap=40){const caps=[5,10,15,20,25,29,30,31,32,33,34,35,36,37,38,39,40];return{version:5,savedAtMs:now,sequence:0,nextId:tiers.length+1,researchLevel:caps.indexOf(cap),researchMaxTier:cap,goldCellUnlocked:false,goldFrequencyLevel:0,goldFormat:'full',eventSequence:0,nextEventAtMs:now+60000,event:null,lastEvent:null,protectedIds:tiers.length?['p-1']:[],reducedEffects:true,game:{bounds:{origin:{x:0,y:0},width:4,height:4},highestTierReached:Math.max(1,...tiers),revision:0,slimes:tiers.map((tier,i)=>({id:`p-${i+1}`,tier,position:{x:i%4,y:Math.floor(i/4)},attributes:attrs[i]||[]}))},wallet:{gold:1234,upgrades:{speed:0,tap:0,storage:0}},generator:{storedTiers:[1,1],storedAttributes:[[{id:'ice',level:2}],[]],totalGenerated:2,progressMs:0,updatedAtMs:now}}}
async function pointer(p,cdp,touch,kind,a){if(touch)await cdp.send('Input.dispatchTouchEvent',{type:{down:'touchStart',move:'touchMove',up:'touchEnd',cancel:'touchCancel'}[kind],touchPoints:kind==='up'||kind==='cancel'?[]:[{...a,id:0}]});else if(kind==='down'){await p.mouse.move(a.x,a.y);await p.mouse.down()}else if(kind==='move')await p.mouse.move(a.x,a.y,{steps:3});else if(kind==='cancel'){await p.keyboard.press('Escape');await p.mouse.up()}else await p.mouse.up()}
async function drag(p,cdp,touch,from,to,preview){await pointer(p,cdp,touch,'down',await center(p,from));await pointer(p,cdp,touch,'move',await center(p,to));if(preview)await preview();await pointer(p,cdp,touch,'up')}
async function set(p,options={}){
 const now=await p.evaluate(()=>Date.now()),s=fixture(now,options.tiers||[],options.attrs||[])
 s.version=6;s.generationMode='normal';s.focusedGenerated=0;s.nature={progressMs:0,updatedAtMs:now,totalGenerated:0};s.protectedIds=[]
 Object.assign(s,options)
 await p.evaluate(([k,s])=>localStorage.setItem(k,JSON.stringify(s)),[key,s]);await p.reload();await p.getByTestId('board').waitFor();await p.waitForTimeout(80);assert.equal(await p.locator('.storage-error').count(),0,'fixture must load without save error');return s
}
async function run(){let server,browser
try{
 if(!process.env.GAME_URL){server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','5173','--strictPort']);await new Promise((res,rej)=>{server.stdout.on('data',d=>{if(String(d).includes('Local:'))res()});server.on('exit',rej)})}
 browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 for(const [width,height]of sizes){
  const touch=width<900,name=`${width}x${height}`,ctx=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:width<=700&&height>500}),p=await ctx.newPage(),cdp=await ctx.newCDPSession(p)
  p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
  await p.clock.install({time:new Date('2026-11-01T04:00:00Z')});await p.goto(process.env.GAME_URL||'http://127.0.0.1:5173/slime-merge-game/')
  const fifoStock=()=>({storedTiers:Array(10).fill(1),storedAttributes:Array.from({length:10},()=>[]),totalGenerated:10,progressMs:0,updatedAtMs:1793505600000})
  await check(name+' normal/focus buttons reachable without shrinking board or page scroll',async()=>{
   const now=await p.evaluate(()=>Date.now()),generator={...fifoStock(),updatedAtMs:now};await set(p,{generator})
   const measure=await p.evaluate(()=>{const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}}
    return{width:innerWidth,height:innerHeight,scroll:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],board:rect('[data-testid=board]'),mode:rect('.mode-button'),tap:rect('.accelerate-button'),add:rect('.add-button')}})
   assert.deepEqual(measure.scroll,[width,height]);assert(Math.abs(measure.board.w-[1010,830,698,650,624,752,374,359,304,334][sizes.findIndex(x=>x[0]===width)])<=1,JSON.stringify(measure))
   for(const b of [measure.mode,measure.tap,measure.add])assert(b.w>=44&&b.h>=44&&b.x>=0&&b.y>=0&&b.right<=width&&b.bottom<=height,'control clipped/small '+JSON.stringify(b))
   measurements.push(measure);await p.getByTestId('generation-mode').click();await until(async()=>(await snap(p)).generationMode==='focused')
   assert((await p.getByTestId('add-slime').innerText()).includes('10体→1体'));assert.equal(await p.getByTestId('generation-mode').getAttribute('aria-pressed'),'true')
   await p.screenshot({path:path.join(dir,`mode-${name}.png`)})
  })
  await check(name+' mode toggle and reload keep10 materials; focus consumes exactly10 once',async()=>{
   assert.equal((await snap(p)).generator.storedTiers.length,10);await p.reload();assert.equal(await p.getByTestId('generation-mode').getAttribute('aria-pressed'),'true')
   await p.evaluate(()=>Math.random=()=>.99);await p.getByTestId('add-slime').click();await until(async()=>(await snap(p)).focusedGenerated===1)
   const s=await snap(p);assert.equal(s.generator.storedTiers.length,0);assert.equal(s.game.slimes.length,1);assert.equal(s.game.slimes[0].tier,1);assert.deepEqual(s.game.slimes[0].attributes,[]);assert(await p.getByTestId('add-slime').isDisabled());await p.reload();assert.equal((await snap(p)).focusedGenerated,1)
  })
  await check(name+' attributed/high Tier stock included and FIFO count enables the mode',async()=>{
   const now=await p.evaluate(()=>Date.now()),s=fixture(now,[5],[])
   await set(p,{game:s.game,nextId:s.nextId,generationMode:'focused',generator:{...fifoStock(),updatedAtMs:now,storedTiers:[5,...Array(9).fill(1)],storedAttributes:[[],[{id:'fire',level:1}],...Array.from({length:8},()=>[])]}})
   assert(!(await p.getByTestId('add-slime').isDisabled()));assert((await p.getByTestId('add-slime').innerText()).includes('貯蔵10体で使用可能'))
   const before=(await snap(p)).generator;await p.getByTestId('generation-mode').click();await until(async()=>(await snap(p)).generationMode==='normal');assert.deepEqual((await snap(p)).generator.storedTiers,before.storedTiers);assert.deepEqual((await snap(p)).generator.storedAttributes,before.storedAttributes)
  })
  await check(name+' full board rejects focus without spending FIFO stock',async()=>{
   const now=await p.evaluate(()=>Date.now());await set(p,{tiers:Array(16).fill(1),generationMode:'focused',generator:{...fifoStock(),updatedAtMs:now}})
   assert(await p.getByTestId('add-slime').isDisabled());assert.equal((await snap(p)).generator.storedTiers.length,10)
  })
  await check(name+' dark risk preview consumes no draw; group loss keeps both bodies/other attributes',async()=>{
   await set(p,{tiers:Array(5).fill(1),attrs:[[{id:'fire',level:1},{id:'gold',level:1},{id:'dark',level:1}],[],[],[],[]]})
   await p.evaluate(()=>{window.draws=0;Math.random=()=>{window.draws++;return 0}})
   await drag(p,cdp,touch,'[data-slime-id="p-1"]','[data-slime-id="p-2"]',async()=>{
    assert((await p.getByTestId('attribute-preview').innerText()).includes('闇のみ消失 仮20%'));assert.equal(await p.evaluate(()=>window.draws),0);assert(await p.getByTestId('dark-risk').evaluate(n=>{const a=n.getBoundingClientRect(),b=n.parentElement.getBoundingClientRect();return a.y>=b.y&&a.bottom<=b.bottom&&Number(getComputedStyle(n.parentElement).zIndex)>Number(getComputedStyle(document.querySelector('.drag-sprite')).zIndex)}),'risk must be unclipped above held sprite')
    await p.screenshot({path:path.join(dir,`dark-risk-${name}.png`)})
   });await until(async()=>(await snap(p)).game.highestTierReached===2)
   const s=await snap(p);assert.equal(s.game.slimes.length,2);for(const out of s.game.slimes)assert.deepEqual(out.attributes.map(a=>a.id),['fire','gold'])
   await p.reload();assert.deepEqual((await snap(p)).game,s.game)
  })
  await check(name+' actual sale quote and price tags include fire/gold/dark and equal receipt',async()=>{
   await set(p,{tiers:[5],attrs:[[{id:'fire',level:1},{id:'gold',level:1},{id:'dark',level:1}]]})
   // floor((32+ceil(32*.08))*1.15*2*1.05)=84
   await drag(p,cdp,touch,'[data-slime-id="p-1"]','[data-testid="sale-zone"]',async()=>{
    assert((await p.getByTestId('sale-zone').innerText()).includes('+84 GOLD'));assert((await p.getByTestId('sale-price').first().innerText()).includes('84'))
    await p.screenshot({path:path.join(dir,`sale-${name}.png`)})
   });await until(async()=>(await snap(p)).game.slimes.length===0);assert.equal((await snap(p)).wallet.gold,1318)
  })
  await check(name+' ice/lightning/luck/combo summaries and actual Lv effects are readable',async()=>{
   await set(p,{tiers:[1,1],attrs:[[{id:'ice',level:5},{id:'lightning',level:5}],[{id:'luck',level:5},{id:'mutation',level:5},{id:'light',level:5}]]})
   await p.getByRole('button',{name:'属性',exact:true}).click();assert((await p.getByTestId('support-summary').innerText()).includes('属性重視'))
   await p.locator('.attribute-roster button').first().click();const text=await p.locator('.effect-details').innerText();assert(text.includes('氷Lv5'));assert(text.includes('雷Lv5'));assert(text.includes('複合'))
   assert(await p.locator('.panel-body').evaluate(n=>{const r=n.getBoundingClientRect();return r.right<=innerWidth&&r.bottom<=innerHeight&&n.scrollWidth<=n.clientWidth+1}))
   await p.screenshot({path:path.join(dir,`effects-${name}.png`)});await p.getByRole('button',{name:'閉じる',exact:true}).click()
  })
  await check(name+' nature additional production is stored once and survives reload',async()=>{
   const now=await p.evaluate(()=>Date.now());await set(p,{tiers:[1],attrs:[[{id:'nature',level:1}]],generator:{storedTiers:[],storedAttributes:[],totalGenerated:0,progressMs:0,updatedAtMs:now},nature:{progressMs:179000,totalGenerated:0,updatedAtMs:now}})
   await p.clock.runFor(1000);await until(async()=>(await snap(p)).nature.totalGenerated===1)
   assert.equal((await snap(p)).generator.storedTiers.length,1);await p.reload();await p.clock.runFor(1000);assert.equal((await snap(p)).nature.totalGenerated,1)
  })
  await ctx.close()
 }
 await check('3merge risk label does not promise two outputs',async()=>{
  const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),p=await ctx.newPage(),cdp=await ctx.newCDPSession(p)
  await p.goto('http://127.0.0.1:5173/slime-merge-game/');await set(p,{tiers:[1,1,1],attrs:[[{id:'dark',level:1}],[],[]]})
  await drag(p,cdp,true,'[data-slime-id="p-1"]','[data-slime-id="p-2"]',async()=>{assert((await p.getByTestId('dark-risk').innerText()).includes('20%/組'));assert(!(await p.getByTestId('dark-risk').innerText()).includes('2出力'))})
  await until(async()=>(await snap(p)).game.highestTierReached===2);assert.equal((await snap(p)).game.slimes.length,1);await ctx.close()
 })
 await check('focus Quota preserves original materials/mode/UI; reload and native click execute once',async()=>{
  const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),p=await ctx.newPage();await p.clock.install({time:new Date('2026-11-01T04:00:00Z')});await p.goto('http://127.0.0.1:5173/slime-merge-game/')
  const now=await p.evaluate(()=>Date.now());await set(p,{generationMode:'focused',generator:{storedTiers:Array(10).fill(1),storedAttributes:Array.from({length:10},()=>[]),totalGenerated:10,progressMs:0,updatedAtMs:now}})
  const raw=await p.evaluate(k=>localStorage.getItem(k),key);await p.evaluate(()=>{Storage.prototype.setItem=()=>{throw Error('Quota')}})
  await p.getByTestId('add-slime').tap();await until(async()=>await p.locator('.storage-error').isVisible());assert.equal(await p.evaluate(k=>localStorage.getItem(k),key),raw);assert.equal(await p.locator('[data-slime-id]').count(),0);assert((await p.getByTestId('storage-count').innerText()).includes('10 / 10'));await p.reload();await p.getByTestId('add-slime').tap();await until(async()=>(await snap(p)).focusedGenerated===1);await ctx.close()
 })
 assert.deepEqual(errors,[])
}finally{fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify({checks,errors,measurements,browser:browser?.version()},null,2));console.log(checks.length,checks.filter(c=>c.result==='FAIL'));await browser?.close();server?.kill()}}
run().catch(e=>{console.error(e);process.exitCode=1})
