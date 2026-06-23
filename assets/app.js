const MANUAL_GITHUB_REPOSITORY_URL = "https://github.com/mathtjungsw/math-class-webtools";

function inferGithubRepositoryUrl() {
  const host = window.location.hostname;

  if (!host.endsWith(".github.io")) {
    return "";
  }

  const owner = host.replace(".github.io", "");
  const firstPath = window.location.pathname.split("/").filter(Boolean)[0];
  const repo = firstPath || `${owner}.github.io`;

  return `https://github.com/${owner}/${repo}`;
}

function resolveGithubRepositoryUrl() {
  return MANUAL_GITHUB_REPOSITORY_URL || inferGithubRepositoryUrl();
}

function wireGithubLinks() {
  const githubUrl = resolveGithubRepositoryUrl();

  document.querySelectorAll("[data-github-link]").forEach((link) => {
    if (!githubUrl) {
      link.setAttribute("aria-disabled", "true");
      link.setAttribute("title", "GitHub 원격 저장소를 연결하면 자동으로 활성화됩니다.");
      link.addEventListener("click", (event) => event.preventDefault());
      return;
    }

    link.href = githubUrl;
  });
}

function selectSubject(selectedSubject, updateHash = false) {
  const selectedButton = document.querySelector(`[data-subject="${selectedSubject}"]`);
  if (!selectedButton) return;

  document.querySelectorAll("[data-subject]").forEach((item) => {
    item.classList.toggle("is-active", item === selectedButton);
  });

  document.querySelectorAll("[data-subject-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.subjectPanel !== selectedSubject;
  });

  if (updateHash) window.history.replaceState({}, "", `#${selectedSubject}`);
}

document.querySelectorAll("[data-subject]").forEach((button) => {
  button.addEventListener("click", () => selectSubject(button.dataset.subject, true));
});

selectSubject(window.location.hash.slice(1) || "probability-statistics");

wireGithubLinks();
