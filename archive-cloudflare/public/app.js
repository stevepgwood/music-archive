// Demo tracks are placeholders. Replace these with records from the secure backend in a later step.
const demoTracks = [
  {id:1,title:"LOCA",artist:"SWOOD",genre:"Hyperpop",bpm:150,key:"F minor",date:"2026-10-27",artwork:"",audio:""},
  {id:2,title:"Skullbead",artist:"SWOOD",genre:"Electronic",bpm:140,key:"D minor",date:"2026-09-25",artwork:"",audio:""},
  {id:3,title:"Track 003",artist:"SWOOD",genre:"Techno",bpm:132,key:"A minor",date:"2026-09-12",artwork:"",audio:""},
  {id:4,title:"Track 004",artist:"ST. OVE",genre:"Electropunk",bpm:160,key:"C minor",date:"2026-08-30",artwork:"",audio:""}
];
let tracks = [...demoTracks];
const $ = id => document.getElementById(id);
const audio = $("audio");
let currentTrackId = null;
let visibleTracks = [...tracks];
let sort = {field:"date",dir:"desc"};
// Circle-of-fifths rank: C, G, D, A, E, B, F#, Db, Ab, Eb, Bb, F — each major followed by its relative minor.
const PC={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
function keyRank(t){
  const m=/^\s*([A-G])([#b♯♭]?)\s*(minor|min|m|major|maj)?\s*$/i.exec(t.key||"");if(!m)return 99;
  const mode=m[3]||"",minor=mode==="m"||/^min/i.test(mode);
  let pc=PC[m[1].toUpperCase()]+(/[#♯]/.test(m[2])?1:/[b♭]/i.test(m[2])?-1:0)+(minor?3:0);
  pc=((pc%12)+12)%12;
  return (pc*7%12)*2+(minor?1:0);
}
const SORTERS={title:t=>t.title.toLowerCase(),genre:t=>(t.genre||"").toLowerCase(),bpm:t=>t.bpm||0,key:keyRank,date:t=>t.date||""};

function formatDate(date){if(!date)return "—";const [y,m,d]=date.split("-");return `${m}.${d}.${y.slice(2)}`;}
function formatTime(seconds){if(!Number.isFinite(seconds))return "0:00";const m=Math.floor(seconds/60);const s=Math.floor(seconds%60).toString().padStart(2,"0");return `${m}:${s}`;}
function coverMarkup(track, cls="cover"){return `<div class="${cls}">${track.artwork ? `<img src="${escapeAttr(track.artwork)}" alt="${escapeAttr(track.title)} artwork">` : escapeHtml(track.title.slice(0,2).toUpperCase())}</div>`;}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function escapeAttr(s){return escapeHtml(s);}
function populateGenres(){
  const select=$("genre-filter");const current=select.value;select.innerHTML='<option value="">ALL GENRES</option>';
  [...new Set(tracks.map(t=>t.genre).filter(Boolean))].sort().forEach(g=>{const o=document.createElement("option");o.value=g;o.textContent=g.toUpperCase();select.appendChild(o);});
  select.value=current;
}
function render(){
  const query=$("search").value.trim().toLowerCase();const genre=$("genre-filter").value;
  visibleTracks=tracks.filter(t=>(!genre||t.genre===genre)&&[t.title,t.artist,t.genre,t.key].join(" ").toLowerCase().includes(query));
  const f=SORTERS[sort.field];
  visibleTracks.sort((a,b)=>{const x=f(a),y=f(b);const c=typeof x==="number"?x-y:String(x).localeCompare(String(y));return sort.dir==="asc"?c:-c;});
  document.querySelectorAll(".track-header [data-sort]").forEach(btn=>btn.parentElement.setAttribute("aria-sort",btn.dataset.sort===sort.field?(sort.dir==="asc"?"ascending":"descending"):"none"));
  $("track-count").textContent=`${String(tracks.length).padStart(2,"0")} TRACKS`;
  $("index-count").textContent=`/ ${String(visibleTracks.length).padStart(2,"0")}`;
  $("track-list").innerHTML=visibleTracks.map((t,i)=>`
    <div class="track-row ${t.id===currentTrackId?"active":""}" role="row" tabindex="0" data-id="${t.id}" aria-label="Play ${escapeAttr(t.title)}">
      <span class="track-no">${String(i+1).padStart(2,"0")}</span>
      <div class="track-title-wrap">${coverMarkup(t)}<div style="min-width:0"><div class="track-title">${escapeHtml(t.title)}</div><div class="track-artist">${escapeHtml(t.artist)}</div></div></div>
      <span class="track-genre">${escapeHtml(t.genre)}</span>
      <span class="track-meta">${t.bpm||"—"}</span>
      <span class="track-meta track-key">${escapeHtml(t.key||"—")}</span>
      <span class="track-meta track-date">${formatDate(t.date)}</span>
      <button class="row-play" type="button" data-play="${t.id}" aria-label="Play ${escapeAttr(t.title)}">▶</button>
    </div>`).join("");
  $("empty-state").hidden=visibleTracks.length!==0;
}
function setPlayerArt(track){
  $("player-art").innerHTML=track.artwork?`<img src="${escapeAttr(track.artwork)}" alt="${escapeAttr(track.title)} artwork">`:escapeHtml(track.title.slice(0,2).toUpperCase());
}
function loadTrack(id,autoplay=true){
  const track=tracks.find(t=>t.id===Number(id));if(!track)return;
  currentTrackId=track.id;
  $("player-title").textContent=track.title;$("player-artist").textContent=track.artist;
  $("player-genre").textContent=(track.genre||"").toUpperCase();$("player-bpm").textContent=`${track.bpm||"—"} BPM`;
  setPlayerArt(track);render();
  if(track.audio){
    if(audio.src!==new URL(track.audio,location.href).href)audio.src=track.audio;
    if(autoplay)audio.play().catch(()=>{});
  }else{
    audio.pause();$("play").textContent="▶";
    $("current-time").textContent="0:00";$("duration").textContent="0:00";$("progress").value=0;
  }
}
$("track-list").addEventListener("click",e=>{
  const playButton=e.target.closest("[data-play]");const row=e.target.closest(".track-row");
  if(playButton){loadTrack(playButton.dataset.play);return;}
  if(row)loadTrack(row.dataset.id);
});
$("track-list").addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&e.target.classList.contains("track-row")){e.preventDefault();loadTrack(e.target.dataset.id);}});
["search","genre-filter"].forEach(id=>$(id).addEventListener(id==="search"?"input":"change",render));
$("clear-filters").addEventListener("click",()=>{$("search").value="";$("genre-filter").value="";sort={field:"date",dir:"desc"};render();});
$("play").addEventListener("click",()=>{if(!currentTrackId){if(visibleTracks[0])loadTrack(visibleTracks[0].id);return;}if(!audio.src){return;}if(audio.paused)audio.play().catch(()=>{});else audio.pause();});
$("prev").addEventListener("click",()=>stepTrack(-1));$("next").addEventListener("click",()=>stepTrack(1));
function stepTrack(direction){if(!visibleTracks.length)return;let index=visibleTracks.findIndex(t=>t.id===currentTrackId);index=index<0?0:(index+direction+visibleTracks.length)%visibleTracks.length;loadTrack(visibleTracks[index].id);}
audio.addEventListener("play",()=>$("play").textContent="Ⅱ");
audio.addEventListener("pause",()=>$("play").textContent="▶");
audio.addEventListener("loadedmetadata",()=>{$("duration").textContent=formatTime(audio.duration);});
audio.addEventListener("timeupdate",()=>{if(Number.isFinite(audio.duration)&&audio.duration>0){$("progress").value=(audio.currentTime/audio.duration)*100;$("current-time").textContent=formatTime(audio.currentTime);}});
$("progress").addEventListener("input",()=>{if(Number.isFinite(audio.duration)&&audio.duration>0)audio.currentTime=(Number($("progress").value)/100)*audio.duration;});
audio.addEventListener("ended",()=>stepTrack(1));
document.querySelector(".track-header").addEventListener("click",e=>{
  const b=e.target.closest("[data-sort]");if(!b)return;const f=b.dataset.sort;
  sort=sort.field===f?{field:f,dir:sort.dir==="asc"?"desc":"asc"}:{field:f,dir:f==="date"?"desc":"asc"};render();
});
populateGenres();render();
// Load real tracks from the backend; falls back to the demo tracks if there is no server.
fetch("/api/tracks").then(r=>r.ok?r.json():Promise.reject()).then(list=>{tracks=list;$("demo-note").hidden=true;populateGenres();render();}).catch(()=>{});
