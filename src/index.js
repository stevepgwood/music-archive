const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json",...headers}});
const readTracks=async env=>{const o=await env.BUCKET.get("tracks.json");return o?o.json():[]};
const writeTracks=(env,t)=>env.BUCKET.put("tracks.json",JSON.stringify(t),{httpMetadata:{contentType:"application/json"}});

// Admin check: the password arrives in the x-admin-password header and is compared in constant time.
async function isAdmin(request,env){
  if(!env.ADMIN_PASSWORD)return false;
  const enc=new TextEncoder(),h=s=>crypto.subtle.digest("SHA-256",enc.encode(s));
  const [a,b]=await Promise.all([h(request.headers.get("x-admin-password")||""),h(env.ADMIN_PASSWORD)]);
  return crypto.subtle.timingSafeEqual(a,b);
}

const KINDS={audio:{mp3:"audio/mpeg",wav:"audio/wav",flac:"audio/flac",m4a:"audio/mp4",aac:"audio/aac",ogg:"audio/ogg"},
  art:{jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",webp:"image/webp",gif:"image/gif"}};

// Streams the raw file body straight into R2 (no buffering in memory).
async function upload(request,env,url){
  const kind=url.searchParams.get("kind"),ext=(url.searchParams.get("ext")||"").toLowerCase();
  const type=KINDS[kind]&&KINDS[kind][ext];
  if(!type||!request.body)return json({error:"Unsupported or empty file."},400);
  const key=`${kind}/${crypto.randomUUID()}.${ext}`;
  await env.BUCKET.put(key,request.body,{httpMetadata:{contentType:type}});
  return json({key});
}

async function addTrack(request,env){
  const b=await request.json().catch(()=>({}));
  const valid=(k,p)=>typeof k==="string"&&k.startsWith(p)&&!k.includes("..");
  const s=v=>String(v||"").trim();
  if(!s(b.title)||!valid(b.audio,"audio/")||!await env.BUCKET.head(b.audio))return json({error:"A title and an uploaded audio file are required."},400);
  if(b.artwork&&!valid(b.artwork,"art/"))return json({error:"Bad artwork file."},400);
  const tracks=await readTracks(env);
  const t={id:Math.max(0,...tracks.map(x=>x.id))+1,title:s(b.title),artist:s(b.artist),genre:s(b.genre),bpm:Number(b.bpm)||0,key:s(b.key),
    date:s(b.date)||new Date().toISOString().slice(0,10),artwork:b.artwork?"/media/"+b.artwork:"",audio:"/media/"+b.audio};
  tracks.push(t);await writeTracks(env,tracks);return json(t);
}

async function removeTrack(env,id){
  const tracks=await readTracks(env),t=tracks.find(x=>x.id===id);
  if(!t)return json({error:"Not found"},404);
  await env.BUCKET.delete([t.audio,t.artwork].filter(Boolean).map(u=>u.replace("/media/","")));
  await writeTracks(env,tracks.filter(x=>x!==t));return json({ok:true});
}

// Public file server for uploaded audio/artwork, with Range support so seeking works in the player.
async function media(request,env,key){
  if(!/^(audio|art)\/[\w.-]+$/.test(key))return new Response("Not found",{status:404});
  const obj=await env.BUCKET.get(key,{range:request.headers});
  if(!obj)return new Response("Not found",{status:404});
  const h=new Headers();obj.writeHttpMetadata(h);
  h.set("etag",obj.httpEtag);h.set("accept-ranges","bytes");h.set("cache-control","public, max-age=31536000, immutable");
  const r=obj.range;
  if(r){
    const start=r.suffix!==undefined?obj.size-r.suffix:(r.offset||0);
    const end=r.length!==undefined?start+r.length-1:obj.size-1;
    h.set("content-range",`bytes ${start}-${end}/${obj.size}`);h.set("content-length",String(end-start+1));
    return new Response(obj.body,{status:206,headers:h});
  }
  return new Response(obj.body,{headers:h});
}

export default {
  async fetch(request,env){
    const url=new URL(request.url),path=url.pathname,m=request.method;
    if(path==="/api/tracks"&&m==="GET")return json(await readTracks(env),200,{"cache-control":"no-cache"});
    if(path.startsWith("/media/")&&m==="GET")return media(request,env,path.slice(7));
    if(path.startsWith("/api/")){
      if(!await isAdmin(request,env))return json({error:"Wrong password."},401);
      if(path==="/api/upload"&&m==="PUT")return upload(request,env,url);
      if(path==="/api/tracks"&&m==="POST")return addTrack(request,env);
      const del=/^\/api\/tracks\/(\d+)$/.exec(path);
      if(del&&m==="DELETE")return removeTrack(env,Number(del[1]));
    }
    return env.ASSETS.fetch(request);
  }
};
