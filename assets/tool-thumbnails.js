(() => {
  "use strict";

  const candidates = window.THUMBNAIL_CANDIDATES;
  if (!candidates) return;

  // Explicit approval list: adding a candidate must never publish it automatically.
  const approvedIds = Object.freeze([
    "geometry-conic", "geometry-space", "geometry-vector", "common2-coordinate", "common2-circle",
    "common2-transform", "common2-set", "common2-logic", "common2-function", "common2-inverse",
    "common2-rational", "common2-radical", "fold-punch-lab", "tessellation-lab", "golden-ratio-lab",
    "paraboloid-conic-lab", "rabbit-fox-ecosystem", "mathematician-story", "escape-room-maker",
    "sound-math-lab", "geometry-rhythm-sequencer", "sampling-studio", "graph-framing-lab",
    "law-of-large-numbers", "symbol-guessing-lab", "genetics-simulator", "benford-lab",
    "anomaly-detection-lab", "curriculum-common1", "curriculum-algebra", "curriculum-calculus",
    "curriculum-inference", "curriculum-balance", "curriculum-counting"
  ]);
  const redesignedIds = new Set(approvedIds);
  const colorOnlyIds = new Set(candidates.colorOnly);

  function requestedMode() {
    return new URLSearchParams(window.location.search).get("thumbnails") === "legacy" ? "legacy" : "scene";
  }

  function archiveLegacyVisual(visual) {
    let archive = visual.querySelector(":scope > .thumbnail-legacy");
    if (archive) return archive;
    archive = document.createElement("div");
    archive.className = "thumbnail-legacy";
    while (visual.firstChild) archive.append(visual.firstChild);
    visual.append(archive);
    return archive;
  }

  function render(root = document) {
    const mode = requestedMode();
    document.documentElement.dataset.thumbnailMode = mode;

    root.querySelectorAll(".tool-card[data-tool-id]").forEach((card) => {
      const toolId = card.dataset.toolId;
      const visual = card.querySelector(".tool-visual");
      const selected = redesignedIds.has(toolId);
      card.dataset.thumbnailTreatment = selected ? "redesigned" : "preserved";
      if (!selected || !visual) return;

      if (colorOnlyIds.has(toolId)) {
        visual.dataset.thumbnailRecolor = toolId;
        return;
      }

      if (visual.querySelector(":scope > .scene-thumbnail")) return;
      const artwork = candidates.render(toolId);
      if (!artwork) return;
      archiveLegacyVisual(visual);
      visual.insertAdjacentHTML("beforeend", artwork);
      visual.dataset.sceneThumbnail = toolId;
    });
  }

  function setMode(mode) {
    document.documentElement.dataset.thumbnailMode = mode === "legacy" ? "legacy" : "scene";
  }

  window.MATH_TOOL_THUMBNAILS = Object.freeze({
    redesigned: Object.freeze([...redesignedIds]),
    colorOnly: Object.freeze([...colorOnlyIds]),
    render,
    setMode
  });

  render();
})();
