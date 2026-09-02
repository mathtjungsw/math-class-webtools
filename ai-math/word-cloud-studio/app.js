(function () {
  "use strict";

  const Engine = window.WordCloudEngine;
  const $ = (id) => document.getElementById(id);
  const canvas = $("wordCloudCanvas");
  const context = canvas.getContext("2d", { alpha: true });
  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;
  const FONT_FAMILY = '"Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
  const sampleText = `인공지능은 데이터를 바탕으로 규칙과 패턴을 찾습니다. 데이터가 충분하고 다양하면 인공지능은 새로운 자료를 더 잘 분류하고 예측할 수 있습니다. 하지만 데이터가 한쪽으로 치우치면 인공지능의 결과도 편향될 수 있습니다.

수학은 인공지능을 이해하는 중요한 언어입니다. 벡터는 자료의 특징을 숫자로 표현하고, 행렬은 많은 자료를 정리하며, 확률과 통계는 예측의 불확실성을 설명합니다. 우리는 데이터를 모으고 시각화하고 해석하면서 인공지능의 판단을 비판적으로 살펴볼 수 있습니다.

좋은 인공지능 수업에서는 정확도만 확인하지 않습니다. 어떤 데이터를 사용했는지, 어떤 패턴을 학습했는지, 오류가 누구에게 더 자주 나타나는지 질문합니다. 데이터와 수학, 인공지능과 사람의 판단을 함께 생각해야 합니다.`;

  const palettes = {
    ocean: { background: "#fbfaf5", colors: ["#123f4b", "#16786f", "#326eaa", "#d06d35", "#617b82", "#2a9587"] },
    pastel: { background: "#fffaf8", colors: ["#bd6d8b", "#6e8fc1", "#78a890", "#ce8a62", "#836fa3", "#d1a04e"] },
    forest: { background: "#fbfcf6", colors: ["#234f39", "#3f7d52", "#799b3d", "#a06f32", "#477265", "#6a8736"] },
    sunset: { background: "#fff9f3", colors: ["#9d3f35", "#cf623e", "#d89437", "#755072", "#bb4f67", "#7b5642"] },
    mono: { background: "#fbfaf7", colors: ["#17282d", "#364a4f", "#586b6f", "#253a3f", "#6c7c7f"] }
  };

  let currentResult = null;
  let currentPlacements = [];

  function setStatus(message, type) {
    const element = $("statusMessage");
    element.textContent = message;
    element.classList.toggle("is-error", type === "error");
  }

  function hashString(value) {
    let hash = 2166136261;
    for (const character of String(value)) {
      hash ^= character.codePointAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function shapeCenter(shape) {
    return { x: WIDTH / 2, y: shape === "heart" ? HEIGHT * .48 : HEIGHT / 2 };
  }

  function pointInsideShape(x, y, shape) {
    const padding = 35;
    if (shape === "square") return x >= padding && x <= WIDTH - padding && y >= padding && y <= HEIGHT - padding;
    const center = shapeCenter(shape);
    if (shape === "circle") {
      const radius = Math.min(WIDTH, HEIGHT) * .46;
      return ((x - center.x) / radius) ** 2 + ((y - center.y) / radius) ** 2 <= 1;
    }
    if (shape === "ellipse") {
      return ((x - center.x) / (WIDTH * .46)) ** 2 + ((y - center.y) / (HEIGHT * .41)) ** 2 <= 1;
    }
    if (shape === "rounded") {
      const nx = Math.abs((x - center.x) / (WIDTH * .46));
      const ny = Math.abs((y - center.y) / (HEIGHT * .43));
      return nx ** 4 + ny ** 4 <= 1;
    }
    if (shape === "heart") {
      const nx = (x - center.x) / (WIDTH * .35);
      const ny = -(y - center.y) / (HEIGHT * .34) + .08;
      return (nx * nx + ny * ny - 1) ** 3 - nx * nx * ny * ny * ny <= 0;
    }
    return true;
  }

  function rectangleInsideShape(rect, shape) {
    const inset = 2;
    const points = [
      [rect.x + inset, rect.y + inset],
      [rect.x + rect.width - inset, rect.y + inset],
      [rect.x + inset, rect.y + rect.height - inset],
      [rect.x + rect.width - inset, rect.y + rect.height - inset],
      [rect.x + rect.width / 2, rect.y + inset],
      [rect.x + rect.width / 2, rect.y + rect.height - inset],
      [rect.x + inset, rect.y + rect.height / 2],
      [rect.x + rect.width - inset, rect.y + rect.height / 2]
    ];
    return points.every(([x, y]) => pointInsideShape(x, y, shape));
  }

  function cellKeys(rect) {
    const cellSize = 80;
    const keys = [];
    const startX = Math.floor(rect.x / cellSize);
    const endX = Math.floor((rect.x + rect.width) / cellSize);
    const startY = Math.floor(rect.y / cellSize);
    const endY = Math.floor((rect.y + rect.height) / cellSize);
    for (let x = startX; x <= endX; x += 1) {
      for (let y = startY; y <= endY; y += 1) keys.push(`${x}:${y}`);
    }
    return keys;
  }

  function intersects(left, right) {
    return left.x < right.x + right.width && left.x + left.width > right.x && left.y < right.y + right.height && left.y + left.height > right.y;
  }

  function collides(rect, grid) {
    const candidates = new Set();
    cellKeys(rect).forEach((key) => (grid.get(key) || []).forEach((item) => candidates.add(item)));
    return Array.from(candidates).some((item) => intersects(rect, item.rect));
  }

  function addToGrid(item, grid) {
    cellKeys(item.rect).forEach((key) => {
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(item);
    });
  }

  function wordFontSize(entry, index, entries) {
    const maximum = entries[0]?.count || 1;
    const minimum = entries[entries.length - 1]?.count || maximum;
    const frequencyScale = maximum === minimum ? .58 : (entry.count - minimum) / (maximum - minimum);
    const rankScale = entries.length <= 1 ? 1 : 1 - index / (entries.length - 1);
    const density = entries.length > 140 ? .78 : entries.length > 80 ? .88 : 1;
    return Math.round((18 + 112 * Math.pow(.72 * frequencyScale + .28 * rankScale, .62)) * density);
  }

  function layoutWords(entries, shape, rotate) {
    const placements = [];
    const grid = new Map();
    const center = shapeCenter(shape);

    entries.forEach((entry, index) => {
      const hash = hashString(entry.word);
      const vertical = rotate && index > 2 && hash % 7 < 2;
      const rotation = vertical ? (hash % 2 ? Math.PI / 2 : -Math.PI / 2) : 0;
      let size = wordFontSize(entry, index, entries);
      let placed = null;

      for (let scaleAttempt = 0; scaleAttempt < 7 && !placed; scaleAttempt += 1) {
        context.font = `900 ${size}px ${FONT_FAMILY}`;
        const metrics = context.measureText(entry.word);
        const rawWidth = Math.ceil(metrics.width) + 12;
        const rawHeight = Math.ceil(size * 1.06) + 10;
        const width = vertical ? rawHeight : rawWidth;
        const height = vertical ? rawWidth : rawHeight;
        const startAngle = ((hash % 360) / 180) * Math.PI;

        for (let attempt = 0; attempt < 1800; attempt += 1) {
          const radius = attempt === 0 ? 0 : 4.3 * Math.sqrt(attempt);
          const angle = startAngle + attempt * 2.399963229728653;
          const horizontalStretch = shape === "circle" || shape === "heart" ? 1 : 1.48;
          const x = center.x + Math.cos(angle) * radius * horizontalStretch - width / 2;
          const y = center.y + Math.sin(angle) * radius - height / 2;
          const rect = { x, y, width, height };
          if (rectangleInsideShape(rect, shape) && !collides(rect, grid)) {
            placed = { entry, x: x + width / 2, y: y + height / 2, size, rotation, rect };
            break;
          }
        }
        size = Math.max(13, Math.floor(size * .84));
      }

      if (placed) {
        placements.push(placed);
        addToGrid(placed, grid);
      }
    });
    return placements;
  }

  function traceShape(shape) {
    const center = shapeCenter(shape);
    context.beginPath();
    if (shape === "circle") context.arc(center.x, center.y, Math.min(WIDTH, HEIGHT) * .46, 0, Math.PI * 2);
    else if (shape === "ellipse") context.ellipse(center.x, center.y, WIDTH * .46, HEIGHT * .41, 0, 0, Math.PI * 2);
    else if (shape === "square") context.rect(35, 35, WIDTH - 70, HEIGHT - 70);
    else if (shape === "rounded") context.roundRect(35, 35, WIDTH - 70, HEIGHT - 70, 120);
    else if (shape === "heart") {
      context.moveTo(center.x, HEIGHT * .83);
      context.bezierCurveTo(WIDTH * .16, HEIGHT * .61, WIDTH * .17, HEIGHT * .23, WIDTH * .36, HEIGHT * .22);
      context.bezierCurveTo(WIDTH * .45, HEIGHT * .21, WIDTH * .49, HEIGHT * .29, center.x, HEIGHT * .35);
      context.bezierCurveTo(WIDTH * .51, HEIGHT * .29, WIDTH * .55, HEIGHT * .21, WIDTH * .64, HEIGHT * .22);
      context.bezierCurveTo(WIDTH * .83, HEIGHT * .23, WIDTH * .84, HEIGHT * .61, center.x, HEIGHT * .83);
    }
    context.closePath();
  }

  function drawCloud(entries) {
    const palette = palettes[$("paletteSelect").value] || palettes.ocean;
    const transparent = $("transparentBackground").checked;
    const shape = $("shapeSelect").value;
    context.clearRect(0, 0, WIDTH, HEIGHT);
    if (!transparent) {
      context.fillStyle = palette.background;
      context.fillRect(0, 0, WIDTH, HEIGHT);
    }

    const placements = layoutWords(entries, shape, $("rotateWords").checked);
    context.save();
    traceShape(shape);
    context.strokeStyle = transparent ? "rgba(24, 52, 58, .13)" : "rgba(24, 52, 58, .08)";
    context.lineWidth = 3;
    context.stroke();
    context.restore();

    placements.forEach((item, index) => {
      context.save();
      context.translate(item.x, item.y);
      context.rotate(item.rotation);
      context.font = `900 ${item.size}px ${FONT_FAMILY}`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = palette.colors[(hashString(item.entry.word) + index) % palette.colors.length];
      context.fillText(item.entry.word, 0, 0);
      context.restore();
    });
    return placements;
  }

  function readAnalysisOptions() {
    return {
      maxWords: Number($("maxWordsSelect").value),
      minLength: Number($("minLengthSelect").value),
      includeNumbers: $("includeNumbers").checked,
      stripParticles: $("stripParticles").checked,
      useDefaultStopwords: $("useDefaultStopwords").checked,
      customStopwords: $("customStopwords").value
    };
  }

  function renderMetrics(result) {
    const stats = result.stats;
    $("totalTokensMetric").textContent = stats.totalTokens.toLocaleString("ko-KR");
    $("analyzedTokensMetric").textContent = stats.analyzedTokens.toLocaleString("ko-KR");
    $("uniqueWordsMetric").textContent = stats.uniqueWords.toLocaleString("ko-KR");
    $("removedWordsMetric").textContent = stats.removedTotal.toLocaleString("ko-KR");
    const top = result.allEntries[0];
    $("topWordMetric").textContent = top?.word || "—";
    $("topWordDetail").textContent = top ? `${top.count.toLocaleString("ko-KR")}회 · ${top.percent.toFixed(1)}%` : "분석할 단어 없음";
  }

  function renderBarChart(result) {
    const chart = $("barChart");
    const entries = result.allEntries.slice(0, 10);
    if (!entries.length) {
      chart.innerHTML = '<p class="empty-copy">표시할 단어가 없습니다.</p>';
      return;
    }
    const maximum = entries[0].count;
    chart.replaceChildren(...entries.map((entry) => {
      const item = document.createElement("div");
      item.className = "bar-item";
      const bar = document.createElement("i");
      bar.className = "bar-fill";
      bar.style.height = `${Math.max(4, (entry.count / maximum) * 100)}%`;
      bar.title = `${entry.word} ${entry.count}회`;
      const count = document.createElement("strong");
      count.textContent = `${entry.count}회`;
      const word = document.createElement("span");
      word.textContent = entry.word;
      word.title = entry.word;
      item.append(bar, count, word);
      return item;
    }));
  }

  function renderTable() {
    const body = $("frequencyTableBody");
    if (!currentResult) return;
    const query = Engine.normalizeWord($("tableSearch").value);
    const entries = currentResult.allEntries.filter((entry) => !query || entry.word.includes(query));
    if (!entries.length) {
      body.innerHTML = '<tr><td colspan="4" class="empty-copy">조건에 맞는 단어가 없습니다.</td></tr>';
      return;
    }
    body.replaceChildren(...entries.map((entry) => {
      const row = document.createElement("tr");
      const rank = currentResult.allEntries.indexOf(entry) + 1;
      [rank, entry.word, entry.count.toLocaleString("ko-KR"), `${entry.percent.toFixed(2)}%`].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });
      return row;
    }));
  }

  function clearResult(message) {
    currentResult = null;
    currentPlacements = [];
    context.clearRect(0, 0, WIDTH, HEIGHT);
    $("emptyState").hidden = false;
    $("placedCount").textContent = "0개 배치";
    $("downloadPngButton").disabled = true;
    $("downloadCsvButton").disabled = true;
    $("tableSearch").disabled = true;
    $("frequencyTableBody").innerHTML = '<tr><td colspan="4" class="empty-copy">분석 결과가 아직 없습니다.</td></tr>';
    $("barChart").innerHTML = '<p class="empty-copy">워드클라우드를 만들면 막대그래프가 표시됩니다.</p>';
    ["totalTokensMetric", "analyzedTokensMetric", "uniqueWordsMetric", "removedWordsMetric", "topWordMetric"].forEach((id) => { $(id).textContent = "—"; });
    $("topWordDetail").textContent = "분석 전";
    setStatus(message, "error");
  }

  function generateCloud() {
    const text = $("textInput").value.trim();
    if (!text) {
      clearResult("분석할 텍스트를 먼저 입력해 주세요.");
      $("textInput").focus();
      return;
    }
    const result = Engine.analyzeText(text, readAnalysisOptions());
    if (!result.entries.length) {
      clearResult("설정 적용 후 남은 단어가 없습니다. 최소 글자 수나 불용어 설정을 확인해 주세요.");
      return;
    }

    currentResult = result;
    $("tableSearch").value = "";
    currentPlacements = drawCloud(result.entries);
    $("emptyState").hidden = true;
    $("placedCount").textContent = `${currentPlacements.length}개 배치`;
    $("downloadPngButton").disabled = false;
    $("downloadCsvButton").disabled = false;
    $("tableSearch").disabled = false;
    renderMetrics(result);
    renderBarChart(result);
    renderTable();

    const missed = result.entries.length - currentPlacements.length;
    const message = missed > 0
      ? `${result.stats.analyzedTokens.toLocaleString("ko-KR")}개 단어를 분석했습니다. 공간이 부족해 작은 단어 ${missed}개는 그림에서 생략했습니다.`
      : `${result.stats.analyzedTokens.toLocaleString("ko-KR")}개 단어를 분석해 상위 ${currentPlacements.length}개를 배치했습니다. 입력한 글은 외부로 전송되지 않았습니다.`;
    setStatus(message);
  }

  function updateCharacterCount() {
    $("characterCount").textContent = `${Array.from($("textInput").value).length.toLocaleString("ko-KR")}자`;
  }

  function updateStopwordSummary() {
    const defaults = $("useDefaultStopwords").checked;
    const particles = $("stripParticles").checked;
    const customCount = Engine.parseStopwords($("customStopwords").value).size;
    $("stopwordSummary").textContent = `${defaults ? "기본 목록" : "기본 끔"}${particles ? " · 조사 정리" : ""}${customCount ? ` + 직접 ${customCount}개` : ""}`;
  }

  function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function dateStamp() {
    const now = new Date();
    return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("");
  }

  function downloadPng() {
    if (!currentPlacements.length) return;
    canvas.toBlob((blob) => {
      if (!blob) {
        setStatus("이미지 파일을 만들지 못했습니다. 다른 브라우저에서 다시 시도해 주세요.", "error");
        return;
      }
      downloadBlob(`워드클라우드-${dateStamp()}.png`, blob);
      setStatus("고해상도 PNG 이미지를 내려받았습니다.");
    }, "image/png");
  }

  function downloadCsv() {
    if (!currentResult) return;
    const csv = `\ufeff${Engine.toCsv(currentResult)}`;
    downloadBlob(`단어-빈도-통계-${dateStamp()}.csv`, new Blob([csv], { type: "text/csv;charset=utf-8" }));
    setStatus("전체 단어 빈도표를 CSV 파일로 내려받았습니다.");
  }

  function bindEvents() {
    $("generateButton").addEventListener("click", generateCloud);
    $("loadSampleButton").addEventListener("click", () => {
      $("textInput").value = sampleText;
      updateCharacterCount();
      generateCloud();
    });
    $("textInput").addEventListener("input", updateCharacterCount);
    $("customStopwords").addEventListener("input", updateStopwordSummary);
    $("useDefaultStopwords").addEventListener("change", updateStopwordSummary);
    $("stripParticles").addEventListener("change", updateStopwordSummary);
    $("tableSearch").addEventListener("input", renderTable);
    $("downloadPngButton").addEventListener("click", downloadPng);
    $("downloadCsvButton").addEventListener("click", downloadCsv);
    ["shapeSelect", "paletteSelect", "rotateWords", "transparentBackground"].forEach((id) => {
      $(id).addEventListener("change", () => { if (currentResult) generateCloud(); });
    });
    $("fullscreenButton").addEventListener("click", async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
      } catch {
        setStatus("이 브라우저에서는 전체화면을 시작할 수 없습니다.", "error");
      }
    });
    document.addEventListener("fullscreenchange", () => {
      $("fullscreenButton").textContent = document.fullscreenElement ? "전체화면 종료" : "전체화면";
    });
  }

  function init() {
    $("textInput").value = sampleText;
    updateCharacterCount();
    updateStopwordSummary();
    bindEvents();
  }

  init();
})();
