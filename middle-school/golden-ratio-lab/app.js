(() => {
  "use strict";

  const PHI = (1 + Math.sqrt(5)) / 2;
  const canvas = document.querySelector("[data-canvas]");
  const shell = document.querySelector("[data-canvas-shell]");
  const ctx = canvas.getContext("2d");
  const upload = document.querySelector("#image-upload");
  const zoomRange = document.querySelector("[data-zoom-range]");
  const zoomOutput = document.querySelector("[data-zoom-output]");
  const hint = document.querySelector("[data-canvas-hint]");
  const emptyState = document.querySelector("[data-empty-state]");
  const dropMask = document.querySelector("[data-drop-mask]");
  const statusText = document.querySelector("[data-status-text]");
  const goldenToggle = document.querySelector("[data-toggle-golden]");
  const toast = document.querySelector("[data-toast]");

  const fields = {
    ratio: document.querySelector("[data-ratio]"),
    width: document.querySelector("[data-width]"),
    height: document.querySelector("[data-height]"),
    difference: document.querySelector("[data-difference]"),
    error: document.querySelector("[data-error]"),
    badge: document.querySelector("[data-result-badge]"),
    marker: document.querySelector("[data-ratio-marker]"),
    message: document.querySelector("[data-result-message]")
  };

  const state = {
    image: null,
    sourceName: "",
    objectUrl: null,
    mode: "measure",
    fitScale: 1,
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    pointA: null,
    pointB: null,
    pointerDown: false,
    pointerStart: null,
    startOffset: null,
    activeHandle: null,
    showGolden: false,
    spacePressed: false
  };

  function resizeCanvas() {
    const rect = shell.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    render();
  }

  function canvasSize() {
    return { width: canvas.clientWidth, height: canvas.clientHeight };
  }

  function imageScale() {
    return state.fitScale * state.zoom;
  }

  function fitImage(resetMeasurement = false) {
    if (!state.image) return;
    const { width, height } = canvasSize();
    state.fitScale = Math.min(width / state.image.naturalWidth, height / state.image.naturalHeight);
    state.zoom = 1;
    state.offsetX = (width - state.image.naturalWidth * state.fitScale) / 2;
    state.offsetY = (height - state.image.naturalHeight * state.fitScale) / 2;
    if (resetMeasurement) clearMeasurement(false);
    syncZoom();
    render();
  }

  function screenToImage(x, y) {
    const scale = imageScale();
    return {
      x: Math.max(0, Math.min(state.image.naturalWidth, (x - state.offsetX) / scale)),
      y: Math.max(0, Math.min(state.image.naturalHeight, (y - state.offsetY) / scale))
    };
  }

  function imageToScreen(point) {
    const scale = imageScale();
    return { x: state.offsetX + point.x * scale, y: state.offsetY + point.y * scale };
  }

  function eventPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function render() {
    const { width, height } = canvasSize();
    ctx.clearRect(0, 0, width, height);
    if (!state.image) return;
    const scale = imageScale();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(state.image, state.offsetX, state.offsetY, state.image.naturalWidth * scale, state.image.naturalHeight * scale);
    drawMeasurement();
  }

  function drawMeasurement() {
    if (!state.pointA) return;
    const a = imageToScreen(state.pointA);
    const b = state.pointB ? imageToScreen(state.pointB) : a;
    const left = Math.min(a.x, b.x);
    const top = Math.min(a.y, b.y);
    const width = Math.abs(b.x - a.x);
    const height = Math.abs(b.y - a.y);

    if (state.pointB) {
      ctx.save();
      ctx.fillStyle = "rgba(229, 184, 63, .16)";
      ctx.strokeStyle = "#f2cb5e";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 5]);
      ctx.fillRect(left, top, width, height);
      ctx.strokeRect(left, top, width, height);
      ctx.setLineDash([]);

      if (state.showGolden && width > 2 && height > 2) drawGoldenGuide(a, b, width, height);

      const imageWidth = Math.abs(state.pointB.x - state.pointA.x);
      const imageHeight = Math.abs(state.pointB.y - state.pointA.y);
      ctx.font = '700 11px "Noto Sans KR", sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      drawLabel(`${Math.round(imageWidth)} px`, left + width / 2, top - 15);
      ctx.save();
      ctx.translate(left - 15, top + height / 2);
      ctx.rotate(-Math.PI / 2);
      drawLabel(`${Math.round(imageHeight)} px`, 0, 0);
      ctx.restore();
      ctx.restore();
    }

    drawHandle(a, "A");
    if (state.pointB) drawHandle(b, "B");
  }

  function drawGoldenGuide(a, b, width, height) {
    const signX = b.x >= a.x ? 1 : -1;
    const signY = b.y >= a.y ? 1 : -1;
    let guideWidth;
    let guideHeight;
    if (width >= height) {
      guideHeight = height;
      guideWidth = height * PHI;
    } else {
      guideWidth = width;
      guideHeight = width * PHI;
    }
    ctx.save();
    ctx.strokeStyle = "rgba(126, 244, 172, .95)";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 5]);
    ctx.strokeRect(a.x, a.y, guideWidth * signX, guideHeight * signY);
    ctx.setLineDash([]);
    ctx.font = '700 10px "Noto Sans KR", sans-serif';
    ctx.fillStyle = "#173b26";
    const labelX = a.x + guideWidth * signX / 2;
    const labelY = a.y + guideHeight * signY + (signY > 0 ? 14 : -14);
    drawLabel("φ 기준", labelX, labelY, "#bdf4cc", "#173b26");
    ctx.restore();
  }

  function drawLabel(text, x, y, background = "rgba(18, 29, 21, .88)", color = "white") {
    const metrics = ctx.measureText(text);
    const w = metrics.width + 14;
    ctx.fillStyle = background;
    roundRect(ctx, x - w / 2, y - 10, w, 20, 6);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.fillText(text, x, y + .5);
  }

  function drawHandle(point, label) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(point.x, point.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = "#17231b";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#f2cb5e";
    ctx.stroke();
    ctx.fillStyle = "white";
    ctx.font = '700 9px "DM Mono", monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, point.x, point.y + .5);
    ctx.restore();
  }

  function roundRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2);
    context.beginPath();
    context.roundRect(x, y, width, height, r);
  }

  function nearestHandle(point) {
    if (!state.pointA) return null;
    const handles = [{ name: "a", point: imageToScreen(state.pointA) }];
    if (state.pointB) handles.push({ name: "b", point: imageToScreen(state.pointB) });
    return handles.find((handle) => Math.hypot(handle.point.x - point.x, handle.point.y - point.y) <= 18)?.name || null;
  }

  function onPointerDown(event) {
    if (!state.image || (event.button !== 0 && event.button !== 1)) return;
    canvas.setPointerCapture(event.pointerId);
    const point = eventPoint(event);
    state.pointerDown = true;
    state.pointerStart = point;

    const panRequested = state.mode === "pan" || state.spacePressed || event.button === 1;
    if (panRequested) {
      state.activeHandle = "pan";
      state.startOffset = { x: state.offsetX, y: state.offsetY };
      canvas.classList.add("is-panning");
      return;
    }

    const handle = nearestHandle(point);
    if (handle) {
      state.activeHandle = handle;
      return;
    }

    const imagePoint = screenToImage(point.x, point.y);
    if (!state.pointA || state.pointB) {
      state.pointA = imagePoint;
      state.pointB = null;
      state.activeHandle = "new";
      hint.innerHTML = "<b>2</b> 두 번째 꼭짓점을 클릭하세요";
      resetResults();
    } else {
      state.pointB = imagePoint;
      state.activeHandle = "b";
    }
    render();
  }

  function onPointerMove(event) {
    if (!state.pointerDown || !state.image) return;
    const point = eventPoint(event);
    if (state.activeHandle === "pan") {
      state.offsetX = state.startOffset.x + point.x - state.pointerStart.x;
      state.offsetY = state.startOffset.y + point.y - state.pointerStart.y;
    } else if (state.activeHandle === "a") {
      state.pointA = screenToImage(point.x, point.y);
    } else if (state.activeHandle === "b") {
      state.pointB = screenToImage(point.x, point.y);
    } else if (state.activeHandle === "new" && Math.hypot(point.x - state.pointerStart.x, point.y - state.pointerStart.y) > 5) {
      state.pointB = screenToImage(point.x, point.y);
    }
    render();
    if (state.pointB) updateResults();
  }

  function onPointerUp(event) {
    if (!state.pointerDown) return;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    state.pointerDown = false;
    canvas.classList.remove("is-panning");
    if (state.pointB) {
      updateResults();
      hint.style.opacity = "0";
      statusText.textContent = "측정 완료 — 점 A와 B를 끌어 세밀하게 조정할 수 있습니다.";
    }
    state.activeHandle = null;
  }

  function updateResults() {
    if (!state.pointA || !state.pointB) return resetResults();
    const width = Math.abs(state.pointB.x - state.pointA.x);
    const height = Math.abs(state.pointB.y - state.pointA.y);
    if (width < 1 || height < 1) return resetResults();
    const ratio = Math.max(width, height) / Math.min(width, height);
    const difference = Math.abs(ratio - PHI);
    const error = difference / PHI * 100;
    fields.width.textContent = Math.round(width).toLocaleString("ko-KR");
    fields.height.textContent = Math.round(height).toLocaleString("ko-KR");
    fields.ratio.textContent = ratio.toFixed(3);
    fields.difference.textContent = difference.toFixed(3);
    fields.error.textContent = `${error.toFixed(1)}%`;
    fields.marker.hidden = false;
    fields.marker.style.left = `${Math.max(0, Math.min(100, (ratio - 1) * 100))}%`;
    fields.badge.className = "result-badge";
    if (error <= 1) {
      fields.badge.textContent = "거의 일치";
      fields.badge.classList.add("is-close");
      fields.message.textContent = "황금비에 거의 정확히 맞습니다. 다른 영역에서도 같은 결과가 나오는지 확인해 보세요.";
    } else if (error <= 3) {
      fields.badge.textContent = "매우 가까움";
      fields.badge.classList.add("is-close");
      fields.message.textContent = "황금비에 매우 가깝습니다. 점의 위치를 조금씩 바꾸며 가장 가까운 경계를 찾아보세요.";
    } else if (error <= 7) {
      fields.badge.textContent = "비슷함";
      fields.badge.classList.add("is-close");
      fields.message.textContent = "황금비와 비슷한 비율입니다. 황금 사각형 비교선을 켜 차이가 나는 방향을 살펴보세요.";
    } else {
      fields.badge.textContent = "차이 있음";
      fields.badge.classList.add("is-far");
      fields.message.textContent = "황금비와 차이가 있습니다. 이것도 중요한 관찰입니다. 다른 부분을 재어 결과를 비교해 보세요.";
    }
  }

  function resetResults() {
    fields.ratio.textContent = "—";
    fields.width.textContent = "—";
    fields.height.textContent = "—";
    fields.difference.textContent = "—";
    fields.error.textContent = "—";
    fields.badge.textContent = "측정 전";
    fields.badge.className = "result-badge";
    fields.marker.hidden = true;
    fields.message.textContent = "사진에서 비교할 영역의 두 꼭짓점을 지정해 보세요.";
  }

  function clearMeasurement(announce = true) {
    state.pointA = null;
    state.pointB = null;
    hint.innerHTML = "<b>1</b> 첫 번째 꼭짓점을 클릭하세요";
    hint.style.opacity = "1";
    resetResults();
    render();
    if (announce) {
      statusText.textContent = "측정점을 지웠습니다. 첫 번째 꼭짓점을 지정하세요.";
      showToast("측정점을 지웠습니다.");
    }
  }

  function setZoom(nextZoom, anchor = null) {
    if (!state.image) return;
    const previousScale = imageScale();
    const { width, height } = canvasSize();
    const focus = anchor || { x: width / 2, y: height / 2 };
    const imageFocus = { x: (focus.x - state.offsetX) / previousScale, y: (focus.y - state.offsetY) / previousScale };
    state.zoom = Math.max(.5, Math.min(4, nextZoom));
    const nextScale = imageScale();
    state.offsetX = focus.x - imageFocus.x * nextScale;
    state.offsetY = focus.y - imageFocus.y * nextScale;
    syncZoom();
    render();
  }

  function syncZoom() {
    const percent = Math.round(state.zoom * 100);
    zoomRange.value = String(percent);
    zoomOutput.value = `${percent}%`;
    zoomOutput.textContent = `${percent}%`;
  }

  function loadImage(src, name, markExample = null) {
    const image = new Image();
    image.onload = () => {
      state.image = image;
      state.sourceName = name;
      emptyState.hidden = true;
      dropMask.hidden = true;
      clearMeasurement(false);
      requestAnimationFrame(() => fitImage(false));
      statusText.textContent = `${name} 사진을 불러왔습니다.`;
      if (markExample) {
        document.querySelectorAll("[data-example]").forEach((button) => {
          const active = button.dataset.example === markExample;
          button.classList.toggle("is-active", active);
          button.querySelector("i").textContent = active ? "선택됨" : "보기";
        });
      } else {
        document.querySelectorAll("[data-example]").forEach((button) => {
          button.classList.remove("is-active");
          button.querySelector("i").textContent = "보기";
        });
      }
    };
    image.onerror = () => showToast("사진을 불러오지 못했습니다.");
    image.src = src;
  }

  function loadFile(file) {
    dropMask.hidden = true;
    if (!file || !file.type.startsWith("image/")) {
      showToast("이미지 파일을 선택해 주세요.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      showToast("25MB 이하의 이미지를 사용해 주세요.");
      return;
    }
    if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
    state.objectUrl = URL.createObjectURL(file);
    loadImage(state.objectUrl, file.name.replace(/\.[^.]+$/, ""));
  }

  function setMode(mode) {
    state.mode = mode;
    document.querySelectorAll("[data-mode]").forEach((button) => {
      const active = button.dataset.mode === mode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    canvas.classList.toggle("is-pan", mode === "pan");
    statusText.textContent = mode === "pan" ? "사진을 끌어 원하는 위치로 이동하세요." : "측정할 영역의 두 꼭짓점을 지정하세요.";
  }

  function saveResult() {
    if (!state.image) return showToast("먼저 사진을 불러오세요.");
    const link = document.createElement("a");
    link.download = `황금비-측정-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    showToast("현재 화면을 이미지로 저장했습니다.");
  }

  let toastTimer;
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2300);
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("wheel", (event) => {
    if (!state.image) return;
    event.preventDefault();
    setZoom(state.zoom * (event.deltaY < 0 ? 1.12 : .89), eventPoint(event));
  }, { passive: false });

  upload.addEventListener("change", () => loadFile(upload.files[0]));
  document.querySelectorAll("[data-example]").forEach((button) => button.addEventListener("click", () => loadImage(button.dataset.src, button.querySelector("strong").textContent, button.dataset.example)));
  document.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
  document.querySelector("[data-zoom-in]").addEventListener("click", () => setZoom(state.zoom + .2));
  document.querySelector("[data-zoom-out]").addEventListener("click", () => setZoom(state.zoom - .2));
  zoomRange.addEventListener("input", () => setZoom(Number(zoomRange.value) / 100));
  document.querySelector("[data-fit]").addEventListener("click", () => fitImage(false));
  document.querySelector("[data-clear]").addEventListener("click", () => clearMeasurement(true));
  document.querySelector("[data-download]").addEventListener("click", saveResult);
  goldenToggle.addEventListener("click", () => {
    state.showGolden = !state.showGolden;
    goldenToggle.setAttribute("aria-pressed", String(state.showGolden));
    goldenToggle.querySelector("span").textContent = state.showGolden ? "켬" : "끔";
    render();
  });

  function isFileDrag(event) {
    return Array.from(event.dataTransfer?.types || []).includes("Files");
  }

  shell.addEventListener("dragenter", (event) => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    dropMask.hidden = false;
  });
  shell.addEventListener("dragover", (event) => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    dropMask.hidden = false;
  });
  shell.addEventListener("dragleave", (event) => {
    if (!shell.contains(event.relatedTarget)) dropMask.hidden = true;
  });
  shell.addEventListener("drop", (event) => {
    event.preventDefault();
    dropMask.hidden = true;
    loadFile(event.dataTransfer.files[0]);
  });
  window.addEventListener("dragend", () => { dropMask.hidden = true; });
  window.addEventListener("drop", () => { dropMask.hidden = true; });

  const dialog = document.querySelector("[data-guide-dialog]");
  document.querySelector("[data-open-guide]").addEventListener("click", () => dialog.showModal());
  document.querySelector("[data-close-guide]").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  if (new URLSearchParams(window.location.search).get("manual") === "1") {
    requestAnimationFrame(() => dialog.showModal());
  }

  window.addEventListener("keydown", (event) => {
    if (event.code === "Space" && !/INPUT|BUTTON/.test(document.activeElement.tagName)) {
      event.preventDefault();
      state.spacePressed = true;
      canvas.classList.add("is-pan");
    }
    if ((event.key === "+" || event.key === "=") && !event.ctrlKey) setZoom(state.zoom + .2);
    if (event.key === "-" && !event.ctrlKey) setZoom(state.zoom - .2);
    if (event.key === "Escape" && dialog.open) dialog.close();
  });
  window.addEventListener("keyup", (event) => {
    if (event.code === "Space") {
      state.spacePressed = false;
      canvas.classList.toggle("is-pan", state.mode === "pan");
    }
  });

  new ResizeObserver(() => resizeCanvas()).observe(shell);
  loadImage("./assets/examples/sunflower.webp", "해바라기", "sunflower");
})();
