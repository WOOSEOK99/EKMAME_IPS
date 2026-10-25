const state={patches:[],filtered:[],selected:new Set(),query:"",sort:"game"};
const els={patchList:document.querySelector("#patchList"),emptyState:document.querySelector("#emptyState"),emptyTitle:document.querySelector("#emptyTitle"),emptyMessage:document.querySelector("#emptyMessage"),searchInput:document.querySelector("#searchInput"),sortSelect:document.querySelector("#sortSelect"),selectVisibleBtn:document.querySelector("#selectVisibleBtn"),clearSelectionBtn:document.querySelector("#clearSelectionBtn"),selectedDownloadBtn:document.querySelector("#selectedDownloadBtn"),bulkDownloadBtn:document.querySelector("#bulkDownloadBtn"),patchCount:document.querySelector("#patchCount"),gameCount:document.querySelector("#gameCount"),selectedCount:document.querySelector("#selectedCount"),selectedSize:document.querySelector("#selectedSize"),barSelectedCount:document.querySelector("#barSelectedCount"),barSelectedSize:document.querySelector("#barSelectedSize"),resultSummary:document.querySelector("#resultSummary"),toast:document.querySelector("#toast")};

function bytes(value){const n=Number(value)||0;if(!n)return"0 B";const units=["B","KB","MB","GB"];const i=Math.min(Math.floor(Math.log(n)/Math.log(1024)),units.length-1);return `${(n/1024**i).toFixed(i===0?0:1)} ${units[i]}`}
function text(v){return String(v??"")}
function escapeHtml(v){return text(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function idFor(p,i){return p.id||p.rom||p.file||String(i)}
function searchable(p){return [p.game,p.rom,p.title,p.description,p.file,p.category].map(text).join(" ").toLowerCase()}
function compare(a,b){if(state.sort==="updated")return text(b.updated).localeCompare(text(a.updated));if(state.sort==="rom")return text(a.rom).localeCompare(text(b.rom),"en",{numeric:true});return text(a.game).localeCompare(text(b.game),"ko",{numeric:true})||text(a.rom).localeCompare(text(b.rom),"en",{numeric:true})}
function applyFilters(){const q=state.query.trim().toLowerCase();state.filtered=state.patches.filter(p=>!q||searchable(p).includes(q)).sort(compare);render()}
function render(){
  els.patchList.innerHTML="";
  const frag=document.createDocumentFragment();
  state.filtered.forEach((p,i)=>{
    const id=idFor(p,i);
    const row=document.createElement("article");
    row.className="patch-row";
    const url=p.download_url||p.url||"";
    row.innerHTML=`
      <input class="patch-check" type="checkbox" aria-label="${escapeHtml(p.title||p.rom||"패치")} 선택" data-id="${escapeHtml(id)}" ${state.selected.has(id)?"checked":""}>
      <div class="patch-main">
        <div class="patch-top">
          <span class="game-name">${escapeHtml(p.game||"Unknown Game")}</span>
          <span class="rom-name">${escapeHtml(p.rom||"-")}</span>
        </div>
        <div class="patch-title">${escapeHtml(p.title||p.description||p.file||"IPS Patch")}</div>
        <div class="patch-meta">
          ${p.file?`<span>${escapeHtml(p.file)}</span>`:""}
          ${p.updated?`<span>업데이트 ${escapeHtml(p.updated)}</span>`:""}
          ${p.author?`<span>by ${escapeHtml(p.author)}</span>`:""}
        </div>
      </div>
      <div class="patch-actions">
        <span class="file-size">${bytes(p.size)}</span>
        ${url?`<a class="icon-btn" href="${escapeHtml(url)}" download>다운로드 ↓</a>`:`<button class="icon-btn" type="button" disabled>준비 중</button>`}
      </div>`;
    frag.appendChild(row);
  });
  els.patchList.appendChild(frag);
  els.emptyState.hidden=state.filtered.length>0;
  if(!state.patches.length){els.emptyTitle.textContent="등록된 패치가 없습니다.";els.emptyMessage.textContent="GitHub Releases에 패치를 올린 뒤 data/patches.json에 목록을 추가하면 여기에 표시됩니다."}
  else if(!state.filtered.length){els.emptyTitle.textContent="검색 결과가 없습니다.";els.emptyMessage.textContent="다른 게임명, ROM명 또는 패치명으로 검색해 보세요."}
  els.resultSummary.textContent=`${state.filtered.length}개 표시 / 전체 ${state.patches.length}개`;
  bindChecks();
  updateStats();
}
function bindChecks(){document.querySelectorAll(".patch-check").forEach(cb=>cb.addEventListener("change",e=>{e.target.checked?state.selected.add(e.target.dataset.id):state.selected.delete(e.target.dataset.id);updateStats()}))}
function selectedPatches(){return state.patches.filter((p,i)=>state.selected.has(idFor(p,i)))}
function updateStats(){
  const selected=selectedPatches();
  const size=selected.reduce((sum,p)=>sum+(Number(p.size)||0),0);
  const count=selected.length;
  els.patchCount.textContent=state.patches.length.toLocaleString();
  els.gameCount.textContent=new Set(state.patches.map(p=>p.game).filter(Boolean)).size.toLocaleString();
  els.selectedCount.textContent=count.toLocaleString();
  els.selectedSize.textContent=bytes(size);
  els.barSelectedCount.textContent=count.toLocaleString();
  els.barSelectedSize.textContent=bytes(size);
  els.selectedDownloadBtn.disabled=!selected.some(p=>p.download_url||p.url);
  els.bulkDownloadBtn.disabled=!state.patches.some(p=>p.bundle_url)||!state.patches.find(p=>p.bundle_url);
}
function toast(msg){els.toast.textContent=msg;els.toast.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>els.toast.classList.remove("show"),2600)}
async function sequentialDownload(items){
  const urls=items.map(p=>p.download_url||p.url).filter(Boolean);
  if(!urls.length){toast("다운로드 주소가 등록된 항목이 없습니다.");return}
  toast(`${urls.length}개 파일 다운로드를 시작합니다. 브라우저가 여러 파일 다운로드를 확인할 수 있습니다.`);
  for(const url of urls){
    const a=document.createElement("a");a.href=url;a.download="";a.rel="noopener";document.body.appendChild(a);a.click();a.remove();
    await new Promise(r=>setTimeout(r,450));
  }
}
els.searchInput.addEventListener("input",e=>{state.query=e.target.value;applyFilters()});
els.sortSelect.addEventListener("change",e=>{state.sort=e.target.value;applyFilters()});
els.selectVisibleBtn.addEventListener("click",()=>{state.filtered.forEach((p,i)=>state.selected.add(idFor(p,i)));render()});
els.clearSelectionBtn.addEventListener("click",()=>{state.selected.clear();render()});
els.selectedDownloadBtn.addEventListener("click",()=>sequentialDownload(selectedPatches()));
els.bulkDownloadBtn.addEventListener("click",()=>{
  const bundle=state.patches.find(p=>p.bundle_url)?.bundle_url;
  if(bundle)location.href=bundle;
});
fetch("./data/patches.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json()}).then(data=>{
  const payload=Array.isArray(data)?{patches:data}:data;
  state.patches=Array.isArray(payload.patches)?payload.patches:[];
  if(payload.bundle_url&&state.patches.length)state.patches[0].bundle_url=payload.bundle_url;
  applyFilters();
}).catch(err=>{console.error(err);els.resultSummary.textContent="패치 목록을 불러오지 못했습니다.";els.emptyState.hidden=false;els.emptyTitle.textContent="패치 목록 로드 실패";els.emptyMessage.textContent="data/patches.json 파일을 확인해 주세요.";updateStats()});
