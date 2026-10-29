(() => {
  "use strict";
  const repo = "WOOSEOK99/EKMAME_IPS";
  const api = "https://api.github.com/repos/" + repo;
  const root = "EKIPS_7z/";
  const limit = 5;
  const list = document.querySelector("#recentUpdatesList");
  const status = document.querySelector("#recentUpdatesStatus");
  if (!list || !status) return;

  const make = (tag, cls, content) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (content !== undefined) node.textContent = content;
    return node;
  };
  async function readJson(url) {
    const r = await fetch(url, {cache:"no-store"});
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  }
  function time(value) {
    if (!value || Number.isNaN(Date.parse(value))) return "날짜 확인 불가";
    return new Date(value).toLocaleString("ko-KR", {timeZone:"Asia/Seoul", year:"numeric",month:"2-digit",day:"2-digit"});
  }
  function flatten(commits) {
    const result = [], visited = new Set();
    for (const commit of commits) {
      for (const file of commit.files || []) {
        if (!file.filename || !file.filename.startsWith(root) || visited.has(file.filename)) continue;
        visited.add(file.filename);
        if (file.status === "removed") continue;
        result.push({file,sha:commit.sha,date:commit.date});
      }
    }
    return result.slice(0, 30);
  }
  function render(data, fallback=false) {
    if (!Array.isArray(data.commits)) throw new Error("Invalid patch history");
    const entries = flatten(data.commits);
    const fragment = document.createDocumentFragment();
    for (const entry of entries) {
      const {file, sha, date} = entry;
      const row = make("div", "recent-file");
      const state = file.status === "added" ? "added" : file.status === "modified" ? "modified" : file.status === "renamed" ? "renamed" : "changed";
      const labels = {added:"NEW",modified:"수정",renamed:"이름 변경",changed:"변경"};
      row.appendChild(make("span", "recent-file-tag recent-file-" + state, labels[state]));
      const path = file.filename.split("/").map(encodeURIComponent).join("/");
      const a = make("a", "recent-file-name", file.filename.slice(root.length));
      a.href = "https://github.com/" + repo + "/blob/" + encodeURIComponent(sha) + "/" + path;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      row.appendChild(a);
      row.appendChild(make("span", "recent-commit-meta", time(date)));
      fragment.appendChild(row);
    }
    list.replaceChildren(fragment);
    status.textContent = entries.length
      ? "EKIPS_7z 최근 추가/수정된 패치 " + entries.length + "개" + (fallback ? " · 저장된 변경 내역" : " · 최신 GitHub 기록")
      : "최근 추가되거나 수정된 패치 파일이 없습니다.";
  }
  async function live() {
    const commits = await readJson(api + "/commits?sha=main&path=EKIPS_7z&per_page=" + limit);
    if (!Array.isArray(commits)) throw new Error("Invalid commits");
    const details = await Promise.allSettled(commits.map(c => readJson(api + "/commits/" + encodeURIComponent(c.sha))));
    if (details.some(r => r.status !== "fulfilled")) throw new Error("Incomplete commit details");
    return {commits:details.map((r,i) => {
      const value=r.value;
      if (!Array.isArray(value.files)) throw new Error("Incomplete files");
      return {sha:commits[i].sha,date:value.commit?.committer?.date || value.commit?.author?.date,
        files:value.files.filter(f=>f.filename?.startsWith(root)).map(f=>({filename:f.filename,status:f.status}))};
    })};
  }
  async function start() {
    try {
      const snapshot = await readJson("./data/patch-updates.json");
      render(snapshot,true);
    } catch (error) {
      console.warn("패치 업데이트 저장 목록 조회 실패",error);
      status.textContent = "최신 패치 목록을 확인하는 중입니다.";
    }
    try { render(await live()); }
    catch (error) {
      console.warn("패치 업데이트 실시간 조회 실패",error);
      if (!list.childElementCount) status.textContent = "패치 변경 내역을 불러오지 못했습니다. GitHub에서 확인해 주세요.";
    }
  }
  start();
})();
