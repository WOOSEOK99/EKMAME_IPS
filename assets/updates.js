(() => {
  "use strict";
  const repo = "WOOSEOK99/EKMAME_IPS";
  const api = "https://api.github.com/repos/" + repo;
  const root = "EKIPS_7z/";
  const initialCommit = "aaac8d82566f212b4fa340fdf54104795b1a0c9d";
  const initialDate = "2026-10-07T12:32:09Z";
  const dayMs = 24 * 60 * 60 * 1000;
  const pageSize = 100;
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
    const response = await fetch(url, {cache: "no-store"});
    if (!response.ok) throw new Error("HTTP " + response.status);
    return response.json();
  }
  function isPatchFile(filename) {
    return typeof filename === "string" &&
      filename.startsWith(root) && /\.(?:zip|7z)$/i.test(filename);
  }
  function cutoff() {
    return new Date(Date.now() - 30 * dayMs).toISOString();
  }
  function dateText(value) {
    if (!value || Number.isNaN(Date.parse(value))) return "날짜 확인 불가";
    return new Date(value).toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul", year: "numeric", month: "2-digit",
      day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false
    });
  }
  // A commit may touch the same file several times over 30 days.
  // Keep only its newest event, including deletions as hidden tombstones.
  function latestChanges(events) {
    const threshold = Date.now() - 30 * dayMs;
    const newest = new Map();
    for (const event of events) {
      if (!isPatchFile(event.filename) || !event.date || Date.parse(event.date) < threshold) continue;
      const prior = newest.get(event.filename);
      if (!prior || Date.parse(event.date) > Date.parse(prior.date) ||
          (event.date === prior.date && event.priority > prior.priority)) {
        newest.set(event.filename, event);
      }
    }
    return [...newest.values()].filter(e => e.status !== "removed")
      .sort((a, b) => Date.parse(b.date) - Date.parse(a.date) ||
        a.filename.localeCompare(b.filename, "en", {numeric: true}));
  }
  function commitEvents(commit, priority) {
    const date = commit.date;
    const sha = commit.sha;
    const output = [];
    for (const file of commit.files || []) {
      if (!isPatchFile(file.filename)) continue;
      output.push({filename:file.filename,status:file.status || "changed",date,sha,priority});
      if (file.status === "renamed" && isPatchFile(file.previous_filename)) {
        output.push({filename:file.previous_filename,status:"removed",date,sha,priority});
      }
    }
    return output;
  }
  function render(events, label) {
    const entries = latestChanges(events);
    const fragment = document.createDocumentFragment();
    const batch = 30;
    let shown = 0;
    function appendBatch() {
      const end = Math.min(shown + batch, entries.length);
      for (; shown < end; shown++) {
        const entry = entries[shown];
        const row = make("div", "recent-file");
        const kind = ["added","modified","renamed"].includes(entry.status) ? entry.status : "changed";
        const labels = {added:"NEW", modified:"수정", renamed:"이름 변경", changed:"변경"};
        row.appendChild(make("span", "recent-file-tag recent-file-" + kind, labels[kind]));
        const path = entry.filename.split("/").map(encodeURIComponent).join("/");
        const a = make("a", "recent-file-name", entry.filename.slice(root.length));
        a.href = "https://github.com/" + repo + "/blob/" + encodeURIComponent(entry.sha) + "/" + path;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.title = entry.filename;
        row.appendChild(a);
        row.appendChild(make("span", "recent-commit-meta", dateText(entry.date)));
        const commitLink = make("a", "recent-commit-link", "커밋");
        commitLink.href = "https://github.com/" + repo + "/commit/" + encodeURIComponent(entry.sha);
        commitLink.target = "_blank";
        commitLink.rel = "noopener noreferrer";
        row.appendChild(commitLink);
        fragment.appendChild(row);
      }
      list.appendChild(fragment);
      list.appendChild(more);
      more.textContent = `더 보기 (${(entries.length - shown).toLocaleString()}개 남음)`;
      more.hidden = shown >= entries.length;
      status.textContent = `최근 30일 변경된 패치 ${entries.length.toLocaleString()}개 · ${shown.toLocaleString()}개 표시 · ${label}`;
    }
    list.replaceChildren();
    const more = make("button", "btn btn-secondary", "더 보기");
    more.type = "button";
    more.addEventListener("click", () => appendBatch());
    appendBatch();
    if (!entries.length) {
      more.hidden = true;
      status.textContent = `최근 30일 이내 추가·수정된 IPS 패치 파일이 없습니다. · ${label}`;
    }
  }
  async function commitDetail(sha) {
    const all = [];
    let date;
    for (let page = 1; page <= 30; page++) {
      const commit = await readJson(api + "/commits/" + encodeURIComponent(sha) +
        "?per_page=" + pageSize + "&page=" + page);
      if (!Array.isArray(commit.files)) throw new Error("GitHub 커밋 파일 목록 오류");
      date = commit.commit?.committer?.date || commit.commit?.author?.date;
      all.push(...commit.files);
      if (commit.files.length < pageSize) return {sha,date,files:all};
    }
    throw new Error("파일 3000개 이상인 커밋은 정확한 전체 내역을 확인할 수 없습니다.");
  }
  async function sinceSnapshot(baseline, threshold) {
    const commits = [];
    for (let page = 1; ; page++) {
      const url = api + "/commits?sha=main&path=EKIPS_7z&since=" +
        encodeURIComponent(threshold) + "&per_page=" + pageSize + "&page=" + page;
      const batch = await readJson(url);
      if (!Array.isArray(batch)) throw new Error("GitHub 커밋 목록 오류");
      let reachedBaseline = false;
      for (const commit of batch) {
        if (baseline && commit.sha === baseline) { reachedBaseline = true; break; }
        commits.push(commit);
      }
      if (reachedBaseline || batch.length < pageSize) break;
    }
    const details = await Promise.all(commits.map(c => commitDetail(c.sha)));
    return details.flatMap((commit, i) => commitEvents(commit, 100000 - i));
  }
  async function start() {
    const savedEvents = [];
    let baseline = "";
    const saved = await Promise.allSettled([
      readJson("./data/patches.json"),
      readJson("./data/patch-updates.json")
    ]);
    if (saved[0].status === "fulfilled") {
      const patches = saved[0].value.patches;
      if (Array.isArray(patches)) {
        for (const file of patches) {
          if (isPatchFile(file.id)) savedEvents.push({
            filename:file.id,status:"added",date:initialDate,
            sha:initialCommit,priority:0
          });
        }
      }
    } else console.warn("초기 패치 파일 목록 확인 실패", saved[0].reason);
    if (saved[1].status === "fulfilled" && Array.isArray(saved[1].value.commits)) {
      const commits = saved[1].value.commits;
      baseline = commits[0]?.sha || "";
      commits.slice().reverse().forEach((commit,i) => {
        savedEvents.push(...commitEvents(commit, i + 1));
      });
    } else console.warn("패치 변경 기록 확인 실패", saved[1].reason);
    if (savedEvents.length) render(savedEvents, "저장된 기록");
    try {
      const recent = await sinceSnapshot(baseline, cutoff());
      render(savedEvents.concat(recent), "GitHub 최신 기록");
    } catch (error) {
      console.warn("GitHub 최신 패치 변경 기록 조회 실패", error);
      if (!savedEvents.length) status.textContent = "최근 패치 변경 내역을 불러오지 못했습니다.";
      else render(savedEvents, "저장된 기록 (실시간 조회 실패)");
    }
  }
  start();
})();
