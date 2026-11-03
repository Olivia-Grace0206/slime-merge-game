/* Built production React UI, real mouse/CDP touch; fixtures only enter through the public save format. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright')
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process')
const dir=process.env.BROWSER_ARTIFACT_DIR||'docs/validation/phase2-polish/input'
const url=process.env.GAME_URL||'http://127.0.0.1:5173/slime-merge-game/'
const key='slime-merge-normal-v2',checks=[],errors=[]
fs.mkdirSync(dir,{recursive:true})
async function check(name,fn){try{await fn();checks.push({name,result:'PASS'});console.log('PASS',name)}catch(e){checks.push({name,result:'FAIL',error:String(e)});throw e}}
async function center(p,selector){const r=await p.locator(selector).boundingBox();assert(r);return {x:r.x+r.width/2,y:r.y+r.height/2}}
// Compare legacy absence with schema5's explicit empty attributes semantically.
async function snapshot(p){return p.evaluate(k=>{const s=JSON.parse(localStorage.getItem(k));if(s){s.game.slimes=s.game.slimes.map(x=>({...x,attributes:x.attributes??[]}));s.generator.storedAttributes??=s.generator.storedTiers.map(()=>[])}return s},key)}
async function until(fn){for(let i=0;i<80;i++){if(await fn())return;await new Promise(r=>setTimeout(r,10))}throw Error('condition timeout')}
function fixture(now,{tiers=[],queue=[],gold=0,H=1,event=null,capacityLv=0}={}){return {version:3,savedAtMs:now,nextId:tiers.length+1,sequence:0,game:{bounds:{origin:{x:0,y:0},width:4,height:4},slimes:tiers.map((t,i)=>({id:`p-${i+1}`,tier:t,position:{x:i%4,y:Math.floor(i/4)}})),highestTierReached:Math.max(H,...tiers,...queue),revision:0},wallet:{gold,upgrades:{speed:0,tap:0,storage:capacityLv}},generator:{storedTiers:queue,progressMs:0,updatedAtMs:now,totalGenerated:queue.length},eventSequence:event?1:0,nextEventAtMs:now+60000,event,lastEvent:null,protectedIds:[],reducedEffects:false}}
async function seed(p,options){const now=await p.evaluate(()=>Date.now()),s=fixture(now,options);await p.evaluate(([k,s])=>localStorage.setItem(k,JSON.stringify(s)),[key,s]);await p.reload();await p.getByTestId('board').waitFor();return s}
async function add(p){const count=await p.locator('[data-slime-id]').count();await p.getByTestId('add-slime').tap();await until(async()=>await p.locator('[data-slime-id]').count()===count+1)}
async function drag(p,from,to,touch=false,cdp){const a=await center(p,from),b=await center(p,to);if(touch){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...a,id:0}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...b,id:0}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}else{await p.mouse.move(a.x,a.y);await p.mouse.down();await p.mouse.move(b.x,b.y,{steps:8});await p.mouse.up()}await p.waitForTimeout(30)}
async function main(){let server,browser
try{
 if(!process.env.GAME_URL){server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','5173','--strictPort']);await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('Local:'))resolve()});server.on('exit',reject)})}
 browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 for(const width of [1366,390,320]){
  const ctx=await browser.newContext({viewport:{width,height:width===1366?768:width===390?844:568},hasTouch:true,isMobile:width<700}),p=await ctx.newPage(),cdp=await ctx.newCDPSession(p)
  p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
  await p.goto(url)
  const start=async(points)=>cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points})
  const end=async()=>cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
  await check(width+' full board rejects without stock loss; eight one-click additions remain distinct and do not auto-merge',async()=>{
   await seed(p,{tiers:Array(16).fill(1),queue:[1]});const s=await snapshot(p);assert(await p.getByTestId('add-slime').isDisabled());await p.waitForTimeout(100);assert.deepEqual((await snapshot(p)).generator.storedTiers,s.generator.storedTiers)
   await seed(p,{queue:Array(8).fill(1)});for(let i=0;i<8;i++)await add(p)
   const n=await snapshot(p);assert.equal(n.game.slimes.length,8);assert.equal(new Set(n.game.slimes.map(x=>JSON.stringify(x.position))).size,8);assert(n.game.slimes.every(x=>x.tier===1))
  })
  await check(width+' release outside sale, touch cancel and two-finger release over sale never sell',async()=>{
   await seed(p,{tiers:[2]});const before=(await snapshot(p)).game
   await drag(p,'[data-cell="0,0"]','.app-header',true,cdp);assert.deepEqual((await snapshot(p)).game,before)
   const a=await center(p,'[data-cell="0,0"]'),b=await center(p,'[data-testid="sale-zone"]')
   await start([{...a,id:0}]);await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...b,id:0}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});assert.deepEqual((await snapshot(p)).game,before)
   await start([{...a,id:0}]);await start([{...a,id:0},{x:a.x+20,y:a.y+20,id:1}]);await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...b,id:0},{x:b.x-20,y:b.y-20,id:1}]});await end();assert.deepEqual((await snapshot(p)).game,before);assert.equal((await snapshot(p)).wallet.gold,0)
  })
  await check(width+' native 600ms hold toggles once without movement; contextmenu cannot toggle a second time',async()=>{
   await seed(p,{tiers:[1]});const a=await center(p,'[data-cell="0,0"]'),before=(await snapshot(p)).game
   await start([{...a,id:0}]);await p.waitForTimeout(620);await end();await until(async()=>(await snapshot(p)).protectedIds.length===1)
   assert.deepEqual((await snapshot(p)).game,before);await p.locator('[data-cell="0,0"]').dispatchEvent('contextmenu',{clientX:a.x,clientY:a.y});assert.equal((await snapshot(p)).protectedIds.length,1)
   await p.reload();assert.equal((await snapshot(p)).protectedIds.length,1)
  })
  await check(width+' movement threshold, second finger inside/outside board and pointercancel cancel a pending hold',async()=>{
   for(const mode of ['move','second-board','second-ui','cancel']){
    await seed(p,{tiers:[1]});const a=await center(p,'[data-cell="0,0"]'),sale=await center(p,'[data-testid="sale-zone"]')
    await start([{...a,id:0}])
    if(mode==='move')await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:a.x+24,y:a.y,id:0}]})
    if(mode==='second-board')await start([{...a,id:0},{x:a.x+20,y:a.y+20,id:1}])
    if(mode==='second-ui')await start([{...a,id:0},{...sale,id:1}])
    if(mode==='cancel')await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]})
    await p.waitForTimeout(620);if(mode!=='cancel')await end();assert.deepEqual((await snapshot(p)).protectedIds,[],mode)
   }
  })
  await check(width+' drag sale preview exposes Tier/price and protected refusal without a modal',async()=>{
   await seed(p,{tiers:[5]});const a=await center(p,'[data-cell="0,0"]'),b=await center(p,'[data-testid="sale-zone"]')
   assert((await p.locator('[data-cell="0,0"]').getAttribute('title')).includes('32 GOLD'))
   await p.mouse.move(a.x,a.y);await p.mouse.down();await p.mouse.move(b.x,b.y,{steps:5});assert((await p.getByTestId('sale-zone').innerText()).includes('Tier 5 · +32 GOLD'));assert((await p.getByTestId('sale-zone').getAttribute('class')).includes('sale-hover'));await p.mouse.up()
   await until(async()=>(await snapshot(p)).game.slimes.length===0);assert.equal((await snapshot(p)).wallet.gold,32);assert.equal(await p.getByRole('dialog').isVisible(),false)
  })
  await check(width+' keyboard protection/detail and direct sale; protected merge material remains allowed',async()=>{
   await seed(p,{tiers:[1,1,1]});const cell=p.locator('[data-cell="0,0"]');await cell.focus();await cell.press('p');await until(async()=>(await snapshot(p)).protectedIds.length===1)
   await cell.press('i');assert(await p.getByRole('dialog').isVisible());await p.getByRole('button',{name:'閉じる',exact:true}).click()
   await cell.focus();await cell.press('Enter');await p.locator('[data-cell="1,0"]').press('Enter');await until(async()=>(await snapshot(p)).game.slimes.length===1);assert.deepEqual((await snapshot(p)).protectedIds,[])
   const output=p.locator('[data-slime-id]');await output.focus();await output.press('Enter');await p.getByTestId('sale-zone').focus();await p.getByTestId('sale-zone').press('Enter');await until(async()=>(await snapshot(p)).game.slimes.length===0);assert.equal((await snapshot(p)).wallet.gold,4)
  })
  await check(width+' real touchscreen shop tap works without virtual clock',async()=>{
   await seed(p,{gold:1000});await p.getByRole('button',{name:'GOLDショップ',exact:true}).tap();await p.waitForTimeout(80)
   for(const key of ['speed','tap','storage']){await p.getByTestId('buy-'+key).tap();await until(async()=>(await snapshot(p)).wallet.upgrades[key]===1)}
   assert.equal((await snapshot(p)).wallet.gold,952);await p.getByRole('button',{name:'閉じる',exact:true}).tap()
  })
  await check(width+' interpolated bar advances between commits; hidden tab stops drawing and resynchronizes',async()=>{
   await seed(p);await p.evaluate(()=>{window.storageWrites=0;const old=Storage.prototype.setItem;Storage.prototype.setItem=function(...a){window.storageWrites++;return old.apply(this,a)}})
   const values=[];for(let i=0;i<6;i++){await p.waitForTimeout(45);values.push(await p.locator('progress').evaluate(n=>n.value))}
   assert(new Set(values.map(Math.round)).size>=4,values);assert(await p.evaluate(()=>window.storageWrites)<=1)
   await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))});const before=await p.locator('progress').evaluate(n=>n.value);await p.waitForTimeout(300);assert.equal(await p.locator('progress').evaluate(n=>n.value),before)
   await p.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))});await p.waitForTimeout(80);assert(await p.locator('progress').evaluate(n=>n.value)>before)
   await p.reload()
  })
  await check(width+' v2 4/10 migrates frozen unit then sale ends ledger; save failure retains both sides',async()=>{
   let now=await p.evaluate(()=>Date.now()),s=fixture(now,{tiers:[5],gold:4});s.version=2;s.eventSequence=1;s.event={id:'gold-1',sequence:1,cell:{x:0,y:0},expiresAtMs:now+45000,tier:5,sourceId:'p-1',attributeCount:0,paid:4,receivedGOLD:4,unitGOLD:1,nextPaymentAtMs:now+5000};await p.evaluate(([k,s])=>localStorage.setItem(k,JSON.stringify(s)),[key,s]);await p.reload()
   await drag(p,'[data-cell="0,0"]','[data-testid="sale-zone"]');await until(async()=>(await snapshot(p)).event===null);assert.equal((await snapshot(p)).wallet.gold,36);assert.equal((await snapshot(p)).version,7)
   await seed(p,{tiers:[1],queue:[1]});const raw=await p.evaluate(k=>localStorage.getItem(k),key);await p.evaluate(()=>{Storage.prototype.setItem=()=>{throw new DOMException('quota','QuotaExceededError')}})
   await p.getByTestId('add-slime').click();await until(async()=>await p.getByRole('alert').isVisible());assert.equal(await p.evaluate(k=>localStorage.getItem(k),key),raw);assert.equal(await p.locator('[data-slime-id]').count(),1);await p.reload()
  })
  await check(width+' acceleration and speed purchase rebase display; reload follows authoritative progress',async()=>{
   await seed(p,{gold:1000});await p.getByRole('button',{name:/生成加速/}).click();await until(async()=>(await snapshot(p)).generator.progressMs>=1000)
   await p.waitForTimeout(80);assert(await p.locator('progress').evaluate(n=>n.value)>=(await snapshot(p)).generator.progressMs)
   await p.getByRole('button',{name:'GOLDショップ',exact:true}).click();await p.getByTestId('buy-speed').click();await until(async()=>(await snapshot(p)).wallet.upgrades.speed===1);await p.getByRole('button',{name:'閉じる',exact:true}).click()
   assert.equal(await p.locator('progress').evaluate(n=>n.max),14250);await p.reload();await p.waitForTimeout(80)
   const shown=await p.locator('progress').evaluate(n=>n.value),real=(await snapshot(p)).generator.progressMs;assert(shown>=real&&shown-real<1500)
  })
  await check(width+' full-capacity visual stop, tap/speed/reload display and Tier2/4 shape distinction',async()=>{
   await seed(p,{queue:Array(10).fill(1),tiers:[2,4]});await p.waitForTimeout(100);assert((await p.getByTestId('generation-time').innerText()).includes('満杯'));assert.equal(await p.locator('progress').evaluate(n=>n.value),15000)
   assert.equal(await p.locator('[data-tier="4"] .violet-drop').count(),1);assert.equal(await p.locator('[data-tier="2"] .violet-drop').count(),0)
   await p.screenshot({path:path.join(dir,`populated-${width}.png`)})
  })
  await ctx.close()
 }
 await check('gold receipt save failure preserves 4/10, then reload completes once',async()=>{
  const ctx=await browser.newContext(),p=await ctx.newPage();await p.goto(url);const now=await p.evaluate(()=>Date.now())
  await seed(p,{tiers:[5],gold:20,event:{rewardVersion:2,id:'gold-1',sequence:1,cell:{x:0,y:0},expiresAtMs:now+45000,tier:5,sourceId:'p-1',attributeCount:0,paid:4,receivedGOLD:20,unitGOLD:5,nextPaymentAtMs:now+1000}})
  const raw=await p.evaluate(k=>localStorage.getItem(k),key)
  await p.evaluate(()=>{Storage.prototype.setItem=()=>{throw new DOMException('quota','QuotaExceededError')}})
  await until(async()=>await p.getByRole('alert').isVisible()).catch(async()=>{await p.waitForTimeout(500);assert(await p.getByRole('alert').isVisible())})
  assert.equal(await p.evaluate(k=>localStorage.getItem(k),key),raw);assert.equal(await p.getByTestId('gold').innerText(),'20')
  await p.reload();await p.waitForTimeout(2600);assert.equal((await snapshot(p)).wallet.gold,50);assert.equal((await snapshot(p)).event,null);await ctx.close()
 })
 await check('hidden gold tab pauses receipts and resumes with one payment, not a catch-up batch',async()=>{
  const ctx=await browser.newContext(),p=await ctx.newPage();await p.goto(url);const now=await p.evaluate(()=>Date.now())
  await seed(p,{tiers:[5],gold:20,event:{rewardVersion:2,id:'gold-1',sequence:1,cell:{x:0,y:0},expiresAtMs:now+45000,tier:5,sourceId:'p-1',attributeCount:0,paid:4,receivedGOLD:20,unitGOLD:5,nextPaymentAtMs:now+1000}})
  await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))});await p.waitForTimeout(1200);assert.equal((await snapshot(p)).wallet.gold,20)
  await p.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))});await until(async()=>(await snapshot(p)).event.paid===5);assert.equal((await snapshot(p)).wallet.gold,25);await ctx.close()
 })
 await check('two active gold tabs serialize receipts and stale writer stops',async()=>{
  const ctx=await browser.newContext(),a=await ctx.newPage();await a.goto(url);const now=await a.evaluate(()=>Date.now())
  await seed(a,{tiers:[5],gold:20,event:{rewardVersion:2,id:'gold-1',sequence:1,cell:{x:0,y:0},expiresAtMs:now+45000,tier:5,sourceId:'p-1',attributeCount:0,paid:4,receivedGOLD:20,unitGOLD:5,nextPaymentAtMs:now+1000}})
  const b=await ctx.newPage();await b.goto(url);await a.waitForTimeout(1500)
  assert((await a.getByRole('alert').isVisible())||(await b.getByRole('alert').isVisible()))
  const s=await snapshot(a);assert(s.wallet.gold<=50);if(s.event)assert.equal(s.wallet.gold,s.event.paid*5)
  await a.waitForTimeout(2500);assert.equal((await snapshot(a)).wallet.gold,50);await ctx.close()
 })
 assert.equal(errors.length,0,errors.join('\n'))
}finally{fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify({browser:browser?.version(),checks,errors},null,2));console.log(`${checks.filter(x=>x.result==='PASS').length} PASS / ${checks.filter(x=>x.result==='FAIL').length} FAIL`);await browser?.close();server?.kill()}}
main().catch(e=>{console.error(e);process.exitCode=1})

