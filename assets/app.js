const MANUAL_GITHUB_REPOSITORY_URL = "https://github.com/mathtjungsw/math-class-webtools";

function inferGithubRepositoryUrl() {
  const host = window.location.hostname;

  if (!host.endsWith(".github.io")) return "";

  const owner = host.replace(".github.io", "");
  const firstPath = window.location.pathname.split("/").filter(Boolean)[0];
  const repo = firstPath || `${owner}.github.io`;

  return `https://github.com/${owner}/${repo}`;
}

function wireGithubLinks() {
  const githubUrl = MANUAL_GITHUB_REPOSITORY_URL || inferGithubRepositoryUrl();

  document.querySelectorAll("[data-github-link]").forEach((link) => {
    if (!githubUrl) {
      link.hidden = true;
      return;
    }

    link.href = githubUrl;
  });
}

function selectFilter(filter, updateHash = false) {
  const selectedButton = document.querySelector(`[data-filter="${filter}"]`);
  if (!selectedButton) return;

  document.querySelectorAll("[data-filter]").forEach((button) => {
    const isSelected = button === selectedButton;
    button.classList.toggle("is-active", isSelected);
    button.setAttribute("aria-selected", String(isSelected));
  });

  let visibleCount = 0;
  document.querySelectorAll("[data-tool-category]").forEach((card) => {
    const isVisible = filter === "all" || card.dataset.toolCategory === filter;
    card.classList.toggle("is-hidden", !isVisible);
    card.setAttribute("aria-hidden", String(!isVisible));
    if (isVisible) visibleCount += 1;
  });

  document.querySelectorAll("[data-tool-section]").forEach((section) => {
    const hasVisibleCards = Boolean(section.querySelector("[data-tool-category]:not(.is-hidden)"));
    section.classList.toggle("is-hidden", !hasVisibleCards);
    section.setAttribute("aria-hidden", String(!hasVisibleCards));
  });

  document.querySelector(".empty-message").hidden = visibleCount !== 0;

  if (updateHash) {
    const nextHash = filter === "all" ? "tools" : filter;
    window.history.replaceState({}, "", `#${nextHash}`);
  }
}

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => selectFilter(button.dataset.filter, true));
});

const initialFilter = window.location.hash.slice(1);
selectFilter(document.querySelector(`[data-filter="${initialFilter}"]`) ? initialFilter : "all");
wireGithubLinks();
