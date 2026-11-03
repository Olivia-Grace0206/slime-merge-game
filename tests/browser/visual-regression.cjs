/* A frozen production artifact for both retained regressions and visual acceptance. */
const {spawn}=require('node:child_process'),fs=require('node:fs'),path=require('node:path')
const root=process.env.BROWSER_ARTIFACT_DIR||'docs/validation/phase3c-polish/regression'
fs.mkdirSync(root,{recursive:true})
async function run(){let server
try{
 server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','5176','--strictPort',...(process.env.BROWSER_DIST?['--outDir',process.env.BROWSER_DIST]:[])])
 await new Promise((res,rej)=>{server.stdout.on('data',d=>{if(String(d).includes('Local:'))res()});server.on('exit',rej)})
 const status=[]
 for(const name of ['phase1-1','phase3a','followup','polish-input','phase2-polish','phase1','followup-compare','phase3b','phase3b1','phase3b1-performance','phase3c','visual-polish']){
  const log=fs.openSync(path.join(root,name+'-run.txt'),'w'),child=spawn(process.execPath,['tests/browser/'+name+'.cjs'],{env:{...process.env,GAME_URL:'http://127.0.0.1:5176/slime-merge-game/',BROWSER_ARTIFACT_DIR:path.join(root,name),VP_DIST:process.env.BROWSER_DIST||'dist'},stdio:['ignore',log,log]})
  const code=await new Promise(res=>child.on('exit',res));fs.closeSync(log);status.push({name,code});console.log(name,code)
 }
 fs.writeFileSync(path.join(root,'suite-status.json'),JSON.stringify(status,null,2));if(status.some(s=>s.code!==0))process.exitCode=1
}finally{server?.kill()}}
run().catch(e=>{console.error(e);process.exitCode=1})
