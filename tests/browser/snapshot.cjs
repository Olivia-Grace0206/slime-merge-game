/* Historical browser fixtures use number expectations for safe amounts only. Keep unsafe amounts
 * as bigint, so precision can never be silently lost. Does not touch actual saved bytes.
 */
function normaliseSnapshot(s){
 if(!s)return s
 for(const [obj,keys]of [[s.wallet,['gold']],[s.event,['unitGOLD','receivedGOLD','cappedGOLD']],[s.lastEvent,['receivedGOLD']]])if(obj)for(const k of keys)if(typeof obj[k]==='string'&&/^(0|[1-9][0-9]*)$/.test(obj[k])){const value=BigInt(obj[k]);obj[k]=value<=BigInt(Number.MAX_SAFE_INTEGER)?Number(value):value}
 // Model the decoded initial land when a fixture has not yet been written by the first action.
 if(s.version<8&&s.game?.bounds.width===4&&s.game.bounds.height===4)s.game.bounds={...s.game.bounds,width:8,height:8,plots:['A']}
 return s
}
module.exports={normaliseSnapshot}
