(() => {
  "use strict";

  const G = window.ConicLabGeometry;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const reflectionCanvas = $("[data-reflection-canvas]");
  const reflectionContext = reflectionCanvas.getContext("2d");
  const conic3dCanvas = $("[data-conic-3d]");
  const conic3dContext = conic3dCanvas.getContext("2d");
  const conic2dCanvas = $("[data-conic-2d]");
  const conic2dContext = conic2dCanvas.getContext("2d");

  const reflection = {
    mode: "focus-to-parallel",
    focal: 1.4,
    rayCount: 7,
    aperture: 5,
    offset: 0,
    selected: 1,
    showValues: true,
    showGuides: true,
    progress: 1,
    playing: false,
    startedAt: 0,
    raf: 0
  };

  const conic = {
    halfAngle: 32,
    planeAngle: 0,
    planeOffset: 1.6,
    zoom: 1,
    yaw: -28,
    pitch: -16,
    showValues: true,
    showFeatures: true,
    playing: false,
    direction: 1,
    lastTime: 0,
    raf: 0,
    dragging: false,
    pointer: null
  };

  let toastTimer = 0;

  function showToast(message) {
    const toast = $("[data-toast]");
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = window.setTimeout(() => { toast.hidden = true; }, 2400);
  }

  function setCanvasSize(canvas, context) {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(rect.width * ratio));
    const height = Math.max(1, Math.round(rect.height * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { width: rect.width, height: rect.height };
  }

  function line(context, start, end, style, width, dash) {
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.strokeStyle = style;
    context.lineWidth = width;
    context.setLineDash(dash || []);
    context.stroke();
    context.setLineDash([]);
  }

  function arrowLine(context, start, end, style, width, alpha) {
    context.save();
    context.globalAlpha = alpha == null ? 1 : alpha;
    line(context, start, end, style, width);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    if (length > 16) {
      const ux = dx / length;
      const uy = dy / length;
      const size = 8 + width;
      context.beginPath();
      context.moveTo(end.x, end.y);
      context.lineTo(end.x - ux * size - uy * size * .55, end.y - uy * size + ux * size * .55);
      context.lineTo(end.x - ux * size + uy * size * .55, end.y - uy * size - ux * size * .55);
      context.closePath();
      context.fillStyle = style;
      context.fill();
    }
    context.restore();
  }

  function interpolate(a, b, amount) {
    return { x: a.x + (b.x - a.x) * amount, y: a.y + (b.y - a.y) * amount };
  }

  function drawGrid(context, width, height, step) {
    context.save();
    context.strokeStyle = "rgba(255,255,255,.055)";
    context.lineWidth = 1;
    context.beginPath();
    for (let x = 0; x <= width; x += step) { context.moveTo(x, 0); context.lineTo(x, height); }
    for (let y = 0; y <= height; y += step) { context.moveTo(0, y); context.lineTo(width, y); }
    context.stroke();
    context.restore();
  }

  function drawPoint(context, point, radius, fill, stroke) {
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fillStyle = fill;
    context.fill();
    if (stroke) { context.strokeStyle = stroke; context.lineWidth = 2; context.stroke(); }
  }

  function reflectionStageLabel() {
    if (reflection.progress >= .99) return "전체 경로";
    if (reflection.progress < .46) return "1단계 · 표면까지 입사";
    if (reflection.progress < .7) return "2단계 · 법선과 각 확인";
    return "3단계 · 반사광 진행";
  }

  function reflectionCoordinates(width, height, positions) {
    const margin = { left: 54, right: 34, top: 35, bottom: 38 };
    const yExtent = Math.max(3.2, ...positions.map(Math.abs), Math.abs(reflection.offset) + reflection.aperture / 2) + .55;
    const maxHitX = Math.max(...positions.map((y) => G.parabolaPoint(reflection.focal, y).x));
    const minX = -reflection.focal * 1.35;
    const maxX = Math.max(reflection.focal * 4.4, maxHitX + reflection.focal * 2.4);
    const scaleX = (width - margin.left - margin.right) / (maxX - minX);
    const scaleY = (height - margin.top - margin.bottom) / (2 * yExtent);
    const scale = Math.min(scaleX, scaleY);
    const usedWidth = (maxX - minX) * scale;
    const left = margin.left + Math.max(0, (width - margin.left - margin.right - usedWidth) / 2);
    return {
      minX,
      maxX,
      yExtent,
      map(point) {
        return { x: left + (point.x - minX) * scale, y: height / 2 - point.y * scale };
      }
    };
  }

  function drawAngleArc(context, center, rayDirection, normalDirection, radius, color) {
    let a1 = Math.atan2(rayDirection.y, rayDirection.x);
    let a2 = Math.atan2(normalDirection.y, normalDirection.x);
    let delta = a2 - a1;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    if (Math.abs(delta) > Math.PI / 2) {
      a2 += delta > 0 ? -Math.PI : Math.PI;
      delta = a2 - a1;
    }
    context.beginPath();
    context.arc(center.x, center.y, radius, a1, a1 + delta, delta < 0);
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.stroke();
  }

  function drawReflection() {
    const size = setCanvasSize(reflectionCanvas, reflectionContext);
    const ctx = reflectionContext;
    ctx.clearRect(0, 0, size.width, size.height);
    drawGrid(ctx, size.width, size.height, 34);

    const positions = G.sampleRayPositions(reflection.rayCount, reflection.aperture, reflection.offset);
    reflection.selected = G.clamp(reflection.selected, 0, positions.length - 1);
    const coords = reflectionCoordinates(size.width, size.height, positions);
    const map = coords.map;
    const axisStart = map({ x: coords.minX, y: 0 });
    const axisEnd = map({ x: coords.maxX, y: 0 });
    line(ctx, axisStart, axisEnd, "rgba(255,255,255,.32)", 1.5, [8, 6]);

    const directrixStart = map({ x: -reflection.focal, y: -coords.yExtent });
    const directrixEnd = map({ x: -reflection.focal, y: coords.yExtent });
    line(ctx, directrixStart, directrixEnd, "rgba(157,140,255,.72)", 1.5, [5, 6]);

    ctx.beginPath();
    const curveLimit = coords.yExtent * .98;
    for (let index = 0; index <= 180; index += 1) {
      const y = -curveLimit + 2 * curveLimit * index / 180;
      const point = map(G.parabolaPoint(reflection.focal, y));
      index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y);
    }
    ctx.strokeStyle = "#71c9ff";
    ctx.lineWidth = 4;
    ctx.stroke();

    const focus = map({ x: reflection.focal, y: 0 });
    const vertex = map({ x: 0, y: 0 });
    drawPoint(ctx, focus, 6, "#ffc857", "#101c2d");
    drawPoint(ctx, vertex, 4, "#ffffff", "#101c2d");

    positions.forEach((y, index) => {
      const ray = G.reflectionRay(reflection.focal, y, reflection.mode);
      const hit = map(ray.hit);
      const startWorld = reflection.mode === "focus-to-parallel" ? ray.focus : { x: coords.maxX, y };
      const endWorld = reflection.mode === "focus-to-parallel" ? { x: coords.maxX, y } : ray.focus;
      const start = map(startWorld);
      const end = map(endWorld);
      const selected = index === reflection.selected;
      const baseAlpha = selected ? 1 : .24;
      const incomingAmount = selected ? G.clamp(reflection.progress / .46, 0, 1) : 1;
      const outgoingAmount = selected ? G.clamp((reflection.progress - .66) / .34, 0, 1) : 1;
      const incomingEnd = interpolate(start, hit, incomingAmount);
      const outgoingEnd = interpolate(hit, end, outgoingAmount);
      arrowLine(ctx, start, incomingEnd, "#ffc857", selected ? 3.4 : 1.35, baseAlpha);
      if (!selected || reflection.progress >= .66) arrowLine(ctx, hit, outgoingEnd, "#67e0c1", selected ? 3.4 : 1.35, baseAlpha);
      if (selected) drawPoint(ctx, hit, 5, "#ff8066", "white");
    });

    const selectedY = positions[reflection.selected];
    const selectedRay = G.reflectionRay(reflection.focal, selectedY, reflection.mode);
    if (reflection.showGuides && reflection.progress >= .44) {
      const hit = map(selectedRay.hit);
      const normalScale = 1.2;
      const normalA = map({ x: selectedRay.hit.x - selectedRay.normal.x * normalScale, y: selectedRay.hit.y - selectedRay.normal.y * normalScale });
      const normalB = map({ x: selectedRay.hit.x + selectedRay.normal.x * normalScale, y: selectedRay.hit.y + selectedRay.normal.y * normalScale });
      line(ctx, normalA, normalB, "rgba(113,201,255,.95)", 1.5, [5, 4]);

      const incomingScreenDirection = {
        x: -selectedRay.incoming.x,
        y: selectedRay.incoming.y
      };
      const reflectedScreenDirection = {
        x: selectedRay.reflected.x,
        y: -selectedRay.reflected.y
      };
      const normalScreen = { x: selectedRay.normal.x, y: -selectedRay.normal.y };
      drawAngleArc(ctx, hit, incomingScreenDirection, normalScreen, 25, "#ffc857");
      drawAngleArc(ctx, hit, reflectedScreenDirection, normalScreen, 34, "#67e0c1");
      ctx.fillStyle = "#dce5ef";
      ctx.font = "700 10px system-ui, sans-serif";
      ctx.fillText(`${selectedRay.incidenceAngleDeg.toFixed(1)}°`, hit.x + 11, hit.y - 36);
    }

    ctx.font = "800 10px ui-monospace, monospace";
    ctx.fillStyle = "#ffc857";
    ctx.fillText("F", focus.x + 10, focus.y - 9);
    ctx.fillStyle = "#d7e0ea";
    ctx.fillText("V", vertex.x - 17, vertex.y + 20);
    ctx.fillStyle = "#9d8cff";
    ctx.fillText("준선", directrixStart.x + 7, 22);
    ctx.fillStyle = "#9eacbe";
    ctx.fillText("축", axisEnd.x - 18, axisEnd.y - 10);

    $("[data-reflection-stage]").textContent = reflectionStageLabel();
    $("[data-selected-ray]").textContent = `${reflection.selected + 1} / ${positions.length}`;
    $("[data-ray-select]").max = positions.length;
    $("[data-ray-select]").value = reflection.selected + 1;
    $("[data-ray-angle]").textContent = `θᵢ = θᵣ = ${selectedRay.incidenceAngleDeg.toFixed(1)}°`;
    $("[data-reflection-angle]").textContent = `입사각 ${selectedRay.incidenceAngleDeg.toFixed(1)}° = 반사각 ${selectedRay.reflectionAngleDeg.toFixed(1)}°`;
  }

  function updateReflectionUI() {
    $$('[data-reflection-mode]').forEach((button) => {
      const active = button.dataset.reflectionMode === reflection.mode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    const outputValues = {
      focal: reflection.focal.toFixed(2),
      rayCount: String(reflection.rayCount),
      aperture: reflection.aperture.toFixed(1),
      offset: reflection.offset.toFixed(1)
    };
    Object.entries(outputValues).forEach(([key, value]) => { $(`[data-output="${key}"]`).textContent = value; });
    $("[data-equation]").textContent = `y² = ${(4 * reflection.focal).toFixed(2)}x`;
    $("[data-focus]").textContent = `F(${reflection.focal.toFixed(2)}, 0)`;
    $("[data-directrix]").textContent = `x = −${reflection.focal.toFixed(2)}`;
    const sourceMode = reflection.mode === "focus-to-parallel";
    $("[data-reflection-summary]").textContent = sourceMode ? "초점 → 평행광" : "평행광 → 초점";
    $("[data-reflection-description]").textContent = sourceMode
      ? "초점 F에서 나온 광선이 포물면에 닿은 뒤 축과 평행하게 진행합니다."
      : "축과 평행하게 들어온 광선이 포물면에서 반사된 뒤 모두 초점 F를 지납니다.";
    $("[data-reflection-values]").hidden = !reflection.showValues;
    drawReflection();
  }

  function stopReflection() {
    reflection.playing = false;
    window.cancelAnimationFrame(reflection.raf);
    const button = $("[data-reflection-play]");
    button.setAttribute("aria-pressed", "false");
    button.innerHTML = '<span aria-hidden="true">▶</span> 재생';
  }

  function reflectionFrame(time) {
    if (!reflection.playing) return;
    if (!reflection.startedAt) reflection.startedAt = time;
    reflection.progress = ((time - reflection.startedAt) % 3600) / 3600;
    drawReflection();
    reflection.raf = window.requestAnimationFrame(reflectionFrame);
  }

  function toggleReflectionPlayback() {
    if (reduceMotion) {
      reflection.progress = 1;
      drawReflection();
      showToast("동작 줄이기 설정에 따라 전체 경로를 바로 표시했습니다.");
      return;
    }
    if (reflection.playing) { stopReflection(); return; }
    reflection.playing = true;
    reflection.startedAt = 0;
    const button = $("[data-reflection-play]");
    button.setAttribute("aria-pressed", "true");
    button.innerHTML = '<span aria-hidden="true">Ⅱ</span> 일시정지';
    reflection.raf = window.requestAnimationFrame(reflectionFrame);
  }

  function activateTab(name, focus) {
    $$('[role="tab"]').forEach((tab) => {
      const active = tab.dataset.tab === name;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active && focus) tab.focus();
    });
    $$('[role="tabpanel"]').forEach((panel) => { panel.hidden = panel.dataset.panel !== name; });
    window.requestAnimationFrame(() => { name === "reflection" ? drawReflection() : drawConic(); });
  }

  $$('[role="tab"]').forEach((tab, index, tabs) => {
    tab.addEventListener("click", () => activateTab(tab.dataset.tab));
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      activateTab(tabs[next].dataset.tab, true);
    });
  });

  $$('[data-reflection-mode]').forEach((button) => button.addEventListener("click", () => {
    stopReflection();
    reflection.mode = button.dataset.reflectionMode;
    reflection.progress = 1;
    updateReflectionUI();
  }));

  $$('[data-reflection-control]').forEach((input) => input.addEventListener("input", () => {
    stopReflection();
    reflection[input.dataset.reflectionControl] = Number(input.value);
    if (input.dataset.reflectionControl === "rayCount") reflection.selected = Math.floor(reflection.rayCount / 2);
    updateReflectionUI();
  }));

  $("[data-ray-select]").addEventListener("input", (event) => { stopReflection(); reflection.selected = Number(event.target.value) - 1; drawReflection(); });
  $("[data-ray-previous]").addEventListener("click", () => { stopReflection(); reflection.selected = (reflection.selected - 1 + reflection.rayCount) % reflection.rayCount; drawReflection(); });
  $("[data-ray-next]").addEventListener("click", () => { stopReflection(); reflection.selected = (reflection.selected + 1) % reflection.rayCount; drawReflection(); });
  $("[data-reflection-play]").addEventListener("click", toggleReflectionPlayback);
  $("[data-reflection-step]").addEventListener("click", () => {
    stopReflection();
    const stages = [0, .46, .69, 1];
    const current = stages.findIndex((value) => Math.abs(value - reflection.progress) < .03);
    reflection.progress = stages[(current + 1 + stages.length) % stages.length];
    drawReflection();
  });
  $("[data-reflection-reset]").addEventListener("click", () => {
    stopReflection();
    Object.assign(reflection, { mode: "focus-to-parallel", focal: 1.4, rayCount: 7, aperture: 5, offset: 0, selected: 1, showValues: true, showGuides: true, progress: 1 });
    $$('[data-reflection-control]').forEach((input) => { input.value = reflection[input.dataset.reflectionControl]; });
    $("[data-toggle-values]").checked = true; $("[data-toggle-guides]").checked = true;
    updateReflectionUI();
  });
  $("[data-toggle-values]").addEventListener("change", (event) => { reflection.showValues = event.target.checked; updateReflectionUI(); });
  $("[data-toggle-guides]").addEventListener("change", (event) => { reflection.showGuides = event.target.checked; drawReflection(); });
  $$('[data-reflection-preset]').forEach((button) => button.addEventListener("click", () => {
    stopReflection();
    if (button.dataset.reflectionPreset === "wide") Object.assign(reflection, { focal: 2.2, aperture: 6.4, offset: 0, rayCount: 9, selected: 4 });
    else Object.assign(reflection, { focal: 1, aperture: 2.4, offset: 0, rayCount: 5, selected: 2 });
    $$('[data-reflection-control]').forEach((input) => { input.value = reflection[input.dataset.reflectionControl]; });
    updateReflectionUI();
  }));

  const conicMeta = {
    circle: { name: "원", symbol: "○", feature: "중심 · 반지름" },
    ellipse: { name: "타원", symbol: "⬭", feature: "두 초점 · 장축" },
    parabola: { name: "포물선", symbol: "∪", feature: "초점 · 준선" },
    hyperbola: { name: "쌍곡선", symbol: ")(", feature: "두 초점 · 점근선" }
  };

  function project3d(point, width, height) {
    const yaw = G.degToRad(conic.yaw);
    const pitch = G.degToRad(conic.pitch);
    const x1 = point.x * Math.cos(yaw) + point.z * Math.sin(yaw);
    const z1 = -point.x * Math.sin(yaw) + point.z * Math.cos(yaw);
    const y2 = point.y * Math.cos(pitch) - z1 * Math.sin(pitch);
    const depth = point.y * Math.sin(pitch) + z1 * Math.cos(pitch);
    const scale = Math.min(width, height) * .105 * conic.zoom;
    return { x: width / 2 + x1 * scale, y: height / 2 - y2 * scale, depth };
  }

  function drawPolyline3d(context, points, width, height, style, lineWidth, dash) {
    let started = false;
    let previous = null;
    context.beginPath();
    points.forEach((point) => {
      if (![point.x, point.y, point.z].every(Number.isFinite) || Math.max(Math.abs(point.x), Math.abs(point.y), Math.abs(point.z)) > 8) { started = false; previous = null; return; }
      const projected = project3d(point, width, height);
      if (previous && Math.hypot(projected.x - previous.x, projected.y - previous.y) > Math.min(width, height) * .45) started = false;
      if (!started) { context.moveTo(projected.x, projected.y); started = true; }
      else context.lineTo(projected.x, projected.y);
      previous = projected;
    });
    context.strokeStyle = style;
    context.lineWidth = lineWidth;
    context.setLineDash(dash || []);
    context.stroke();
    context.setLineDash([]);
  }

  function drawConic3d() {
    const size = setCanvasSize(conic3dCanvas, conic3dContext);
    const ctx = conic3dContext;
    ctx.clearRect(0, 0, size.width, size.height);
    drawGrid(ctx, size.width, size.height, 32);
    const t = Math.tan(G.degToRad(conic.halfAngle));

    [-3, -2.25, -1.5, -.75, .75, 1.5, 2.25, 3].forEach((y) => {
      const radius = Math.abs(y) * t;
      const ring = Array.from({ length: 65 }, (_, index) => {
        const theta = index / 64 * Math.PI * 2;
        return { x: radius * Math.cos(theta), y, z: radius * Math.sin(theta) };
      });
      drawPolyline3d(ctx, ring, size.width, size.height, y > 0 ? "rgba(157,140,255,.34)" : "rgba(113,201,255,.28)", 1);
    });
    for (let index = 0; index < 12; index += 1) {
      const theta = index / 12 * Math.PI * 2;
      const points = [-3, 0, 3].map((y) => ({ x: Math.abs(y) * t * Math.cos(theta), y, z: Math.abs(y) * t * Math.sin(theta) }));
      drawPolyline3d(ctx, points, size.width, size.height, "rgba(205,215,229,.35)", 1.1);
    }

    const planeSpanU = 4.4;
    const planeSpanV = 3.5;
    const corners = [
      G.planePointToWorld(-planeSpanU, -planeSpanV, conic.planeAngle, conic.planeOffset),
      G.planePointToWorld(planeSpanU, -planeSpanV, conic.planeAngle, conic.planeOffset),
      G.planePointToWorld(planeSpanU, planeSpanV, conic.planeAngle, conic.planeOffset),
      G.planePointToWorld(-planeSpanU, planeSpanV, conic.planeAngle, conic.planeOffset)
    ].map((point) => project3d(point, size.width, size.height));
    ctx.beginPath();
    corners.forEach((point, index) => index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y));
    ctx.closePath();
    ctx.fillStyle = "rgba(255,200,87,.10)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,200,87,.8)";
    ctx.lineWidth = 1.7;
    ctx.stroke();

    const sampled = G.sampleConic(conic.halfAngle, conic.planeAngle, conic.planeOffset, { samples: 220, span: 4.8 });
    const curveColor = sampled.type === "circle" ? "#ffc857" : sampled.type === "ellipse" ? "#67e0c1" : sampled.type === "parabola" ? "#71c9ff" : "#ff8066";
    sampled.branches.forEach((branch) => drawPolyline3d(ctx, branch, size.width, size.height, curveColor, 4));

    const apex = project3d({ x: 0, y: 0, z: 0 }, size.width, size.height);
    drawPoint(ctx, apex, 4, "white", "#101c2d");
    ctx.fillStyle = "#c9d3df";
    ctx.font = "700 9px system-ui, sans-serif";
    ctx.fillText("원뿔 꼭짓점", apex.x + 9, apex.y - 9);
  }

  function graphTransform(sampled, width, height) {
    const points = sampled.branches.flat().filter((point) => Number.isFinite(point.u) && Number.isFinite(point.v) && Math.abs(point.u) < 14 && Math.abs(point.v) < 14);
    if (!points.length) return { map: () => ({ x: width / 2, y: height / 2 }), scale: 1, minU: -5, maxU: 5, minV: -5, maxV: 5 };
    let minU = Math.min(...points.map((point) => point.u));
    let maxU = Math.max(...points.map((point) => point.u));
    let minV = Math.min(...points.map((point) => point.v));
    let maxV = Math.max(...points.map((point) => point.v));
    const spanU = Math.max(1.2, maxU - minU);
    const spanV = Math.max(1.2, maxV - minV);
    minU -= spanU * .15; maxU += spanU * .15; minV -= spanV * .18; maxV += spanV * .18;
    const padding = 32;
    const scale = Math.min((width - padding * 2) / (maxU - minU), (height - padding * 2) / (maxV - minV));
    const centerU = (minU + maxU) / 2;
    const centerV = (minV + maxV) / 2;
    return { minU, maxU, minV, maxV, scale, map(point) { return { x: width / 2 + (point.u - centerU) * scale, y: height / 2 - (point.v - centerV) * scale }; } };
  }

  function drawConic2d() {
    const size = setCanvasSize(conic2dCanvas, conic2dContext);
    const ctx = conic2dContext;
    ctx.clearRect(0, 0, size.width, size.height);
    drawGrid(ctx, size.width, size.height, 32);
    const sampled = G.sampleConic(conic.halfAngle, conic.planeAngle, conic.planeOffset, { samples: 240, span: 5 });
    const transform = graphTransform(sampled, size.width, size.height);
    const map = transform.map;

    const xAxisA = map({ u: transform.minU, v: 0 });
    const xAxisB = map({ u: transform.maxU, v: 0 });
    const yAxisA = map({ u: 0, v: transform.minV });
    const yAxisB = map({ u: 0, v: transform.maxV });
    line(ctx, xAxisA, xAxisB, "rgba(255,255,255,.22)", 1);
    line(ctx, yAxisA, yAxisB, "rgba(255,255,255,.22)", 1);

    if (conic.showFeatures) {
      if (sampled.type === "hyperbola") {
        const center = sampled.center;
        const extent = Math.max(transform.maxU - transform.minU, 8);
        [-1, 1].forEach((sign) => {
          const a = { u: center.u - extent, v: -sign * sampled.asymptoteSlope * extent };
          const b = { u: center.u + extent, v: sign * sampled.asymptoteSlope * extent };
          line(ctx, map(a), map(b), "rgba(255,200,87,.65)", 1.3, [6, 5]);
        });
      }
      if (sampled.type === "parabola") {
        line(ctx, map({ u: sampled.directrixU, v: transform.minV }), map({ u: sampled.directrixU, v: transform.maxV }), "rgba(157,140,255,.7)", 1.3, [5, 5]);
      }
    }

    const curveColor = sampled.type === "circle" ? "#ffc857" : sampled.type === "ellipse" ? "#67e0c1" : sampled.type === "parabola" ? "#71c9ff" : "#ff8066";
    sampled.branches.forEach((branch) => {
      ctx.beginPath();
      let started = false;
      branch.forEach((point) => {
        if (Math.abs(point.u) > 14 || Math.abs(point.v) > 14) { started = false; return; }
        const screen = map(point);
        if (!started) { ctx.moveTo(screen.x, screen.y); started = true; }
        else ctx.lineTo(screen.x, screen.y);
      });
      ctx.strokeStyle = curveColor;
      ctx.lineWidth = 4;
      ctx.stroke();
    });

    if (conic.showFeatures && sampled.foci) {
      sampled.foci.forEach((focus, index) => {
        const screen = map(focus);
        drawPoint(ctx, screen, 5, "#ffc857", "#101c2d");
        ctx.fillStyle = "#ffc857";
        ctx.font = "800 9px ui-monospace, monospace";
        ctx.fillText(sampled.foci.length > 1 ? `F${index + 1}` : "F", screen.x + 8, screen.y - 8);
      });
    }
    ctx.fillStyle = "#9eacbe";
    ctx.font = "800 9px ui-monospace, monospace";
    ctx.fillText("u", size.width - 20, xAxisB.y - 8);
    ctx.fillText("v", yAxisB.x + 8, 18);
  }

  function conicReason(type, angle, boundary) {
    if (type === "circle") return "수평 절단(β = 0°)이므로 원입니다.";
    if (type === "ellipse") return `0° < β = ${angle}° < ${boundary}°이므로 한쪽 원뿔을 닫힌 곡선으로 자릅니다.`;
    if (type === "parabola") return `β = ${boundary}°: 절단면이 원뿔의 모선과 평행한 경계입니다.`;
    return `β = ${angle}° > ${boundary}°이므로 절단면이 위·아래 원뿔을 모두 지납니다.`;
  }

  function updateConicUI() {
    const sampled = G.conicFeatures(conic.halfAngle, conic.planeAngle, conic.planeOffset);
    const meta = conicMeta[sampled.type];
    const boundary = sampled.boundaryDeg;
    $("[data-conic-name]").textContent = meta.name;
    $("[data-conic-symbol]").textContent = meta.symbol;
    $("[data-conic-badge]").dataset.type = sampled.type;
    $("[data-section-feature]").textContent = meta.feature;
    $("[data-boundary-reason]").textContent = conicReason(sampled.type, conic.planeAngle, boundary);
    $("[data-angle-marker]").style.left = `${conic.planeAngle / 90 * 100}%`;
    $("[data-output=" + 'planeAngle' + "]").textContent = `${conic.planeAngle.toFixed(0)}°`;
    $("[data-output=" + 'planeOffset' + "]").textContent = conic.planeOffset.toFixed(1);
    $("[data-output=" + 'zoom' + "]").textContent = `${Math.round(conic.zoom * 100)}%`;
    $("[data-output=" + 'yaw' + "]").textContent = `${conic.yaw < 0 ? "−" : ""}${Math.abs(Math.round(conic.yaw))}°`;
    const relation = sampled.type === "circle" ? "β = 0°" : sampled.type === "ellipse" ? `0° < β < ${boundary}°` : sampled.type === "parabola" ? `β = ${boundary}°` : `β > ${boundary}°`;
    $("[data-classification-rule]").textContent = relation;
    const slope = Math.tan(G.degToRad(conic.planeAngle));
    $("[data-plane-equation]").textContent = Math.abs(slope) < 1e-8 ? `y = ${conic.planeOffset.toFixed(2)}` : `y = ${conic.planeOffset.toFixed(2)} + ${slope.toFixed(2)}x`;
    if (sampled.type === "circle") $("[data-feature-value]").textContent = `r = ${sampled.radius.toFixed(2)}`;
    else if (sampled.type === "ellipse") $("[data-feature-value]").textContent = `a = ${sampled.semiMajor.toFixed(2)}, b = ${sampled.semiMinor.toFixed(2)}`;
    else if (sampled.type === "parabola") $("[data-feature-value]").textContent = `p = ${Math.abs(sampled.focalParameter).toFixed(2)}`;
    else $("[data-feature-value]").textContent = `점근선 기울기 ±${sampled.asymptoteSlope.toFixed(2)}`;
    $("[data-conic-value-panel]").hidden = !conic.showValues;
    $$('[data-conic-preset]').forEach((button) => button.classList.toggle("is-active", Number(button.textContent.match(/\d+/)?.[0]) === Math.round(conic.planeAngle)));
    drawConic();
  }

  function drawConic() { drawConic3d(); drawConic2d(); }

  function stopConic() {
    conic.playing = false;
    window.cancelAnimationFrame(conic.raf);
    const button = $("[data-conic-play]");
    button.setAttribute("aria-pressed", "false");
    button.innerHTML = '<span aria-hidden="true">▶</span> 연속 변화';
  }

  function conicFrame(time) {
    if (!conic.playing) return;
    const delta = conic.lastTime ? Math.min(40, time - conic.lastTime) : 0;
    conic.lastTime = time;
    conic.planeAngle += conic.direction * delta * .018;
    if (conic.planeAngle >= 76) { conic.planeAngle = 76; conic.direction = -1; }
    if (conic.planeAngle <= 0) { conic.planeAngle = 0; conic.direction = 1; }
    $("[data-conic-control=" + 'planeAngle' + "]").value = conic.planeAngle;
    updateConicUI();
    conic.raf = window.requestAnimationFrame(conicFrame);
  }

  $("[data-conic-play]").addEventListener("click", () => {
    if (reduceMotion) {
      conic.planeAngle = 58;
      $("[data-conic-control=" + 'planeAngle' + "]").value = 58;
      updateConicUI();
      showToast("동작 줄이기 설정에 따라 포물선 경계를 바로 표시했습니다.");
      return;
    }
    if (conic.playing) { stopConic(); return; }
    conic.playing = true; conic.lastTime = 0;
    const button = $("[data-conic-play]");
    button.setAttribute("aria-pressed", "true");
    button.innerHTML = '<span aria-hidden="true">Ⅱ</span> 일시정지';
    conic.raf = window.requestAnimationFrame(conicFrame);
  });
  $$('[data-conic-control]').forEach((input) => input.addEventListener("input", () => {
    stopConic();
    const key = input.dataset.conicControl;
    const value = Number(input.value);
    conic[key] = key === "zoom" ? value / 100 : value;
    updateConicUI();
  }));
  $$('[data-conic-preset]').forEach((button) => button.addEventListener("click", () => {
    stopConic();
    const values = { circle: 0, ellipse: 36, parabola: 58, hyperbola: 70 };
    conic.planeAngle = values[button.dataset.conicPreset];
    $("[data-conic-control=" + 'planeAngle' + "]").value = conic.planeAngle;
    updateConicUI();
  }));
  $("[data-conic-reset-view]").addEventListener("click", () => {
    conic.yaw = -28; conic.pitch = -16; conic.zoom = 1;
    $("[data-conic-control=" + 'yaw' + "]").value = conic.yaw;
    $("[data-conic-control=" + 'zoom' + "]").value = 100;
    updateConicUI();
  });
  $("[data-conic-reset]").addEventListener("click", () => {
    stopConic();
    Object.assign(conic, { planeAngle: 0, planeOffset: 1.6, zoom: 1, yaw: -28, pitch: -16, showValues: true, showFeatures: true });
    $("[data-conic-control=" + 'planeAngle' + "]").value = 0;
    $("[data-conic-control=" + 'planeOffset' + "]").value = 1.6;
    $("[data-conic-control=" + 'zoom' + "]").value = 100;
    $("[data-conic-control=" + 'yaw' + "]").value = -28;
    $("[data-conic-values]").checked = true; $("[data-conic-features]").checked = true;
    updateConicUI();
  });
  $("[data-conic-values]").addEventListener("change", (event) => { conic.showValues = event.target.checked; updateConicUI(); });
  $("[data-conic-features]").addEventListener("change", (event) => { conic.showFeatures = event.target.checked; drawConic2d(); });

  function pointerPosition(event) { return { x: event.clientX, y: event.clientY }; }
  conic3dCanvas.addEventListener("pointerdown", (event) => {
    conic.dragging = true; conic.pointer = pointerPosition(event); conic3dCanvas.setPointerCapture(event.pointerId);
  });
  conic3dCanvas.addEventListener("pointermove", (event) => {
    if (!conic.dragging) return;
    const next = pointerPosition(event);
    conic.yaw = G.clamp(conic.yaw + (next.x - conic.pointer.x) * .35, -120, 120);
    conic.pitch = G.clamp(conic.pitch - (next.y - conic.pointer.y) * .25, -55, 45);
    conic.pointer = next;
    $("[data-conic-control=" + 'yaw' + "]").value = G.clamp(conic.yaw, -70, 70);
    updateConicUI();
  });
  conic3dCanvas.addEventListener("pointerup", () => { conic.dragging = false; });
  conic3dCanvas.addEventListener("pointercancel", () => { conic.dragging = false; });
  conic3dCanvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    conic.zoom = G.clamp(conic.zoom - event.deltaY * .001, .7, 1.5);
    $("[data-conic-control=" + 'zoom' + "]").value = Math.round(conic.zoom * 100);
    updateConicUI();
  }, { passive: false });
  conic3dCanvas.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "+", "-", "="].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "ArrowLeft") conic.yaw -= 4;
    if (event.key === "ArrowRight") conic.yaw += 4;
    if (event.key === "ArrowUp") conic.pitch += 4;
    if (event.key === "ArrowDown") conic.pitch -= 4;
    if (event.key === "+" || event.key === "=") conic.zoom += .05;
    if (event.key === "-") conic.zoom -= .05;
    conic.yaw = G.clamp(conic.yaw, -120, 120); conic.pitch = G.clamp(conic.pitch, -55, 45); conic.zoom = G.clamp(conic.zoom, .7, 1.5);
    $("[data-conic-control=" + 'yaw' + "]").value = G.clamp(conic.yaw, -70, 70);
    $("[data-conic-control=" + 'zoom' + "]").value = Math.round(conic.zoom * 100);
    updateConicUI();
  });

  $("[data-hero-example]").addEventListener("click", () => {
    activateTab("conic");
    conic.planeAngle = 58;
    $("[data-conic-control=" + 'planeAngle' + "]").value = 58;
    updateConicUI();
    $("#lab").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  });

  const storageKey = "paraboloid-conic-lab-records-v1";
  function loadRecords() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(storageKey) || "{}"); } catch {}
    $$('[data-mission]').forEach((input) => { input.checked = Boolean(saved.missions?.[input.dataset.mission]); });
    $$('[data-note]').forEach((textarea) => { textarea.value = saved.notes?.[textarea.dataset.note] || ""; });
  }
  function saveRecords() {
    const missions = {}; const notes = {};
    $$('[data-mission]').forEach((input) => { missions[input.dataset.mission] = input.checked; });
    $$('[data-note]').forEach((textarea) => { notes[textarea.dataset.note] = textarea.value; });
    try { localStorage.setItem(storageKey, JSON.stringify({ missions, notes })); } catch {}
  }
  $$('[data-mission]').forEach((input) => input.addEventListener("change", saveRecords));
  $$('[data-note]').forEach((textarea) => textarea.addEventListener("input", saveRecords));
  $("[data-clear-records]").addEventListener("click", () => {
    try { localStorage.removeItem(storageKey); } catch {}
    $$('[data-mission]').forEach((input) => { input.checked = false; });
    $$('[data-note]').forEach((textarea) => { textarea.value = ""; });
    showToast("관찰 기록을 지웠습니다.");
  });

  const resizeObserver = new ResizeObserver(() => {
    if (!$("[data-panel=" + 'reflection' + "]").hidden) drawReflection();
    if (!$("[data-panel=" + 'conic' + "]").hidden) drawConic();
  });
  [reflectionCanvas, conic3dCanvas, conic2dCanvas].forEach((canvas) => resizeObserver.observe(canvas.parentElement));
  window.addEventListener("pagehide", () => { stopReflection(); stopConic(); });

  loadRecords();
  updateReflectionUI();
  updateConicUI();
})();
