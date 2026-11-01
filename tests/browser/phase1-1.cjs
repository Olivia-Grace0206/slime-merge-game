/* Run after build. Isolated Playwright; no application dependency added. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict')
const { spawn } = require('node:child_process')
const dir = process.env.BROWSER_ARTIFACT_DIR || 'docs/validation/phase1-1-polish'
fs.mkdirSync(dir, {recursive:true})
const checks=[], errors=[], measurements=[]
const sizes=[[1920,1080],[1440,900],[1366,768],[1280,720],[1024,768],[768,1024],[390,844],[375,667],[320,568],[844,390]]
async function check(name, action) {try {await action();checks.push({name,result:'PASS'})}catch(e){checks.push({name,result:'FAIL',error:String(e)});throw e}}
async function center(page, selector) {const b=await page.locator(selector).boundingBox(); assert(b); return {x:b.x+b.width/2,y:b.y+b.height/2}}
async function placements(page) {return page.locator('[data-slime-id]').evaluateAll(ns=>ns.map(n=>({id:n.dataset.slimeId,tier:+n.dataset.tier,cell:n.dataset.cell})).sort((a,b)=>a.id.localeCompare(b.id)))}
async function preset(page,label) {await page.getByRole('button',{name:'検証',exact:true}).click();await page.getByRole('button',{name:label,exact:true}).click()}
async function cameraAction(page, name) {
 await page.getByRole('button',{name:'設定',exact:true}).click()
 await page.getByRole('button',{name,exact:true}).click()
 await page.getByRole('button',{name:'閉じる',exact:true}).click()
}
async function startServer(cwd, port) {
 const proc=spawn(process.execPath,[path.resolve('node_modules/vite/bin/vite.js'),'preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd,stdio:['ignore','pipe','pipe']})
 await new Promise((resolve,reject)=>{proc.stdout.on('data',d=>{if(String(d).includes('Local:'))resolve()});proc.on('exit',c=>reject(Error('server exit '+c)));proc.stderr.on('data',d=>process.stderr.write(d))})
 return proc
}
async function metrics(page) {return page.evaluate(()=>{
 const box=s=>{const node=document.querySelector(s);if(!node)return null;const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}}
 const d=document.documentElement,b=box('[data-testid="board"]'),v=box('[data-testid="viewport"]')
 const buttons=[...document.querySelectorAll('.edge-menu button')].map(n=>{const r=n.getBoundingClientRect();const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {text:n.textContent,visible:r.x>=0&&r.y>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&!!hit&&n.contains(hit)}})
 return {viewport:{width:innerWidth,height:innerHeight},scrollHeight:d.scrollHeight,clientHeight:d.clientHeight,scrollWidth:d.scrollWidth,clientWidth:d.clientWidth,board:b,gameViewport:v,header:box('.app-header'),menu:box('.edge-menu'),camera:box('.camera-controls'),status:box('.result-bar'),boardAreaPercent:b.width*b.height/(innerWidth*innerHeight)*100,boardWidthPercent:b.width/innerWidth*100,boardHeightPercent:b.height/innerHeight*100,buttons,rootOverflow:getComputedStyle(d).overflow,bodyOverflow:getComputedStyle(document.body).overflow}
 })}
async function run(){
 const servers=[];let browser
 try{
  if(!process.env.GAME_URL)servers.push(await startServer(process.cwd(),5173))
  if(process.env.BASELINE_DIR)servers.push(await startServer(process.env.BASELINE_DIR,5174))
  browser=await chromium.launch({headless:true,args:['--no-sandbox']})
  for(const [width,height] of sizes){
   const name=`${width}x${height}`,mobile=width<=700&&height>500
   const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:mobile,deviceScaleFactor:1})
   const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('requestfailed',r=>errors.push(r.url()+':'+r.failure()?.errorText))
   await page.goto(process.env.GAME_URL||'http://127.0.0.1:5173/slime-merge-game/');await preset(page,'5体マージ');await page.getByTestId('board').waitFor();await page.waitForTimeout(70)
   await check(`${name} layout: no page scroll, complete maximal centered square and reachable controls`,async()=>{
    const m=await metrics(page);measurements.push(m)
    assert(m.scrollHeight<=m.clientHeight+1);assert(m.scrollWidth<=m.clientWidth+1)
    assert(!['hidden','clip'].includes(m.rootOverflow));assert(!['hidden','clip'].includes(m.bodyOverflow))
    assert(Math.abs(m.board.width-m.board.height)<1)
    assert(m.board.width>=Math.min(m.gameViewport.width,m.gameViewport.height)-9)
    assert(m.board.x>=m.gameViewport.x-1&&m.board.right<=m.gameViewport.right+1)
    assert(m.board.y>=m.gameViewport.y-1&&m.board.bottom<=m.gameViewport.bottom+1)
    assert(Math.abs((m.board.x+m.board.right)/2-(m.gameViewport.x+m.gameViewport.right)/2)<1)
    assert(m.buttons.every(b=>b.visible),JSON.stringify(m.buttons));assert.equal(m.status,null)
    assert(m.header.bottom<=m.gameViewport.y+1)
    if(width===1440)assert(m.board.width>=650)
    if(width===1366)assert(m.board.width>=520)
    if(width===390)assert(m.board.width>=370)
    await page.screenshot({path:path.join(dir,`screen-${name}.png`),type:'png'})
   })
   if(process.env.BASELINE_DIR){
    const bp=await context.newPage();await bp.goto('http://127.0.0.1:5174/slime-merge-game/');await bp.waitForFunction(()=>document.querySelector('[data-testid="board"]')?.getBoundingClientRect().width>100)
    const current=measurements[measurements.length-1],baseline=await metrics(bp)
    current.baseline=baseline
    const recorded=JSON.parse(fs.readFileSync(path.resolve('docs/validation/phase1-1/browser-results.json'),'utf8')).measurements.find(m=>m.viewport.width===width&&m.viewport.height===height)
    assert(Math.abs(recorded.board.width-baseline.board.width)<1,'baseline agrees with PR #6')
    assert(current.board.width>=baseline.board.width-.5,'board must not shrink')
    if(width>900||height<=500)assert(current.board.width>baseline.board.width+40,'reclaimed footer height enlarges PC board')
    await bp.screenshot({path:path.join(dir,`before-${name}.png`),type:'png'});await bp.close()
   }
   await check(`${name} polish: obsolete UI removed, live announcement takes no row and board centered in page`,async()=>{
    assert.equal(await page.locator('.result-bar,.camera-controls,.board-label,[data-testid="zoom"]').count(),0)
    assert.equal(await page.locator('footer').count(),0)
    const live=page.getByTestId('status');assert.equal(await live.getAttribute('aria-live'),'polite')
    const b=await live.boundingBox();assert(b.width<=1&&b.height<=1)
    const visibleText=await page.locator('body').innerText();assert(!/7\s*[×x]\s*7|\d+%/.test(visibleText))
    const board=await page.getByTestId('board').boundingBox();assert(Math.abs(board.x+board.width/2-width/2)<1)
    assert.equal(await page.locator('[data-cell]').count(),49)
   })
   await check(`${name} keyboard: settings zoom +/-/reset accessible, focus returns and no game mutation`,async()=>{
    const before=await placements(page),opener=page.getByRole('button',{name:'設定',exact:true})
    await opener.focus();await page.keyboard.press('Enter');assert(await page.getByRole('dialog').isVisible())
    const zoomIn=page.getByRole('button',{name:'拡大',exact:true}),zoomOut=page.getByRole('button',{name:'縮小',exact:true}),reset=page.getByTestId('reset-camera')
    for(const button of [zoomIn,zoomOut,reset]){
     const box=await button.boundingBox();assert(box.width>=44&&box.height>=44)
     await button.focus();assert(await button.evaluate(n=>n===document.activeElement));await page.keyboard.press('Enter')
     const z=+await page.getByTestId('viewport').getAttribute('data-zoom');assert.equal(z,button===zoomIn?1.2:1)
    }
    await page.keyboard.press('Escape');assert(await opener.evaluate(n=>n===document.activeElement))
    assert.deepEqual(await placements(page),before)
   })
   await check(`${name} menus: help, settings, 40-tier internally scrollable appearance and focus return`,async()=>{
    for(const label of ['遊び方','設定','スライム一覧・外見確認']){
     const opener=page.getByRole('button',{name:label,exact:true});await opener.click()
     const dialog=page.getByRole('dialog');assert(await dialog.isVisible());const b=await dialog.boundingBox();assert(b.x>=0&&b.y>=0&&b.x+b.width<=width+1&&b.y+b.height<=height+1)
     if(label==='スライム一覧・外見確認'){
      assert.equal(await page.locator('[data-preview-tier]').count(),40)
      const labels=await page.locator('[data-preview-tier] .tier-pill').allTextContents();assert.deepEqual(labels,Array.from({length:40},(_,i)=>String(i+1)))
      await page.locator('[data-preview-tier="40"]').scrollIntoViewIfNeeded();assert(await page.locator('[data-preview-tier="40"]').isVisible())
      await page.locator('.panel-body').evaluate(n=>n.scrollTop=0)
      if(width===1440)await dialog.screenshot({path:path.join(dir,'tier1-40.png'),type:'png'})
     }
     if(label==='設定') {await page.getByRole('checkbox', {name:'発光・進化アニメーションを軽減'}).check();await page.getByRole('checkbox', {name:'発光・進化アニメーションを軽減'}).uncheck()}
     await page.getByRole('button',{name:'閉じる',exact:true}).click();assert(await opener.evaluate(n=>n===document.activeElement))
    }
    await page.getByRole('button',{name:'遊び方',exact:true}).click();await page.keyboard.press('Escape');assert(!await page.getByRole('dialog').isVisible())
   })
   await check(`${name} wheel in/out and cursor anchor, 75/300 clamps, UI size unchanged`,async()=>{
    const before=await page.getByTestId('board').boundingBox(),header=await page.locator('.app-header').boundingBox()
    const anchor={x:before.x+before.width*.35,y:before.y+before.height*.45}
    await page.mouse.move(anchor.x,anchor.y);await page.mouse.wheel(0,-160);await page.waitForTimeout(40)
    const bigger=await page.getByTestId('board').boundingBox();assert(bigger.width>before.width)
    assert(Math.abs((anchor.x-bigger.x)/bigger.width-.35)<.002);assert(Math.abs((anchor.y-bigger.y)/bigger.height-.45)<.002)
    await page.mouse.wheel(0,100);await page.waitForTimeout(30);const smaller=await page.getByTestId('board').boundingBox();assert(smaller.width<bigger.width)
    await page.mouse.wheel(0,-3000);await page.waitForTimeout(30);assert.equal(+await page.getByTestId('viewport').getAttribute('data-zoom'),3)
    await page.mouse.wheel(0,3000);await page.waitForTimeout(30);assert.equal(+await page.getByTestId('viewport').getAttribute('data-zoom'),.75)
    assert.deepEqual(await page.locator('.app-header').boundingBox(),header)
    await cameraAction(page,'表示リセット');assert.equal(+await page.getByTestId('viewport').getAttribute('data-zoom'),1)
   })
   const cdp=await context.newCDPSession(page)
   const touch=async(type,points)=>{await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});await page.waitForTimeout(25)}
   await check(`${name} trusted pinch cancels active merge; center held; residual finger cannot drop`,async()=>{
    await preset(page,'11体マージ');const before=await placements(page),a=await center(page,'[data-slime-id="drag"]'),target=await center(page,'[data-cell="2,2"]')
    await touch('touchStart',[{...a,id:0}]);await touch('touchMove',[{...target,id:0}]);assert.equal(await page.locator('[data-group]').count(),10)
    const p={...target,id:0},q={x:target.x+60,y:target.y,id:1}
    await touch('touchStart',[p,q]);assert.equal(await page.locator('[data-group]').count(),0)
    const board=await page.getByTestId('board').boundingBox(),mid={x:target.x+30,y:target.y},u=(mid.x-board.x)/board.width,v=(mid.y-board.y)/board.height
    const expanded=[{x:p.x-16,y:p.y,id:0},{x:q.x+16,y:q.y,id:1}]
    await touch('touchMove',expanded)
    const big=await page.getByTestId('board').boundingBox();assert(big.width>board.width);assert(Math.abs((mid.x-big.x)/big.width-u)<.01);assert(Math.abs((mid.y-big.y)/big.height-v)<.01)
    await touch('touchMove',[p,q]);const small=await page.getByTestId('board').boundingBox();assert(small.width<big.width)
    assert.deepEqual(await placements(page),before)
    await touch('touchEnd',[p]);await touch('touchMove',[{x:target.x+5,y:target.y,id:0}]);assert.equal(await page.locator('[data-group]').count(),0)
    await touch('touchEnd',[]);assert.deepEqual(await placements(page),before)
    assert.equal(await page.getByTestId('viewport').getAttribute('data-gesture'),'idle')
    await cameraAction(page,'表示リセット')
   })
   await check(`${name} pinch touchCancel/blur/third contact never commit and fresh touch recovers`,async()=>{
    for(const mode of ['touchCancel','blur','third']){
     await preset(page,'3体マージ');const before=await placements(page),a=await center(page,'[data-slime-id="drag"]'),b=await center(page,'[data-cell="2,2"]')
     const p={...b,id:0},q={x:b.x+45,y:b.y,id:1}
     await touch('touchStart',[{...a,id:0}]);await touch('touchMove',[p]);await touch('touchStart',[p,q])
     if(mode==='touchCancel')await touch('touchCancel',[])
     if(mode==='blur'){await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await touch('touchEnd',[])}
     if(mode==='third'){await touch('touchStart',[p,q,{x:b.x+70,y:b.y+15,id:2}]);await touch('touchEnd',[])}
     assert.deepEqual(await placements(page),before);assert.equal(await page.locator('[data-group]').count(),0)
     const freshA=await center(page,'[data-slime-id="drag"]'),freshB=await center(page,'[data-cell="2,2"]')
     await touch('touchStart',[{...freshA,id:0}]);await touch('touchMove',[{...freshB,id:0}]);await touch('touchEnd',[])
     assert.equal((await placements(page)).length,1)
    }
   })
   for(const [label,count] of [['3体マージ',1],['5体マージ',2],['11体マージ',5]])await check(`${name} zoom+pan ${label} preview IDs, remainder and output cells match commit`,async()=>{
    await preset(page,label)
    const source0=await center(page,'[data-slime-id="drag"]');await page.mouse.move(source0.x,source0.y);await page.mouse.wheel(0,-180);await page.waitForTimeout(30)
    const empty=await center(page,'[data-cell="1,1"]'),beforePan=await page.getByTestId('board').boundingBox()
    await page.mouse.move(empty.x,empty.y);await page.mouse.down();await page.mouse.move(empty.x+8,empty.y+8);await page.mouse.up()
    const afterPan=await page.getByTestId('board').boundingBox();assert(Math.abs(afterPan.x-beforePan.x-8)<1)
    const before=await placements(page),a=await center(page,'[data-slime-id="drag"]'),b=await center(page,'[data-cell="2,2"]')
    if(mobile) {await touch('touchStart',[{...a,id:0}]);await touch('touchMove',[{...b,id:0}])}else {await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:5})}
    assert.deepEqual(await placements(page),before)
    const ids=await page.locator('[data-group]').evaluateAll(ns=>ns.map(n=>n.dataset.slimeId)),outputs=await page.locator('[data-output]').evaluateAll(ns=>ns.map(n=>n.dataset.cell).sort()),keep=await page.locator('[data-remainder]').evaluateAll(ns=>ns.map(n=>n.dataset.slimeId))
    assert(ids.length>=3)
    if(width===390&&label==='11体マージ')await page.screenshot({path:path.join(dir,'mobile-zoom-preview.png'),type:'png'})
    if(mobile)await touch('touchEnd',[]);else await page.mouse.up()
    const after=await placements(page);assert.equal(after.length,count);assert(ids.every(id=>!after.some(s=>s.id===id)))
    const created=after.filter(s=>!before.some(t=>t.id===s.id));assert.deepEqual(created.map(s=>s.cell).sort(),outputs)
    for(const id of keep)assert.deepEqual(after.find(s=>s.id===id),before.find(s=>s.id===id))
    assert.match(await page.getByTestId('status').innerText(),/マージ成功/)
    await page.getByTestId('viewport').dispatchEvent('pointerup',{pointerId:1,clientX:b.x,clientY:b.y});assert.deepEqual(await placements(page),after)
   })
   await check(`${name} zoomed different-tier swaps; outside/Escape/cancel/lost capture/blur preserve state`,async()=>{
    for(const mode of ['different','outside','escape','pointercancel','lostpointercapture','blur']){
     // Phase3A different-tier swaps change positions; restore each independent cancellation fixture.
     await preset(page,'高Tier試験');await cameraAction(page,'拡大');const e=await center(page,'[data-cell="3,0"]');await page.mouse.move(e.x,e.y);await page.mouse.down();await page.mouse.move(e.x+8,e.y);await page.mouse.up()
     const before=await placements(page),a=await center(page,'[data-slime-id="seed-0"]'),b=await center(page,mode==='different'?'[data-slime-id="cap-1"]':'[data-slime-id="seed-1"]')
     await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y)
     if(mode==='outside')await page.mouse.move(1,1)
     if(mode==='escape')await page.keyboard.press('Escape')
     if(mode==='pointercancel'||mode==='lostpointercapture')await page.getByTestId('viewport').dispatchEvent(mode,{pointerId:1})
     if(mode==='blur')await page.evaluate(()=>window.dispatchEvent(new Event('blur')))
     await page.mouse.up();if(mode==='different'){const after=await placements(page);assert.equal(after.find(s=>s.id==='seed-0').cell,before.find(s=>s.id==='cap-1').cell);assert.equal(after.find(s=>s.id==='cap-1').cell,before.find(s=>s.id==='seed-0').cell)}else assert.deepEqual(await placements(page),before,mode)
    }
   })
   await check(`${name} resize/rotation cancels pending drag and safely refits then merges`,async()=>{
    await preset(page,'3体マージ');const before=await placements(page),a=await center(page,'[data-slime-id="drag"]'),b=await center(page,'[data-cell="2,2"]')
    await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y)
    await page.setViewportSize({width:height,height:width});await page.waitForTimeout(60);await page.mouse.up();assert.deepEqual(await placements(page),before);assert.equal(+await page.getByTestId('viewport').getAttribute('data-zoom'),1)
    const m=await metrics(page);assert(m.scrollHeight<=m.clientHeight+1&&m.scrollWidth<=m.clientWidth+1)
    await page.setViewportSize({width,height});await page.waitForTimeout(60)
    const src=await center(page,'[data-slime-id="drag"]'),dest=await center(page,'[data-cell="2,2"]');await page.mouse.move(src.x,src.y);await page.mouse.down();await page.mouse.move(dest.x,dest.y);await page.mouse.up();assert.equal((await placements(page)).length,1)
   })
   await context.close()
  }
  assert.deepEqual(errors,[])
 }finally{
  fs.writeFileSync(path.join(dir,'browser-results.json'),JSON.stringify({browser:browser?.version(),playwright:require((process.env.PLAYWRIGHT_MODULE||'playwright')+'/package.json').version,checks,errors,measurements},null,2))
  if(browser)await browser.close();for(const server of servers)server.kill()
 }
 console.log(JSON.stringify({passed:checks.filter(c=>c.result==='PASS').length,failed:checks.filter(c=>c.result==='FAIL').length,errors,dir}))
}
run().catch(e=>{console.error(e);process.exitCode=1})

