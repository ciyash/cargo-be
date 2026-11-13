// Per-process guard for public credential endpoints. Production clusters also need an edge/shared limit.
export function authenticationThrottle({now=Date.now,loginLimit=10,ipLimit=300,windowMs=15*60*1000}={}) {
  const entries=new Map();
  const login=new Set(['/auth/login','/company/login','/company/subsidiary/login','/subadmin-auth/login']);
  const recovery=new Set(['/subadmin-auth/forgot-password','/subadmin-auth/reset-password']);
  return (req,res,next)=>{
    const path=req.path.replace(/\/+$/,'');
    if(req.method!=='POST'||!login.has(path)&&!recovery.has(path))return next();
    const time=now();for(const [key,entry] of entries)if(entry.until<=time)entries.delete(key);
    const ip=req.ip||req.socket?.remoteAddress||'unknown';
    const raw=req.body?.identifier??req.body?.email;
    const identity=typeof raw==='string'?raw.trim().toLowerCase().slice(0,254):'';
    const kind=login.has(path)?'login':path.endsWith('forgot-password')?'forgot':'reset';
    const keys=[{key:'ip:'+ip,limit:ipLimit}];
    if(identity)keys.push({key:kind+':'+(kind==='forgot'?'':ip+':')+identity,limit:kind==='forgot'?3:loginLimit});
    for(const item of keys){const entry=entries.get(item.key);if(entry&&entry.count>=item.limit){res.set('Retry-After',String(Math.max(1,Math.ceil((entry.until-time)/1000))));return res.status(429).json({message:'Too many attempts. Please try again later.'});}}
    if(entries.size>10000)return res.status(429).json({message:'Please try again later.'});
    for(const item of keys){const entry=entries.get(item.key)||{count:0,until:time+windowMs};entry.count++;entries.set(item.key,entry);}
    if(kind==='login')res.once('finish',()=>{if(res.statusCode>=200&&res.statusCode<300&&keys[1])entries.delete(keys[1].key);});
    next();
  };
}
