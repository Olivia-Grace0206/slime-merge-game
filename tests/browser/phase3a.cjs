/* Production build only; persisted fixtures + actual mouse/native CDP touch input. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright')
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process')
const dir=process.env.BROWSER_ARTIFACT_DIR||'docs/validation/phase3a/browser',key='slime-merge-normal-v2',checks=[],errors=[],measurements=[]
fs.mkdirSync(dir,{recursive:true})
const sizes=[[1920,1080],[1440,900],[1366,768],[1280,720],[1024,768],[768,1024],[390,844],[375,667],[320,568],[844,390]]
async function check(name,fn){try{await fn();checks.push({name,result:'PASS'});console.log('PASS',name)}catch(e){checks.push({name,result:'FAIL',error:String(e)});throw e}}
async function until(fn){for(let i=0;i<120;i++){if(await fn())return;await new Promise(r=>setTimeout(r,15))}throw Error('condition timeout')}
async function center(p,s){const b=await p.locator(s).boundingBox();assert(b);return{x:b.x+b.width/2,y:b.y+b.height/2}}
const snap=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),key)
function fixture(now,tiers=[1,2],attrs=[[],[]],cap=40){const caps=[5,10,15,20,25,29,30,31,32,33,34,35,36,37,38,39,40];return{version:5,savedAtMs:now,sequence:0,nextId:tiers.length+1,researchLevel:caps.indexOf(cap),researchMaxTier:cap,goldCellUnlocked:false,goldFrequencyLevel:0,goldFormat:'full',eventSequence:0,nextEventAtMs:now+60000,event:null,lastEvent:null,protectedIds:tiers.length?['p-1']:[],reducedEffects:true,game:{bounds:{origin:{x:0,y:0},width:4,height:4},highestTierReached:Math.max(1,...tiers),revision:0,slimes:tiers.map((tier,i)=>({id:`p-${i+1}`,tier,position:{x:i%4,y:Math.floor(i/4)},attributes:attrs[i]||[]}))},wallet:{gold:1234,upgrades:{speed:0,tap:0,storage:0}},generator:{storedTiers:[1,1],storedAttributes:[[{id:'ice',level:2}],[]],totalGenerated:2,progressMs:0,updatedAtMs:now}}}
async function seed(p,tiers,attrs,cap){const s=fixture(await p.evaluate(()=>Date.now()),tiers,attrs,cap);await p.evaluate(([k,v])=>localStorage.setItem(k,JSON.stringify(v)),[key,s]);await p.reload();await p.getByTestId('board').waitFor();await until(async()=>(await p.getByTestId('board').boundingBox()).width>100);return s}
async function pointer(p,cdp,touch,kind,a){if(touch)await cdp.send('Input.dispatchTouchEvent',{type:{down:'touchStart',move:'touchMove',up:'touchEnd',cancel:'touchCancel'}[kind],touchPoints:kind==='up'||kind==='cancel'?[]:[{...a,id:0}]});else if(kind==='down'){await p.mouse.move(a.x,a.y);await p.mouse.down()}else if(kind==='move')await p.mouse.move(a.x,a.y,{steps:3});else if(kind==='cancel'){await p.keyboard.press('Escape');await p.mouse.up()}else await p.mouse.up()}
async function drag(p,cdp,touch,from,to,preview){await pointer(p,cdp,touch,'down',await center(p,from));await pointer(p,cdp,touch,'move',await center(p,to));if(preview)await preview();await pointer(p,cdp,touch,'up')}
async function run(){let server,browser
try{
 if(!process.env.GAME_URL){server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','5173','--strictPort']);await new Promise((res,rej)=>{server.stdout.on('data',d=>{if(String(d).includes('Local:'))res()});server.on('exit',rej)})}
 browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 for(const [width,height]of sizes){
 const name=`${width}x${height}`,touch=width<900,ctx=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:width<=700&&height>500}),p=await ctx.newPage(),cdp=await ctx.newCDPSession(p)
 p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
 await p.clock.install({time:new Date('2026-11-01T04:00:00Z')});await p.goto(process.env.GAME_URL||'http://127.0.0.1:5173/slime-merge-game/')
 const attrs=[[{id:'fire',level:2},{id:'gold',level:3},{id:'ice',level:99}],[{id:'dark',level:4}]]
 await seed(p,[1,2],attrs)
 await check(name+' one-screen board unchanged and menu reachable, face/Tier/badges separate',async()=>{
 const m=await p.evaluate(()=>{const rect=n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}},cell=document.querySelector('[data-slime-id="p-1"]');return{width:innerWidth,height:innerHeight,scroll:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],board:rect(document.querySelector('[data-testid=board]')),tier:rect(cell.querySelector('.tier-pill')),face:rect(cell.querySelector('.smile')),eyes:rect(cell.querySelector('.eyes')),badges:[...cell.querySelectorAll('.attribute-badge')].map(n=>({...rect(n),font:parseFloat(getComputedStyle(n).fontSize)})),menus:[...document.querySelectorAll('.edge-menu button')].map(n=>({...rect(n),text:n.innerText}))}})
 assert.deepEqual(m.scroll,[width,height]);const previous=[1010,830,698,650,624,752,374,359,304,334][sizes.findIndex(x=>x[0]===width)];assert(Math.abs(m.board.w-previous)<=1,JSON.stringify(m.board));assert.equal(m.badges.length,3)
 for(const b of m.badges){assert(b.bottom<=m.tier.y+1,'attribute/Tier overlap');assert(b.y>=m.face.bottom-1,'attribute/face overlap')}
 for(const b of m.menus)assert(b.x>=0&&b.y>=0&&b.right<=width+.5&&b.bottom<=height+.5,'menu clipped '+b.text)
 measurements.push(m);await p.screenshot({path:path.join(dir,`attributes-${name}.png`)})
 })
 await check(name+' different Tier exchanges only positions + IDs/attributes/protection preserved/reload',async()=>{
 const before=await snap(p)
 await drag(p,cdp,touch,'[data-slime-id="p-1"]','[data-slime-id="p-2"]',async()=>{assert(await p.getByTestId('swap-preview').isVisible());assert.equal(await p.locator('.swap-cell').count(),2);assert.equal(await p.getByTestId('attribute-preview').count(),0);assert(await p.locator('.drag-sprite').evaluate(n=>{const r=n.getBoundingClientRect(),tier=n.querySelector('.tier-pill').getBoundingClientRect(),face=n.querySelector('.smile').getBoundingClientRect();return [...n.querySelectorAll('.attribute-badge')].every(x=>{const b=x.getBoundingClientRect();return b.x>=r.x-1&&b.right<=r.right+1&&b.bottom<=tier.y+1&&b.y>=face.bottom-1})}),'drag badges stay within sprite and do not cover face/Tier');await p.screenshot({path:path.join(dir,`swap-${name}.png`)})})
 await until(async()=>(await snap(p)).game.revision===1);const after=await snap(p);assert.equal(after.game.slimes.length,2);assert.deepEqual(after.game.slimes.map(s=>[s.id,s.tier,s.attributes]),before.game.slimes.map(s=>[s.id,s.tier,s.attributes]));assert.deepEqual(after.protectedIds,['p-1']);assert.deepEqual(after.game.slimes[0].position,{x:1,y:0});assert.equal(after.wallet.gold,before.wallet.gold);await p.reload();assert.deepEqual((await snap(p)).game,after.game)
 })
 await check(name+' touch-accessible attribute list/details with actual effects and provisional values',async()=>{
 await p.getByRole('button',{name:'属性',exact:true}).click();await p.locator('.attribute-roster button').first().click();assert((await p.locator('.panel-body').innerText()).includes('炎Lv2・黄金Lv3・氷Lv99'));assert((await p.locator('.panel-body').innerText()).includes('効果量は仮設定'));await p.screenshot({path:path.join(dir,`detail-${name}.png`)});await p.getByRole('button',{name:'閉じる',exact:true}).click()
 })
 await check(name+' 5merge preview guarantees copied Lv + both outputs, remainder untouched',async()=>{
 await seed(p,[1,1,1,1,1,1],[[{id:'fire',level:2}],[],[],[{id:'ice',level:3}],[],[]])
 await drag(p,cdp,touch,'[data-slime-id="p-1"]','[data-slime-id="p-2"]',async()=>{assert.equal(await p.getByTestId('swap-preview').count(),0);assert((await p.getByTestId('attribute-preview').innerText()).includes('炎Lv2'));assert.equal(await p.locator('[data-group="1"]').count(),5);await p.screenshot({path:path.join(dir,`merge-${name}.png`)})})
 await until(async()=>(await snap(p)).game.highestTierReached===2);const s=await snap(p),out=s.game.slimes.filter(x=>x.tier===2);assert.equal(out.length,2);for(const a of out)assert(a.attributes.some(x=>x.id==='fire'&&x.level===2));assert.deepEqual(s.game.slimes.find(x=>x.id==='p-4').attributes,[{id:'ice',level:3}]);await p.reload();assert.deepEqual((await snap(p)).game,s.game)
 })
 await check(name+' overflow switches to clear swap preview; research/MAX40/two-input exchange',async()=>{
 await seed(p,[1,1,1],[[{id:'fire',level:1},{id:'gold',level:1}],[{id:'ice',level:2}],[{id:'dark',level:2}]])
 await drag(p,cdp,touch,'[data-slime-id="p-1"]','[data-slime-id="p-2"]',async()=>{assert((await p.getByTestId('swap-preview').innerText()).includes('属性上限'));assert.equal(await p.locator('[data-group]').count(),0)})
 await until(async()=>(await snap(p)).game.revision===1);assert.equal((await snap(p)).game.slimes.length,3)
 for(const [tiers,cap]of [[[5,5,5],5],[[40,40],40],[[1,1],40]]){await seed(p,tiers,[],cap);await drag(p,cdp,touch,'[data-slime-id="p-1"]','[data-slime-id="p-2"]',async()=>{assert(await p.getByTestId('swap-preview').isVisible());if(cap===5)assert(await p.locator('.research-notice').isVisible())});await until(async()=>(await snap(p)).game.revision===1);assert.equal((await snap(p)).game.slimes.length,tiers.length)}
 })
 await check(name+' pinch/pointercancel/Escape/rotation never commit previewed swap',async()=>{
 await seed(p,[1,2],attrs);const before=(await snap(p)).game,a=await center(p,'[data-slime-id="p-1"]'),b=await center(p,'[data-slime-id="p-2"]')
 await pointer(p,cdp,touch,'down',a);await pointer(p,cdp,touch,'move',b);await pointer(p,cdp,touch,'cancel');assert.deepEqual((await snap(p)).game,before)
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...a,id:0}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...b,id:0}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...b,id:0},{x:a.x,y:a.y+10,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:b.x+8,y:b.y,id:0},{x:a.x-8,y:a.y+10,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.deepEqual((await snap(p)).game,before);assert.equal(await p.getByTestId('swap-preview').count(),0)
 await p.reload();await pointer(p,cdp,touch,'down',await center(p,'[data-slime-id="p-1"]'));await pointer(p,cdp,touch,'move',await center(p,'[data-slime-id="p-2"]'));await p.setViewportSize({width:height,height:width});await pointer(p,cdp,touch,'up');assert.deepEqual((await snap(p)).game,before);await p.setViewportSize({width,height})
 })
 await check(name+' FIFO attribute withdrawal + immediate protected sale / actual receipt',async()=>{
 await seed(p,[1,2],attrs);await p.getByTestId('add-slime').click();await until(async()=>(await snap(p)).game.slimes.length===3);assert.deepEqual((await snap(p)).game.slimes[2].attributes,[{id:'ice',level:2}])
 const old=(await snap(p)).wallet.gold;await drag(p,cdp,touch,'[data-slime-id="p-2"]','[data-testid="sale-zone"]');await until(async()=>(await snap(p)).game.slimes.length===2);assert.equal((await snap(p)).wallet.gold,old+10)
 await drag(p,cdp,touch,'[data-slime-id="p-1"]','[data-testid="sale-zone"]');assert.equal((await snap(p)).game.slimes.length,2);assert.equal((await snap(p)).wallet.gold,old+10)
 })
 await ctx.close()
 }
 const txContext=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),tx=await txContext.newPage(),txCdp=await txContext.newCDPSession(tx)
 tx.on('pageerror',e=>errors.push(String(e)));await tx.clock.install({time:new Date('2026-11-01T04:00:00Z')});await tx.goto(process.env.GAME_URL||'http://127.0.0.1:5173/slime-merge-game/')
 for(const source of ['p-1','p-2'])await check('390 GOLD active swap by '+source+' closes frozen attribute contract without transferring receipts',async()=>{
 const now=await tx.evaluate(()=>Date.now()),s=fixture(now,[5,5],[[{id:'fire',level:2}],[]]);s.goldCellUnlocked=true;s.eventSequence=1;s.event={id:'gold-1',sequence:1,cell:{x:0,y:0},tier:5,sourceId:'p-1',attributeCount:1,unitGOLD:4,paid:4,receivedGOLD:16,cappedGOLD:0,expiresAtMs:now+45000,nextPaymentAtMs:now+10000,rewardVersion:2}
 await tx.evaluate(([k,v])=>localStorage.setItem(k,JSON.stringify(v)),[key,s]);await tx.reload();await until(async()=>(await tx.getByTestId('board').boundingBox()).width>100)
 await drag(tx,txCdp,true,`[data-slime-id="${source}"]`,`[data-slime-id="${source==='p-1'?'p-2':'p-1'}"]`);await until(async()=>(await snap(tx)).event===null)
 const n=await snap(tx);assert.deepEqual(n.lastEvent,{id:'gold-1',receivedGOLD:16,paid:4});assert.equal(n.wallet.gold,1234);assert.equal(n.eventSequence,1);await tx.reload();await tx.clock.runFor(1000);assert.equal((await snap(tx)).wallet.gold,1234);assert.equal((await snap(tx)).event,null)
 })
 await txContext.close()
 for(const merge of [false,true])await check('Quota during attributed '+(merge?'merge':'swap')+' keeps original bytes, individuals and attributes in UI',async()=>{
 const ctx=await browser.newContext({viewport:{width:1366,height:768}}),p=await ctx.newPage();await p.goto(process.env.GAME_URL||'http://127.0.0.1:5173/slime-merge-game/');await seed(p,merge?[1,1,1]:[1,2],[[{id:'fire',level:3}],[],[]]);const raw=await p.evaluate(k=>localStorage.getItem(k),key),before=(await snap(p)).game
 await p.evaluate(()=>{Storage.prototype.setItem=()=>{throw Error('Quota')}})
 await drag(p,null,false,'[data-slime-id="p-1"]','[data-slime-id="p-2"]');await until(async()=>await p.locator('.storage-error').isVisible());assert.equal(await p.evaluate(k=>localStorage.getItem(k),key),raw);assert.deepEqual((await snap(p)).game,before);assert.equal(await p.locator('[data-cell="0,0"]').getAttribute('data-slime-id'),'p-1');assert.equal(await p.locator('[data-slime-id="p-1"] [data-attribute="fire"]').count(),1);await ctx.close()
 })
 assert.deepEqual(errors,[])
}finally{fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify({checks,errors,measurements,browser:browser?.version()},null,2));console.log(checks.length,checks.filter(c=>c.result==='FAIL'));await browser?.close();server?.kill()}}
run().catch(e=>{console.error(e);process.exitCode=1})
