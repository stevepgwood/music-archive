const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json",...headers}});
const readTracks=async env=>{const o=await env.BUCKET.get("tracks.json");return o?o.json():[]};
const writeTracks=(env,t)=>env.BUCKET.put("tracks.json",JSON.stringify(t),{httpMetadata:{contentType:"application/json"}});

const readSite=async env=>{const o=await env.BUCKET.get("site.json");return o?o.json():{}};
const writeSite=(env,s)=>env.BUCKET.put("site.json",JSON.stringify(s),{httpMetadata:{contentType:"application/json"}});
// If MEDIA_BASE is set (public R2 address), audio/artwork URLs point straight at R2 instead of through the Worker.
const mediaUrl=(env,u)=>{if(!u)return "";const b=(env.MEDIA_BASE||"").trim().replace(/\/$/,"");return b?b+u.slice(6):u};
const pub=(env,t)=>({...t,audio:mediaUrl(env,t.audio),artwork:mediaUrl(env,t.artwork),download:t.audio?"/download/"+t.audio.slice(7):""});

// Admin check: the password arrives in the x-admin-password header and is compared in constant time.
async function isAdmin(request,env){
  const enc=new TextEncoder(),h=s=>crypto.subtle.digest("SHA-256",enc.encode(String(s).trim()));
  const [a,b]=await Promise.all([h(request.headers.get("x-admin-password")||""),h(env.ADMIN_PASSWORD)]);
  return crypto.subtle.timingSafeEqual(a,b);
}

const IMG={jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",webp:"image/webp",gif:"image/gif"};
const KINDS={audio:{mp3:"audio/mpeg",wav:"audio/wav",flac:"audio/flac",m4a:"audio/mp4",aac:"audio/aac",ogg:"audio/ogg"},
  art:IMG,site:IMG};

// Streams the raw file body straight into R2 (no buffering in memory).
async function upload(request,env,url){
  const kind=url.searchParams.get("kind"),ext=(url.searchParams.get("ext")||"").toLowerCase(),name=url.searchParams.get("name");
  const type=KINDS[kind]&&KINDS[kind][ext];
  if(!type||!request.body)return json({error:"Unsupported or empty file."},400);
  if(kind==="site"&&!["logo","banner"].includes(name))return json({error:"Bad image name."},400);
  const key=kind==="site"?`site/${name}-${crypto.randomUUID()}.${ext}`:`${kind}/${crypto.randomUUID()}.${ext}`;
  await env.BUCKET.put(key,request.body,{httpMetadata:{contentType:type,cacheControl:"public, max-age=31536000, immutable"}});
  if(kind==="site"){const st=await readSite(env);if(st[name])await env.BUCKET.delete(st[name].slice(7));st[name]="/media/"+key;await writeSite(env,st);}
  return json({key});
}

async function removeSite(env,name){
  const st=await readSite(env);if(st[name])await env.BUCKET.delete(st[name].slice(7));
  delete st[name];await writeSite(env,st);return json({ok:true});
}

// Download button: same-origin, forces a "Save as" with a nice filename (works even when audio is served from a public R2 domain).
async function download(env,key){
  if(!/^audio\/[\w.-]+$/.test(key))return new Response("Not found",{status:404});
  const t=(await readTracks(env)).find(x=>x.audio==="/media/"+key);
  const obj=t&&await env.BUCKET.get(key);
  if(!obj)return new Response("Not found",{status:404});
  const name=[t.artist,t.title].filter(Boolean).join(" - ")+"."+key.split(".").pop();
  const h=new Headers();obj.writeHttpMetadata(h);h.set("content-length",String(obj.size));
  h.set("content-disposition",`attachment; filename="${name.replace(/[^\x20-\x7E]|["\\]/g,"_")}"; filename*=UTF-8''${encodeURIComponent(name)}`);
  return new Response(obj.body,{headers:h});
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
  if(!/^(audio|art|site)\/[\w.-]+$/.test(key))return new Response("Not found",{status:404});
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
    if(m==="GET"){
      if(path==="/api/tracks")return json((await readTracks(env)).map(t=>pub(env,t)),200,{"cache-control":"no-cache"});
      if(path==="/api/site"){const st=await readSite(env);return json({logo:mediaUrl(env,st.logo),banner:mediaUrl(env,st.banner)},200,{"cache-control":"no-cache"});}
      if(path.startsWith("/media/"))return media(request,env,path.slice(7));
      if(path.startsWith("/download/"))return download(env,path.slice(10));
    }
    if(path.startsWith("/api/")){
      if(!env.ADMIN_PASSWORD)return json({error:"The ADMIN_PASSWORD secret is not set on this Worker."},500);
      if(!await isAdmin(request,env))return json({error:"Wrong password."},401);
      if(path==="/api/upload"&&m==="PUT")return upload(request,env,url);
      if(path==="/api/tracks"&&m==="POST")return addTrack(request,env);
      const del=/^\/api\/tracks\/(\d+)$/.exec(path);
      if(del&&m==="DELETE")return removeTrack(env,Number(del[1]));
      const rs=/^\/api\/site\/(logo|banner)$/.exec(path);
      if(rs&&m==="DELETE")return removeSite(env,rs[1]);
    }
    return env.ASSETS.fetch(request);
  }
};
