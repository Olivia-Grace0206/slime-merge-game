const {normaliseSnapshot}=require('./snapshot.cjs')
/* Production build only; persisted fixtures + actual mouse/native CDP touch input. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright')
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process')
const dir=process.env.BROWSER_ARTIFACT_DIR||'docs/validation/phase3b1/browser',key='slime-merge-normal-v2',checks=[],errors=[],measurements=[]
fs.mkdirSync(dir,{recursive:true})
const sizes=[[1920,1080],[1440,900],[1366,768],[1280,720],[1024,768],[768,1024],[390,844],[375,667],[320,568],[844,390]]
async function check(name,fn){try{await fn();checks.push({name,result:'PASS'});console.log('PASS',name)}catch(e){checks.push({name,result:'FAIL',error:String(e)});throw e}}
async function until(fn){for(let i=0;i<120;i++){if(await fn())return;await new Promise(r=>setTimeout(r,15))}throw Error('condition timeout')}
async function center(p,s){const b=await p.locator(s).boundingBox();assert(b);return{x:b.x+b.width/2,y:b.y+b.height/2}}
const snap=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),key).then(normaliseSnapshot)
function fixture(now,tiers=[1,2],attrs=[[],[]],cap=40){const caps=[5,10,15,20,25,29,30,31,32,33,34,35,36,37,38,39,40];return{version:5,savedAtMs:now,sequence:0,nextId:tiers.length+1,researchLevel:caps.indexOf(cap),researchMaxTier:cap,goldCellUnlocked:false,goldFrequencyLevel:0,goldFormat:'full',eventSequence:0,nextEventAtMs:now+60000,event:null,lastEvent:null,protectedIds:tiers.length?['p-1']:[],reducedEffects:true,game:{bounds:{origin:{x:0,y:0},width:4,height:4},highestTierReached:Math.max(1,...tiers),revision:0,slimes:tiers.map((tier,i)=>({id:`p-${i+1}`,tier,position:{x:i%4,y:Math.floor(i/4)},attributes:attrs[i]||[]}))},wallet:{gold:1234,upgrades:{speed:0,tap:0,storage:0}},generator:{storedTiers:[1,1],storedAttributes:[[{id:'ice',level:2}],[]],totalGenerated:2,progressMs:0,updatedAtMs:now}}}
async function pointer(p,cdp,touch,kind,a){if(touch)await cdp.send('Input.dispatchTouchEvent',{type:{down:'touchStart',move:'touchMove',up:'touchEnd',cancel:'touchCancel'}[kind],touchPoints:kind==='up'||kind==='cancel'?[]:[{...a,id:0}]});else if(kind==='down'){await p.mouse.move(a.x,a.y);await p.mouse.down()}else if(kind==='move')await p.mouse.move(a.x,a.y,{steps:3});else if(kind==='cancel'){await p.keyboard.press('Escape');await p.mouse.up()}else await p.mouse.up()}
async function drag(p,cdp,touch,from,to,preview){await pointer(p,cdp,touch,'down',await center(p,from));await pointer(p,cdp,touch,'move',await center(p,to));if(preview)await preview();await pointer(p,cdp,touch,'up')}
async function set(p,options={}){
 const now=await p.evaluate(()=>Date.now()),s=fixture(now,options.tiers||[],options.attrs||[])
 s.version=6;s.generationMode='normal';s.focusedGenerated=0;s.nature={progressMs:0,updatedAtMs:now,totalGenerated:0};s.protectedIds=[]
 Object.assign(s,options);delete s.tiers;delete s.attrs
 await p.evaluate(([k,s])=>localStorage.setItem(k,JSON.stringify(s)),[key,s]);await p.reload();await p.getByTestId('board').waitFor();await p.waitForTimeout(80);assert.equal(await p.locator('.storage-error').count(),0,'fixture must load without save error');return s
}
const performanceSamples=[]
async function run(){let server,browser
try{
 if(!process.env.GAME_URL){server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','5173','--strictPort']);await new Promise((res,rej)=>{server.stdout.on('data',d=>{if(String(d).includes('Local:'))res()});server.on('exit',rej)})}
 browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 const url=process.env.GAME_URL||'http://127.0.0.1:5173/slime-merge-game/'
 const ids=['fire','gold','dark','ice','lightning','nature','luck','mutation','light','magnet']
 for(const [width,height]of sizes){
  const name=`${width}x${height}`,touch=width<900,ctx=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:width<=700&&height>500}),p=await ctx.newPage(),cdp=await ctx.newCDPSession(p)
  p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
  await p.clock.setFixedTime(new Date('2026-11-01T12:10:00Z'));await p.goto(url)
  await p.evaluate(()=>document.fonts.ready)
  async function management(){const now=await p.evaluate(()=>Date.now());return set(p,{tiers:[8,2],attrs:[[{id:'fire',level:99},{id:'ice',level:99},{id:'mutation',level:99}],[{id:'gold',level:5},{id:'light',level:99},{id:'nature',level:5}]],protectedIds:['p-1'],wallet:{gold:1234,upgrades:{speed:0,tap:0,storage:30}},generator:{storedTiers:Array.from({length:127},(_,i)=>i%8+1),storedAttributes:Array.from({length:127},()=>[{id:'ice',level:2}]),progressMs:6000,updatedAtMs:now,totalGenerated:127}})}
  await check(name+' one-screen unchanged board, separate strip above sale,127/160 remains large and unclipped',async()=>{
   await management()
   const m=await p.evaluate(()=>{const box=n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}},strip=document.querySelector('[data-testid=strip-zone]'),sale=document.querySelector('[data-testid=sale-zone]'),count=document.querySelector('[data-testid=storage-count]'),range=document.createRange();range.selectNodeContents(count)
    const text=range.getBoundingClientRect(),panel=document.querySelector('.generator-panel').getBoundingClientRect()
    return{width:innerWidth,height:innerHeight,scroll:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],board:box(document.querySelector('[data-testid=board]')),strip:box(strip),sale:box(sale),stock:{...box(count),font:parseFloat(getComputedStyle(count).fontSize),textRight:text.right,panelRight:panel.right},hitStrip:strip.contains(document.elementFromPoint((strip.getBoundingClientRect().left+strip.getBoundingClientRect().right)/2,(strip.getBoundingClientRect().top+strip.getBoundingClientRect().bottom)/2)),hitSale:sale.contains(document.elementFromPoint((sale.getBoundingClientRect().left+sale.getBoundingClientRect().right)/2,(sale.getBoundingClientRect().top+sale.getBoundingClientRect().bottom)/2))}})
   assert.deepEqual(m.scroll,[width,height]);assert(Math.abs(m.board.w/2-[1010,830,698,650,624,752,374,359,304,334][sizes.findIndex(x=>x[0]===width)])<=1,JSON.stringify(m))
   assert(m.strip.bottom<=m.sale.y-2,'destinations must have a gap');for(const b of [m.strip,m.sale])assert(b.w>=44&&b.h>=44&&b.x>=0&&b.right<=width&&b.y>=0&&b.bottom<=height,JSON.stringify(b))
   assert(m.hitStrip&&m.hitSale);assert(m.stock.font>=17);assert(m.stock.textRight<=m.stock.panelRight+1,JSON.stringify(m.stock));assert((await p.getByTestId('storage-count').innerText()).includes('127 / 160'))
   measurements.push(m);await p.screenshot({path:path.join(dir,`management-${name}.png`)})
  })
  await check(name+' protected specimen strips all traits free and stays at exact original cell after reload',async()=>{
   const before=await snap(p),started=performance.now()
   await drag(p,cdp,touch,'[data-slime-id="p-1"]','[data-testid="strip-zone"]',async()=>{
    assert(await p.getByTestId('strip-preview').isVisible());assert((await p.getByTestId('strip-preview').innerText()).includes('無料'));assert((await p.getByTestId('strip-preview').innerText()).includes('炎Lv99'))
    assert.equal(await p.getByTestId('sale-price').count(),0);assert(await p.getByTestId('strip-zone').evaluate(n=>n.classList.contains('strip-hover')));assert.equal(await p.getByTestId('attribute-preview').count(),0)
    await p.screenshot({path:path.join(dir,`strip-${name}.png`)})
   });await until(async()=>(await snap(p)).game.revision===before.game.revision+1)
   const n=await snap(p);assert.deepEqual(n.game.slimes[0],{...before.game.slimes[0],attributes:[]});assert.deepEqual(n.game.slimes[1],before.game.slimes[1]);assert.deepEqual(n.protectedIds,before.protectedIds);assert.equal(n.wallet.gold,before.wallet.gold);assert.equal(n.game.highestTierReached,before.game.highestTierReached);assert.equal(n.nextId,before.nextId);assert.equal(n.generator.totalGenerated,before.generator.totalGenerated)
   performanceSamples.push({name,stripRoundTripMs:performance.now()-started});await p.reload();assert.deepEqual((await snap(p)).game,n.game)
  })
  await check(name+' un-attributed drop makes no save and exiting zone/cancel never deletes individual',async()=>{
   const raw=await p.evaluate(k=>localStorage.getItem(k),key)
   await drag(p,cdp,touch,'[data-slime-id="p-1"]','[data-testid="strip-zone"]',async()=>assert((await p.getByTestId('strip-preview').innerText()).includes('属性がありません')))
   await p.waitForTimeout(30);assert.equal(await p.evaluate(k=>localStorage.getItem(k),key),raw)
   await pointer(p,cdp,touch,'down',await center(p,'[data-slime-id="p-2"]'));await pointer(p,cdp,touch,'move',await center(p,'[data-testid="strip-zone"]'));assert(await p.getByTestId('strip-preview').isVisible())
   const empty=await center(p,'[data-cell="3,3"]');await pointer(p,cdp,touch,'move',empty);await until(async()=>await p.getByTestId('strip-preview').count()===0);await pointer(p,cdp,touch,'cancel')
   assert.equal(await p.evaluate(k=>localStorage.getItem(k),key),raw)
  })
  await check(name+' sale remains a separate destructive operation and price labels only show there',async()=>{
   await set(p,{tiers:[1,2],attrs:[[{id:'fire',level:1}],[{id:'ice',level:2}]]})
   await drag(p,cdp,touch,'[data-slime-id="p-1"]','[data-testid="sale-zone"]',async()=>{assert.equal(await p.getByTestId('strip-preview').count(),0);assert(await p.getByTestId('sale-price').count()>0)})
   await until(async()=>(await snap(p)).game.slimes.length===1);assert.equal((await snap(p)).wallet.gold,1237);assert.deepEqual((await snap(p)).game.slimes[0].attributes,[{id:'ice',level:2}])
  })
  await check(name+' keyboard-selected protected individual can strip without being sold',async()=>{
   await set(p,{tiers:[8],attrs:[[{id:'ice',level:2},{id:'nature',level:3}]],protectedIds:['p-1']})
   await p.locator('[data-slime-id="p-1"]').focus();await p.keyboard.press('Enter');await p.getByTestId('strip-zone').focus();await p.keyboard.press('Enter')
   await until(async()=>(await snap(p)).game.slimes[0].attributes.length===0);const s=await snap(p);assert.equal(s.game.slimes.length,1);assert.deepEqual(s.protectedIds,['p-1']);assert.equal(s.wallet.gold,1234);assert.deepEqual(s.game.slimes[0].position,{x:0,y:0})
  })
  await check(name+' SVG badges leave face/Tier visible, guide has all10 unowned traits and3 combos',async()=>{
   await management()
   const badges=await p.locator('[data-slime-id="p-1"] .attribute-badge').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect(),cell=n.closest('[data-slime-id]'),tier=cell.querySelector('.tier-pill').getBoundingClientRect(),face=cell.querySelector('.smile').getBoundingClientRect(),icon=n.querySelector('svg');return{id:n.dataset.attribute,icon:icon.dataset.attributeIcon,label:n.getAttribute('aria-label'),right:r.right,left:r.left,top:r.top,bottom:r.bottom,tierTop:tier.top,faceBottom:face.bottom,cell:cell.getBoundingClientRect().toJSON(),iconRect:icon.getBoundingClientRect().toJSON(),text:n.textContent}}))
   assert.equal(badges.length,3);for(const b of badges){assert.equal(b.id,b.icon);assert(b.label.includes('99'));assert(b.bottom<=b.tierTop+1&&b.top>=b.faceBottom-1,'face/Tier overlap');assert(b.left>=b.cell.left&&b.right<=b.cell.right,'badge outside cell');assert(!/[炎金闇氷雷葉幸変光磁]/.test(b.text),'badge must use the SVG, not one-character labels')}
   await p.getByRole('button',{name:'属性紹介',exact:true}).click();assert.equal(await p.locator('.attribute-card').count(),10)
   const overview=await p.getByTestId('attribute-introduction').evaluate(n=>({scroll:n.scrollHeight,client:n.clientHeight,width:n.scrollWidth,clientWidth:n.clientWidth}))
   assert(overview.scroll<=overview.client+1&&overview.width<=overview.clientWidth+1,'the 10-card introduction must fit without scrolling')
   await p.screenshot({path:path.join(dir,`guide-${name}.png`)})
   for(const id of ids){const card=p.getByTestId('guide-'+id);assert.equal(await card.locator('svg').getAttribute('data-attribute-icon'),id);await card.focus();await p.keyboard.press('Enter');const detail=await p.getByTestId('attribute-info-detail').innerText();assert(detail.includes('どんな効果？')&&detail.includes('Lvを上げると？')&&detail.includes('上限・注意点'));if(id==='dark')assert(detail.includes('20%/組'));if(id==='ice')assert(detail.includes('25%'));if(id==='lightning')assert(detail.includes('50%'));if(id==='nature')assert(detail.includes('40秒'));await p.locator('.attribute-back').first().click()}
   assert(await p.getByRole('dialog').evaluate(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight}))
   await p.getByTestId('attribute-roster-open').click();assert.equal(await p.locator('[data-testid="combination-guide"] article').count(),3);assert.equal(await p.locator('[data-testid="combination-guide"] svg').count(),6)
   await p.locator('.attribute-roster button').first().click();assert((await p.locator('.panel-body').innerText()).includes('炎Lv99・氷Lv99・変異Lv99'));assert(await p.locator('.panel-body > .attribute-tokens svg').count()===3)
   await p.screenshot({path:path.join(dir,`detail-${name}.png`)});await p.getByRole('button',{name:'閉じる',exact:true}).click()
  })
  await check(name+' FIFO head10 includes high Tier/attributed stock; remaining slot/trait survives reload',async()=>{
   const now=await p.evaluate(()=>Date.now()),s=fixture(now,[],[]);s.game.highestTierReached=8
   const tiers=[8,7,6,5,4,3,2,1,8,7,6],attrs=tiers.map((_,i)=>[{id:i===10?'mutation':'ice',level:i===10?9:2}])
   await set(p,{game:s.game,nextId:1,generationMode:'focused',wallet:{gold:1234,upgrades:{speed:0,tap:0,storage:1}},generator:{storedTiers:tiers,storedAttributes:attrs,totalGenerated:11,progressMs:0,updatedAtMs:now}})
   assert(!(await p.getByTestId('add-slime').isDisabled()));assert((await p.getByTestId('add-slime').innerText()).includes('10体→1体'));assert(!/安全素材/.test(await p.locator('body').innerText()));assert(!/Tier|次は/.test(await p.getByTestId('add-slime').innerText()))
   await p.evaluate(()=>Math.random=()=>.99);await p.getByTestId('add-slime').click();await until(async()=>(await snap(p)).focusedGenerated===1)
   const n=await snap(p);assert.deepEqual(n.generator.storedTiers,[6]);assert.deepEqual(n.generator.storedAttributes,[[{id:'mutation',level:9}]]);assert.equal(n.game.slimes.length,1);assert.equal(n.game.slimes[0].tier,1);assert.deepEqual(n.game.slimes[0].attributes,[]);assert.equal(n.game.highestTierReached,8)
   await p.reload();assert.deepEqual((await snap(p)).generator,n.generator);assert(await p.getByTestId('add-slime').isDisabled())
  })
  await check(name+' storageLv30/160 is independent of capped speed/tap16 and displays within shop',async()=>{
   const now=await p.evaluate(()=>Date.now());await set(p,{wallet:{gold:1000000,upgrades:{speed:16,tap:16,storage:29}},generator:{storedTiers:Array(127).fill(1),storedAttributes:Array.from({length:127},()=>[]),totalGenerated:127,progressMs:0,updatedAtMs:now}})
   await p.getByRole('button',{name:'GOLDショップ',exact:true}).click();assert(await p.getByTestId('buy-speed').isDisabled());assert(await p.getByTestId('buy-tap').isDisabled());await p.getByTestId('buy-storage').click();await until(async()=>(await snap(p)).wallet.upgrades.storage===30)
   assert(await p.getByTestId('buy-storage').isDisabled());assert.equal((await snap(p)).wallet.gold,1000000-Math.ceil(20*1.35**29));assert.equal((await snap(p)).version,8);assert.equal((await snap(p)).generator.storedTiers.length,127)
   await p.getByRole('button',{name:'閉じる',exact:true}).click();assert((await p.getByTestId('storage-count').innerText()).includes('127 / 160'))
   const times=await p.evaluate(k=>{const raw=localStorage.getItem(k),samples={read:[],parse:[],write:[]};for(let i=0;i<50;i++){let start=performance.now();const text=localStorage.getItem(k);samples.read.push(performance.now()-start);start=performance.now();JSON.parse(text);samples.parse.push(performance.now()-start);start=performance.now();localStorage.setItem(k,raw);samples.write.push(performance.now()-start)}return{jsonUTF8Bytes:new TextEncoder().encode(raw).length,hotSameJSON50ClockControlledNotUsedForPerformance: Object.fromEntries(Object.entries(samples).map(([key,a])=>[key,{meanMs:a.reduce((x,y)=>x+y,0)/a.length,maxMs:Math.max(...a)}]))}},key)
   performanceSamples.push({name,...times});await p.reload();assert.equal((await snap(p)).wallet.upgrades.storage,30)
  })
  if([1366,390].includes(width)){
   for(const cancel of ['Escape','pointercancel','pinch','blur','rotation'])await check(name+' '+cancel+' cancels strip preview and keeps original attributes/raw',async()=>{
    await management();const before=(await snap(p)).game,a=await center(p,'[data-slime-id="p-1"]'),b=await center(p,'[data-testid="strip-zone"]')
    await pointer(p,cdp,touch,'down',a);await pointer(p,cdp,touch,'move',b);assert(await p.getByTestId('strip-preview').isVisible())
    if(cancel==='Escape'){await p.keyboard.press('Escape');await pointer(p,cdp,touch,'up')}
    if(cancel==='pointercancel'){await p.getByTestId('viewport').dispatchEvent('pointercancel',{pointerId:touch?2:1,pointerType:touch?'touch':'mouse'});await pointer(p,cdp,touch,'cancel')}
    if(cancel==='pinch'){await pointer(p,cdp,touch,'cancel');await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...a,id:0}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...b,id:0}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...b,id:0},{x:a.x,y:a.y+5,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}
    if(cancel==='blur'){await p.evaluate(()=>window.dispatchEvent(new Event('blur')));await pointer(p,cdp,touch,'up')}
    if(cancel==='rotation'){await p.setViewportSize({width:height,height:width});await pointer(p,cdp,touch,'up');await p.setViewportSize({width,height});await p.waitForTimeout(80)}
    assert.deepEqual((await snap(p)).game,before);assert.equal(await p.getByTestId('strip-preview').count(),0)
   })
  }
  await ctx.close()
 }
 const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),p=await ctx.newPage(),cdp=await ctx.newCDPSession(p)
 p.on('pageerror',e=>errors.push(String(e)));await p.clock.setFixedTime(new Date('2026-11-01T12:10:00Z'));await p.goto(url)
 await check('390 GOLD4/10 contract remains frozen through free stripping, then old payment resumes once',async()=>{
  const now=await p.evaluate(()=>Date.now()),s=fixture(now,[5],[[{id:'fire',level:2}]]);s.version=6;s.generationMode='normal';s.focusedGenerated=0;s.nature={progressMs:0,totalGenerated:0,updatedAtMs:now};s.goldCellUnlocked=true;s.eventSequence=1;s.event={id:'gold-1',sequence:1,cell:{x:0,y:0},tier:5,sourceId:'p-1',attributeCount:1,unitGOLD:4,paid:4,receivedGOLD:16,cappedGOLD:0,expiresAtMs:now+45000,nextPaymentAtMs:now+10000,rewardVersion:2}
  await p.evaluate(([k,s])=>localStorage.setItem(k,JSON.stringify(s)),[key,s]);await p.reload();await p.waitForTimeout(80);await drag(p,cdp,true,'[data-slime-id="p-1"]','[data-testid="strip-zone"]');await until(async()=>(await snap(p)).game.slimes[0].attributes.length===0)
  assert.deepEqual((await snap(p)).event,s.event);assert.equal((await snap(p)).wallet.gold,1234);await p.reload();await p.clock.setFixedTime(new Date(now+10000));await until(async()=>(await snap(p)).event.paid===5);assert.equal((await snap(p)).wallet.gold,1238);assert.equal((await snap(p)).event.attributeCount,1)
 })
 await check('390 strip Quota and another-tab raw conflict keep original traits/position/wallet/clock',async()=>{
  await set(p,{tiers:[8],attrs:[[{id:'ice',level:2},{id:'nature',level:3}]],protectedIds:['p-1']});const raw=await p.evaluate(k=>localStorage.getItem(k),key),before=(await snap(p)).game
  await p.evaluate(()=>{Storage.prototype.setItem=()=>{throw Error('Quota')}});await drag(p,cdp,true,'[data-slime-id="p-1"]','[data-testid="strip-zone"]');await until(async()=>await p.locator('.storage-error').isVisible());assert.equal(await p.evaluate(k=>localStorage.getItem(k),key),raw);assert.deepEqual((await snap(p)).game,before);await p.reload()
  await p.evaluate(k=>{const s=JSON.parse(localStorage.getItem(k));s.wallet.gold+=1;localStorage.setItem(k,JSON.stringify(s))},key);const external=await p.evaluate(k=>localStorage.getItem(k),key)
  await drag(p,cdp,true,'[data-slime-id="p-1"]','[data-testid="strip-zone"]');await until(async()=>await p.locator('.storage-error').isVisible());assert.equal(await p.evaluate(k=>localStorage.getItem(k),key),external);assert.equal(await p.locator('[data-slime-id="p-1"] [data-attribute="ice"]').count(),1)
 })
 await ctx.close();assert.deepEqual(errors,[])
}finally{fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify({checks,errors,measurements,performanceSamples,browser:browser?.version(),realDevices:false},null,2));console.log(checks.length,checks.filter(c=>c.result==='FAIL'));await browser?.close();server?.kill()}}
run().catch(e=>{console.error(e);process.exitCode=1})
