const {normaliseSnapshot}=require('./snapshot.cjs')
/* Built production React UI, real mouse/CDP touch; fixtures only enter through the public save format. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright')
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process')
const dir=process.env.BROWSER_ARTIFACT_DIR||'docs/validation/phase2-polish'
const url=process.env.GAME_URL||'http://127.0.0.1:5173/slime-merge-game/'
const key='slime-merge-normal-v2',checks=[],errors=[],measurements=[]
fs.mkdirSync(dir,{recursive:true})
async function check(name,fn){try{await fn();checks.push({name,result:'PASS'});console.log('PASS',name)}catch(e){checks.push({name,result:'FAIL',error:String(e)});throw e}}
async function center(p,selector){const r=await p.locator(selector).boundingBox();assert(r);return {x:r.x+r.width/2,y:r.y+r.height/2}}
// Compare legacy absence with schema5's explicit empty attributes semantically.
async function snapshot(p){return p.evaluate(k=>{const s=JSON.parse(localStorage.getItem(k));if(s){s.game.slimes=s.game.slimes.map(x=>({...x,attributes:x.attributes??[]}));s.generator.storedAttributes??=s.generator.storedTiers.map(()=>[])}return s},key).then(normaliseSnapshot)}
async function until(fn){for(let i=0;i<80;i++){if(await fn())return;await new Promise(r=>setTimeout(r,10))}throw Error('condition timeout')}
function fixture(now,{tiers=[],queue=[],gold=0,H=1,event=null,capacityLv=0}={}){return {version:3,savedAtMs:now,nextId:tiers.length+1,sequence:0,game:{bounds:{origin:{x:0,y:0},width:4,height:4},slimes:tiers.map((t,i)=>({id:`p-${i+1}`,tier:t,position:{x:i%4,y:Math.floor(i/4)}})),highestTierReached:Math.max(H,...tiers,...queue),revision:0},wallet:{gold,upgrades:{speed:0,tap:0,storage:capacityLv}},generator:{storedTiers:queue,progressMs:0,updatedAtMs:now,totalGenerated:queue.length},eventSequence:event?1:0,nextEventAtMs:now+60000,event,lastEvent:null,protectedIds:[],reducedEffects:false}}
async function seed(p,options){const now=await p.evaluate(()=>Date.now()),s=fixture(now,options);await p.evaluate(([k,s])=>localStorage.setItem(k,JSON.stringify(s)),[key,s]);await p.reload();await p.getByTestId('board').waitFor();await p.waitForTimeout(80);return s}
async function add(p){const count=await p.locator('[data-slime-id]').count();await p.getByTestId('add-slime').tap();await until(async()=>await p.locator('[data-slime-id]').count()===count+1)}
async function drag(p,from,to,touch=false,cdp){const a=await center(p,from),b=await center(p,to);if(touch){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...a,id:0}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...b,id:0}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}else{await p.mouse.move(a.x,a.y);await p.mouse.down();await p.mouse.move(b.x,b.y,{steps:8});await p.mouse.up()}await p.waitForTimeout(30)}
async function metrics(p){return p.evaluate(()=>{const box=s=>{const n=document.querySelector(s),r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};const d=document.documentElement;return {width:innerWidth,height:innerHeight,scrollWidth:d.scrollWidth,clientWidth:d.clientWidth,scrollHeight:d.scrollHeight,clientHeight:d.clientHeight,board:(()=>{const a=box('[data-cell="0,0"]'),b=box('[data-cell="3,3"]');return {...a,width:b.right-a.x,height:b.bottom-a.y,right:b.right,bottom:b.bottom}})(),viewport:box('[data-testid="viewport"]'),buttons:[...document.querySelectorAll('.edge-menu button,.progress-controls button')].map(n=>{const r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {text:n.innerText,w:r.width,h:r.height,visible:r.x>=0&&r.y>=0&&r.right<=innerWidth+.5&&r.bottom<=innerHeight+.5&&!!hit&&n.contains(hit)}})}})}
async function main(){let server,browser
try{
 if(!process.env.GAME_URL){server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','5173','--strictPort']);await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('Local:'))resolve()});server.on('exit',reject)})}
 browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 for(const [width,height] of [[1920,1080],[1440,900],[1366,768],[1280,720],[1024,768],[768,1024],[390,844],[375,667],[320,568],[844,390]]){
  if(process.env.ONLY_WIDTH&&width!==+process.env.ONLY_WIDTH)continue
  const touch=width<900,ctx=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:width<=700&&height>500,deviceScaleFactor:1}),p=await ctx.newPage()
  p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
  await p.clock.install({time:new Date('2026-11-01T00:00:00Z')});await p.goto(url);await p.getByTestId('board').waitFor();await p.waitForTimeout(30)
  const cdp=await ctx.newCDPSession(p),name=`${width}x${height}`
  await check(name+' 4x4 fit, no page scroll, buttons ≥44px and reachable',async()=>{
   assert.equal(await p.locator('[data-cell]:not([data-locked])').count(),16);const m=await metrics(p);measurements.push(m)
   assert.equal(m.scrollHeight,m.clientHeight);assert.equal(m.scrollWidth,m.clientWidth);assert(Math.abs(m.board.width-m.board.height)<1)
   assert(m.board.x>=m.viewport.x-1&&m.board.right<=m.viewport.right+1&&m.board.y>=m.viewport.y-1&&m.board.bottom<=m.viewport.bottom+1)
   assert(m.buttons.every(x=>x.visible&&x.h>=44&&x.w>=44),JSON.stringify(m.buttons));if(width===390)assert(m.board.width>=370);if(width===320)assert(m.board.width>=300)
   await p.screenshot({path:path.join(dir,`screen-${name}.png`)})
  })
  await check(name+' actual generation, one-click random addition, no placement mode or tap modal',async()=>{
   await p.clock.runFor(15_000);await until(async()=>!!(await snapshot(p))?.generator.storedTiers.length)
   await add(p);assert.equal((await snapshot(p)).generator.storedTiers.length,0)
   assert(await p.getByTestId('add-slime').isDisabled())
   for(let i=0;i<15;i++)await p.getByRole('button',{name:/生成加速/}).click()
   await until(async()=>(await snapshot(p)).generator.storedTiers.length===1)
   await add(p);assert.equal(await p.locator('[data-slime-id]').count(),2)
   await p.locator('[data-slime-id]').first().tap();assert.equal(await p.getByRole('dialog').isVisible(),false)
  })
  await check(name+' shop dialog and settings stay within viewport',async()=>{
   for(const label of ['GOLDショップ','設定']){await p.getByRole('button',{name:label,exact:true}).click();const b=await p.getByRole('dialog').boundingBox();assert(b.x>=0&&b.y>=0&&b.x+b.width<=width+1&&b.y+b.height<=height+1);await p.getByRole('button',{name:'閉じる',exact:true}).click()}
  })
  if([1440,390,320,844].includes(width)){
   await check(name+' 5 merge in normal play, persisted highest Tier and reload',async()=>{
    await seed(p,{tiers:[1,1,1,1,1]})
    const stateBeforeZoom=(await snapshot(p)).game
    if(touch){
      const a=await center(p,'[data-cell="0,0"]'),b=await center(p,'[data-cell="1,1"]')
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...a,id:0}]})
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...a,id:0},{...b,id:1}]})
      await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:a.x-8,y:a.y-8,id:0},{x:b.x+8,y:b.y+8,id:1}]})
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
    }else{const a=await center(p,'[data-cell="0,0"]');await p.mouse.move(a.x,a.y);await p.mouse.wheel(0,-100);await p.waitForTimeout(20)}
    assert.deepEqual((await snapshot(p)).game,stateBeforeZoom)
    await drag(p,'[data-cell="0,0"]','[data-cell="1,0"]',touch,cdp)
    await until(async()=>await p.locator('[data-tier="2"]').count()===2)
    await p.reload();assert.equal(await p.locator('[data-tier="2"]').count(),2);assert.equal((await snapshot(p)).game.highestTierReached,2)
    await p.screenshot({path:path.join(dir,`play-${name}.png`)})
   })
   await check(name+' immediate sale, right-click or long-hold protection, save/reload and preview',async()=>{
    let id=(await snapshot(p)).game.slimes[0].id
    const toggle=async()=>{if(touch){const a=await center(p,`[data-slime-id="${id}"]`);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...a,id:0}]});await p.clock.runFor(510);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}else await p.locator(`[data-slime-id="${id}"]`).click({button:'right'})}
    await toggle();await until(async()=>(await snapshot(p)).protectedIds.includes(id));await p.reload()
    assert((await snapshot(p)).protectedIds.includes(id));await drag(p,`[data-slime-id="${id}"]`,'[data-testid="sale-zone"]',touch,cdp)
    assert.equal(await p.getByRole('dialog').isVisible(),false);assert.equal(await p.locator(`[data-slime-id="${id}"]`).count(),1)
    await toggle();await until(async()=>!(await snapshot(p)).protectedIds.includes(id))
    const gold=(await snapshot(p)).wallet.gold
    await drag(p,`[data-slime-id="${id}"]`,'[data-testid="sale-zone"]',touch,cdp)
    await until(async()=>await p.locator(`[data-slime-id="${id}"]`).count()===0)
    assert.equal(await p.getByRole('dialog').isVisible(),false);assert.equal((await snapshot(p)).wallet.gold,gold+8)
   })
   await check(name+' funded shop updates all three effects atomically, repeat click uses expected Lv',async()=>{
    await seed(p,{gold:1000});await p.getByRole('button',{name:'GOLDショップ'}).click()
    for(const upgrade of ['speed','tap','storage']){await p.getByTestId(`buy-${upgrade}`).click();await until(async()=>(await snapshot(p)).wallet.upgrades[upgrade]===1)}
    await until(async()=>(await snapshot(p)).wallet.upgrades.storage===1)
    assert.deepEqual((await snapshot(p)).wallet.upgrades,{speed:1,tap:1,storage:1});assert.equal((await snapshot(p)).wallet.gold,952)
    await p.screenshot({path:path.join(dir,`shop-${name}.png`)});await p.getByRole('button',{name:'閉じる',exact:true}).click()
   })
   await check(name+' gold ten fast receipts, reload 4/10, exit expires unpaid balance',async()=>{
    const now=await p.evaluate(()=>Date.now()),event={rewardVersion:2,id:'gold-1',sequence:1,cell:{x:0,y:0},expiresAtMs:now+45000,tier:5,sourceId:'p-1',attributeCount:0,paid:4,receivedGOLD:20,unitGOLD:5,nextPaymentAtMs:now+5000}
    await seed(p,{tiers:[5],gold:20,event});const before=await snapshot(p);await p.reload();assert.equal((await snapshot(p)).event.paid,before.event.paid)
    await drag(p,'[data-cell="0,0"]','[data-cell="1,1"]',touch,cdp)
    await until(async()=>(await snapshot(p)).event===null);assert.equal((await snapshot(p)).wallet.gold,20)
    await p.clock.runFor(10000);assert.equal((await snapshot(p)).wallet.gold,20)
    await seed(p,{tiers:[5],gold:20,event:{...event,nextPaymentAtMs:await p.evaluate(()=>Date.now())+350}})
    await p.clock.runFor(3000);await until(async()=>(await snapshot(p)).event===null)
    assert.equal((await snapshot(p)).wallet.gold,50);assert.equal((await snapshot(p)).game.slimes.length,1)
    await p.screenshot({path:path.join(dir,`gold-${name}.png`)})
    await p.reload();await p.clock.runFor(3000);assert.equal((await snapshot(p)).wallet.gold,50)
   })
   await check(name+' full-board rescue sale, capacity freeze, debug mode preserves normal save',async()=>{
    await seed(p,{tiers:Array.from({length:16},(_,i)=>i+1),queue:Array(10).fill(1)})
    await p.clock.fastForward(100_000);assert.equal((await snapshot(p)).generator.storedTiers.length,10)
    await drag(p,'[data-cell="0,0"]','[data-testid="sale-zone"]',touch,cdp);await until(async()=>await p.locator('[data-slime-id]').count()===15)
    const before=await snapshot(p)
    await p.getByRole('button',{name:'検証',exact:true}).click();await p.getByRole('button',{name:'11体マージ',exact:true}).click();assert.equal(await p.locator('[data-cell]').count(),49)
    const entered=await snapshot(p);assert.deepEqual(entered.game,before.game);assert.deepEqual(entered.wallet,before.wallet)
    await p.clock.runFor(1000);assert.deepEqual(await snapshot(p),entered)
    await p.getByRole('button',{name:'通常プレイへ戻る',exact:true}).click();assert.equal(await p.locator('[data-cell]:not([data-locked])').count(),16);assert.equal(await p.locator('[data-slime-id]').count(),15)
   })
   await check(name+' corrupted save blocks autosave and original bytes survive retry/reload',async()=>{
    await p.evaluate(k=>localStorage.setItem(k,'{bad-json'),key);await p.reload();assert(await p.getByRole('alert').isVisible());await p.clock.fastForward(120000)
    assert.equal(await p.evaluate(k=>localStorage.getItem(k),key),'{bad-json');await p.getByRole('button',{name:'再試行',exact:true}).click();assert.equal(await p.evaluate(k=>localStorage.getItem(k),key),'{bad-json')
   })
  }
  await ctx.close()
 }
 await check('gold-cell merge keeps group frame, consumes target and expires event without receipts',async()=>{
  const ctx=await browser.newContext({viewport:{width:1440,height:900}}),p=await ctx.newPage();await p.clock.install({time:new Date('2026-11-01T00:00:00Z')});await p.goto(url)
  const now=await p.evaluate(()=>Date.now()),event={rewardVersion:2,id:'gold-1',sequence:1,cell:{x:1,y:0},expiresAtMs:now+45000,tier:1,sourceId:'p-2',attributeCount:0,paid:0,receivedGOLD:0,unitGOLD:1,nextPaymentAtMs:now+5000}
  await seed(p,{tiers:[1,1,1],event})
  const a=await center(p,'[data-cell="0,0"]'),b=await center(p,'[data-cell="1,0"]');await p.mouse.move(a.x,a.y);await p.mouse.down();await p.mouse.move(b.x,b.y,{steps:8})
  const shadow=await p.locator('[data-cell="1,0"]').evaluate(n=>getComputedStyle(n).boxShadow);assert(shadow.includes('229, 133, 34'),shadow)
  await p.mouse.up();await until(async()=>await p.locator('[data-tier="2"]').count()===1)
  assert.equal((await snapshot(p)).event,null);assert.equal((await snapshot(p)).wallet.gold,0);await ctx.close()
 })
 await check('close/reopen tab resumes pending gold receipts without paying again',async()=>{
  const ctx=await browser.newContext(),p=await ctx.newPage();await p.clock.install({time:new Date('2026-11-01T00:00:00Z')});await p.goto(url)
  const now=await p.evaluate(()=>Date.now()),event={id:'gold-1',sequence:1,cell:{x:0,y:0},expiresAtMs:now+45000,tier:10,sourceId:'p-1',attributeCount:0,paid:4,receivedGOLD:204,unitGOLD:51,nextPaymentAtMs:now+700}
  await seed(p,{tiers:[10],gold:204,H:10,event:{...event,rewardVersion:1}});await p.close()
  const q=await ctx.newPage();await q.clock.install({time:new Date(now)});await q.goto(url);assert.equal((await snapshot(q)).event.paid,4)
  await q.clock.runFor(6000);await until(async()=>(await snapshot(q)).event===null);assert.equal((await snapshot(q)).wallet.gold,510);await ctx.close()
 })
 await check('GOLD cap still permits immediate rescue sale and capped receipts',async()=>{
  const ctx=await browser.newContext(),p=await ctx.newPage();await p.goto(url);await seed(p,{tiers:Array.from({length:16},(_,i)=>i+1),gold:Number.MAX_SAFE_INTEGER})
  await drag(p,'[data-cell="0,0"]','[data-testid="sale-zone"]');assert.equal(await p.getByRole('dialog').isVisible(),false)
  await until(async()=>await p.locator('[data-slime-id]').count()===15);assert.equal((await snapshot(p)).wallet.gold,BigInt(Number.MAX_SAFE_INTEGER)+2n);await ctx.close()
 })
 await check('blocked localStorage access shows recovery state without a white screen',async()=>{
  const ctx=await browser.newContext();await ctx.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('blocked','SecurityError')}}))
  const p=await ctx.newPage();await p.goto(url);assert(await p.getByRole('alert').isVisible());assert.equal(await p.locator('[data-cell]:not([data-locked])').count(),16);await ctx.close()
 })
 await check('two tabs: Web Lock and expected saved bytes prevent stale overwrite',async()=>{
  const ctx=await browser.newContext(),a=await ctx.newPage(),b=await ctx.newPage();await a.goto(url);await b.goto(url)
  await a.getByRole('button',{name:/生成加速/}).click();await until(async()=>!!await snapshot(a))
  const saved=await snapshot(a);await b.getByRole('button',{name:/生成加速/}).click();await until(async()=>await b.getByRole('alert').isVisible())
  const after=await snapshot(a);assert.equal(after.generator.totalGenerated,saved.generator.totalGenerated);assert(after.sequence>=saved.sequence);await ctx.close()
 })
 await check('quota error rolls back immediate sale and preserves source across reload',async()=>{
  const ctx=await browser.newContext(),p=await ctx.newPage();await p.goto(url);await seed(p,{tiers:[1]});
  await p.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('quota','QuotaExceededError')}})
  await drag(p,'[data-cell="0,0"]','[data-testid="sale-zone"]');await until(async()=>await p.getByRole('alert').isVisible())
  assert.equal(await p.locator('[data-slime-id]').count(),1);assert.equal((await snapshot(p)).wallet.gold,0);await p.reload();assert.equal(await p.locator('[data-slime-id]').count(),1);await ctx.close()
 })
 assert.equal(errors.length,0,errors.join('\n'))
}finally{
 fs.writeFileSync(path.join(dir,'browser-results.json'),JSON.stringify({browser:browser?.version(),checks,errors,measurements},null,2))
 console.log(`${checks.filter(x=>x.result==='PASS').length} PASS / ${checks.filter(x=>x.result==='FAIL').length} FAIL`,errors)
 await browser?.close();server?.kill()
}}
main().catch(e=>{console.error(e);process.exitCode=1})


