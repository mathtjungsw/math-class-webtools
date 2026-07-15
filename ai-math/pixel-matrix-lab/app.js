(function () {
  "use strict";

  var M = window.PixelMatrix;
  var $ = function (id) { return document.getElementById(id); };
  var sourceCanvas = $("sourceCanvas");
  var sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
  var state = {
    resolution: 8,
    threshold: 128,
    sourceMatrix: [],
    sourceImageData: null,
    matrix: [],
    outputMatrix: [],
    selectedRow: 0,
    selectedColumn: 0,
    step: 0,
    playing: false,
    timer: null,
    drawing: new Array(256).fill(255),
    completedMissions: new Set()
  };

  var PRESETS = {
    blur: { kernel: [[1,1,1],[1,1,1],[1,1,1]], normalize: true, bias: 0 },
    sharpen: { kernel: [[0,-1,0],[-1,5,-1],[0,-1,0]], normalize: false, bias: 0 },
    edge: { kernel: [[-1,-1,-1],[-1,8,-1],[-1,-1,-1]], normalize: false, bias: 0 },
    emboss: { kernel: [[-2,-1,0],[-1,1,1],[0,1,2]], normalize: false, bias: 128 },
    identity: { kernel: [[0,0,0],[0,1,0],[0,0,0]], normalize: false, bias: 0 }
  };

  function setStatus(message, error) {
    $("statusMessage").textContent = message;
    $("statusMessage").classList.toggle("is-error", Boolean(error));
  }

  function drawSample(name) {
    var width = 320;
    var height = 320;
    sourceCanvas.width = width;
    sourceCanvas.height = height;
    sourceContext.clearRect(0, 0, width, height);
    if (name === "gradient") {
      for (var band = 0; band < 8; band += 1) {
        var gray = Math.round(band * 255 / 7);
        sourceContext.fillStyle = "rgb(" + gray + "," + gray + "," + gray + ")";
        sourceContext.fillRect(band * 40, 0, 40, height);
      }
      sourceContext.fillStyle = "#dc6b31";
      sourceContext.fillRect(0, 232, 320, 16);
    } else if (name === "checker") {
      for (var y = 0; y < 8; y += 1) for (var x = 0; x < 8; x += 1) {
        var value = (x + y) % 2 ? 232 : 35;
        sourceContext.fillStyle = "rgb(" + value + "," + value + "," + value + ")";
        sourceContext.fillRect(x * 40, y * 40, 40, 40);
      }
      sourceContext.fillStyle = "#55a782";
      sourceContext.beginPath(); sourceContext.arc(160, 160, 80, 0, Math.PI * 2); sourceContext.fill();
    } else if (name === "landscape") {
      var sky = sourceContext.createLinearGradient(0, 0, 0, 320);
      sky.addColorStop(0, "#e7f4f6"); sky.addColorStop(1, "#85b6bc");
      sourceContext.fillStyle = sky; sourceContext.fillRect(0, 0, 320, 320);
      sourceContext.fillStyle = "#fff3bf"; sourceContext.beginPath(); sourceContext.arc(245, 72, 36, 0, Math.PI * 2); sourceContext.fill();
      sourceContext.fillStyle = "#315c55"; sourceContext.beginPath(); sourceContext.moveTo(0, 255); sourceContext.lineTo(110, 105); sourceContext.lineTo(215, 255); sourceContext.closePath(); sourceContext.fill();
      sourceContext.fillStyle = "#58866d"; sourceContext.beginPath(); sourceContext.moveTo(90, 270); sourceContext.lineTo(218, 128); sourceContext.lineTo(320, 270); sourceContext.closePath(); sourceContext.fill();
      sourceContext.fillStyle = "#d7e0d7"; sourceContext.beginPath(); sourceContext.moveTo(88, 135); sourceContext.lineTo(110, 105); sourceContext.lineTo(135, 140); sourceContext.lineTo(114, 132); sourceContext.closePath(); sourceContext.fill();
      sourceContext.fillStyle = "#274a3b"; sourceContext.fillRect(0, 250, 320, 70);
    } else {
      sourceContext.fillStyle = "#e8f1ee"; sourceContext.fillRect(0, 0, 320, 320);
      sourceContext.fillStyle = "#173c50"; sourceContext.fillRect(64, 62, 192, 196);
      sourceContext.fillStyle = "#76c3a2"; sourceContext.fillRect(80, 78, 160, 160);
      sourceContext.fillStyle = "#f7f4e9"; sourceContext.fillRect(98, 102, 44, 44); sourceContext.fillRect(178, 102, 44, 44);
      sourceContext.fillStyle = "#173c50"; sourceContext.fillRect(112, 116, 18, 18); sourceContext.fillRect(192, 116, 18, 18);
      sourceContext.fillRect(104, 185, 112, 14); sourceContext.fillRect(118, 199, 14, 14); sourceContext.fillRect(188, 199, 14, 14);
      sourceContext.fillStyle = "#db6c31"; sourceContext.fillRect(148, 34, 24, 28); sourceContext.beginPath(); sourceContext.arc(160, 30, 12, 0, Math.PI * 2); sourceContext.fill();
      sourceContext.fillStyle = "#173c50"; sourceContext.fillRect(44, 111, 20, 70); sourceContext.fillRect(256, 111, 20, 70); sourceContext.fillRect(112, 258, 28, 30); sourceContext.fillRect(180, 258, 28, 30);
    }
    updateFromSource("내장 예시를 불러왔습니다.");
  }

  function updateFromSource(message) {
    state.sourceImageData = sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
    state.sourceMatrix = M.imageDataToMatrix(state.sourceImageData);
    $("sourceSize").textContent = sourceCanvas.width + " × " + sourceCanvas.height + " px";
    state.selectedRow = 0;
    state.selectedColumn = 0;
    state.step = 0;
    refreshExperiment();
    setStatus(message + " 모든 계산은 브라우저 안에서만 실행됩니다.");
  }

  function refreshExperiment() {
    var resample = $("resampleSelect").value === "nearest" ? M.resampleNearest : M.resampleAverage;
    state.matrix = resample(state.sourceMatrix, state.resolution, state.resolution);
    state.selectedRow = Math.min(state.resolution - 1, state.selectedRow);
    state.selectedColumn = Math.min(state.resolution - 1, state.selectedColumn);
    state.step = Math.min(state.step, state.resolution * state.resolution - 1);
    renderMatrix();
    renderInspector();
    renderBinary();
    renderComparison();
    updateConvolution();
  }

  function textColor(value) { return value < 135 ? "#ffffff" : "#101b17"; }

  function renderMatrix() {
    var grid = $("matrixGrid");
    var binaryMode = $("binaryToggle").checked;
    var binaryMatrix = M.binary(state.matrix, state.threshold);
    grid.innerHTML = "";
    grid.style.setProperty("--columns", state.resolution);
    grid.dataset.size = String(state.resolution);
    grid.setAttribute("aria-label", (binaryMode ? "이진값" : "명도값") + " " + state.resolution + "×" + state.resolution + " 행렬");
    state.matrix.forEach(function (row, y) {
      row.forEach(function (value, x) {
        var button = document.createElement("button");
        var displayValue = binaryMode ? binaryMatrix[y][x] : value;
        var gray = binaryMode ? displayValue * 255 : value;
        button.type = "button";
        button.className = "matrix-cell" + (y === state.selectedRow && x === state.selectedColumn ? " is-selected" : "");
        button.style.backgroundColor = "rgb(" + gray + "," + gray + "," + gray + ")";
        button.style.color = textColor(gray);
        button.textContent = displayValue;
        button.tabIndex = y === state.selectedRow && x === state.selectedColumn ? 0 : -1;
        button.dataset.row = y;
        button.dataset.column = x;
        button.setAttribute("role", "gridcell");
        button.setAttribute("aria-label", (y + 1) + "행 " + (x + 1) + "열, " + (binaryMode ? "이진값 " : "명도 ") + displayValue);
        grid.appendChild(button);
      });
    });
  }

  function selectCell(row, column, focus) {
    state.selectedRow = Math.max(0, Math.min(state.resolution - 1, row));
    state.selectedColumn = Math.max(0, Math.min(state.resolution - 1, column));
    renderMatrix();
    renderInspector();
    if (focus) {
      var selected = $("matrixGrid").querySelector(".is-selected");
      if (selected) selected.focus();
    }
  }

  function renderInspector() {
    if (!state.matrix.length) return;
    var x = Math.min(sourceCanvas.width - 1, Math.floor((state.selectedColumn + 0.5) * sourceCanvas.width / state.resolution));
    var y = Math.min(sourceCanvas.height - 1, Math.floor((state.selectedRow + 0.5) * sourceCanvas.height / state.resolution));
    var index = (y * state.sourceImageData.width + x) * 4;
    var r = state.sourceImageData.data[index];
    var g = state.sourceImageData.data[index + 1];
    var b = state.sourceImageData.data[index + 2];
    var representative = M.rgbToLuminance(r, g, b);
    var value = state.matrix[state.selectedRow][state.selectedColumn];
    $("cellRow").textContent = state.selectedRow + 1;
    $("cellColumn").textContent = state.selectedColumn + 1;
    $("cellLuminance").textContent = value;
    $("sourcePosition").textContent = "x " + x + ", y " + y;
    $("rgbValue").textContent = "(" + r + ", " + g + ", " + b + ")";
    $("luminanceFormula").textContent = "0.2126×" + r + " + 0.7152×" + g + " + 0.0722×" + b + " ≈ " + representative + " (셀 평균 " + value + ")";
    $("binaryValue").textContent = value >= state.threshold ? "1 (임계값 이상)" : "0 (임계값 미만)";
    $("selectedSwatch").style.backgroundColor = "rgb(" + value + "," + value + "," + value + ")";
    $("selectedSwatch").style.color = textColor(value);
  }

  function drawMatrix(canvas, matrix, binaryMode) {
    var ctx = canvas.getContext("2d");
    var height = matrix.length;
    var width = height ? matrix[0].length : 0;
    if (!width) return;
    var buffer = document.createElement("canvas");
    buffer.width = width;
    buffer.height = height;
    var bctx = buffer.getContext("2d");
    var data = bctx.createImageData(width, height);
    for (var y = 0; y < height; y += 1) for (var x = 0; x < width; x += 1) {
      var value = binaryMode ? matrix[y][x] * 255 : Math.round(M.clamp(matrix[y][x]));
      var index = (y * width + x) * 4;
      data.data[index] = value; data.data[index + 1] = value; data.data[index + 2] = value; data.data[index + 3] = 255;
    }
    bctx.putImageData(data, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buffer, 0, 0, canvas.width, canvas.height);
  }

  function renderBinary() {
    var result = M.binary(state.matrix, state.threshold);
    var ones = result.reduce(function (sum, row) { return sum + row.reduce(function (s, value) { return s + value; }, 0); }, 0);
    $("whiteCellCount").textContent = ones;
    $("blackCellCount").textContent = state.resolution * state.resolution - ones;
    drawMatrix($("binaryCanvas"), result, true);
  }

  function renderComparison() {
    var method = $("resampleSelect").value === "nearest" ? M.resampleNearest : M.resampleAverage;
    var original = M.resampleAverage(state.sourceMatrix, 64, 64);
    drawMatrix($("compareOriginal"), original, false);
    [16, 8, 4].forEach(function (size) {
      var small = method(state.sourceMatrix, size, size);
      drawMatrix($("compare" + size), small, false);
      var reconstructed = M.resampleNearest(small, 64, 64);
      var mse = M.meanSquaredError(original, reconstructed);
      $("metric" + size).textContent = "평균 제곱 오차 " + Math.round(mse).toLocaleString("ko-KR");
    });
  }

  function getKernel() {
    return Array.from($("kernelGrid").querySelectorAll("input")).reduce(function (rows, input, index) {
      var row = Math.floor(index / 3);
      if (!rows[row]) rows[row] = [];
      rows[row].push(Number(input.value) || 0);
      return rows;
    }, []);
  }

  function getConvolutionOptions() {
    return { padding: $("paddingSelect").value, normalize: $("normalizeToggle").checked, bias: Number($("biasInput").value) || 0 };
  }

  function renderKernelInputs(kernel) {
    var grid = $("kernelGrid");
    grid.innerHTML = "";
    kernel.forEach(function (row, y) { row.forEach(function (value, x) {
      var input = document.createElement("input");
      input.type = "number"; input.step = "0.1"; input.value = value;
      input.setAttribute("aria-label", "커널 " + (y + 1) + "행 " + (x + 1) + "열");
      input.addEventListener("input", function () { $("presetSelect").value = ""; updateConvolution(); });
      grid.appendChild(input);
    }); });
  }

  function applyPreset(name) {
    var preset = PRESETS[name];
    if (!preset) return;
    renderKernelInputs(preset.kernel);
    $("normalizeToggle").checked = preset.normalize;
    $("biasInput").value = preset.bias;
    state.step = 0;
    updateConvolution();
    setStatus("‘" + $("presetSelect").selectedOptions[0].textContent + "’ 커널을 적용했습니다. 각 곱셈과 합계를 확인해 보세요.");
  }

  function updateConvolution() {
    if (!state.matrix.length || !$("kernelGrid").children.length) return;
    var kernel = getKernel();
    var options = getConvolutionOptions();
    state.outputMatrix = M.convolve(state.matrix, kernel, options);
    var y = Math.floor(state.step / state.resolution);
    var x = state.step % state.resolution;
    var detail = M.convolutionAt(state.matrix, kernel, y, x, options);
    var patch = $("inputPatch");
    patch.innerHTML = "";
    detail.products.forEach(function (item) {
      var span = document.createElement("span");
      span.textContent = item.input;
      span.style.backgroundColor = "rgb(" + item.input + "," + item.input + "," + item.input + ")";
      span.style.color = textColor(item.input);
      if (item.sourceY < 0 || item.sourceX < 0 || item.sourceY >= state.resolution || item.sourceX >= state.resolution) span.classList.add("is-outside");
      patch.appendChild(span);
    });
    var products = $("productList");
    products.innerHTML = "";
    detail.products.forEach(function (item) {
      var span = document.createElement("span");
      span.textContent = item.input + "×" + item.weight + "=" + formatNumber(item.product);
      products.appendChild(span);
    });
    $("kernelSum").textContent = formatNumber(M.kernelSum(kernel));
    $("divisorValue").textContent = formatNumber(detail.divisor);
    $("positionLabel").textContent = "출력 (" + (y + 1) + ", " + (x + 1) + ")";
    $("equationText").textContent = formatNumber(detail.raw) + " ÷ " + formatNumber(detail.divisor) + " + " + options.bias + " = " + formatNumber(detail.biased) + " → " + detail.output;
    $("outputValue").textContent = detail.output;
    $("outputPixel").style.backgroundColor = "rgb(" + detail.output + "," + detail.output + "," + detail.output + ")";
    $("outputPixel").style.color = textColor(detail.output);
    $("convolutionStep").textContent = (state.step + 1) + " / " + (state.resolution * state.resolution) + "칸";
    drawMatrix($("filterInputCanvas"), state.matrix, false);
    drawMatrix($("filterOutputCanvas"), state.outputMatrix, false);
  }

  function formatNumber(value) {
    if (Math.abs(value - Math.round(value)) < 0.0001) return String(Math.round(value));
    return Number(value).toFixed(2).replace(/\.00$/, "");
  }

  function changeStep(delta) {
    var total = state.resolution * state.resolution;
    state.step = (state.step + delta + total) % total;
    updateConvolution();
  }

  function stopPlayback() {
    if (state.timer) window.clearInterval(state.timer);
    state.timer = null;
    state.playing = false;
    $("playButton").textContent = "자동 재생";
  }

  function togglePlayback() {
    if (state.playing) { stopPlayback(); return; }
    state.playing = true;
    $("playButton").textContent = "일시정지";
    var speed = Number($("speedSelect").value);
    state.timer = window.setInterval(function () {
      var last = state.resolution * state.resolution - 1;
      if (state.step >= last) { stopPlayback(); return; }
      changeStep(1);
    }, speed);
  }

  function initDrawingGrid() {
    var grid = $("drawGrid");
    var painting = false;
    function paintCell(cell) {
      var index = Number(cell.dataset.index);
      var value = Number($("brushRange").value);
      state.drawing[index] = value;
      cell.style.backgroundColor = "rgb(" + value + "," + value + "," + value + ")";
      cell.setAttribute("aria-label", (Math.floor(index / 16) + 1) + "행 " + (index % 16 + 1) + "열, 명도 " + value);
    }
    for (var index = 0; index < 256; index += 1) {
      var cell = document.createElement("button");
      cell.type = "button"; cell.className = "draw-cell"; cell.dataset.index = index;
      cell.style.backgroundColor = "#fff"; cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-label", (Math.floor(index / 16) + 1) + "행 " + (index % 16 + 1) + "열, 명도 255");
      cell.addEventListener("pointerdown", function (event) { painting = true; event.preventDefault(); paintCell(event.currentTarget); });
      cell.addEventListener("pointerenter", function (event) { if (painting || event.buttons === 1) paintCell(event.currentTarget); });
      cell.addEventListener("pointerup", function () { painting = false; });
      cell.addEventListener("keydown", function (event) { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); paintCell(event.currentTarget); } });
      grid.appendChild(cell);
    }
    grid.addEventListener("pointermove", function (event) {
      if (!painting) return;
      event.preventDefault();
      var target = document.elementFromPoint(event.clientX, event.clientY);
      var cell = target && target.closest ? target.closest(".draw-cell") : null;
      if (cell && grid.contains(cell)) paintCell(cell);
    });
    window.addEventListener("pointerup", function () { painting = false; });
    window.addEventListener("pointercancel", function () { painting = false; });
  }

  function refreshDrawingCells() {
    Array.from($("drawGrid").children).forEach(function (cell, index) {
      var value = state.drawing[index];
      cell.style.backgroundColor = "rgb(" + value + "," + value + "," + value + ")";
    });
  }

  function useDrawing() {
    sourceCanvas.width = 320; sourceCanvas.height = 320;
    sourceContext.imageSmoothingEnabled = false;
    state.drawing.forEach(function (value, index) {
      sourceContext.fillStyle = "rgb(" + value + "," + value + "," + value + ")";
      sourceContext.fillRect((index % 16) * 20, Math.floor(index / 16) * 20, 20, 20);
    });
    updateFromSource("직접 그린 16×16 픽셀 그림을 불러왔습니다.");
  }

  function loadImage(file) {
    if (!file || !file.type.match(/^image\//)) { setStatus("PNG, JPG, WebP 또는 GIF 이미지 파일을 선택해 주세요.", true); return; }
    if (file.size > 20 * 1024 * 1024) { setStatus("이미지 파일은 20MB 이하로 선택해 주세요.", true); return; }
    var url = URL.createObjectURL(file);
    var image = new Image();
    image.onload = function () {
      var scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
      sourceCanvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      sourceCanvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      sourceContext.fillStyle = "#ffffff";
      sourceContext.fillRect(0, 0, sourceCanvas.width, sourceCanvas.height);
      sourceContext.drawImage(image, 0, 0, sourceCanvas.width, sourceCanvas.height);
      URL.revokeObjectURL(url);
      updateFromSource("‘" + file.name + "’을(를) " + sourceCanvas.width + "×" + sourceCanvas.height + "로 준비했습니다.");
    };
    image.onerror = function () { URL.revokeObjectURL(url); setStatus("이미지를 읽지 못했습니다. 다른 파일을 선택해 주세요.", true); };
    image.src = url;
  }

  function matrixCsv() {
    return state.matrix.map(function (row) { return row.join(","); }).join("\n");
  }

  function downloadBlob(blob, filename) {
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob); link.download = filename;
    document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
  }

  function copyCsv() {
    var text = matrixCsv();
    var fallback = function () {
      var area = document.createElement("textarea"); area.value = text; area.style.position = "fixed"; area.style.opacity = "0";
      document.body.appendChild(area); area.select(); document.execCommand("copy"); area.remove();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(fallback); else fallback();
    setStatus(state.resolution + "×" + state.resolution + " 명도 행렬을 CSV 형식으로 복사했습니다.");
  }

  function saveSettings() {
    var payload = { version: 1, resolution: state.resolution, threshold: state.threshold, resample: $("resampleSelect").value, kernel: getKernel(), padding: $("paddingSelect").value, normalize: $("normalizeToggle").checked, bias: Number($("biasInput").value) || 0 };
    downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" }), "pixel-matrix-settings.json");
  }

  function loadSettings(file) {
    if (!file || file.size > 1024 * 1024) { setStatus("1MB 이하의 설정 JSON 파일을 선택해 주세요.", true); return; }
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        if (![4,8,16].includes(Number(data.resolution)) || !Array.isArray(data.kernel) || data.kernel.length !== 3 || !data.kernel.every(function (row) { return Array.isArray(row) && row.length === 3; })) throw new Error("형식 오류");
        state.resolution = Number(data.resolution);
        state.threshold = Math.round(M.clamp(Number(data.threshold)));
        $("thresholdRange").value = state.threshold; $("thresholdOutput").textContent = state.threshold;
        $("resampleSelect").value = data.resample === "nearest" ? "nearest" : "average";
        $("paddingSelect").value = ["zero","extend","reflect"].includes(data.padding) ? data.padding : "zero";
        $("normalizeToggle").checked = Boolean(data.normalize); $("biasInput").value = Number(data.bias) || 0;
        $("presetSelect").value = ""; renderKernelInputs(data.kernel);
        Array.from(document.querySelectorAll("[data-resolution]")).forEach(function (button) { button.classList.toggle("is-active", Number(button.dataset.resolution) === state.resolution); });
        refreshExperiment(); setStatus("설정 JSON을 불러왔습니다.");
      } catch (error) { setStatus("이 도구에서 저장한 올바른 설정 JSON인지 확인해 주세요.", true); }
    };
    reader.readAsText(file);
  }

  function checkMission(kind) {
    var correct = false; var feedback;
    if (kind === "cipher") { correct = $("cipherAnswer").value === "heart"; feedback = $("cipherFeedback"); }
    if (kind === "kernel") { correct = Number($("kernelMissionAnswer").value) === 5; feedback = $("kernelFeedback"); }
    if (kind === "resolution") { correct = $("resolutionAnswer").value === "4"; feedback = $("resolutionFeedback"); }
    feedback.textContent = correct ? "정답입니다! 숫자의 규칙을 잘 찾았습니다." : "아직 아닙니다. 그림이나 계산 규칙을 다시 살펴보세요.";
    feedback.className = "mission-feedback " + (correct ? "is-correct" : "is-wrong");
    if (correct) state.completedMissions.add(kind);
    $("missionScore").textContent = state.completedMissions.size;
  }

  function bindEvents() {
    $("openGuideButton").addEventListener("click", function () { $("guideDialog").showModal(); });
    $("closeGuideButton").addEventListener("click", function () { $("guideDialog").close(); });
    $("startButton").addEventListener("click", function () { $("guideDialog").close(); $("input").scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); });
    $("guideDialog").addEventListener("click", function (event) { if (event.target === $("guideDialog")) $("guideDialog").close(); });
    $("sampleSelect").addEventListener("change", function () { drawSample(this.value); });
    $("imageInput").addEventListener("change", function () { loadImage(this.files[0]); this.value = ""; });
    $("toggleEditorButton").addEventListener("click", function () { var hidden = $("pixelEditor").hidden; $("pixelEditor").hidden = !hidden; this.setAttribute("aria-expanded", String(hidden)); });
    $("brushRange").addEventListener("input", function () { $("brushOutput").textContent = "명도 " + this.value; });
    $("clearDrawingButton").addEventListener("click", function () { state.drawing.fill(255); refreshDrawingCells(); });
    $("useDrawingButton").addEventListener("click", useDrawing);
    Array.from(document.querySelectorAll("[data-resolution]")).forEach(function (button) { button.addEventListener("click", function () {
      state.resolution = Number(this.dataset.resolution); state.step = 0;
      Array.from(document.querySelectorAll("[data-resolution]")).forEach(function (item) { item.classList.toggle("is-active", item === button); });
      refreshExperiment(); setStatus(state.resolution + "×" + state.resolution + " 행렬로 바꿨습니다. 셀의 크기와 값 변화를 비교해 보세요.");
    }); });
    $("matrixGrid").addEventListener("click", function (event) { var cell = event.target.closest(".matrix-cell"); if (cell) selectCell(Number(cell.dataset.row), Number(cell.dataset.column), false); });
    $("matrixGrid").addEventListener("keydown", function (event) {
      var cell = event.target.closest(".matrix-cell"); if (!cell) return;
      var row = Number(cell.dataset.row); var column = Number(cell.dataset.column);
      if (event.key === "ArrowUp") row -= 1; else if (event.key === "ArrowDown") row += 1; else if (event.key === "ArrowLeft") column -= 1; else if (event.key === "ArrowRight") column += 1; else return;
      event.preventDefault(); selectCell(row, column, true);
    });
    $("binaryToggle").addEventListener("change", renderMatrix);
    $("thresholdRange").addEventListener("input", function () { state.threshold = Number(this.value); $("thresholdOutput").textContent = state.threshold; renderMatrix(); renderInspector(); renderBinary(); });
    $("resampleSelect").addEventListener("change", function () { refreshExperiment(); setStatus((this.value === "average" ? "면적 평균" : "최근접") + " 축소 방식으로 다시 계산했습니다."); });
    $("presetSelect").addEventListener("change", function () { applyPreset(this.value); });
    $("paddingSelect").addEventListener("change", updateConvolution);
    $("normalizeToggle").addEventListener("change", updateConvolution);
    $("biasInput").addEventListener("input", updateConvolution);
    $("previousStepButton").addEventListener("click", function () { stopPlayback(); changeStep(-1); });
    $("nextStepButton").addEventListener("click", function () { stopPlayback(); changeStep(1); });
    $("resetStepButton").addEventListener("click", function () { stopPlayback(); state.step = 0; updateConvolution(); });
    $("playButton").addEventListener("click", togglePlayback);
    $("speedSelect").addEventListener("change", function () { if (state.playing) { stopPlayback(); togglePlayback(); } });
    $("copyCsvButton").addEventListener("click", copyCsv);
    $("downloadCsvButton").addEventListener("click", function () { downloadBlob(new Blob(["\ufeff" + matrixCsv()], { type: "text/csv;charset=utf-8" }), "luminance-" + state.resolution + "x" + state.resolution + ".csv"); });
    $("downloadImageButton").addEventListener("click", function () { $("filterOutputCanvas").toBlob(function (blob) { downloadBlob(blob, "filtered-pixel-image.png"); }, "image/png"); });
    $("saveSettingsButton").addEventListener("click", saveSettings);
    $("loadSettingsInput").addEventListener("change", function () { loadSettings(this.files[0]); this.value = ""; });
    Array.from(document.querySelectorAll(".mission-button")).forEach(function (button) { button.addEventListener("click", function () { checkMission(this.dataset.mission); }); });
    document.addEventListener("visibilitychange", function () { if (document.hidden) stopPlayback(); });
  }

  function initialize() {
    initDrawingGrid();
    renderKernelInputs(PRESETS.blur.kernel);
    bindEvents();
    drawSample("robot");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) $("speedSelect").value = "1200";
  }

  initialize();
})();
