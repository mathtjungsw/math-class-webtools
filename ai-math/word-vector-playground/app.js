(function () {
  "use strict";

  const V = window.WordVectors;
  const $ = (id) => document.getElementById(id);
  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
  const copyObject = (value) => JSON.parse(JSON.stringify(value));
  const escapeHtml = (value) => String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  const defaultBasicPoints = {
    바다: [4, 2],
    호수: [3.2, 1.8],
    산: [-2, 3.5],
    사막: [-3, -1.5]
  };
  const rankBasicPoints = {
    기준: [2, 0],
    가까운점: [4, 3],
    같은방향: [10, 0],
    반대방향: [-2, 0]
  };

  const corpusPresets = {
    balanced: {
      text: [
        "누리 별빵 먹다", "마루 별빵 먹다", "누리 달죽 먹다", "마루 달죽 먹다",
        "토리 공원 뛰다", "보리 공원 뛰다", "토리 운동장 뛰다", "보리 운동장 뛰다",
        "별빵 달콤 간식", "달죽 따뜻 간식", "공원 초록 산책", "운동장 넓다 달리기"
      ].join("\n"),
      insight: "가상 이름과 합성 음식으로 만든 두 주제 자료입니다. 먼저 ‘누리–마루’, ‘토리–보리’가 비슷할지 예상해 보세요."
    },
    polysemy: {
      text: [
        "배 과일 달다", "배 과일 먹다", "배 노랑 과일", "사과 과일 달다",
        "배 바다 항구", "배 바다 여행", "배 파도 항구", "돛단배 바다 여행"
      ].join("\n"),
      insight: "‘배’의 과일 문맥과 탈것 문맥이 한 벡터에 섞입니다. 하나의 점으로 여러 뜻을 모두 표현할 때 무엇을 잃는지 살펴보세요."
    },
    sparse: {
      text: ["라온 구름 관찰", "다온 강물 측정", "마온 별빛 기록", "하온 나무 분류"].join("\n"),
      insight: "대부분 한 번만 등장해 서로 비교할 근거가 매우 적습니다. 영벡터나 우연한 이웃을 ‘뜻’으로 단정하면 안 됩니다."
    },
    bias: {
      text: [
        "솔마을 사람 과학 연구", "솔마을 사람 수학 연구", "솔마을 사람 실험 연구", "솔마을 사람 과학 연구",
        "달마을 사람 그림 돌봄", "달마을 사람 음악 돌봄", "달마을 사람 요리 돌봄", "달마을 사람 그림 돌봄"
      ].join("\n"),
      insight: "실재 집단이 아닌 가상 마을을 일부러 치우치게 묘사한 자료입니다. 결과가 집단의 본성이 아니라 반복된 문장의 편향임을 근거로 설명하세요."
    },
    frequent: {
      text: [
        "오늘 누리 별빵 먹다", "오늘 마루 달죽 먹다", "오늘 토리 공원 뛰다", "오늘 보리 운동장 뛰다",
        "오늘 누리 공원 산책", "오늘 마루 음악 듣다", "오늘 토리 별빛 관찰", "오늘 보리 간식 만들다"
      ].join("\n"),
      insight: "‘오늘’이 모든 문장에 반복됩니다. 고빈도 공통 단어가 서로 다른 주제의 벡터를 불필요하게 닮게 만드는지 확인하세요."
    }
  };

  let basicPoints = copyObject(defaultBasicPoints);
  let corpusDataset = null;
  let currentDataset = null;
  let dataSource = "corpus";
  let currentMode = "basic";
  let updateTimer = null;
  let dragWord = null;

  function formatNumber(value, digits) {
    if (value === null || !Number.isFinite(value)) return "계산 불가";
    const rounded = Math.abs(value) < 1e-10 ? 0 : value;
    return rounded.toLocaleString("ko-KR", { maximumFractionDigits: digits === undefined ? 3 : digits });
  }

  function formatVector(vector, digits) {
    if (!vector) return "—";
    return `[${vector.map((value) => formatNumber(value, digits === undefined ? 2 : digits)).join(", ")}]`;
  }

  function setStatus(message, isError) {
    const node = $("statusMessage");
    node.textContent = message;
    node.style.color = isError ? "#ad3f3f" : "";
  }

  function setMode(mode, announce) {
    currentMode = ["basic", "corpus", "explore"].includes(mode) ? mode : "basic";
    document.querySelectorAll("[data-mode-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.modePanel !== currentMode;
    });
    document.querySelectorAll("[data-mode]").forEach((button) => {
      const selected = button.dataset.mode === currentMode;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-selected", String(selected));
    });
    if (currentMode === "explore") renderExplore();
    const messages = {
      basic: "1단계: 단어 점을 드래그하거나 방향키로 움직여 거리와 방향의 변화를 관찰하세요.",
      corpus: "2단계: 문맥 창·빈도·정규화를 바꾸면 행렬과 벡터가 즉시 다시 계산됩니다.",
      explore: "3단계: 같은 벡터에서 거리 순위, 방향 순위, 벡터 연산과 군집을 비교하세요."
    };
    if (announce !== false) setStatus(messages[currentMode]);
  }

  function fillSelect(select, values, preferred) {
    if (!select) return "";
    const previous = preferred !== undefined ? preferred : select.value;
    select.replaceChildren();
    values.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
    const selected = values.includes(previous) ? previous : (values[0] || "");
    select.value = selected;
    select.disabled = values.length === 0;
    return selected;
  }

  function basicDataset() {
    const words = Object.keys(basicPoints);
    return { words, dimensions: ["x", "y"], vectors: basicPoints, rawVectors: basicPoints };
  }

  function configureBasicSelects(preferred) {
    const words = Object.keys(basicPoints);
    const choices = preferred || {};
    fillSelect($("basicASelect"), words, choices.a || $("basicASelect").value || words[0]);
    fillSelect($("basicBSelect"), words, choices.b || $("basicBSelect").value || words[1] || words[0]);
    fillSelect($("basicQuerySelect"), words, choices.query || $("basicQuerySelect").value || words[0]);
  }

  function setBasicPointFromClient(word, clientX, clientY) {
    const rect = $("basicPlot").getBoundingClientRect();
    const x = clamp(((clientX - rect.left) / rect.width) * 20 - 10, -10, 10);
    const y = clamp(10 - ((clientY - rect.top) / rect.height) * 20, -10, 10);
    basicPoints[word] = [Math.round(x * 5) / 5, Math.round(y * 5) / 5];
    renderBasic();
  }

  function renderBasicPoints() {
    const holder = $("basicPoints");
    const activeWords = new Set(Object.keys(basicPoints));
    holder.querySelectorAll(".vector-point").forEach((button) => {
      if (!activeWords.has(button.dataset.word)) button.remove();
    });
    const wordA = $("basicASelect").value;
    const wordB = $("basicBSelect").value;
    Object.entries(basicPoints).forEach(([word, vector]) => {
      let button = Array.from(holder.querySelectorAll(".vector-point")).find((item) => item.dataset.word === word);
      if (!button) {
        button = document.createElement("button");
        button.type = "button";
        button.className = "vector-point";
        button.dataset.word = word;
        button.addEventListener("pointerdown", (event) => {
          dragWord = word;
          button.setPointerCapture(event.pointerId);
          setBasicPointFromClient(word, event.clientX, event.clientY);
        });
        button.addEventListener("keydown", (event) => {
          if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
          event.preventDefault();
          const step = event.shiftKey ? 1 : 0.2;
          const next = basicPoints[word].slice();
          if (event.key === "ArrowLeft") next[0] -= step;
          if (event.key === "ArrowRight") next[0] += step;
          if (event.key === "ArrowUp") next[1] += step;
          if (event.key === "ArrowDown") next[1] -= step;
          basicPoints[word] = next.map((value) => Math.round(clamp(value, -10, 10) * 10) / 10);
          renderBasic();
        });
        holder.appendChild(button);
      }
      button.textContent = word;
      button.style.left = `${((vector[0] + 10) / 20) * 100}%`;
      button.style.top = `${((10 - vector[1]) / 20) * 100}%`;
      button.dataset.role = word === wordA && word === wordB ? "both" : word === wordA ? "a" : word === wordB ? "b" : "other";
      button.setAttribute("aria-label", `${word}, 좌표 (${formatNumber(vector[0], 1)}, ${formatNumber(vector[1], 1)}). 드래그하거나 방향키로 이동`);
    });
  }

  function renderVectorLine(id, vector) {
    const plot = $("basicPlot");
    const line = $(id);
    const width = plot.clientWidth || 1;
    const height = plot.clientHeight || 1;
    const dx = (vector[0] / 20) * width;
    const dy = (-vector[1] / 20) * height;
    line.style.width = `${Math.sqrt(dx * dx + dy * dy)}px`;
    line.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
  }

  function renderBasicCosineSteps(a, b, detail) {
    const node = $("basicCosineSteps");
    const valueText = detail.value === null ? "영벡터가 포함되어 정의되지 않음" : formatNumber(detail.value, 4);
    node.innerHTML = `<ol class="math-step-list">
      <li><b>성분별로 곱하기</b><br><code>(${formatNumber(a[0], 2)}×${formatNumber(b[0], 2)}) + (${formatNumber(a[1], 2)}×${formatNumber(b[1], 2)}) = ${detail.products.map((value) => formatNumber(value, 3)).join(" + ")}</code></li>
      <li><b>내적 구하기</b><br><code>A·B = ${formatNumber(detail.innerProduct, 4)}</code></li>
      <li><b>각 벡터의 크기</b><br><code>|A| = √(${formatNumber(a[0] ** 2, 3)} + ${formatNumber(a[1] ** 2, 3)}) = ${formatNumber(detail.magnitudeA, 4)}, |B| = ${formatNumber(detail.magnitudeB, 4)}</code></li>
      <li><b>내적을 두 크기의 곱으로 나누기</b><br><code>${formatNumber(detail.innerProduct, 4)} ÷ (${formatNumber(detail.magnitudeA, 4)}×${formatNumber(detail.magnitudeB, 4)}) = ${valueText}</code></li>
    </ol>`;
  }

  function renderRankList(node, rows, metric, limit) {
    node.replaceChildren();
    rows.slice(0, limit || 5).forEach((row) => {
      const item = document.createElement("li");
      if (row.score === null) item.className = "undefined-score";
      const word = document.createElement("b");
      word.textContent = row.word;
      const score = document.createElement("code");
      score.textContent = row.score === null ? "정의 안 됨" : metric === "euclidean" ? formatNumber(row.score, 3) : formatNumber(row.score, 4);
      item.append(word, score);
      node.appendChild(item);
    });
    if (!rows.length) {
      const item = document.createElement("li");
      item.className = "undefined-score";
      const word = document.createElement("b");
      word.textContent = "비교할 단어가 없습니다";
      item.appendChild(word);
      node.appendChild(item);
    }
  }

  function renderBasic() {
    const aWord = $("basicASelect").value;
    const bWord = $("basicBSelect").value;
    const a = basicPoints[aWord];
    const b = basicPoints[bWord];
    if (!a || !b) return;
    renderBasicPoints();
    renderVectorLine("basicLineA", a);
    renderVectorLine("basicLineB", b);
    $("basicVectorA").textContent = `${aWord} ${formatVector(a, 1)}`;
    $("basicVectorB").textContent = `${bWord} ${formatVector(b, 1)}`;
    const detail = V.cosineBreakdown(a, b);
    $("basicDistance").textContent = formatNumber(V.euclideanDistance(a, b), 3);
    $("basicDot").textContent = formatNumber(detail.innerProduct, 3);
    $("basicMagnitudes").textContent = `${formatNumber(detail.magnitudeA, 3)} · ${formatNumber(detail.magnitudeB, 3)}`;
    const angle = (vector) => (Math.atan2(vector[1], vector[0]) * 180 / Math.PI + 360) % 360;
    $("basicAngles").textContent = `${formatNumber(angle(a), 1)}° · ${formatNumber(angle(b), 1)}°`;
    $("basicCosine").textContent = detail.value === null ? "정의 안 됨" : formatNumber(detail.value, 4);
    renderBasicCosineSteps(a, b, detail);

    const query = $("basicQuerySelect").value;
    const dataset = basicDataset();
    const distanceRows = V.rankNeighbors(dataset, query, "euclidean");
    const cosineRows = V.rankNeighbors(dataset, query, "cosine");
    renderRankList($("basicEuclideanRank"), distanceRows, "euclidean", 4);
    renderRankList($("basicCosineRank"), cosineRows, "cosine", 4);
    if (distanceRows[0] && cosineRows[0] && distanceRows[0].word !== cosineRows[0].word) {
      $("rankExplanation").innerHTML = `<b>순위가 달라졌습니다.</b> 거리는 <strong>${escapeHtml(distanceRows[0].word)}</strong>을, 방향은 <strong>${escapeHtml(cosineRows[0].word)}</strong>을 1위로 골랐습니다. 벡터의 길이와 방향을 따로 살펴보세요.`;
    } else {
      $("rankExplanation").textContent = "현재 두 방법의 1위가 같습니다. 점의 길이나 방향을 바꾸거나 ‘순위 반전 예제’를 눌러 차이를 만들어 보세요.";
    }
  }

  function loadCorpusPreset(key) {
    const preset = corpusPresets[key] || corpusPresets.balanced;
    $("corpusInput").value = preset.text;
    $("presetInsight").textContent = preset.insight;
    rebuildCorpusDataset(true);
  }

  function scheduleCorpusUpdate() {
    window.clearTimeout(updateTimer);
    updateTimer = window.setTimeout(() => rebuildCorpusDataset(false), 160);
  }

  function rebuildCorpusDataset(announce) {
    $("windowSizeOutput").value = $("windowSizeInput").value;
    const text = $("corpusInput").value;
    const minFrequency = Number($("minFrequencySelect").value);
    const retained = V.frequencyTable(text).filter((row) => row.count >= minFrequency);
    if (retained.length > 60) {
      setStatus(`남는 단어가 ${retained.length}개입니다. 화면과 계산을 안전하게 유지하려면 최소 출현 빈도를 높이거나 자료를 줄여 60개 이하로 만들어 주세요.`, true);
      return;
    }
    try {
      corpusDataset = V.buildCooccurrence(text, {
        windowSize: Number($("windowSizeInput").value),
        minFrequency,
        normalize: $("normalizeCheckbox").checked
      });
      if (dataSource === "corpus") currentDataset = corpusDataset;
      renderCorpusSummary();
      if (dataSource === "corpus") renderDatasetViews();
      if (announce) setStatus(`말뭉치에서 ${corpusDataset.words.length}개 단어 × ${corpusDataset.dimensions.length}개 문맥 성분을 만들었습니다.`);
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  function renderCorpusSummary() {
    const summary = $("corpusSummary");
    const tokens = corpusDataset ? corpusDataset.sentences.flat().length : 0;
    const items = [
      `${corpusDataset ? corpusDataset.sentences.length : 0}개 문장`,
      `${tokens}개 토큰`,
      `${corpusDataset ? corpusDataset.words.length : 0}개 단어`,
      `문맥 창 ±${$("windowSizeInput").value}`,
      $("normalizeCheckbox").checked ? "길이 1로 정규화" : "원빈도 벡터"
    ];
    summary.replaceChildren(...items.map((text) => {
      const span = document.createElement("span");
      span.textContent = text;
      return span;
    }));
    if (corpusDataset && corpusDataset.zeroWords.length) {
      const warning = document.createElement("span");
      warning.className = "warning-badge";
      warning.textContent = `문맥 없는 단어 ${corpusDataset.zeroWords.length}개`;
      summary.appendChild(warning);
    }
  }

  function activeMatrixVector(word) {
    return currentDataset && currentDataset.vectors[word] ? currentDataset.vectors[word] : [];
  }

  function renderMatrix() {
    const dataset = currentDataset;
    const head = $("matrixHead");
    const body = $("matrixBody");
    head.replaceChildren();
    body.replaceChildren();
    if (!dataset || !dataset.words.length) {
      body.innerHTML = '<tr><td class="empty-cell">단어가 없습니다. 문장을 입력하거나 빈도 기준을 낮춰 주세요.</td></tr>';
      $("matrixSizeBadge").textContent = "0 × 0";
      return;
    }
    $("matrixSizeBadge").textContent = `${dataset.words.length} × ${dataset.dimensions.length}`;
    const headRow = document.createElement("tr");
    const corner = document.createElement("th");
    corner.scope = "col";
    corner.textContent = "단어＼성분";
    headRow.appendChild(corner);
    dataset.dimensions.forEach((dimension) => {
      const th = document.createElement("th");
      th.scope = "col";
      th.textContent = dimension;
      headRow.appendChild(th);
    });
    head.appendChild(headRow);
    dataset.words.forEach((word) => {
      const row = document.createElement("tr");
      const th = document.createElement("th");
      th.scope = "row";
      th.textContent = word;
      row.appendChild(th);
      activeMatrixVector(word).forEach((value) => {
        const td = document.createElement("td");
        td.textContent = formatNumber(value, dataset.normalized ? 2 : 1);
        row.appendChild(td);
      });
      body.appendChild(row);
    });
  }

  function renderHeatmap() {
    const node = $("heatmap");
    node.replaceChildren();
    const dataset = currentDataset;
    if (!dataset || !dataset.words.length) {
      node.textContent = "표시할 값이 없습니다.";
      return;
    }
    const values = dataset.words.flatMap((word) => activeMatrixVector(word).map((value) => Math.abs(value)));
    const maximum = Math.max(...values, 0);
    node.style.gridTemplateColumns = `58px repeat(${dataset.dimensions.length}, minmax(31px, 1fr))`;
    const blank = document.createElement("span");
    node.appendChild(blank);
    dataset.dimensions.forEach((dimension) => {
      const label = document.createElement("span");
      label.className = "heatmap-label";
      label.textContent = dimension;
      label.title = dimension;
      node.appendChild(label);
    });
    dataset.words.forEach((word) => {
      const rowLabel = document.createElement("span");
      rowLabel.className = "heatmap-label heatmap-row-label";
      rowLabel.textContent = word;
      node.appendChild(rowLabel);
      activeMatrixVector(word).forEach((value, index) => {
        const ratio = maximum ? Math.abs(value) / maximum : 0;
        const lightness = 94 - ratio * 58;
        const cell = document.createElement("span");
        cell.className = "heatmap-cell";
        cell.style.setProperty("--heat", `hsl(163 39% ${lightness}%)`);
        cell.style.setProperty("--heat-text", ratio > 0.6 ? "white" : "#14243a");
        cell.textContent = formatNumber(value, dataset.normalized ? 1 : 0);
        cell.setAttribute("aria-label", `${word} 행, ${dataset.dimensions[index]} 성분: ${formatNumber(value, 3)}`);
        node.appendChild(cell);
      });
    });
    node.setAttribute("aria-label", `${dataset.words.length}개 단어와 ${dataset.dimensions.length}개 성분의 ${dataset.type === "csv" ? "벡터 값" : "동시출현"} 히트맵`);
  }

  function renderVectorStory() {
    const dataset = currentDataset;
    const select = $("matrixWordSelect");
    const preferred = fillSelect(select, dataset ? dataset.words : [], select.value);
    const node = $("selectedVectorStory");
    node.replaceChildren();
    if (!dataset || !preferred) {
      node.textContent = "선택할 단어가 없습니다.";
      return;
    }
    const vector = activeMatrixVector(preferred);
    const maximum = Math.max(...vector.map((value) => Math.abs(value)), 0);
    const wrapper = document.createElement("div");
    wrapper.className = "vector-expression";
    const code = document.createElement("code");
    code.textContent = `${preferred} = (${dataset.dimensions.map((dimension, index) => `${dimension}:${formatNumber(vector[index], 2)}`).join(", ")})`;
    const bars = document.createElement("div");
    bars.className = "component-bars";
    dataset.dimensions.forEach((dimension, index) => {
      const row = document.createElement("div");
      row.className = "component-bar";
      const name = document.createElement("b");
      name.textContent = dimension;
      const bar = document.createElement("i");
      bar.style.width = `${maximum ? (Math.abs(vector[index]) / maximum) * 100 : 0}%`;
      const value = document.createElement("code");
      value.textContent = formatNumber(vector[index], 2);
      row.append(name, bar, value);
      bars.appendChild(row);
    });
    wrapper.append(code, bars);
    if (V.magnitude(vector) <= V.EPSILON) {
      const warning = document.createElement("p");
      warning.className = "thinking-note";
      warning.textContent = "이 단어는 현재 기준에서 문맥 성분이 모두 0인 영벡터입니다. 코사인 유사도는 정의되지 않습니다.";
      wrapper.appendChild(warning);
    }
    node.appendChild(wrapper);
  }

  function renderDatasetViews() {
    renderMatrix();
    renderHeatmap();
    renderVectorStory();
    renderExplore();
  }

  function applyCsvDataset(announce) {
    try {
      currentDataset = V.parseVectorCsv($("csvInput").value);
      dataSource = "csv";
      $("csvFeedback").textContent = `${currentDataset.words.length}개 단어, ${currentDataset.dimensions.length}개 차원을 적용했습니다.`;
      renderDatasetViews();
      if (announce !== false) setStatus("CSV 벡터 데이터셋을 적용했습니다. 3단계의 순위·연산·군집도 함께 바뀌었습니다.");
    } catch (error) {
      $("csvFeedback").textContent = error.message;
      setStatus(error.message, true);
    }
  }

  function useCorpusDataset() {
    dataSource = "corpus";
    currentDataset = corpusDataset;
    $("csvFeedback").textContent = "말뭉치에서 만든 벡터를 다시 사용합니다.";
    renderDatasetViews();
    setStatus("말뭉치 벡터로 돌아왔습니다.");
  }

  function populateExploreSelects() {
    const words = currentDataset ? currentDataset.words : [];
    const dimensions = currentDataset ? currentDataset.dimensions : [];
    const preferred = (select, values, index) => values.includes(select.value) ? select.value : (values[index] || values[0] || "");
    const query = fillSelect($("queryWordSelect"), words, preferred($("queryWordSelect"), words, 0));
    const comparePreferred = preferred($("compareWordSelect"), words, 1);
    fillSelect($("compareWordSelect"), words, comparePreferred === query && words.length > 1 ? words.find((word) => word !== query) : comparePreferred);
    fillSelect($("wordASelect"), words, preferred($("wordASelect"), words, 0));
    fillSelect($("wordBSelect"), words, preferred($("wordBSelect"), words, 1));
    fillSelect($("wordCSelect"), words, preferred($("wordCSelect"), words, 2));
    const axisX = fillSelect($("axisXSelect"), dimensions, preferred($("axisXSelect"), dimensions, 0));
    const axisYPreferred = preferred($("axisYSelect"), dimensions, 1);
    fillSelect($("axisYSelect"), dimensions, axisYPreferred === axisX && dimensions.length > 1 ? dimensions.find((dimension) => dimension !== axisX) : axisYPreferred);
  }

  function renderNeighbors() {
    const query = $("queryWordSelect").value;
    if (!currentDataset || !query) {
      renderRankList($("euclideanNeighbors"), [], "euclidean");
      renderRankList($("cosineNeighbors"), [], "cosine");
      return;
    }
    renderRankList($("euclideanNeighbors"), V.rankNeighbors(currentDataset, query, "euclidean"), "euclidean", 5);
    renderRankList($("cosineNeighbors"), V.rankNeighbors(currentDataset, query, "cosine"), "cosine", 5);
  }

  function renderCosineDetail() {
    const query = $("queryWordSelect").value;
    const compare = $("compareWordSelect").value;
    const body = $("cosineComponentBody");
    const summary = $("cosineFormulaSummary");
    const steps = $("cosineCalculationSteps");
    body.replaceChildren();
    steps.replaceChildren();
    if (!currentDataset || !query || !compare) {
      summary.textContent = "비교할 두 단어가 필요합니다.";
      return;
    }
    const a = currentDataset.vectors[query];
    const b = currentDataset.vectors[compare];
    const detail = V.cosineBreakdown(a, b);
    currentDataset.dimensions.forEach((dimension, index) => {
      const row = document.createElement("tr");
      [dimension, formatNumber(a[index], 3), formatNumber(b[index], 3), formatNumber(detail.products[index], 3)].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });
      body.appendChild(row);
    });
    summary.innerHTML = `<b>${escapeHtml(query)}</b> · <b>${escapeHtml(compare)}</b> = <code>${detail.value === null ? "영벡터 때문에 정의 안 됨" : formatNumber(detail.value, 4)}</code>`;
    const productText = detail.products.length <= 12
      ? detail.products.map((value) => formatNumber(value, 3)).join(" + ")
      : `${detail.products.slice(0, 10).map((value) => formatNumber(value, 3)).join(" + ")} + … (${detail.products.length}개)`;
    [
      ["1. 성분별 곱", productText || "성분 없음"],
      ["2. 내적", `A·B = ${formatNumber(detail.innerProduct, 4)}`],
      ["3. 벡터 크기", `|A| = ${formatNumber(detail.magnitudeA, 4)}, |B| = ${formatNumber(detail.magnitudeB, 4)}`],
      ["4. 최종 나눗셈", detail.value === null ? "분모가 0이므로 코사인 유사도를 정의할 수 없습니다." : `${formatNumber(detail.innerProduct, 4)} ÷ ${formatNumber(detail.denominator, 4)} = ${formatNumber(detail.value, 4)}`]
    ].forEach(([label, value]) => {
      const li = document.createElement("li");
      const strong = document.createElement("b");
      strong.textContent = label;
      const code = document.createElement("code");
      code.textContent = value;
      li.append(strong, document.createElement("br"), code);
      steps.appendChild(li);
    });
  }

  function calculateArithmetic(announce) {
    if (!currentDataset || !currentDataset.words.length) {
      $("arithmeticVector").textContent = "—";
      $("arithmeticNearest").textContent = "계산할 단어 없음";
      renderRankList($("arithmeticNeighbors"), [], "cosine", 3);
      return;
    }
    const result = V.vectorArithmetic(currentDataset, $("wordASelect").value, $("wordBSelect").value, $("wordCSelect").value);
    if (result.error) {
      $("arithmeticVector").textContent = result.error;
      $("arithmeticNearest").textContent = "—";
      return;
    }
    $("arithmeticVector").textContent = formatVector(result.vector, 2);
    $("arithmeticNearest").textContent = result.neighbors[0] ? `${result.neighbors[0].word} (${formatNumber(result.neighbors[0].score, 4)})` : "비교할 다른 단어 없음";
    renderRankList($("arithmeticNeighbors"), result.neighbors, "cosine", 3);
    if (announce) setStatus("A−B+C를 계산하고 결과 벡터와 코사인 방향이 가까운 단어를 찾았습니다.");
  }

  function renderProjection() {
    const plot = $("projectionPlot");
    const legend = $("clusterLegend");
    plot.replaceChildren();
    legend.replaceChildren();
    if (!currentDataset || !currentDataset.words.length || !currentDataset.dimensions.length) {
      plot.textContent = "투영할 단어가 없습니다.";
      return;
    }
    const xIndex = Math.max(0, currentDataset.dimensions.indexOf($("axisXSelect").value));
    const yIndex = Math.max(0, currentDataset.dimensions.indexOf($("axisYSelect").value));
    const points = currentDataset.words.map((word) => ({ word, x: currentDataset.vectors[word][xIndex], y: currentDataset.vectors[word][yIndex] }));
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    let minX = Math.min(...xs);
    let maxX = Math.max(...xs);
    let minY = Math.min(...ys);
    let maxY = Math.max(...ys);
    if (Math.abs(maxX - minX) < V.EPSILON) { minX -= 1; maxX += 1; }
    if (Math.abs(maxY - minY) < V.EPSILON) { minY -= 1; maxY += 1; }
    const clusters = V.kMeans(currentDataset, Number($("clusterCountSelect").value));
    points.forEach((point) => {
      const mark = document.createElement("span");
      mark.className = "projected-point";
      mark.dataset.cluster = String(clusters.assignments[point.word] || 0);
      mark.style.left = `${8 + ((point.x - minX) / (maxX - minX)) * 84}%`;
      mark.style.top = `${92 - ((point.y - minY) / (maxY - minY)) * 84}%`;
      mark.textContent = point.word;
      mark.setAttribute("aria-label", `${point.word}: x ${formatNumber(point.x, 3)}, y ${formatNumber(point.y, 3)}, 군집 ${(clusters.assignments[point.word] || 0) + 1}`);
      plot.appendChild(mark);
    });
    for (let cluster = 0; cluster < clusters.k; cluster += 1) {
      const words = currentDataset.words.filter((word) => clusters.assignments[word] === cluster);
      const item = document.createElement("span");
      const shape = document.createElement("i");
      const text = document.createElement("b");
      text.textContent = `군집 ${cluster + 1}: ${words.join(", ") || "없음"}`;
      item.append(shape, text);
      legend.appendChild(item);
    }
    plot.setAttribute("aria-label", `${$("axisXSelect").value}와 ${$("axisYSelect").value} 성분으로 투영한 ${points.length}개 단어. 군집은 전체 ${currentDataset.dimensions.length}차원으로 계산함.`);
  }

  function renderExplore() {
    populateExploreSelects();
    const typeText = dataSource === "csv"
      ? `교사가 입력한 CSV 벡터 ${currentDataset ? currentDataset.words.length : 0}개 단어 · ${currentDataset ? currentDataset.dimensions.length : 0}차원`
      : `2단계 동시출현 벡터 · 문맥 창 ±${corpusDataset ? corpusDataset.windowSize : 0} · ${corpusDataset && corpusDataset.normalized ? "L2 정규화" : "원빈도"}`;
    $("activeDatasetLabel").textContent = typeText;
    renderNeighbors();
    renderCosineDetail();
    calculateArithmetic(false);
    renderProjection();
  }

  function checkPrediction() {
    const prediction = $("neighborPrediction").value.trim();
    const query = $("queryWordSelect").value;
    const nearest = currentDataset && query ? V.rankNeighbors(currentDataset, query, "cosine")[0] : null;
    if (!prediction) {
      $("predictionFeedback").textContent = "먼저 예상 단어를 적어 주세요.";
      return;
    }
    if (!nearest || nearest.score === null) {
      $("predictionFeedback").textContent = "현재 벡터로는 코사인 최근접 단어를 정할 수 없습니다. 영벡터나 자료량을 확인하세요.";
      return;
    }
    $("predictionFeedback").textContent = prediction === nearest.word
      ? `예상과 같습니다. ${nearest.word}, 코사인 ${formatNumber(nearest.score, 4)}`
      : `예상은 ${prediction}, 계산 결과는 ${nearest.word} (${formatNumber(nearest.score, 4)})입니다. 말뭉치 행을 비교해 보세요.`;
  }

  function updateMissionCount() {
    const notes = Array.from(document.querySelectorAll("[data-mission]"));
    const count = notes.filter((input) => input.value.trim()).length;
    $("missionCount").textContent = `${count} / ${notes.length} 기록`;
  }

  function collectState() {
    return {
      currentMode,
      basicPoints,
      basicSelections: { a: $("basicASelect").value, b: $("basicBSelect").value, query: $("basicQuerySelect").value },
      corpusPreset: $("corpusPresetSelect").value,
      corpus: $("corpusInput").value,
      windowSize: Number($("windowSizeInput").value),
      minFrequency: Number($("minFrequencySelect").value),
      normalize: $("normalizeCheckbox").checked,
      dataSource,
      csv: $("csvInput").value,
      queryWord: $("queryWordSelect").value,
      compareWord: $("compareWordSelect").value,
      wordA: $("wordASelect").value,
      wordB: $("wordBSelect").value,
      wordC: $("wordCSelect").value,
      axisX: $("axisXSelect").value,
      axisY: $("axisYSelect").value,
      clusterCount: Number($("clusterCountSelect").value),
      prediction: $("neighborPrediction").value,
      missions: Array.from(document.querySelectorAll("[data-mission]"), (input) => input.value)
    };
  }

  function downloadText(filename, text, type) {
    const blob = new Blob([text], { type: type || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function saveState() {
    downloadText("단어-벡터-놀이터-활동.json", V.encodeState(collectState()), "application/json;charset=utf-8");
    setStatus("현재 좌표·말뭉치·설정·학생 기록을 JSON으로 저장했습니다.");
  }

  function restoreState(state) {
    if (!state || typeof state !== "object") throw new Error("저장된 활동 상태가 비어 있습니다.");
    if (state.basicPoints && typeof state.basicPoints === "object") {
      const restored = {};
      Object.entries(state.basicPoints).slice(0, 20).forEach(([word, vector]) => {
        if (word && Array.isArray(vector) && vector.length === 2 && vector.every(Number.isFinite)) {
          restored[word] = vector.map((value) => clamp(value, -10, 10));
        }
      });
      if (Object.keys(restored).length >= 2) basicPoints = restored;
    }
    configureBasicSelects(state.basicSelections || {});
    $("corpusPresetSelect").value = corpusPresets[state.corpusPreset] ? state.corpusPreset : "balanced";
    if (typeof state.corpus === "string") $("corpusInput").value = state.corpus.slice(0, 20000);
    $("windowSizeInput").value = String(clamp(Number(state.windowSize) || 2, 1, 4));
    $("minFrequencySelect").value = [1,2,3].includes(Number(state.minFrequency)) ? String(state.minFrequency) : "1";
    $("normalizeCheckbox").checked = Boolean(state.normalize);
    if (typeof state.csv === "string") $("csvInput").value = state.csv.slice(0, 100000);
    rebuildCorpusDataset(false);
    if (state.dataSource === "csv") applyCsvDataset(false);
    else useCorpusDataset();
    fillSelect($("queryWordSelect"), currentDataset ? currentDataset.words : [], state.queryWord);
    fillSelect($("compareWordSelect"), currentDataset ? currentDataset.words : [], state.compareWord);
    fillSelect($("wordASelect"), currentDataset ? currentDataset.words : [], state.wordA);
    fillSelect($("wordBSelect"), currentDataset ? currentDataset.words : [], state.wordB);
    fillSelect($("wordCSelect"), currentDataset ? currentDataset.words : [], state.wordC);
    fillSelect($("axisXSelect"), currentDataset ? currentDataset.dimensions : [], state.axisX);
    fillSelect($("axisYSelect"), currentDataset ? currentDataset.dimensions : [], state.axisY);
    $("clusterCountSelect").value = [2,3,4].includes(Number(state.clusterCount)) ? String(state.clusterCount) : "2";
    $("neighborPrediction").value = typeof state.prediction === "string" ? state.prediction : "";
    if (Array.isArray(state.missions)) {
      document.querySelectorAll("[data-mission]").forEach((input, index) => { input.value = String(state.missions[index] || ""); });
    }
    renderBasic();
    renderDatasetViews();
    updateMissionCount();
    setMode(state.currentMode, false);
  }

  function loadStateFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        restoreState(V.decodeState(reader.result));
        setStatus("저장된 활동 상태와 교사 프리셋을 불러왔습니다.");
      } catch (error) {
        setStatus(error.message, true);
      } finally {
        $("loadStateInput").value = "";
      }
    };
    reader.onerror = () => setStatus("JSON 파일을 읽지 못했습니다.", true);
    reader.readAsText(file, "utf-8");
  }

  function bindEvents() {
    document.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
    ["basicASelect", "basicBSelect", "basicQuerySelect"].forEach((id) => $(id).addEventListener("change", renderBasic));
    $("resetBasicButton").addEventListener("click", () => {
      basicPoints = copyObject(defaultBasicPoints);
      configureBasicSelects({ a: "바다", b: "호수", query: "바다" });
      renderBasic();
      setStatus("기본 2차원 좌표로 돌아왔습니다.");
    });
    $("rankPresetButton").addEventListener("click", () => {
      basicPoints = copyObject(rankBasicPoints);
      configureBasicSelects({ a: "기준", b: "가까운점", query: "기준" });
      renderBasic();
      setStatus("거리 1위는 ‘가까운점’, 방향 1위는 ‘같은방향’이 되는 예제를 불러왔습니다.");
    });
    window.addEventListener("pointermove", (event) => { if (dragWord) setBasicPointFromClient(dragWord, event.clientX, event.clientY); });
    window.addEventListener("pointerup", () => { dragWord = null; });
    window.addEventListener("resize", () => { renderBasic(); renderProjection(); });

    $("loadCorpusPresetButton").addEventListener("click", () => loadCorpusPreset($("corpusPresetSelect").value));
    $("corpusInput").addEventListener("input", scheduleCorpusUpdate);
    $("windowSizeInput").addEventListener("input", () => { $("windowSizeOutput").value = $("windowSizeInput").value; scheduleCorpusUpdate(); });
    $("minFrequencySelect").addEventListener("change", () => rebuildCorpusDataset(true));
    $("normalizeCheckbox").addEventListener("change", () => rebuildCorpusDataset(true));
    $("matrixWordSelect").addEventListener("change", renderVectorStory);
    $("applyCsvButton").addEventListener("click", () => applyCsvDataset(true));
    $("useCorpusButton").addEventListener("click", useCorpusDataset);
    $("csvFileInput").addEventListener("change", () => {
      const file = $("csvFileInput").files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { $("csvInput").value = reader.result; applyCsvDataset(true); $("csvFileInput").value = ""; };
      reader.onerror = () => { $("csvFeedback").textContent = "CSV 파일을 읽지 못했습니다."; };
      reader.readAsText(file, "utf-8");
    });

    $("queryWordSelect").addEventListener("change", () => { renderNeighbors(); renderCosineDetail(); });
    $("compareWordSelect").addEventListener("change", renderCosineDetail);
    $("checkPredictionButton").addEventListener("click", checkPrediction);
    $("calculateArithmeticButton").addEventListener("click", () => calculateArithmetic(true));
    ["axisXSelect", "axisYSelect", "clusterCountSelect"].forEach((id) => $(id).addEventListener("change", renderProjection));
    document.querySelectorAll("[data-mission]").forEach((input) => input.addEventListener("input", updateMissionCount));

    $("saveStateButton").addEventListener("click", saveState);
    $("loadStateInput").addEventListener("change", () => loadStateFile($("loadStateInput").files[0]));
    $("printButton").addEventListener("click", () => window.print());
    $("fullscreenButton").addEventListener("click", async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
      } catch (error) {
        setStatus("이 브라우저에서는 전체화면을 시작할 수 없습니다.", true);
      }
    });
    document.addEventListener("fullscreenchange", () => { $("fullscreenButton").textContent = document.fullscreenElement ? "전체화면 종료" : "전체화면"; });

    const dialog = $("guideDialog");
    $("openGuideButton").addEventListener("click", () => dialog.showModal());
    $("closeGuideButton").addEventListener("click", () => dialog.close());
    $("startActivityButton").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
  }

  function init() {
    $("corpusInput").setAttribute("maxlength", "20000");
    configureBasicSelects({ a: "바다", b: "호수", query: "바다" });
    $("corpusPresetSelect").value = "balanced";
    $("corpusInput").value = corpusPresets.balanced.text;
    $("presetInsight").textContent = corpusPresets.balanced.insight;
    bindEvents();
    renderBasic();
    rebuildCorpusDataset(false);
    setMode("basic", false);
    updateMissionCount();
  }

  init();
})();
