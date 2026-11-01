/* Run all retained regression suites against one production preview. No app hooks/dependencies. */
const {spawn}=require('node:child_process'),fs=require('node:fs'),path=require('node:path')
const root=process.env.BROWSER_ARTIFACT_DIR||'docs/validation/phase3b/regression-browser'
fs.mkdirSync(root,{recursive:true})
async function run(){let server
try{
 server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','5173','--strictPort'])
 await new Promise((res,rej)=>{server.stdout.on('data',d=>{if(String(d).includes('Local:'))res()});server.on('exit',rej)})
 const results=[]
 for(const name of ['phase1-1','phase3a','followup','polish-input','phase2-polish','phase1','followup-compare','phase3b']){
  const out=path.join(root,name),log=fs.openSync(path.join(root,`${name}-run.txt`),'w')
  const child=spawn(process.execPath,[`tests/browser/${name}.cjs`],{env:{...process.env,GAME_URL:'http://127.0.0.1:5173/slime-merge-game/',BROWSER_ARTIFACT_DIR:out},stdio:['ignore',log,log]})
  const code=await new Promise(res=>child.on('exit',res));fs.closeSync(log);results.push({suite:name,code});console.log(name,code)
 }
 fs.writeFileSync(path.join(root,'suite-status.json'),JSON.stringify(results,null,2))
 if(results.some(r=>r.code!==0))process.exitCode=1
}finally{server?.kill()}}
run().catch(e=>{console.error(e);process.exitCode=1})
