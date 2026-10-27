const state = { files: [], filtered: [], selected: new Set(), query: "", sort: "name" };
const els = {
  list: document.querySelector("#mngList"),
  empty: document.querySelector("#emptyState"),
  emptyTitle: document.querySelector("#emptyTitle"),
  emptyMessage: document.querySelector("#emptyMessage"),
  search: document.querySelector("#searchInput"),
  sort: document.querySelector("#sortSelect"),
  summary: document.querySelector("#resultSummary"),
  fileCount: document.querySelector("#fileCount"),
  totalSize: document.querySelector("#totalSize"),
  selectedCount: document.querySelector("#selectedCount"),
  selectedSize: document.querySelector("#selectedSize"),
  barSelectedCount: document.querySelector("#barSelectedCount"),
  barSelectedSize: document.querySelector("#barSelectedSize"),
  selectedDownload: document.querySelector("#selectedDownloadBtn"),
  toast: document.querySelector("#toast")
};
const releaseUrlPrefix = "https://github.com/WOOSEOK99/EKMAME_IPS/releases/download/mng-001/";
const mp3UrlPrefix = "https://github.com/WOOSEOK99/EKMAME_IPS/releases/download/mp3-";

function readableSize(value) {
  const n = Number(value) || 0;
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
  return (n / 1024 ** i).toFixed(i === 0 ? 0 : 1) + " " + units[i];
}
function safeUrl(file) {
  return typeof file.url === "string" && file.url.startsWith(releaseUrlPrefix) ? file.url : "";
}
function safeMp3Url(file) {
  return typeof file.mp3_url === "string" && file.mp3_url.startsWith(mp3UrlPrefix) ? file.mp3_url : "";
}
function pairSize(file) {
  return file.size + (safeMp3Url(file) ? (Number(file.mp3_size) || 0) : 0);
}
function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.remove("show"), 3000);
}
function updateStats() {
  const selected = state.files.filter(file => state.selected.has(file.name));
  const count = selected.length;
  const size = selected.reduce((sum, file) => sum + pairSize(file), 0);
  els.fileCount.textContent = state.files.length.toLocaleString();
  els.totalSize.textContent = readableSize(state.files.reduce((sum, file) => sum + pairSize(file), 0));
  els.selectedCount.textContent = count.toLocaleString();
  els.selectedSize.textContent = readableSize(size);
  els.barSelectedCount.textContent = count.toLocaleString();
  els.barSelectedSize.textContent = readableSize(size);
  els.selectedDownload.disabled = !selected.some(safeUrl);
}
function render() {
  const fragment = document.createDocumentFragment();
  state.filtered.forEach(file => {
    const row = document.createElement("article");
    row.className = "patch-row";

    const checkbox = document.createElement("input");
    checkbox.className = "patch-check";
    checkbox.type = "checkbox";
    checkbox.checked = state.selected.has(file.name);
    checkbox.setAttribute("aria-label", file.name + " 선택");
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) state.selected.add(file.name);
      else state.selected.delete(file.name);
      updateStats();
    });

    const main = document.createElement("div");
    main.className = "patch-main";
    const top = document.createElement("div");
    top.className = "patch-top";
    const rom = document.createElement("span");
    rom.className = "game-name";
    rom.textContent = file.name.replace(/\.mng$/i, "");
    top.appendChild(rom);
    const title = document.createElement("div");
    title.className = "patch-title";
    title.textContent = file.name;
    main.appendChild(top);
    main.appendChild(title);

    const meta = document.createElement("div");
    meta.className = "patch-meta";
    const mngInfo = document.createElement("span");
    mngInfo.textContent = "MNG " + readableSize(file.size);
    meta.appendChild(mngInfo);
    const mp3Url = safeMp3Url(file);
    const mp3Info = document.createElement("span");
    mp3Info.textContent = mp3Url ? "MP3 " + readableSize(file.mp3_size) : "MP3 없음";
    meta.appendChild(mp3Info);
    main.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "patch-actions";
    actions.style.flexWrap = "wrap";
    const mngUrl = safeUrl(file);
    if (mngUrl) {
      const link = document.createElement("a");
      link.className = "icon-btn";
      link.href = mngUrl;
      link.download = file.name;
      link.textContent = "MNG ↓";
      actions.appendChild(link);
    }
    if (mp3Url) {
      const link = document.createElement("a");
      link.className = "icon-btn";
      link.href = mp3Url;
      link.download = file.mp3_name;
      link.textContent = "MP3 ↓";
      actions.appendChild(link);
    }

    row.appendChild(checkbox);
    row.appendChild(main);
    row.appendChild(actions);
    fragment.appendChild(row);
  });
  els.list.replaceChildren(fragment);
  els.empty.hidden = state.filtered.length > 0;
  if (!state.filtered.length && state.files.length) {
    els.emptyTitle.textContent = "검색 결과가 없습니다.";
    els.emptyMessage.textContent = "다른 ROM명이나 파일명으로 검색해 보세요.";
  }
  els.summary.textContent = state.filtered.length + "개 표시 / 전체 " + state.files.length + "개";
  updateStats();
}
function applyFilters() {
  const term = state.query.trim().toLowerCase();
  state.filtered = state.files.filter(file => file.name.toLowerCase().includes(term));
  if (state.sort === "size") state.filtered.sort((a, b) => b.size - a.size || a.name.localeCompare(b.name, "en", { numeric: true }));
  else state.filtered.sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }));
  render();
}
els.search.addEventListener("input", event => { state.query = event.target.value; applyFilters(); });
els.sort.addEventListener("change", event => { state.sort = event.target.value; applyFilters(); });
document.querySelector("#selectVisibleBtn").addEventListener("click", () => {
  state.filtered.forEach(file => state.selected.add(file.name));
  render();
});
document.querySelector("#clearSelectionBtn").addEventListener("click", () => {
  state.selected.clear();
  render();
});
els.selectedDownload.addEventListener("click", async () => {
  const downloads = [];
  state.files.filter(file => state.selected.has(file.name)).forEach(file => {
    if (safeUrl(file)) downloads.push({ name: file.name, url: file.url });
    if (safeMp3Url(file)) downloads.push({ name: file.mp3_name, url: file.mp3_url });
  });
  if (!downloads.length) return;
  showToast(downloads.length + "개 파일 다운로드를 시작합니다. 브라우저가 여러 파일 다운로드 허용을 요청할 수 있습니다.");
  for (const file of downloads) {
    const link = document.createElement("a");
    link.href = file.url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    await new Promise(resolve => setTimeout(resolve, 500));
  }
});
fetch("./data/mng.json", { cache: "no-store" })
  .then(response => { if (!response.ok) throw new Error("HTTP " + response.status); return response.json(); })
  .then(data => {
    if (!Array.isArray(data.files)) throw new Error("Invalid MNG manifest");
    state.files = data.files.filter(file =>
      file && typeof file.name === "string" && Number.isFinite(file.size) && file.size > 0 && safeUrl(file)
    );
    applyFilters();
  })
  .catch(error => {
    console.error(error);
    els.summary.textContent = "MNG 목록을 불러오지 못했습니다.";
    els.empty.hidden = false;
    els.emptyTitle.textContent = "목록 로드 실패";
    els.emptyMessage.textContent = "data/mng.json 파일을 확인해 주세요.";
    updateStats();
  });
