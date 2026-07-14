(() => {
  "use strict";

  const PHI = (1 + Math.sqrt(5)) / 2;
  const canvas = document.querySelector("[data-canvas]");
  const shell = document.querySelector("[data-canvas-shell]");
  const ctx = canvas.getContext("2d");
  const upload = document.querySelector("#image-upload");
  const zoomRange = document.querySelector("[data-zoom-range]");
  const zoomOutput = document.querySelector("[data-zoom-output]");
  const rotationRange = document.querySelector("[data-rotation-range]");
  const rotationOutput = document.querySelector("[data-rotation-output]");
  const hint = document.querySelector("[data-canvas-hint]");
  const emptyState = document.querySelector("[data-empty-state]");
  const dropMask = document.querySelector("[data-drop-mask]");
  const statusText = document.querySelector("[data-status-text]");
  const goldenToggle = document.querySelector("[data-toggle-golden]");
  const toast = document.querySelector("[data-toast]");

  const fields = {
    ratioCaption: document.querySelector("[data-ratio-caption]"),
    ratioFormula: document.querySelector("[data-ratio-formula]"),
    ratio: document.querySelector("[data-ratio]"),
    widthLabel: document.querySelector("[data-width-label]"),
    width: document.querySelector("[data-width]"),
    heightLabel: document.querySelector("[data-height-label]"),
    height: document.querySelector("[data-height]"),
    differenceLabel: document.querySelector("[data-difference-label]"),
    difference: document.querySelector("[data-difference]"),
    errorLabel: document.querySelector("[data-error-label]"),
    error: document.querySelector("[data-error]"),
    badge: document.querySelector("[data-result-badge]"),
    marker: document.querySelector("[data-ratio-marker]"),
    message: document.querySelector("[data-result-message]")
  };

  const state = {
    image: null,
    sourceName: "",
    objectUrl: null,
    mode: "rectangle",
    measurementType: "rectangle",
    fitScale: 1,
    zoom: 1,
    rotation: 0,
    offsetX: 0,
    offsetY: 0,
    pointA: null,
    pointB: null,
    segmentT: null,
    pointerDown: false,
    pointerStart: null,
    startOffset: null,
    activeHandle: null,
    showGolden: false,
    spacePressed: false
  };

  function resizeCanvas() {
    const rect = shell.getBoundingClientRect();
    const previousWidth = canvas.clientWidth;
    const previousHeight = canvas.clientHeight;
    if (state.pointA && previousWidth > 0 && previousHeight > 0) {
      const scaleX = rect.width / previousWidth;
      const scaleY = rect.height / previousHeight;
      state.pointA = { x: state.pointA.x * scaleX, y: state.pointA.y * scaleY };
      if (state.pointB) state.pointB = { x: state.pointB.x * scaleX, y: state.pointB.y * scaleY };
    }
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

  function imageDimensions() {
    return {
      width: state.image?.naturalWidth || state.image?.width || 0,
      height: state.image?.naturalHeight || state.image?.height || 0
    };
  }

  function rotationRadians() {
    return state.rotation * Math.PI / 180;
  }

  function imageCenterOnScreen(scale = imageScale()) {
    const { width, height } = imageDimensions();
    return {
      x: state.offsetX + width * scale / 2,
      y: state.offsetY + height * scale / 2
    };
  }

  function fitImage(resetMeasurement = false) {
    if (!state.image) return;
    const canvasBounds = canvasSize();
    const imageBounds = imageDimensions();
    const angle = rotationRadians();
    const rotatedWidth = Math.abs(imageBounds.width * Math.cos(angle)) + Math.abs(imageBounds.height * Math.sin(angle));
    const rotatedHeight = Math.abs(imageBounds.width * Math.sin(angle)) + Math.abs(imageBounds.height * Math.cos(angle));
    state.fitScale = Math.min(canvasBounds.width / rotatedWidth, canvasBounds.height / rotatedHeight);
    state.zoom = 1;
    state.offsetX = (canvasBounds.width - imageBounds.width * state.fitScale) / 2;
    state.offsetY = (canvasBounds.height - imageBounds.height * state.fitScale) / 2;
    if (resetMeasurement) clearMeasurement(false);
    syncZoom();
    render();
  }

  function screenToImage(x, y) {
    const scale = imageScale();
    const dimensions = imageDimensions();
    const center = imageCenterOnScreen(scale);
    const angle = rotationRadians();
    const dx = x - center.x;
    const dy = y - center.y;
    const unrotatedX = dx * Math.cos(angle) + dy * Math.sin(angle);
    const unrotatedY = -dx * Math.sin(angle) + dy * Math.cos(angle);
    return {
      x: Math.max(0, Math.min(dimensions.width, unrotatedX / scale + dimensions.width / 2)),
      y: Math.max(0, Math.min(dimensions.height, unrotatedY / scale + dimensions.height / 2))
    };
  }

  function imageToScreen(point) {
    const scale = imageScale();
    const dimensions = imageDimensions();
    const center = imageCenterOnScreen(scale);
    const angle = rotationRadians();
    const x = (point.x - dimensions.width / 2) * scale;
    const y = (point.y - dimensions.height / 2) * scale;
    return {
      x: center.x + x * Math.cos(angle) - y * Math.sin(angle),
      y: center.y + x * Math.sin(angle) + y * Math.cos(angle)
    };
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
    const dimensions = imageDimensions();
    const center = imageCenterOnScreen(scale);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(rotationRadians());
    ctx.drawImage(state.image, -dimensions.width * scale / 2, -dimensions.height * scale / 2, dimensions.width * scale, dimensions.height * scale);
    ctx.restore();
    drawMeasurement();
  }

  function tracePolygon(points) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
    ctx.closePath();
  }

  function outsideLabelPoint(edgeStart, edgeEnd, center, distance = 15) {
    const midpoint = { x: (edgeStart.x + edgeEnd.x) / 2, y: (edgeStart.y + edgeEnd.y) / 2 };
    const dx = midpoint.x - center.x;
    const dy = midpoint.y - center.y;
    const length = Math.hypot(dx, dy) || 1;
    return { x: midpoint.x + dx / length * distance, y: midpoint.y + dy / length * distance };
  }

  function drawMeasurement() {
    if (!state.pointA) return;
    if (state.measurementType === "segment") drawSegmentMeasurement();
    else drawRectangleMeasurement();
  }

  function drawRectangleMeasurement() {
    const a = state.pointA;
    const b = state.pointB || a;

    if (state.pointB) {
      const imageWidth = Math.abs(state.pointB.x - state.pointA.x);
      const imageHeight = Math.abs(state.pointB.y - state.pointA.y);
      const corners = [
        state.pointA,
        { x: state.pointB.x, y: state.pointA.y },
        state.pointB,
        { x: state.pointA.x, y: state.pointB.y }
      ];
      const center = {
        x: corners.reduce((sum, point) => sum + point.x, 0) / 4,
        y: corners.reduce((sum, point) => sum + point.y, 0) / 4
      };
      ctx.save();
      ctx.fillStyle = "rgba(229, 184, 63, .16)";
      ctx.strokeStyle = "#f2cb5e";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 5]);
      tracePolygon(corners);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);

      if (state.showGolden && imageWidth > 2 && imageHeight > 2) drawGoldenRectangleGuide(imageWidth, imageHeight);

      ctx.font = '700 11px "Noto Sans KR", sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const widthLabel = outsideLabelPoint(corners[0], corners[1], center);
      const heightLabel = outsideLabelPoint(corners[0], corners[3], center);
      drawLabel(`${Math.round(imageWidth)} px`, widthLabel.x, widthLabel.y);
      drawLabel(`${Math.round(imageHeight)} px`, heightLabel.x, heightLabel.y);
      ctx.restore();
    }

    drawHandle(a, "A");
    if (state.pointB) drawHandle(b, "B");
  }

  function drawGoldenRectangleGuide(width, height) {
    const signX = state.pointB.x >= state.pointA.x ? 1 : -1;
    const signY = state.pointB.y >= state.pointA.y ? 1 : -1;
    let guideWidth;
    let guideHeight;
    if (width >= height) {
      guideHeight = height;
      guideWidth = height * PHI;
    } else {
      guideWidth = width;
      guideHeight = width * PHI;
    }
    const end = {
      x: state.pointA.x + guideWidth * signX,
      y: state.pointA.y + guideHeight * signY
    };
    const corners = [
      state.pointA,
      { x: end.x, y: state.pointA.y },
      end,
      { x: state.pointA.x, y: end.y }
    ];
    const center = {
      x: corners.reduce((sum, point) => sum + point.x, 0) / 4,
      y: corners.reduce((sum, point) => sum + point.y, 0) / 4
    };
    ctx.save();
    ctx.strokeStyle = "rgba(126, 244, 172, .95)";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 5]);
    tracePolygon(corners);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = '700 10px "Noto Sans KR", sans-serif';
    ctx.fillStyle = "#173b26";
    const label = outsideLabelPoint(corners[3], corners[2], center, 14);
    drawLabel("φ 기준", label.x, label.y, "#bdf4cc", "#173b26");
    ctx.restore();
  }

  function segmentPoint(t = state.segmentT) {
    if (!state.pointA || !state.pointB || t == null) return null;
    return {
      x: state.pointA.x + (state.pointB.x - state.pointA.x) * t,
      y: state.pointA.y + (state.pointB.y - state.pointA.y) * t
    };
  }

  function projectToSegment(point) {
    if (!state.pointA || !state.pointB) return .5;
    const dx = state.pointB.x - state.pointA.x;
    const dy = state.pointB.y - state.pointA.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared < 1) return .5;
    const t = ((point.x - state.pointA.x) * dx + (point.y - state.pointA.y) * dy) / lengthSquared;
    return Math.max(.02, Math.min(.98, t));
  }

  function drawLine(start, end, color, width, dashed = false) {
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dashed ? [5, 5] : []);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function segmentLabelPoint(start, end, distance = 16) {
    const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy) || 1;
    return { x: midpoint.x - dy / length * distance, y: midpoint.y + dx / length * distance };
  }

  function drawSegmentMeasurement() {
    const a = state.pointA;
    const b = state.pointB;
    if (!b) {
      drawHandle(a, "A");
      return;
    }

    ctx.save();
    drawLine(a, b, "rgba(255,255,255,.76)", 8);
    drawLine(a, b, "#17231b", 3);
    const p = segmentPoint();
    if (p) {
      drawLine(a, p, "#f2cb5e", 5);
      drawLine(p, b, "#78d7a0", 5);
      const firstLength = Math.hypot(p.x - a.x, p.y - a.y);
      const secondLength = Math.hypot(b.x - p.x, b.y - p.y);
      ctx.font = '700 11px "Noto Sans KR", sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const firstLabel = segmentLabelPoint(a, p);
      const secondLabel = segmentLabelPoint(p, b);
      drawLabel(`${Math.round(firstLength)} px`, firstLabel.x, firstLabel.y);
      drawLabel(`${Math.round(secondLength)} px`, secondLabel.x, secondLabel.y);
      if (state.showGolden) drawGoldenSegmentGuide();
      drawHandle(p, "P", "#78d7a0");
    }
    ctx.restore();
    drawHandle(a, "A");
    drawHandle(b, "B");
  }

  function drawGoldenSegmentGuide() {
    const idealT = state.segmentT <= .5 ? 1 - 1 / PHI : 1 / PHI;
    const ideal = segmentPoint(idealT);
    const measured = segmentPoint();
    if (!ideal || !measured) return;
    ctx.save();
    drawLine(measured, ideal, "rgba(126, 244, 172, .8)", 2, true);
    ctx.beginPath();
    ctx.arc(ideal.x, ideal.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#bdf4cc";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#173b26";
    ctx.stroke();
    ctx.font = '700 10px "Noto Sans KR", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const label = segmentLabelPoint(state.pointA, state.pointB, -18);
    label.x += (ideal.x - (state.pointA.x + state.pointB.x) / 2);
    label.y += (ideal.y - (state.pointA.y + state.pointB.y) / 2);
    drawLabel("φ 분할점", label.x, label.y, "#bdf4cc", "#173b26");
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

  function drawHandle(point, label, stroke = "#f2cb5e") {
    ctx.save();
    ctx.beginPath();
    ctx.arc(point.x, point.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = "#17231b";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = stroke;
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
    const handles = [{ name: "a", point: state.pointA }];
    if (state.pointB) handles.push({ name: "b", point: state.pointB });
    const p = state.measurementType === "segment" ? segmentPoint() : null;
    if (p) handles.push({ name: "p", point: p });
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

    const measurementComplete = state.measurementType === "rectangle"
      ? Boolean(state.pointA && state.pointB)
      : Boolean(state.pointA && state.pointB && state.segmentT != null);

    if (!state.pointA || measurementComplete) {
      state.pointA = point;
      state.pointB = null;
      state.segmentT = null;
      state.activeHandle = "new";
      hint.innerHTML = state.measurementType === "segment"
        ? "<b>2</b> 전체 선분의 끝점 B를 클릭하세요"
        : "<b>2</b> 사각형의 반대 꼭짓점 B를 클릭하세요";
      resetResults();
    } else if (!state.pointB) {
      state.pointB = point;
      state.activeHandle = "b";
    } else if (state.measurementType === "segment" && state.segmentT == null) {
      state.segmentT = projectToSegment(point);
      state.activeHandle = "p";
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
      state.pointA = point;
    } else if (state.activeHandle === "b") {
      state.pointB = point;
    } else if (state.activeHandle === "p") {
      state.segmentT = projectToSegment(point);
    } else if (state.activeHandle === "new" && Math.hypot(point.x - state.pointerStart.x, point.y - state.pointerStart.y) > 5) {
      state.pointB = point;
    }
    render();
    if (state.pointB && (state.measurementType === "rectangle" || state.segmentT != null)) updateResults();
  }

  function onPointerUp(event) {
    if (!state.pointerDown) return;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    state.pointerDown = false;
    canvas.classList.remove("is-panning");
    const complete = state.pointB && (state.measurementType === "rectangle" || state.segmentT != null);
    if (complete) {
      updateResults();
      hint.style.opacity = "0";
      statusText.textContent = state.measurementType === "segment"
        ? "선분 측정 완료 — A·P·B 점을 끌어 세밀하게 조정할 수 있습니다."
        : "사각형 측정 완료 — A와 B를 끌어 세밀하게 조정할 수 있습니다.";
    } else if (state.measurementType === "segment" && state.pointB) {
      hint.innerHTML = "<b>3</b> 선분 위의 분할점 P를 클릭하세요";
      hint.style.opacity = "1";
      statusText.textContent = "전체 선분이 만들어졌습니다. 황금분할을 확인할 점 P를 지정하세요.";
    }
    state.activeHandle = null;
  }

  function updateResults() {
    if (!state.pointA || !state.pointB) return resetResults();
    if (state.measurementType === "segment") updateSegmentResults();
    else updateRectangleResults();
  }

  function setComparisonMarker(ratio) {
    fields.marker.hidden = false;
    fields.marker.style.left = `${Math.max(0, Math.min(100, (ratio - 1) * 100))}%`;
  }

  function setResultBadge(error) {
    fields.badge.className = "result-badge";
    if (error <= 1) {
      fields.badge.textContent = "거의 일치";
      fields.badge.classList.add("is-close");
    } else if (error <= 3) {
      fields.badge.textContent = "매우 가까움";
      fields.badge.classList.add("is-close");
    } else if (error <= 7) {
      fields.badge.textContent = "비슷함";
      fields.badge.classList.add("is-close");
    } else {
      fields.badge.textContent = "차이 있음";
      fields.badge.classList.add("is-far");
    }
  }

  function updateRectangleResults() {
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
    setComparisonMarker(ratio);
    setResultBadge(error);
    if (error <= 1) {
      fields.message.textContent = "황금비에 거의 정확히 맞습니다. 다른 영역에서도 같은 결과가 나오는지 확인해 보세요.";
    } else if (error <= 3) {
      fields.message.textContent = "황금비에 매우 가깝습니다. 점의 위치를 조금씩 바꾸며 가장 가까운 경계를 찾아보세요.";
    } else if (error <= 7) {
      fields.message.textContent = "황금비와 비슷한 비율입니다. 황금 사각형 비교선을 켜 차이가 나는 방향을 살펴보세요.";
    } else {
      fields.message.textContent = "황금비와 차이가 있습니다. 이것도 중요한 관찰입니다. 다른 부분을 재어 결과를 비교해 보세요.";
    }
  }

  function updateSegmentResults() {
    if (state.segmentT == null) return resetResults();
    const total = Math.hypot(state.pointB.x - state.pointA.x, state.pointB.y - state.pointA.y);
    const first = total * state.segmentT;
    const second = total * (1 - state.segmentT);
    const longPart = Math.max(first, second);
    const shortPart = Math.min(first, second);
    if (shortPart < 1) return resetResults();
    const longToShort = longPart / shortPart;
    const wholeToLong = total / longPart;
    const ratiosDifference = Math.abs(longToShort - wholeToLong);
    const error = Math.max(Math.abs(longToShort - PHI), Math.abs(wholeToLong - PHI)) / PHI * 100;
    fields.width.textContent = Math.round(longPart).toLocaleString("ko-KR");
    fields.height.textContent = Math.round(shortPart).toLocaleString("ko-KR");
    fields.ratio.textContent = longToShort.toFixed(3);
    fields.difference.textContent = wholeToLong.toFixed(3);
    fields.error.textContent = ratiosDifference.toFixed(3);
    setComparisonMarker(longToShort);
    setResultBadge(error);
    fields.message.textContent = `긴÷짧은 ${longToShort.toFixed(3)}, 전체÷긴 ${wholeToLong.toFixed(3)}입니다. 두 값의 차이는 ${ratiosDifference.toFixed(3)}이고 황금비 기준 최대 오차율은 ${error.toFixed(1)}%입니다.`;
  }

  function resetResults() {
    const segmentMode = state.measurementType === "segment";
    fields.ratioCaption.textContent = segmentMode ? "선분 분할 비율" : "사각형 비율";
    fields.ratioFormula.textContent = segmentMode ? "긴 부분 ÷ 짧은 부분" : "긴 변 ÷ 짧은 변";
    fields.widthLabel.textContent = segmentMode ? "긴 부분" : "가로";
    fields.heightLabel.textContent = segmentMode ? "짧은 부분" : "세로";
    fields.differenceLabel.textContent = segmentMode ? "전체 ÷ 긴 부분" : "황금비와 차이";
    fields.errorLabel.textContent = segmentMode ? "두 비율 차이" : "오차율";
    fields.ratio.textContent = "—";
    fields.width.textContent = "—";
    fields.height.textContent = "—";
    fields.difference.textContent = "—";
    fields.error.textContent = "—";
    fields.badge.textContent = "측정 전";
    fields.badge.className = "result-badge";
    fields.marker.hidden = true;
    fields.message.textContent = segmentMode
      ? "전체 선분 A–B를 만든 뒤 분할점 P를 지정해 보세요."
      : "사진에서 비교할 영역의 두 꼭짓점을 지정해 보세요.";
  }

  function clearMeasurement(announce = true) {
    state.pointA = null;
    state.pointB = null;
    state.segmentT = null;
    hint.innerHTML = state.measurementType === "segment"
      ? "<b>1</b> 전체 선분의 시작점 A를 클릭하세요"
      : "<b>1</b> 사각형의 첫 번째 꼭짓점을 클릭하세요";
    hint.style.opacity = "1";
    resetResults();
    render();
    if (announce) {
      statusText.textContent = state.measurementType === "segment"
        ? "측정점을 지웠습니다. 전체 선분의 시작점 A를 지정하세요."
        : "측정점을 지웠습니다. 사각형의 첫 번째 꼭짓점을 지정하세요.";
      showToast("측정점을 지웠습니다.");
    }
  }

  function setZoom(nextZoom, anchor = null) {
    if (!state.image) return;
    const { width, height } = canvasSize();
    const focus = anchor || { x: width / 2, y: height / 2 };
    const imageFocus = screenToImage(focus.x, focus.y);
    state.zoom = Math.max(.5, Math.min(4, nextZoom));
    const nextScale = imageScale();
    const dimensions = imageDimensions();
    const angle = rotationRadians();
    const relativeX = (imageFocus.x - dimensions.width / 2) * nextScale;
    const relativeY = (imageFocus.y - dimensions.height / 2) * nextScale;
    const centerX = focus.x - (relativeX * Math.cos(angle) - relativeY * Math.sin(angle));
    const centerY = focus.y - (relativeX * Math.sin(angle) + relativeY * Math.cos(angle));
    state.offsetX = centerX - dimensions.width * nextScale / 2;
    state.offsetY = centerY - dimensions.height * nextScale / 2;
    syncZoom();
    render();
  }

  function syncZoom() {
    const percent = Math.round(state.zoom * 100);
    zoomRange.value = String(percent);
    zoomOutput.value = `${percent}%`;
    zoomOutput.textContent = `${percent}%`;
  }

  function normalizeRotation(value) {
    let normalized = Math.round(value);
    while (normalized > 180) normalized -= 360;
    while (normalized < -180) normalized += 360;
    return normalized;
  }

  function setRotation(value) {
    state.rotation = normalizeRotation(value);
    rotationRange.value = String(state.rotation);
    rotationOutput.value = `${state.rotation}°`;
    rotationOutput.textContent = `${state.rotation}°`;
    if (state.image) fitImage(false);
    statusText.textContent = `사진만 ${state.rotation}° 회전했습니다. 측정점과 도형은 화면에 고정됩니다.`;
  }

  function loadImage(src, name, markExample = null) {
    const image = new Image();
    image.onload = () => {
      state.image = image;
      state.sourceName = name;
      state.rotation = 0;
      rotationRange.value = "0";
      rotationOutput.value = "0°";
      rotationOutput.textContent = "0°";
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
    if (mode !== "pan" && mode !== state.measurementType) {
      state.measurementType = mode;
      clearMeasurement(false);
    }
    state.mode = mode;
    document.querySelectorAll("[data-mode]").forEach((button) => {
      const active = button.dataset.mode === mode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    canvas.classList.toggle("is-pan", mode === "pan");
    document.querySelector("[data-golden-label]").textContent = state.measurementType === "segment" ? "황금분할점 비교" : "황금 사각형 비교";
    if (mode === "pan") statusText.textContent = "사진만 끌어 이동합니다. 측정점과 도형은 화면에 고정됩니다.";
    else if (mode === "segment") statusText.textContent = "전체 선분 A–B를 만든 뒤 분할점 P를 지정하세요.";
    else statusText.textContent = "수평·수직 사각형을 만들 두 꼭짓점을 지정하세요.";
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
  rotationRange.addEventListener("input", () => setRotation(Number(rotationRange.value)));
  document.querySelector("[data-rotate-left]").addEventListener("click", () => setRotation(state.rotation - 90));
  document.querySelector("[data-rotate-right]").addEventListener("click", () => setRotation(state.rotation + 90));
  document.querySelector("[data-rotation-reset]").addEventListener("click", () => setRotation(0));
  document.querySelector("[data-fit]").addEventListener("click", () => fitImage(false));
  document.querySelector("[data-clear]").addEventListener("click", () => clearMeasurement(true));
  document.querySelector("[data-download]").addEventListener("click", saveResult);
  goldenToggle.addEventListener("click", () => {
    state.showGolden = !state.showGolden;
    goldenToggle.setAttribute("aria-pressed", String(state.showGolden));
    goldenToggle.querySelector("[data-toggle-state]").textContent = state.showGolden ? "켬" : "끔";
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
