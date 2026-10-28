const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const categories=["posters","logos","album-artwork","motion-graphics"];
function mediaMarkup(p){const url=p.media||p.thumbnail;if(!url)return '<div class="project-placeholder">MEDIA PREVIEW</div>';const type=(p.mediaType||"").toLowerCase();if(type.startsWith("video")||/\.(mp4|webm|mov)(?:$|\?)/i.test(url))return `<video src="${esc(url)}" ${p.thumbnail?`poster="${esc(p.thumbnail)}"`:""} muted playsinline controls preload="metadata"></video>`;return `<img src="${esc(url)}" alt="${esc(p.title)}" loading="lazy">`;}
async function loadDesign(){let projects=[];try{const r=await fetch("/api/design",{cache:"no-store"});if(r.ok)projects=await r.json();}catch{}for(const category of categories){const items=projects.filter(p=>p.category===category).sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0)||(Number(b.year)||0)-(Number(a.year)||0));const grid=document.querySelector(`[data-category="${category}"]`);document.querySelector(`[data-count="${category}"]`).textContent=`${String(items.length).padStart(2,"0")} PROJECT${items.length===1?"":"S"}`;grid.innerHTML=items.length?items.map(p=>`<article class="project-card"><div class="project-media">${mediaMarkup(p)}</div><div class="project-meta"><div class="project-title">${esc(p.title)}</div><span class="project-year">${esc(p.year||"")}</span></div>${p.description?`<p class="project-description">${esc(p.description)}</p>`:""}</article>`).join(""):'<p class="no-projects">PROJECTS WILL APPEAR HERE.</p>';}}
// Click a design image to view it at full size; click it again (or outside it) to close.
function ensureLightbox(){
  let box=document.querySelector(".design-lightbox");
  if(box)return box;
  box=document.createElement("div");
  box.className="design-lightbox";
  box.hidden=true;
  box.setAttribute("role","dialog");
  box.setAttribute("aria-modal","true");
  box.setAttribute("aria-label","Expanded design image");
  box.innerHTML='<button class="design-lightbox-close" type="button" aria-label="Close expanded image">×</button><img alt="">';
  document.body.appendChild(box);
  const close=()=>{box.hidden=true;document.body.classList.remove("lightbox-open");};
  box.addEventListener("click",close);
  box.querySelector("img").addEventListener("click",e=>{e.stopPropagation();close();});
  box.querySelector(".design-lightbox-close").addEventListener("click",close);
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!box.hidden)close();});
  return box;
}
document.addEventListener("click",e=>{
  const thumb=e.target.closest(".project-media img");
  if(!thumb)return;
  const box=ensureLightbox();
  const full=box.querySelector("img");
  full.src=thumb.currentSrc||thumb.src;
  full.alt=thumb.alt||"Expanded design image";
  box.hidden=false;
  document.body.classList.add("lightbox-open");
});
loadDesign();