(function () {
  "use strict";

  const M = window.RhythmMath;
  const palette = ["#ff715b", "#4d9de0", "#55d6b1", "#b28ae8"];
  const timbreNames = { wood: "우드", bell: "벨", kick: "킥", click: "클릭", clap: "클랩" };
  const missions = [
    { a: 3, b: 4, title: "3과 4: 서로소의 긴 호흡", prompt: "두 리듬은 시작점 다음에 몇 바퀴를 돌아야 다시 함께 울릴까요? 한 바퀴 안의 공통 방향 수도 예상하세요." },
    { a: 4, b: 6, title: "4와 6: 공통 방향 두 곳", prompt: "공통 시간 격자 12칸에서 두 색이 겹치는 칸을 예상해 보세요." },
    { a: 6, b: 8, title: "6과 8: 더 촘촘한 합동", prompt: "두 수가 모두 짝수이면 공통 방향은 어떻게 달라질까요?" },
    { a: 5, b: 7, title: "5와 7: 서로소 비교", prompt: "격자는 아주 촘촘하지만 공통 방향은 왜 적은지 설명해 보세요." }
  ];

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const refs = {};
  [
    "rhythmCanvas", "timeline", "layerList", "addLayerButton", "playButton", "resetButton", "stepButton", "stepBackButton",
    "bpmInput", "bpmOutput", "revolutionOutput", "masterVolume", "masterVolumeOutput", "muteButton", "fullscreenButton",
    "clockPosition", "gridPosition", "centerBeat", "coincidenceBadge", "guideButton", "guideDialog", "guideClose", "mathLayerA", "mathLayerB", "lcmValue", "lcmFormula",
    "gcdValue", "gcdFormula", "patternValue", "patternFormula", "factorization", "multiplesTable", "intervalInfo", "phaseInfo",
    "missionList", "missionLabel", "missionTitle", "missionPrompt", "predictionTime", "predictionCount", "predictionReason",
    "checkPrediction", "revealMission", "predictionFeedback", "missionExplanation", "printButton", "printSummary", "savePatternButton",
    "loadPatternInput", "shareCode", "makeShareButton", "loadShareButton", "createStatus", "gameScore", "gameTimer", "gameType",
    "newRoundButton", "hearQuestionButton", "gameRoundLabel", "gameQuestion", "gameAnswerA", "gameAnswerB", "submitGameAnswer",
    "gameFeedback", "roundLog", "teacherMin", "teacherMax", "teacherConcept", "teacherTime", "teacherMissions", "teacherTimbres",
    "saveTeacherButton", "exportTeacherButton", "importTeacherInput", "teacherStatus"
  ].forEach((id) => { refs[id] = document.getElementById(id); });

  let nextLayerId = 3;
  const makeSteps = (count) => Array.from({ length: count }, (_, index) => ({ enabled: true, accent: index === 0 }));
  const state = {
    layers: [
      { id: "layer-1", name: "층 A", divisions: 3, phase: 0, timbre: "wood", volume: .62, color: palette[0], enabled: true, steps: makeSteps(3) },
      { id: "layer-2", name: "층 B", divisions: 4, phase: 0, timbre: "bell", volume: .52, color: palette[1], enabled: true, steps: makeSteps(4) }
    ],
    activeMission: 0,
    lastHits: new Map(),
    lastGroupCount: 0,
    game: { score: 0, round: 0, secret: null, timer: 60, timerId: null, records: [] },
    teacher: { min: 2, max: 16, concept: "gcd-lcm", time: 60, missions: "3×4, 4×6, 6×8, 서로소", timbres: ["wood", "bell", "kick", "click"] }
  };

  const engine = new window.RhythmAudio.AudioClockSequencer(handleVisualGroup);
  engine.setLayers(state.layers);

  function safeInteger(value, min, max, fallback) {
    const number = Math.trunc(Number(value));
    return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
  }

  function resizeSteps(layer, count) {
    const old = layer.steps || [];
    layer.steps = Array.from({ length: count }, (_, index) => old[index] || { enabled: true, accent: index === 0 });
  }

  function layerLabel(layer, index) {
    return `${String.fromCharCode(65 + index)} · ${layer.divisions}등분`;
  }

  function renderLayers() {
    refs.layerList.innerHTML = state.layers.map((layer, index) => {
      const divisionOptions = Array.from({ length: state.teacher.max - state.teacher.min + 1 }, (_, offset) => state.teacher.min + offset)
        .map((value) => `<option value="${value}" ${value === layer.divisions ? "selected" : ""}>${value}등분</option>`).join("");
      const timbreOptions = state.teacher.timbres.map((value) => `<option value="${value}" ${value === layer.timbre ? "selected" : ""}>${timbreNames[value] || value}</option>`).join("");
      const steps = layer.steps.map((step, stepIndex) => {
        const className = step.enabled === false ? "is-rest" : step.accent ? "is-accent" : "";
        const status = step.enabled === false ? "쉼표" : step.accent ? "악센트" : "소리";
        return `<button type="button" class="step-dot ${className}" data-action="step" data-index="${index}" data-step="${stepIndex}" aria-label="${stepIndex + 1}번째 꼭짓점: ${status}" title="${status}">${stepIndex + 1}</button>`;
      }).join("");
      return `<article class="layer-card ${layer.enabled ? "" : "is-muted"}" data-layer="${index}" style="--layer-color:${layer.color}">
        <div class="layer-top">
          <button type="button" class="layer-toggle" data-action="toggle" data-index="${index}" aria-pressed="${layer.enabled}" aria-label="${layer.name} 켜기 또는 끄기">✓</button>
          <div><div class="layer-name">${layer.name}</div><div class="layer-summary">${layerLabel(layer, index)} · 위상 ${Math.round(layer.phase * 360)}°</div></div>
          <button type="button" class="remove-layer" data-action="remove" data-index="${index}" aria-label="${layer.name} 삭제" ${state.layers.length <= 2 ? "disabled" : ""}>삭제</button>
        </div>
        <div class="layer-controls">
          <label>등분 수<select data-field="divisions" data-index="${index}">${divisionOptions}</select></label>
          <label>시작 위상<input data-field="phase" data-index="${index}" type="number" min="0" max="359" step="1" value="${Math.round(layer.phase * 360)}" aria-label="${layer.name} 시작 위상(도)" /></label>
          <label>음색<select data-field="timbre" data-index="${index}">${timbreOptions}</select></label>
          <label>층 음량<input data-field="volume" data-index="${index}" type="range" min="0" max="100" value="${Math.round(layer.volume * 100)}" /></label>
          <label>색상<input data-field="color" data-index="${index}" type="color" value="${layer.color}" /></label>
          <label>미리 듣기<button type="button" data-action="preview" data-index="${index}" style="width:100%;height:36px;min-height:36px;margin-top:4px">한 번 치기</button></label>
        </div>
        <div class="step-editor" aria-label="${layer.name} 꼭짓점 소리 설정">${steps}</div>
      </article>`;
    }).join("");
    refs.addLayerButton.disabled = state.layers.length >= 4;
    updatePairSelectors();
  }

  function updatePairSelectors() {
    const oldA = refs.mathLayerA.value || "0";
    const oldB = refs.mathLayerB.value || "1";
    const options = state.layers.map((layer, index) => `<option value="${index}">${layerLabel(layer, index)}</option>`).join("");
    refs.mathLayerA.innerHTML = options;
    refs.mathLayerB.innerHTML = options;
    refs.mathLayerA.value = Number(oldA) < state.layers.length ? oldA : "0";
    refs.mathLayerB.value = Number(oldB) < state.layers.length && oldB !== refs.mathLayerA.value ? oldB : String(Math.min(1, state.layers.length - 1));
    if (refs.mathLayerA.value === refs.mathLayerB.value) refs.mathLayerB.value = String((Number(refs.mathLayerA.value) + 1) % state.layers.length);
    updateMath();
  }

  refs.layerList.addEventListener("change", (event) => {
    const target = event.target;
    const index = Number(target.dataset.index);
    const layer = state.layers[index];
    if (!layer || !target.dataset.field) return;
    if (target.dataset.field === "divisions") {
      layer.divisions = safeInteger(target.value, state.teacher.min, state.teacher.max, layer.divisions);
      resizeSteps(layer, layer.divisions);
      renderLayers();
    } else if (target.dataset.field === "phase") {
      layer.phase = M.mod(Number(target.value) || 0, 360) / 360;
      const summary = target.closest(".layer-card")?.querySelector(".layer-summary");
      if (summary) summary.textContent = `${layerLabel(layer, index)} · 위상 ${Math.round(layer.phase * 360)}°`;
    } else if (target.dataset.field === "timbre") {
      layer.timbre = target.value;
    } else if (target.dataset.field === "color") {
      layer.color = target.value;
      renderLayers();
    }
    engine.setLayers(state.layers);
    updateMath();
  });

  refs.layerList.addEventListener("input", (event) => {
    const target = event.target;
    const layer = state.layers[Number(target.dataset.index)];
    if (!layer) return;
    if (target.dataset.field === "volume") layer.volume = Number(target.value) / 100;
    if (target.dataset.field === "phase") {
      layer.phase = M.mod(Number(target.value) || 0, 360) / 360;
      const summary = target.closest(".layer-card")?.querySelector(".layer-summary");
      if (summary) summary.textContent = `${layerLabel(layer, Number(target.dataset.index))} · 위상 ${Math.round(layer.phase * 360)}°`;
      updateMath();
    }
  });

  refs.layerList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const index = Number(button.dataset.index);
    const layer = state.layers[index];
    if (!layer) return;
    if (button.dataset.action === "toggle") layer.enabled = !layer.enabled;
    if (button.dataset.action === "remove" && state.layers.length > 2) state.layers.splice(index, 1);
    if (button.dataset.action === "preview") engine.preview(layer, true).catch(showAudioError);
    if (button.dataset.action === "step") {
      const step = layer.steps[Number(button.dataset.step)];
      if (step.enabled !== false && !step.accent) step.accent = true;
      else if (step.enabled !== false && step.accent) { step.enabled = false; step.accent = false; }
      else { step.enabled = true; step.accent = false; }
    }
    renderLayers();
    engine.setLayers(state.layers);
    if (engine.playing) engine.resync(engine.currentPosition());
  });

  refs.addLayerButton.addEventListener("click", () => {
    if (state.layers.length >= 4) return;
    const index = state.layers.length;
    const divisions = [6, 8][Math.max(0, index - 2)] || 6;
    state.layers.push({ id: `layer-${nextLayerId++}`, name: `층 ${String.fromCharCode(65 + index)}`, divisions, phase: 0, timbre: ["kick", "click"][index - 2] || "click", volume: .48, color: palette[index], enabled: true, steps: makeSteps(divisions) });
    renderLayers();
    engine.setLayers(state.layers);
  });

  function selectedPair() {
    let aIndex = Number(refs.mathLayerA.value) || 0;
    let bIndex = Number(refs.mathLayerB.value) || 1;
    if (aIndex === bIndex) bIndex = (aIndex + 1) % state.layers.length;
    return { aIndex, bIndex, a: state.layers[aIndex], b: state.layers[bIndex] };
  }

  function formatRevolutions(value) {
    if (Math.abs(value - 1) < 1e-9) return "1바퀴";
    const denominator = Math.round(1 / value);
    return Math.abs(value - 1 / denominator) < 1e-9 ? `1/${denominator}바퀴` : `${value.toFixed(3)}바퀴`;
  }

  function updateMath() {
    if (state.layers.length < 2) return;
    const { a, b, aIndex, bIndex } = selectedPair();
    const info = M.commonHitInfo(a, b);
    const audiblePattern = M.patternRepeatInfo([a, b]);
    const seconds = engine.revolutionDuration;
    refs.lcmValue.textContent = `${info.lcm}칸`;
    refs.lcmFormula.textContent = `lcm(${info.n}, ${info.m}) = ${info.lcm}`;
    refs.gcdValue.textContent = `${info.commonCount}개`;
    refs.gcdFormula.textContent = info.compatible ? `gcd(${info.n}, ${info.m}) = ${info.gcd}` : `위상 조건 불일치 → 0개`;
    refs.patternValue.textContent = formatRevolutions(audiblePattern.value);
    refs.patternFormula.textContent = Math.abs(audiblePattern.value - info.patternShift) < 1e-9
      ? `모든 꼭짓점: 1 ÷ gcd(${info.n}, ${info.m})`
      : `현재 쉼표·악센트 반영 (모든 꼭짓점이면 ${formatRevolutions(info.patternShift)})`;
    refs.factorization.innerHTML = `<div class="factor-equation">${info.n} = ${M.formatFactors(info.n)}<br>${info.m} = ${M.formatFactors(info.m)}</div><div class="factor-result"><b>gcd = ${info.gcd}</b><b>lcm = ${info.lcm}</b></div>`;

    const maxMultiple = info.lcm * 2;
    const row = (number) => Array.from({ length: Math.min(12, Math.ceil(maxMultiple / number)) }, (_, i) => number * (i + 1));
    const commonSet = new Set([info.lcm, info.lcm * 2]);
    const multipleHtml = (number) => `<div class="multiple-row"><b>${number}의 배수</b><div class="multiple-cells">${row(number).map((value) => `<span class="${commonSet.has(value) ? "is-common" : ""}">${value}</span>`).join("")}</div></div>`;
    refs.multiplesTable.innerHTML = multipleHtml(info.n) + multipleHtml(info.m) + `<p>첫 공통 배수 ${info.lcm}이 한 바퀴의 최소 공통 시간 격자 수입니다.</p>`;

    refs.intervalInfo.innerHTML = `<div class="interval-bars">
      <div class="interval-bar"><b>${info.n}등분</b><i style="--bar-color:${a.color};width:${100 / info.n}%"></i><span>1/${info.n}바퀴 · ${(seconds / info.n).toFixed(3)}초</span></div>
      <div class="interval-bar"><b>${info.m}등분</b><i style="--bar-color:${b.color};width:${100 / info.m}%"></i><span>1/${info.m}바퀴 · ${(seconds / info.m).toFixed(3)}초</span></div>
    </div><p>${info.gcd === 1 ? "두 수는 서로소라 공통 방향이 시작 방향 하나뿐입니다." : info.n % info.m === 0 || info.m % info.n === 0 ? "한 수가 다른 수의 배수라 작은 도형의 모든 꼭짓점 방향이 겹칩니다." : `공약수 ${info.gcd}가 공통 방향의 수가 됩니다.`}</p>`;

    const phaseDegrees = M.mod((b.phase - a.phase) * 360, 360);
    refs.phaseInfo.innerHTML = info.compatible
      ? `<div class="phase-ok">위상 차이 ${phaseDegrees.toFixed(0)}°는 공통 격자 ${info.lcm}칸에 맞습니다. 공통 타격 ${info.commonCount}개.</div><div class="position-chips">${info.positions.map((position) => `<span>${Math.round(position * info.lcm)}/${info.lcm}바퀴 · ${Math.round(position * 360)}°</span>`).join("")}</div>`
      : `<div class="phase-no">위상 차이 ${phaseDegrees.toFixed(0)}°는 360°/${info.lcm} = ${(360 / info.lcm).toFixed(2)}°의 정수배가 아닙니다. 따라서 정확한 동시 타격은 0개입니다.</div><p>두 균일 리듬 각각은 계속 반복되므로 타격 배열의 최소 반복 이동 ${formatRevolutions(info.patternShift)}는 유지됩니다.</p>`;
    renderTimeline(info, aIndex, bIndex);
    updatePrintSummary(info, a, b);
  }

  function renderTimeline(info, aIndex, bIndex) {
    const a = state.layers[aIndex];
    const b = state.layers[bIndex];
    refs.timeline.style.setProperty("--grid-count", info.lcm);
    refs.timeline.style.setProperty("--cell-a", a.color);
    refs.timeline.style.setProperty("--cell-b", b.color);
    const aCells = new Set(M.hitFractions(a, false).map((hit) => M.mod(Math.round(hit.fraction * info.lcm), info.lcm)));
    const bCells = new Set(M.hitFractions(b, false).map((hit) => M.mod(Math.round(hit.fraction * info.lcm), info.lcm)));
    refs.timeline.innerHTML = Array.from({ length: info.lcm }, (_, index) => {
      const hasA = aCells.has(index);
      const hasB = bCells.has(index);
      return `<span class="timeline-cell ${hasA ? "has-a" : ""} ${hasB ? "has-b" : ""} ${hasA && hasB && info.compatible ? "is-common" : ""}" data-index="${index}" data-label="${info.lcm <= 32 || index % Math.ceil(info.lcm / 24) === 0 ? index : ""}" title="${index}/${info.lcm}바퀴"></span>`;
    }).join("");
  }

  refs.mathLayerA.addEventListener("change", updateMath);
  refs.mathLayerB.addEventListener("change", updateMath);

  function showAudioError(error) {
    refs.createStatus.textContent = error && error.message ? error.message : "소리를 시작하지 못했습니다.";
  }

  async function togglePlay() {
    if (engine.playing) {
      engine.pause();
      refs.playButton.classList.remove("is-playing");
      refs.playButton.innerHTML = '<span aria-hidden="true">▶</span> 계속';
    } else {
      try {
        await engine.play(engine.pausedPosition);
        refs.playButton.classList.add("is-playing");
        refs.playButton.innerHTML = '<span aria-hidden="true">Ⅱ</span> 일시정지';
      } catch (error) { showAudioError(error); }
    }
  }

  refs.playButton.addEventListener("click", togglePlay);
  refs.resetButton.addEventListener("click", () => {
    engine.stop();
    state.lastHits.clear();
    refs.playButton.classList.remove("is-playing");
    refs.playButton.innerHTML = '<span aria-hidden="true">▶</span> 시작';
    updateClock(0);
  });

  function stepPosition(direction) {
    const info = M.commonHitInfo(selectedPair().a, selectedPair().b);
    const wasPlaying = engine.playing;
    const current = engine.currentPosition();
    const next = Math.max(0, current + direction / info.lcm);
    if (wasPlaying) engine.resync(next);
    else engine.pausedPosition = next;
    triggerVisualAt(next, true);
    updateClock(next);
  }

  refs.stepButton.addEventListener("click", () => stepPosition(1));
  refs.stepBackButton.addEventListener("click", () => stepPosition(-1));
  refs.bpmInput.addEventListener("input", () => {
    engine.setBpm(refs.bpmInput.value);
    refs.bpmOutput.textContent = `${engine.bpm} BPM`;
    refs.revolutionOutput.textContent = `한 바퀴 ${engine.revolutionDuration.toFixed(2)}초 (4박)`;
    updateMath();
  });
  refs.masterVolume.addEventListener("input", () => {
    const value = Number(refs.masterVolume.value) / 100;
    engine.setVolume(value);
    refs.masterVolumeOutput.textContent = `${Math.round(value * 100)}%`;
  });
  refs.muteButton.addEventListener("click", () => {
    engine.setMuted(!engine.muted);
    refs.muteButton.setAttribute("aria-pressed", String(engine.muted));
    refs.muteButton.innerHTML = engine.muted ? "🔇 <span>음소거</span>" : "🔊 <span>소리 켬</span>";
  });
  refs.fullscreenButton.addEventListener("click", () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
  });
  refs.guideButton.addEventListener("click", () => { if (!refs.guideDialog.open) refs.guideDialog.showModal(); });
  refs.guideClose.addEventListener("click", () => refs.guideDialog.close());
  refs.guideDialog.addEventListener("click", (event) => {
    const rect = refs.guideDialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) refs.guideDialog.close();
  });
  if (new URLSearchParams(window.location.search).get("manual") === "1") requestAnimationFrame(() => refs.guideDialog.showModal());

  function triggerVisualAt(position, sound) {
    const fraction = M.mod(position, 1);
    const events = [];
    state.layers.forEach((layer, layerIndex) => {
      if (!layer.enabled) return;
      M.hitFractions(layer, true).forEach((hit) => {
        if (Math.abs(M.mod(hit.fraction - fraction + .5, 1) - .5) < M.EPSILON) {
          events.push({ layerIndex, layerId: layer.id, step: hit.step, accent: hit.accent, position });
          if (sound) engine.preview(layer, hit.accent).catch(showAudioError);
        }
      });
    });
    if (events.length) handleVisualGroup({ position, events });
  }

  function handleVisualGroup(group) {
    const expires = performance.now() + 210;
    group.events.forEach((event) => state.lastHits.set(event.layerId, { step: event.step, expires }));
    state.lastGroupCount = group.events.length;
    if (group.events.length > 1) {
      refs.coincidenceBadge.classList.remove("is-active");
      void refs.coincidenceBadge.offsetWidth;
      refs.coincidenceBadge.classList.add("is-active");
      setTimeout(() => refs.coincidenceBadge.classList.remove("is-active"), 420);
    }
  }

  function updateClock(position) {
    const info = M.commonHitInfo(selectedPair().a, selectedPair().b);
    const fraction = M.mod(position, 1);
    const cell = M.mod(Math.floor(fraction * info.lcm + 1e-7), info.lcm);
    refs.clockPosition.textContent = `${position.toFixed(3)} 바퀴`;
    refs.gridPosition.textContent = `격자 ${cell} / ${info.lcm}`;
    refs.centerBeat.textContent = String(cell);
    $$(".timeline-cell.is-current", refs.timeline).forEach((node) => node.classList.remove("is-current"));
    const current = $(`.timeline-cell[data-index="${cell}"]`, refs.timeline);
    if (current) current.classList.add("is-current");
  }

  function drawCanvas(position) {
    const canvas = refs.rhythmCanvas;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(320, Math.round(rect.width * dpr));
    if (canvas.width !== width || canvas.height !== width) { canvas.width = width; canvas.height = width; }
    const ctx = canvas.getContext("2d");
    const size = width;
    const center = size / 2;
    const radius = size * .39;
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(center, center);
    ctx.lineCap = "round";

    for (let ring = 1; ring <= 4; ring += 1) {
      ctx.beginPath(); ctx.arc(0, 0, radius * ring / 4, 0, Math.PI * 2); ctx.strokeStyle = `rgba(255,255,255,${ring === 4 ? .2 : .045})`; ctx.lineWidth = dpr; ctx.stroke();
    }
    for (let line = 0; line < 12; line += 1) {
      const angle = -Math.PI / 2 + line * Math.PI / 6;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius); ctx.strokeStyle = "rgba(255,255,255,.035)"; ctx.stroke();
    }

    state.layers.forEach((layer, layerIndex) => {
      const hits = M.hitFractions(layer, false);
      ctx.beginPath();
      hits.forEach((hit, index) => {
        const angle = -Math.PI / 2 + hit.fraction * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.globalAlpha = layer.enabled ? .62 : .16;
      ctx.strokeStyle = layer.color;
      ctx.lineWidth = (2.4 + layerIndex * .25) * dpr;
      ctx.stroke();
      ctx.globalAlpha = 1;

      hits.forEach((hit) => {
        const stepData = layer.steps[hit.step] || {};
        const angle = -Math.PI / 2 + hit.fraction * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const active = state.lastHits.get(layer.id);
        const isHit = active && active.step === hit.step && active.expires > performance.now();
        const baseSize = (stepData.accent ? 8 : 6) * dpr;
        if (isHit) {
          ctx.beginPath(); ctx.arc(x, y, 17 * dpr, 0, Math.PI * 2); ctx.fillStyle = `${layer.color}3d`; ctx.fill();
        }
        ctx.beginPath(); ctx.arc(x, y, (isHit ? baseSize * 1.45 : baseSize), 0, Math.PI * 2);
        ctx.fillStyle = stepData.enabled === false ? "#101a2f" : layer.color;
        ctx.fill();
        ctx.strokeStyle = stepData.enabled === false ? `${layer.color}99` : stepData.accent ? "#fffdf7" : "#101a2f";
        ctx.lineWidth = (stepData.accent ? 3 : 1.5) * dpr;
        ctx.stroke();
      });
    });

    const fraction = M.mod(position, 1);
    const rayAngle = -Math.PI / 2 + fraction * Math.PI * 2;
    const rayGradient = ctx.createLinearGradient(0, 0, Math.cos(rayAngle) * radius * 1.13, Math.sin(rayAngle) * radius * 1.13);
    rayGradient.addColorStop(0, "rgba(255,200,87,.35)"); rayGradient.addColorStop(1, "#ffc857");
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(rayAngle) * radius * 1.13, Math.sin(rayAngle) * radius * 1.13); ctx.strokeStyle = rayGradient; ctx.lineWidth = 4 * dpr; ctx.stroke();
    ctx.beginPath(); ctx.arc(Math.cos(rayAngle) * radius * 1.13, Math.sin(rayAngle) * radius * 1.13, 5 * dpr, 0, Math.PI * 2); ctx.fillStyle = "#ffc857"; ctx.fill();
    ctx.restore();
  }

  function animationFrame() {
    if (engine.playing) engine.consumeVisualEvents();
    const position = engine.currentPosition();
    drawCanvas(position);
    updateClock(position);
    requestAnimationFrame(animationFrame);
  }

  function switchMode(mode) {
    $$(".mode-tabs [role=tab]").forEach((tab) => {
      const selected = tab.dataset.mode === mode;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    ["learn", "create", "game", "teacher"].forEach((name) => {
      document.getElementById(`${name}Panel`).hidden = name !== mode;
    });
  }

  $$(".mode-tabs [role=tab]").forEach((tab) => tab.addEventListener("click", () => switchMode(tab.dataset.mode)));

  function setMission(index) {
    state.activeMission = index;
    const mission = missions[index];
    while (state.layers.length < 2) refs.addLayerButton.click();
    [mission.a, mission.b].forEach((divisions, layerIndex) => {
      const layer = state.layers[layerIndex];
      layer.divisions = divisions;
      layer.phase = 0;
      layer.enabled = true;
      resizeSteps(layer, divisions);
      layer.steps.forEach((step, stepIndex) => { step.enabled = true; step.accent = stepIndex === 0; });
    });
    refs.missionLabel.textContent = `미션 ${index + 1}`;
    refs.missionTitle.textContent = mission.title;
    refs.missionPrompt.textContent = mission.prompt;
    refs.predictionTime.value = "";
    refs.predictionCount.value = "";
    refs.predictionReason.value = "";
    refs.predictionFeedback.textContent = "";
    refs.missionExplanation.hidden = true;
    $$("button", refs.missionList).forEach((button, buttonIndex) => button.classList.toggle("is-active", buttonIndex === index));
    renderLayers();
    refs.mathLayerA.value = "0"; refs.mathLayerB.value = "1";
    updateMath();
    engine.stop();
  }

  refs.missionList.innerHTML = missions.map((mission, index) => `<button type="button" data-mission="${index}" class="${index === 0 ? "is-active" : ""}"><b>${String(index + 1).padStart(2, "0")}</b><span>${mission.a} × ${mission.b}</span></button>`).join("");
  refs.missionList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-mission]");
    if (button) setMission(Number(button.dataset.mission));
  });

  function parsePrediction(value, grid) {
    const text = String(value || "").trim().replace(/\s/g, "");
    if (!text) return NaN;
    const fraction = text.match(/(\d+)\/(\d+)/);
    if (fraction) return Number(fraction[1]) / Number(fraction[2]);
    const number = Number((text.match(/[\d.]+/) || [])[0]);
    if (!Number.isFinite(number)) return NaN;
    return text.includes("칸") ? number / grid : number;
  }

  refs.checkPrediction.addEventListener("click", () => {
    const mission = missions[state.activeMission];
    const info = M.commonHitInfo({ divisions: mission.a, phase: 0 }, { divisions: mission.b, phase: 0 });
    const predictedTime = parsePrediction(refs.predictionTime.value, info.lcm);
    const predictedCount = Number(refs.predictionCount.value);
    const timeCorrect = Math.abs(predictedTime - info.patternShift) < 1e-6;
    const countCorrect = predictedCount === info.gcd;
    refs.predictionFeedback.className = `feedback ${timeCorrect && countCorrect ? "is-good" : "is-bad"}`;
    refs.predictionFeedback.textContent = timeCorrect && countCorrect
      ? "좋아요! 이제 시작해 회전과 소리로 예상이 맞는지 확인해 보세요."
      : `다시 생각해 보세요. 다음 동시 타격은 ${info.lcm / info.gcd}칸 뒤이고, 한 바퀴의 공통 방향은 gcd(${mission.a}, ${mission.b})개입니다.`;
  });

  refs.revealMission.addEventListener("click", () => {
    const mission = missions[state.activeMission];
    const info = M.commonHitInfo({ divisions: mission.a, phase: 0 }, { divisions: mission.b, phase: 0 });
    refs.missionExplanation.hidden = false;
    refs.missionExplanation.innerHTML = `<b>시간표:</b> 한 바퀴를 ${info.lcm}칸으로 나누면 ${mission.a}등분은 ${info.lcm / mission.a}칸마다, ${mission.b}등분은 ${info.lcm / mission.b}칸마다 울립니다. 두 표가 겹치는 간격은 ${info.lcm / info.gcd}칸, 즉 ${formatRevolutions(info.patternShift)}입니다.<br><b>원형 그림:</b> 공통 방향은 ${info.positions.map((p) => `${Math.round(p * 360)}°`).join(", ")}이고 모두 ${info.gcd}개입니다.<br><b>수식:</b> gcd(${mission.a}, ${mission.b}) = ${info.gcd}, lcm(${mission.a}, ${mission.b}) = ${info.lcm}.`;
  });

  refs.printButton.addEventListener("click", () => window.print());
  function updatePrintSummary(info, a, b) {
    refs.printSummary.innerHTML = `<table><tr><th>비교한 두 리듬</th><td>${a.divisions}등분, ${b.divisions}등분</td></tr><tr><th>공통 시간 격자</th><td>${info.lcm}칸</td></tr><tr><th>공통 방향</th><td>${info.commonCount}개</td></tr><tr><th>위상</th><td>${Math.round(a.phase * 360)}°, ${Math.round(b.phase * 360)}°</td></tr></table>`;
  }

  function patternData() {
    return { kind: "geometry-rhythm-sequencer", version: 1, bpm: engine.bpm, volume: engine.volume, layers: state.layers.map((layer) => ({ ...layer, steps: layer.steps.map((step) => ({ ...step })) })) };
  }

  function compactPatternData() {
    return {
      k: "grs", v: 1, b: engine.bpm, q: Math.round(engine.volume * 100),
      l: state.layers.map((layer) => [
        layer.divisions,
        Math.round(layer.phase * 360),
        layer.timbre,
        Math.round(layer.volume * 100),
        layer.color.slice(1),
        layer.enabled ? 1 : 0,
        layer.steps.map((step) => step.enabled === false ? "0" : step.accent ? "2" : "1").join("")
      ])
    };
  }

  function expandSharedPattern(data) {
    if (!data || data.k !== "grs" || !Array.isArray(data.l)) return data;
    return {
      kind: "geometry-rhythm-sequencer",
      version: 1,
      bpm: data.b,
      volume: Number(data.q) / 100,
      layers: data.l.map((item, index) => ({
        id: `layer-${index + 1}`,
        name: `층 ${String.fromCharCode(65 + index)}`,
        divisions: item[0],
        phase: Number(item[1]) / 360,
        timbre: item[2],
        volume: Number(item[3]) / 100,
        color: `#${item[4]}`,
        enabled: Boolean(item[5]),
        steps: String(item[6] || "").split("").map((value) => ({ enabled: value !== "0", accent: value === "2" }))
      }))
    };
  }

  function validatePattern(data) {
    if (!data || data.kind !== "geometry-rhythm-sequencer" || !Array.isArray(data.layers) || data.layers.length < 2 || data.layers.length > 4) throw new Error("도형 리듬 시퀀서 패턴 파일이 아닙니다.");
    return {
      bpm: Math.max(30, Math.min(240, Number(data.bpm) || 84)),
      volume: Math.max(0, Math.min(1, Number(data.volume) || .65)),
      layers: data.layers.map((source, index) => {
        const divisions = safeInteger(source.divisions, 2, 32, 4);
        const layer = { id: String(source.id || `layer-${index + 1}`), name: String(source.name || `층 ${String.fromCharCode(65 + index)}`).slice(0, 20), divisions, phase: M.normalizePhase(source.phase), timbre: timbreNames[source.timbre] ? source.timbre : "wood", volume: Math.max(0, Math.min(1, Number(source.volume) || .5)), color: /^#[0-9a-f]{6}$/i.test(source.color) ? source.color : palette[index], enabled: source.enabled !== false, steps: [] };
        layer.steps = Array.from({ length: divisions }, (_, stepIndex) => ({ enabled: source.steps?.[stepIndex]?.enabled !== false, accent: Boolean(source.steps?.[stepIndex]?.accent) }));
        return layer;
      })
    };
  }

  function applyPattern(data) {
    const valid = validatePattern(data);
    engine.stop();
    state.layers = valid.layers;
    state.teacher.min = Math.min(state.teacher.min, ...state.layers.map((layer) => layer.divisions));
    state.teacher.max = Math.max(state.teacher.max, ...state.layers.map((layer) => layer.divisions));
    engine.setLayers(state.layers);
    engine.setBpm(valid.bpm); engine.setVolume(valid.volume);
    refs.bpmInput.value = String(valid.bpm); refs.bpmOutput.textContent = `${valid.bpm} BPM`;
    refs.masterVolume.value = String(Math.round(valid.volume * 100)); refs.masterVolumeOutput.textContent = `${Math.round(valid.volume * 100)}%`;
    refs.revolutionOutput.textContent = `한 바퀴 ${engine.revolutionDuration.toFixed(2)}초 (4박)`;
    renderLayers();
  }

  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = filename; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  refs.savePatternButton.addEventListener("click", () => { downloadJson("도형-리듬-패턴.json", patternData()); refs.createStatus.textContent = "현재 패턴을 JSON 파일로 저장했습니다."; });
  refs.loadPatternInput.addEventListener("change", async () => {
    try { applyPattern(JSON.parse(await refs.loadPatternInput.files[0].text())); refs.createStatus.textContent = "패턴을 불러왔습니다."; }
    catch (error) { refs.createStatus.textContent = error.message; }
    refs.loadPatternInput.value = "";
  });
  refs.makeShareButton.addEventListener("click", async () => {
    refs.shareCode.value = M.encodeShare(compactPatternData());
    try { await navigator.clipboard.writeText(refs.shareCode.value); refs.createStatus.textContent = "공유 문자열을 만들고 클립보드에 복사했습니다."; }
    catch { refs.createStatus.textContent = "공유 문자열을 만들었습니다. 직접 복사해 주세요."; }
  });
  refs.loadShareButton.addEventListener("click", () => {
    try { applyPattern(expandSharedPattern(M.decodeShare(refs.shareCode.value))); refs.createStatus.textContent = "공유 문자열의 패턴을 불러왔습니다."; }
    catch (error) { refs.createStatus.textContent = `불러오기 실패: ${error.message}`; }
  });

  function randomInt(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
  function randomPair() {
    let a = randomInt(state.teacher.min, state.teacher.max);
    let b = randomInt(state.teacher.min, state.teacher.max);
    while (b === a) b = randomInt(state.teacher.min, state.teacher.max);
    return [a, b].sort((x, y) => x - y);
  }

  function startGameTimer() {
    clearInterval(state.game.timerId);
    state.game.timer = state.teacher.time;
    refs.gameTimer.textContent = state.game.timer;
    state.game.timerId = setInterval(() => {
      state.game.timer -= 1; refs.gameTimer.textContent = state.game.timer;
      if (state.game.timer <= 0) { clearInterval(state.game.timerId); refs.gameFeedback.className = "feedback is-bad"; refs.gameFeedback.textContent = "시간 끝! 새 라운드에 도전하세요."; }
    }, 1000);
  }

  function newRound() {
    const type = refs.gameType.value;
    const pair = randomPair();
    state.game.round += 1;
    state.game.secret = { type, pair };
    refs.gameRoundLabel.textContent = `ROUND ${state.game.round}`;
    refs.gameAnswerA.value = ""; refs.gameAnswerB.value = ""; refs.gameFeedback.textContent = "";
    if (type === "listen") refs.gameQuestion.textContent = "리듬을 듣고 두 등분 수를 맞혀 보세요. (순서는 상관없어요.)";
    if (type === "target") { state.game.secret.target = M.gcd(...pair); refs.gameQuestion.textContent = `한 바퀴의 공통 타격이 ${state.game.secret.target}개가 되는 두 수를 만드세요.`; }
    if (type === "condition") {
      state.game.secret.condition = Math.random() < .5 ? "gcd" : "lcm";
      state.game.secret.target = state.game.secret.condition === "gcd" ? M.gcd(...pair) : M.lcm(...pair);
      refs.gameQuestion.textContent = `${state.game.secret.condition === "gcd" ? "최대공약수" : "최소공배수"}가 ${state.game.secret.target}인 두 수를 만드세요.`;
    }
    startGameTimer();
  }

  refs.newRoundButton.addEventListener("click", newRound);
  refs.hearQuestionButton.addEventListener("click", async () => {
    if (!state.game.secret) newRound();
    const [a, b] = state.game.secret.pair;
    try {
      await engine.ensureAudio();
      const start = engine.context.currentTime + .06;
      const duration = 2.4;
      [{ divisions: a, timbre: "wood", volume: .55 }, { divisions: b, timbre: "bell", volume: .48 }].forEach((layer, index) => {
        for (let step = 0; step < layer.divisions; step += 1) engine.trigger(layer, start + step * duration / layer.divisions, step === 0);
      });
      refs.gameFeedback.className = "feedback"; refs.gameFeedback.textContent = "한 바퀴의 리듬을 들려주었습니다.";
    } catch (error) { showAudioError(error); }
  });
  refs.submitGameAnswer.addEventListener("click", () => {
    if (!state.game.secret || state.game.timer <= 0) return;
    const a = safeInteger(refs.gameAnswerA.value, state.teacher.min, state.teacher.max, NaN);
    const b = safeInteger(refs.gameAnswerB.value, state.teacher.min, state.teacher.max, NaN);
    if (!Number.isFinite(a) || !Number.isFinite(b)) { refs.gameFeedback.textContent = "두 수를 모두 입력하세요."; return; }
    const secret = state.game.secret;
    let correct = false;
    if (secret.type === "listen") correct = [a, b].sort((x, y) => x - y).join(",") === secret.pair.join(",");
    if (secret.type === "target") correct = M.gcd(a, b) === secret.target;
    if (secret.type === "condition") correct = (secret.condition === "gcd" ? M.gcd(a, b) : M.lcm(a, b)) === secret.target;
    clearInterval(state.game.timerId);
    const points = correct ? 10 + Math.ceil(state.game.timer / 10) : 0;
    state.game.score += points; refs.gameScore.textContent = state.game.score;
    refs.gameFeedback.className = `feedback ${correct ? "is-good" : "is-bad"}`;
    refs.gameFeedback.textContent = correct ? `정답! ${points}점 획득.` : `아쉬워요. 예시 답은 ${secret.pair[0]}과 ${secret.pair[1]}입니다.`;
    state.game.records.unshift({ round: state.game.round, answer: `${a}, ${b}`, correct, points });
    refs.roundLog.innerHTML = state.game.records.map((record) => `<li>${record.round}R · ${record.answer} · ${record.correct ? `정답 +${record.points}` : "오답"}</li>`).join("");
  });

  function readTeacherForm() {
    const min = safeInteger(refs.teacherMin.value, 2, 15, 2);
    const max = safeInteger(refs.teacherMax.value, min + 1, 32, 16);
    return { min, max, concept: refs.teacherConcept.value, time: safeInteger(refs.teacherTime.value, 15, 600, 60), missions: refs.teacherMissions.value.slice(0, 200), timbres: [...refs.teacherTimbres.selectedOptions].map((option) => option.value) };
  }
  function applyTeacher(data) {
    const allowedTimbres = Object.keys(timbreNames);
    state.teacher = { min: safeInteger(data.min, 2, 15, 2), max: safeInteger(data.max, 3, 32, 16), concept: ["gcd-lcm", "coprime", "multiple", "phase"].includes(data.concept) ? data.concept : "gcd-lcm", time: safeInteger(data.time, 15, 600, 60), missions: String(data.missions || "3×4, 4×6, 6×8, 서로소").slice(0, 200), timbres: Array.isArray(data.timbres) ? data.timbres.filter((value) => allowedTimbres.includes(value)) : ["wood", "bell"] };
    if (!state.teacher.timbres.length) state.teacher.timbres = ["wood"];
    if (state.teacher.max <= state.teacher.min) state.teacher.max = state.teacher.min + 1;
    refs.teacherMin.value = state.teacher.min; refs.teacherMax.value = state.teacher.max; refs.teacherConcept.value = state.teacher.concept; refs.teacherTime.value = state.teacher.time; refs.teacherMissions.value = state.teacher.missions;
    [...refs.teacherTimbres.options].forEach((option) => { option.selected = state.teacher.timbres.includes(option.value); });
    state.layers.forEach((layer) => { layer.divisions = Math.max(state.teacher.min, Math.min(state.teacher.max, layer.divisions)); resizeSteps(layer, layer.divisions); if (!state.teacher.timbres.includes(layer.timbre)) layer.timbre = state.teacher.timbres[0]; });
    renderLayers();
  }
  refs.saveTeacherButton.addEventListener("click", () => { applyTeacher(readTeacherForm()); localStorage.setItem("ct2-teacher-preset", JSON.stringify(state.teacher)); refs.teacherStatus.textContent = "교사 프리셋을 이 브라우저에 저장했습니다."; });
  refs.exportTeacherButton.addEventListener("click", () => { applyTeacher(readTeacherForm()); downloadJson("도형-리듬-교사-프리셋.json", { kind: "geometry-rhythm-teacher", version: 1, ...state.teacher }); refs.teacherStatus.textContent = "교사 프리셋 파일을 저장했습니다."; });
  refs.importTeacherInput.addEventListener("change", async () => {
    try { const data = JSON.parse(await refs.importTeacherInput.files[0].text()); if (data.kind !== "geometry-rhythm-teacher") throw new Error("교사 프리셋 파일이 아닙니다."); applyTeacher(data); refs.teacherStatus.textContent = "교사 프리셋을 불러왔습니다."; }
    catch (error) { refs.teacherStatus.textContent = error.message; }
    refs.importTeacherInput.value = "";
  });

  document.addEventListener("keydown", (event) => {
    if (/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    if (event.code === "Space") { event.preventDefault(); togglePlay(); }
    if (event.key === "ArrowRight") { event.preventDefault(); stepPosition(1); }
    if (event.key === "ArrowLeft") { event.preventDefault(); stepPosition(-1); }
    if (event.key.toLowerCase() === "m") refs.muteButton.click();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && engine.playing) engine.resync(engine.currentPosition());
  });

  try { const savedTeacher = localStorage.getItem("ct2-teacher-preset"); if (savedTeacher) applyTeacher(JSON.parse(savedTeacher)); } catch { /* 저장값이 손상되면 기본값 사용 */ }
  renderLayers();
  setMission(0);
  engine.setBpm(refs.bpmInput.value);
  engine.setVolume(Number(refs.masterVolume.value) / 100);
  requestAnimationFrame(animationFrame);
})();
