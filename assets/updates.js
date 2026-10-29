(() => {
  "use strict";

  const repository = "WOOSEOK99/EKMAME_IPS";
  const githubUrl = `https://github.com/${repository}`;
  const apiUrl = `https://api.github.com/repos/${repository}`;
  const patchDirectory = "EKIPS_7z/";
  const commitLimit = 5;
  const visibleFileLimit = 50;
  const list = document.querySelector("#recentUpdatesList");
  const status = document.querySelector("#recentUpdatesStatus");
  if (!list || !status) return;

  const fileLabels = {
    added: "NEW", modified: "수정", removed: "삭제",
    renamed: "이름 변경", copied: "복사", changed: "변경"
  };
  const fileOrder = {added: 0, modified: 1, renamed: 2, copied: 3, removed: 4};
  const lastSeenKey = "ekmame-ips-last-seen-patch-commit";

  async function getJson(url) {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {Accept: "application/vnd.github+json"}
    });
    if (!response.ok) throw new Error(`GitHub API: HTTP ${response.status}`);
    return response.json();
  }

  function make(tag, className, value) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (value !== undefined) el.textContent = value;
    return el;
  }

  function link(url, label, className) {
    const el = make("a", className, label);
    el.href = url;
    el.target = "_blank";
    el.rel = "noopener noreferrer";
    return el;
  }

  function commitDate(commit) {
    const value = commit.commit?.committer?.date || commit.commit?.author?.date;
    if (!value || Number.isNaN(Date.parse(value))) return "날짜 확인 불가";
    return new Date(value).toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false
    });
  }

  function fileUrl(commitSha, file) {
    if (file.status === "removed") return `${githubUrl}/commit/${commitSha}`;
    const path = file.filename.split("/").map(encodeURIComponent).join("/");
    return `${githubUrl}/blob/${commitSha}/${path}`;
  }

  function buildFile(file, commitSha) {
    const item = make("li", "recent-file");
    const category = fileLabels[file.status] ? file.status : "changed";
    item.appendChild(make("span", `recent-file-tag recent-file-${category}`, fileLabels[category]));
    const fileAnchor = link(fileUrl(commitSha, file), file.filename.slice(patchDirectory.length), "recent-file-name");
    fileAnchor.title = file.filename;
    item.appendChild(fileAnchor);
    if (file.status === "renamed" && file.previous_filename) {
      item.appendChild(make("span", "recent-file-old", `이전: ${file.previous_filename}`));
    }
    return item;
  }

  function buildCommit(commit, detail, index, isNew) {
    const sha = commit.sha;
    const commitLink = `${githubUrl}/commit/${sha}`;
    const allFiles = Array.isArray(detail?.files) ? detail.files : null;
    const files = allFiles?.filter(file => file.filename?.startsWith(patchDirectory) && file.status !== "removed") ?? null;
    const section = make("details", `recent-commit${isNew ? " recent-commit-new" : ""}`);
    section.open = index === 0;

    const heading = make("summary", "recent-commit-heading");
    const headingBody = make("span", "recent-commit-heading-main");
    const title = make("span", "recent-commit-title", files ? `패치 파일 ${files.length}개 추가/변경` : "패치 파일 내역 확인 불가");
    headingBody.appendChild(title);
    const message = (commit.commit?.message || sha.slice(0, 7)).split("\n")[0];
    const meta = make("span", "recent-commit-meta", `${commitDate(commit)} · ${message}`);
    headingBody.appendChild(meta);
    const chips = make("span", "recent-commit-chips");
    if (isNew) chips.appendChild(make("span", "recent-visit-tag", "지난 방문 이후"));
    chips.appendChild(make("span", "recent-count-tag", files ? `패치 ${files.length}개` : "파일 내역 확인 불가"));
    heading.append(headingBody, chips);
    section.appendChild(heading);

    const contents = make("div", "recent-commit-body");
    if (files === null) {
      contents.appendChild(make("p", "recent-notice", "패치 변경 내역을 불러오지 못했습니다. GitHub에서 확인해 주세요."));
    } else if (files.length === 0) {
      contents.appendChild(make("p", "recent-notice", "이 커밋에 표시할 패치 변경 내역이 없습니다."));
    } else {
      const fileList = make("ul", "recent-file-list");
      const sorted = [...files].sort((a, b) => (fileOrder[a.status] ?? 9) - (fileOrder[b.status] ?? 9));
      sorted.slice(0, visibleFileLimit).forEach(file => fileList.appendChild(buildFile(file, sha)));
      contents.appendChild(fileList);
      if (files.length > visibleFileLimit) {
        const hidden = files.length - visibleFileLimit;
        contents.appendChild(make("p", "recent-notice", `나머지 ${hidden}개 패치 파일은 GitHub에서 확인할 수 있습니다.`));
      }
    }
    if (allFiles?.length >= 300) contents.appendChild(make("p", "recent-notice", "GitHub API의 파일 300개 제한으로 일부 내역이 누락될 수 있습니다."));
    contents.appendChild(link(commitLink, "GitHub에서 변경 내용 전체 보기 ↗", "recent-commit-link"));
    section.appendChild(contents);
    return section;
  }

  async function loadUpdates() {
    try {
      const commits = await getJson(`${apiUrl}/commits?sha=main&path=${encodeURIComponent(patchDirectory.slice(0, -1))}&per_page=${commitLimit}`);
      if (!Array.isArray(commits) || !commits.length) {
        status.textContent = "최근 변경된 패치 파일이 없습니다.";
        return;
      }

      let previous = null;
      try { previous = localStorage.getItem(lastSeenKey); } catch (_) { /* 저장소 접근 제한 */ }
      const seenIndex = previous ? commits.findIndex(commit => commit.sha === previous) : -1;
      const results = await Promise.allSettled(commits.map(commit =>
        getJson(`${apiUrl}/commits/${encodeURIComponent(commit.sha)}`)
      ));
      const fragment = document.createDocumentFragment();
      let displayedCount = 0;
      let failedCount = 0;
      commits.forEach((commit, index) => {
        const detail = results[index].status === "fulfilled" ? results[index].value : null;
        if (!detail) failedCount++;
        const patchFiles = detail?.files?.filter(file => file.filename?.startsWith(patchDirectory) && file.status !== "removed");
        if (detail && !patchFiles?.length) return;
        const newSinceVisit = Boolean(previous && commit.sha !== previous && (seenIndex < 0 || index < seenIndex));
        fragment.appendChild(buildCommit(commit, detail, displayedCount++, newSinceVisit));
      });
      list.replaceChildren(fragment);
      status.textContent = displayedCount
        ? `EKIPS_7z 패치 변경 커밋 ${displayedCount}개 · NEW는 새로 추가된 파일입니다.${failedCount ? " · 일부 내역 조회 실패" : ""}`
        : failedCount ? "패치 변경 내역을 불러오지 못했습니다. GitHub에서 확인해 주세요."
          : "최근 추가되거나 수정된 패치 파일이 없습니다.";
      try { localStorage.setItem(lastSeenKey, commits[0].sha); } catch (_) { /* 저장소 접근 제한 */ }
    } catch (error) {
      console.error("최근 업데이트 내역 조회 실패:", error);
      status.textContent = "EKIPS_7z 패치 업데이트를 불러오지 못했습니다. GitHub에서 확인해 주세요.";
    }
  }

  loadUpdates();
})();
