(function () {
  "use strict";

  const Model = window.EquiprobabilityModel;
  const STORAGE_KEY = "equiprobability-detective-session-v1";
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const MISSIONS = [
    {
      id: "coin",
      number: "01",
      navTitle: "공정한 동전",
      navCaption: "표본공간 첫 수사",
      label: "CASE FILE · FAIR COINS",
      title: "공정한 동전과 첫 표본공간",
      brief: "서로 구별되는 두 동전을 동시에 던졌습니다. 앞면 개수라는 겉결과와 두 동전의 순서 있는 결과를 구분해 봅시다.",
      question: "앞면이 정확히 한 개 나올 확률은?",
      assumptions: [
        ["macro-count", "앞면 개수 0·1·2의 세 이름을 똑같이 셌다"],
        ["micro", "두 동전의 HH·HT·TH·TT가 동가능하다고 보았다"],
        ["single-coin", "동전 하나가 앞면일 확률만 그대로 사용했다"],
      ],
      soundAssumption: "micro",
      errorStage: "겉결과를 기본사건으로 둔 단계",
      teacherQuestion: "HT와 TH를 하나로 합칠 때 확률까지 하나로 줄어드는가?",
      teacherNote: "서로 다른 두 동전을 실제로 구별해 네 결과를 학생들에게 말하게 한 뒤, 앞면 개수별로 다시 묶어 보세요.",
    },
    {
      id: "dice",
      number: "02",
      navTitle: "직육면체 주사위",
      navCaption: "면 이름과 가중치",
      label: "CASE FILE · CUBOID DIE",
      title: "직육면체 주사위의 여섯 면",
      brief: "여섯 면은 모두 존재하지만, 길이가 다른 직육면체는 어느 면으로 놓이느냐에 따라 착지 가능성이 달라질 수 있습니다.",
      question: "현재 가중치 모델에서 1번 넓은 면이 나올 확률은?",
      assumptions: [
        ["six-names", "면 이름이 1~6까지 여섯 개라 모두 1/6로 보았다"],
        ["weights", "마주 보는 면 쌍의 착지 가중치를 각 면에 나누었다"],
        ["shape-only", "직육면체라는 모양만 보고 확률을 정할 수 없다고 보았다"],
      ],
      soundAssumption: "weights",
      errorStage: "여섯 면의 존재를 여섯 동가능 사건으로 바꾼 단계",
      teacherQuestion: "표본공간 {1,2,3,4,5,6}을 쓰는 것과 각 원소가 동가능하다는 것은 같은 말인가?",
      teacherNote: "가중치는 실제 물리 법칙의 단순화된 모형입니다. 핵심은 숫자 자체가 아니라 각 면의 확률을 별도로 정당화해야 한다는 점입니다.",
    },
    {
      id: "necklace",
      number: "03",
      navTitle: "2색 목걸이",
      navCaption: "겉모양과 배치 수",
      label: "CASE FILE · TWO-COLOR NECKLACE",
      title: "두 목걸이 유형의 숨은 배치 수",
      brief: "검정 2개와 흰색 2개를 네 자리 원에 무작위로 놓습니다. 완성된 겉모양은 두 유형이지만 생성 경로 수는 다릅니다.",
      question: "같은 색 구슬끼리 이웃한 유형이 만들어질 확률은?",
      assumptions: [
        ["two-shapes", "완성된 목걸이 모양이 두 종류라 1/2로 보았다"],
        ["labeled-seats", "번호가 붙은 네 자리에서 검정 자리 두 곳을 골랐다"],
        ["rotation", "회전하면 같은 모양이므로 배치 수도 같다고 보았다"],
      ],
      soundAssumption: "labeled-seats",
      errorStage: "회전으로 같은 겉모양을 만든 뒤 각 유형에 같은 무게를 준 단계",
      teacherQuestion: "완성품을 두 종류로 분류하는 것과 만드는 과정이 두 갈래인 것은 왜 다른가?",
      teacherNote: "네 자리에 1~4 번호를 붙이면 검정 자리 선택은 6가지입니다. 번호를 지운 뒤 4가지와 2가지로 묶이는 모습을 강조하세요.",
    },
    {
      id: "bertrand",
      number: "04",
      navTitle: "베르트랑 상자",
      navCaption: "관찰이 만든 가중치",
      label: "CASE FILE · BERTRAND BOXES",
      title: "금화를 본 뒤 남은 동전",
      brief: "상자를 하나 고르고 동전 하나를 꺼냈더니 금화였습니다. 이 관찰은 가능한 상자 두 종류에 같은 무게를 남기지 않습니다.",
      question: "관찰한 동전이 금화일 때, 반대편 동전도 금화일 조건부확률은?",
      assumptions: [
        ["two-boxes", "금화가 가능한 상자가 두 종류라 1/2로 보았다"],
        ["gold-evidence", "관찰될 수 있었던 금화 하나하나를 같은 가능성으로 셌다"],
        ["first-box", "처음 세 상자를 고른 확률 1/3만 사용했다"],
      ],
      soundAssumption: "gold-evidence",
      errorStage: "관찰 뒤 남은 상자 이름 두 개에 같은 조건부 가중치를 준 단계",
      teacherQuestion: "금금 상자는 ‘금화를 보았다’는 증거를 몇 가지 방식으로 만들 수 있는가?",
      teacherNote: "금금 상자의 두 금화에 서로 다른 표시를 붙이면, 관찰된 금화 경로 3개 중 2개가 금금 상자에서 옵니다.",
    },
    {
      id: "two-stage",
      number: "05",
      navTitle: "두 단계 상자",
      navCaption: "경로 확률의 합",
      label: "CASE FILE · TWO-STAGE CHOICE",
      title: "상자를 고른 뒤 공을 뽑는 절차",
      brief: "먼저 상자를 고르고, 그 안에서 공을 하나 뽑습니다. 두 상자의 모든 공을 한 통에 합친 것처럼 세면 첫 단계가 사라집니다.",
      question: "현재 절차에서 흰 공이 나올 전체확률은?",
      assumptions: [
        ["pooled", "두 상자의 공을 모두 합쳐 흰 공 수/전체 공 수로 셌다"],
        ["paths", "상자 선택확률 × 그 상자에서 흰 공 확률을 더했다"],
        ["equal-color", "검정과 흰색 두 결과를 1/2씩으로 보았다"],
      ],
      soundAssumption: "paths",
      errorStage: "첫 단계의 상자 선택확률을 지우고 모든 공을 동가능하게 둔 단계",
      teacherQuestion: "상자 (가)의 공 하나와 상자 (나)의 공 하나가 실제로 같은 확률로 뽑히는가?",
      teacherNote: "나뭇가지마다 확률을 곱하고, 흰 공으로 끝나는 두 경로를 더하게 하세요. 원자료 기본 구성에서는 1/6 + 1/5 = 11/30입니다.",
    },
  ];

  let state = loadSession();
  let selections = { prediction: "", assumption: "", note: "" };
  let saveTimer = null;
  let configInputTimer = null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function loadSession() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Model.sanitizeSession(raw);
    } catch (_) {
      return Model.createDefaultSession();
    }
  }

  function saveSession(message = "방금 저장됨") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      $("#saveStatus").textContent = message;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => { $("#saveStatus").textContent = "이 기기에 자동 저장"; }, 1800);
    } catch (_) {
      $("#saveStatus").textContent = "저장할 수 없음";
    }
  }

  function activeMission() {
    return MISSIONS.find((mission) => mission.id === state.activeMission) || MISSIONS[0];
  }

  function currentTheory(id = state.activeMission) {
    return Model.theoryForMission(id, state.configs);
  }

  function uniqueOptions(options) {
    const seen = new Set();
    return options.filter((option) => {
      if (seen.has(option.value)) return false;
      seen.add(option.value);
      return true;
    });
  }

  function answerOptions(mission, theory) {
    if (mission.id === "coin") return [
      { value: "1/3", label: "1/3" }, { value: "1/2", label: "1/2" }, { value: "2/3", label: "2/3" },
    ];
    if (mission.id === "dice") return uniqueOptions([
      { value: "1/6", label: "1/6" },
      { value: theory.target.text, label: theory.target.text },
      { value: "결정 불가", label: "결정 불가" },
    ]);
    if (mission.id === "necklace") return [
      { value: "1/2", label: "1/2" }, { value: "1/3", label: "1/3" }, { value: "2/3", label: "2/3" },
    ];
    if (mission.id === "bertrand") return uniqueOptions([
      { value: "1/2", label: "1/2" },
      { value: theory.target.text, label: theory.target.text },
      { value: "1/3", label: "1/3" },
    ]);
    return uniqueOptions([
      { value: theory.naivePooled.text, label: `${theory.naivePooled.text} (공을 한데 셈)` },
      { value: theory.target.text, label: theory.target.text },
      { value: "1/2", label: "1/2" },
    ]);
  }

  function renderAll() {
    renderModes();
    renderMissionNav();
    renderCase();
    renderRecords();
  }

  function renderModes() {
    $$('[data-mode]').forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.mode === state.mode)));
    const completeCount = Object.keys(state.records).length;
    if (state.mode === "team") {
      $("#modeDashboard").innerHTML = `
        <div class="dashboard-card">
          <span><strong>모둠 대결</strong> · 현재 답할 모둠을 고른 뒤 사건을 공개하세요.</span>
          <div class="team-controls" role="group" aria-label="현재 모둠">
            <button type="button" data-team="A" class="${state.activeTeam === "A" ? "active" : ""}">A 모둠 · ${state.teamScores.A}점</button>
            <button type="button" data-team="B" class="${state.activeTeam === "B" ? "active" : ""}">B 모둠 · ${state.teamScores.B}점</button>
          </div>
        </div>`;
    } else if (state.mode === "teacher") {
      $("#modeDashboard").innerHTML = `<div class="dashboard-card"><span><strong>교사용 진행</strong> · 질문을 읽고 학생 예상과 근거를 먼저 받은 뒤 ‘증거 공개’를 누르세요.</span><span>${completeCount}/5 사건 공개</span></div>`;
    } else {
      $("#modeDashboard").innerHTML = `<div class="dashboard-card"><span><strong>개인 탐구</strong> · 예상, 근거, 수사 점수가 이 기기에 자동 저장됩니다.</span><span>${completeCount}/5 완료 · ${state.score}/100점</span></div>`;
    }
  }

  function renderMissionNav() {
    $("#missionNav").innerHTML = MISSIONS.map((mission) => {
      const active = mission.id === state.activeMission;
      const complete = Boolean(state.records[mission.id]);
      return `<button class="mission-tab ${active ? "active" : ""} ${complete ? "completed" : ""}" type="button" data-mission="${mission.id}" aria-current="${active ? "step" : "false"}">
        <span>CASE ${mission.number}</span><i class="mission-check" aria-hidden="true">✓</i>
        <b>${mission.navTitle}</b><small>${mission.navCaption}</small>
      </button>`;
    }).join("");
  }

  function renderCase() {
    const mission = activeMission();
    const theory = currentTheory();
    const record = state.records[mission.id];
    selections = record
      ? { prediction: record.prediction, assumption: record.assumptionId || "", note: record.note || "" }
      : { prediction: "", assumption: "", note: "" };

    $("#caseNumber").textContent = mission.number;
    $("#caseLabel").textContent = mission.label;
    $("#caseTitle").textContent = mission.title;
    $("#caseBrief").textContent = mission.brief;
    $("#questionText").textContent = mission.question;
    $("#caseStatus").className = `case-status ${record ? "completed" : ""}`;
    $("#caseStatus").innerHTML = `<span></span>${record ? `수사 완료 · ${record.points}점` : "미수사"}`;

    const options = answerOptions(mission, theory);
    $("#answerChoices").innerHTML = options.map((option, index) => `
      <label class="choice-label"><input type="radio" name="prediction" value="${escapeHtml(option.value)}" ${record?.prediction === option.value ? "checked" : ""} ${record ? "disabled" : ""} />
      <span>${escapeHtml(option.label)}</span></label>`).join("");
    $("#answerChoices").style.gridTemplateColumns = `repeat(${Math.min(3, options.length)}, 1fr)`;

    $("#assumptionChoices").innerHTML = mission.assumptions.map(([id, text]) => `
      <label class="choice-label"><input type="radio" name="assumption" value="${id}" ${record?.assumptionId === id ? "checked" : ""} ${record ? "disabled" : ""} />
      <span>${text}</span></label>`).join("");
    $("#studentNote").value = record?.note || "";
    $("#studentNote").disabled = Boolean(record);
    $("#seedInput").value = state.seed;
    updateRevealButton(record);

    const panel = $("#evidencePanel");
    panel.dataset.revealed = String(Boolean(record));
    $("#evidenceContent").setAttribute("aria-hidden", String(!record));
    $("#evidenceLock").setAttribute("aria-hidden", String(Boolean(record)));
    if (record) {
      const sound = record.assumptionId === mission.soundAssumption;
      const customCondition = Boolean(record.answer && record.answer !== theory.target.text);
      $("#verdictChip").className = `verdict-chip ${record.correct && sound && !customCondition ? "correct" : "rethink"}`;
      $("#verdictChip").textContent = customCondition
        ? "새 조건 탐구 · 점수 고정"
        : record.correct && sound ? "가정까지 정확" : `${record.points}점 · 가정 추적`;
      renderConfig(mission);
      renderEvidence(mission, theory, record);
      renderSimulation(mission, theory);
    } else {
      $("#verdictChip").className = "verdict-chip";
      $("#verdictChip").textContent = "증거 대기";
      $("#configPanel").innerHTML = "";
      $("#simulationResult").innerHTML = "";
    }

    $("#teacherCue").hidden = state.mode !== "teacher";
    $("#teacherQuestion").textContent = mission.teacherQuestion;
    $("#teacherNote").textContent = mission.teacherNote;
  }

  function updateRevealButton(record = state.records[state.activeMission]) {
    const button = $("#revealButton");
    if (record) {
      button.disabled = true;
      button.querySelector("b").textContent = `증거 공개됨 · ${record.points}점`;
      button.querySelector("small").textContent = "기록 저장 완료";
      $("#predictionHint").textContent = "아래에서 겉결과와 미시 사건을 비교하고 반복 실험을 실행하세요.";
      return;
    }
    button.disabled = !(selections.prediction && selections.assumption);
    button.querySelector("b").textContent = "예상 잠그고 증거 공개";
    button.querySelector("small").textContent = "Alt + E";
    $("#predictionHint").textContent = button.disabled
      ? "예상과 판단 근거를 모두 선택하면 공개할 수 있어요."
      : "선택을 기록할 준비가 되었습니다.";
  }

  function revealEvidence() {
    const mission = activeMission();
    if (state.records[mission.id] || !selections.prediction || !selections.assumption) return;
    const theory = currentTheory();
    const correct = selections.prediction === theory.target.text;
    const sound = selections.assumption === mission.soundAssumption;
    const points = (correct ? 14 : 5) + (sound ? 6 : 0);
    const assumptionText = mission.assumptions.find(([id]) => id === selections.assumption)?.[1] || "";
    state.records[mission.id] = {
      prediction: selections.prediction,
      assumptionId: selections.assumption,
      assumption: assumptionText,
      correct,
      points,
      answer: theory.target.text,
      note: $("#studentNote").value.trim(),
      team: state.mode === "team" ? state.activeTeam : "",
    };
    state.score = MISSIONS.reduce((sum, item) => sum + (state.records[item.id]?.points || 0), 0);
    if (state.mode === "team") state.teamScores[state.activeTeam] += points;
    saveSession("예상과 근거 저장됨");
    renderAll();
    toast(correct && sound ? "확률값과 동가능성 가정을 모두 밝혀냈어요!" : "증거에서 동가능성을 잘못 둔 단계를 추적해 보세요.");
    setTimeout(() => $("#evidencePanel").focus?.(), 0);
  }

  function renderConfig(mission) {
    if (mission.id === "dice") {
      const labels = ["넓은 면 쌍 (1·6)", "중간 면 쌍 (2·5)", "좁은 면 쌍 (3·4)"];
      $("#configPanel").innerHTML = `<div class="config-heading"><div><span>MAKE A NEW CASE</span><h4>면 쌍의 착지 가중치 바꾸기</h4></div><button type="button" data-reset-config="dice">기본 6:3:1</button></div>
        <div class="config-grid">${state.configs.diceWeights.map((value, index) => `<label class="config-control"><span>${labels[index]}</span><input type="number" min="0" max="20" value="${value}" data-config="dice" data-index="${index}" aria-label="${labels[index]} 가중치" /></label>`).join("")}</div>`;
    } else if (mission.id === "bertrand") {
      $("#configPanel").innerHTML = `<div class="config-heading"><div><span>MAKE A NEW CASE</span><h4>각 상자의 금화 개수 바꾸기</h4></div><button type="button" data-reset-config="bertrand">금금·은은·금은</button></div>
        <div class="config-grid">${state.configs.bertrandGolds.map((value, index) => `<label class="config-control"><span>상자 ${index + 1} · 금화 수</span><select data-config="bertrand" data-index="${index}" aria-label="상자 ${index + 1}의 금화 수"><option value="0" ${value === 0 ? "selected" : ""}>0 · 은은</option><option value="1" ${value === 1 ? "selected" : ""}>1 · 금은</option><option value="2" ${value === 2 ? "selected" : ""}>2 · 금금</option></select></label>`).join("")}</div>`;
    } else if (mission.id === "two-stage") {
      $("#configPanel").innerHTML = `<div class="config-heading"><div><span>MAKE A NEW CASE</span><h4>상자 선택 가중치와 공 구성 바꾸기</h4></div><button type="button" data-reset-config="two-stage">원자료 기본값</button></div>
        <div class="config-grid two">${state.configs.twoStage.boxes.map((box, index) => `<div class="box-config"><strong>상자 ${index === 0 ? "(가)" : "(나)"}</strong><div class="box-config-row"><label>선택 가중치<input type="number" min="0" max="20" value="${state.configs.twoStage.boxWeights[index]}" data-config="two-stage-weight" data-index="${index}" /></label><label>검정 공<input type="number" min="0" max="12" value="${box.black}" data-config="two-stage-black" data-index="${index}" /></label><label>흰 공<input type="number" min="0" max="12" value="${box.white}" data-config="two-stage-white" data-index="${index}" /></label></div></div>`).join("")}</div>`;
    } else {
      $("#configPanel").innerHTML = "";
    }
  }

  function outcomeCard(label, value, count, target = false) {
    return `<div class="outcome-card ${target ? "target" : ""}" style="--weight:${Math.round(value * 100)}"><b>${label}</b><strong>${Math.round(value * 100)}%</strong><small>${count}</small></div>`;
  }

  function coinPair(value) {
    return `<div class="coin-pair">${[...value].map((side, index) => `<span class="coin-symbol ${side === "T" ? "tail" : ""}" title="${index === 0 ? "100원" : "500원"} 동전 ${side === "H" ? "앞면" : "뒷면"}">${side}</span>`).join("")}</div>`;
  }

  const DOTS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
  function dieFace(face) {
    return `<span class="dice-face" aria-label="${face}번 면">${Array.from({ length: 9 }, (_, index) => `<i class="${DOTS[face].includes(index + 1) ? "dot" : ""}"></i>`).join("")}</span>`;
  }

  function necklaceGraphic(value) {
    return `<span class="necklace-state" aria-label="${value}">${[...value].map((bead) => `<i class="${bead === "B" ? "black" : "white"}"></i>`).join("")}</span>`;
  }

  function boxGraphic(golds, index, highlightGold = false) {
    return `<div class="box-card"><b>상자 ${index + 1}</b><div class="box-coins">${[0, 1].map((coinIndex) => `<span class="coin-token ${coinIndex < golds ? "gold" : "silver"} ${highlightGold && coinIndex < golds ? "evidence-token" : ""}">${coinIndex < golds ? "금" : "은"}</span>`).join("")}</div></div>`;
  }

  function renderEvidence(mission, theory, record) {
    const sound = record.assumptionId === mission.soundAssumption;
    $("#diagnosisTitle").textContent = sound ? "가정 단계가 타당합니다" : `동가능성 오류: ${mission.errorStage}`;
    $("#diagnosisText").textContent = diagnosisText(mission, theory, record, sound);
    $("#exactAnswer").textContent = theory.target.text;
    $("#verdictText").textContent = verdictText(mission, theory);

    if (mission.id === "coin") renderCoinEvidence(theory);
    if (mission.id === "dice") renderDiceEvidence(theory);
    if (mission.id === "necklace") renderNecklaceEvidence(theory);
    if (mission.id === "bertrand") renderBertrandEvidence(theory);
    if (mission.id === "two-stage") renderTwoStageEvidence(theory);
  }

  function diagnosisText(mission, theory, record, sound) {
    const prefix = sound ? "선택한 근거는 무작위 절차를 올바르게 반영합니다. " : `‘${record.assumption}’에서 다시 살펴볼 지점이 있습니다. `;
    if (mission.id === "coin") return `${prefix}앞면 개수는 0·1·2 세 이름이지만, ‘앞면 1개’에는 HT와 TH 두 미시 사건이 들어갑니다.`;
    if (mission.id === "dice") return `${prefix}면의 이름 여섯 개는 표본공간을 나열할 뿐입니다. 현재 모형에서는 각 면이 ${theory.faceWeights.join(":")}의 가중치를 가져야 확률이 정해집니다.`;
    if (mission.id === "necklace") return `${prefix}완성된 모양은 두 유형이지만, 번호 붙은 자리에서 생기는 여섯 배치는 이웃형 4개와 교대형 2개로 묶입니다.`;
    if (mission.id === "bertrand") return `${prefix}금화를 관찰할 수 있는 미시 경로는 ${theory.observedGold}개이고, 그중 반대편도 금인 경로가 ${theory.partnerGold}개입니다. 상자 이름만 두 개 남았다고 같은 무게가 되지 않습니다.`;
    return `${prefix}모든 공을 한데 모으면 첫 번째 상자 선택 단계가 사라집니다. 각 가지에서 ‘상자 선택 × 상자 안 추출’을 계산한 뒤 흰 공 경로를 더해야 합니다.`;
  }

  function verdictText(mission, theory) {
    if (mission.id === "coin") return "동가능한 네 순서 결과 중 두 결과";
    if (mission.id === "dice") return "1번 면에 배정된 가중치의 몫";
    if (mission.id === "necklace") return "여섯 자리 배치 중 이웃형 네 배치";
    if (mission.id === "bertrand") return theory.possible ? "금화 관찰 경로 중 금-금 경로" : "관찰 가능한 금화가 없어 조건을 정의할 수 없음";
    return "두 흰 공 경로의 확률을 더한 값";
  }

  function renderCoinEvidence(theory) {
    $("#microIntro").textContent = "서로 구별되는 두 공정한 동전의 네 순서 결과가 각각 1/4로 동가능합니다.";
    $("#macroView").innerHTML = `<div class="outcome-grid" style="--columns:3">${theory.macro.map((item) => outcomeCard(item.label, item.probability.value, `${item.count}개 미시 사건`, item.key === "one")).join("")}</div>`;
    $("#microView").innerHTML = `<div class="micro-grid" style="--columns:4">${theory.micro.map((value) => `<div class="micro-chip ${value === "HT" || value === "TH" ? "target" : ""}">${coinPair(value)}<small>${value === "HT" || value === "TH" ? "앞면 1개" : value === "HH" ? "앞면 2개" : "앞면 0개"}</small></div>`).join("")}</div>`;
    $("#formulaLine").textContent = "P(앞면 1개) = 2/4 = 1/2";
    $("#formulaNote").textContent = "분모 4는 HH, HT, TH, TT라는 동가능한 기본사건의 수입니다.";
  }

  function renderDiceEvidence(theory) {
    $("#microIntro").textContent = "이 단순 모형에서는 가중치 한 칸을 동가능한 미시 단위로 보고, 같은 면에 속한 칸을 합합니다.";
    $("#macroView").innerHTML = `<div class="outcome-grid" style="--columns:3">${theory.faces.map((item) => `<div class="outcome-card ${item.face === 1 ? "target" : ""}"><b>${item.face}번 면</b><strong>?</strong><small>이름 한 개</small></div>`).join("")}</div>`;
    $("#microView").innerHTML = `<div class="micro-grid" style="--columns:3">${theory.faces.map((item) => `<div class="micro-chip ${item.face === 1 ? "target" : ""}">${dieFace(item.face)}<span class="die-meta">가중치 ${item.weight} · ${item.probability.text}</span></div>`).join("")}</div>`;
    const [wide, middle, narrow] = theory.pairWeights;
    $("#formulaLine").textContent = `P(1번) = ${wide} / {2×(${wide}+${middle}+${narrow})} = ${theory.target.text}`;
    $("#formulaNote").textContent = "마주 보는 두 면은 같은 면 쌍 가중치를 나눠 갖는다고 정한 모형입니다. 실제 주사위는 실험 또는 물리 모형으로 가중치를 정당화해야 합니다.";
  }

  function renderNecklaceEvidence(theory) {
    const adjacent = theory.groups.find((group) => group.key === "adjacent");
    const alternating = theory.groups.find((group) => group.key === "alternating");
    $("#microIntro").textContent = "네 자리에 번호를 붙이고 검정 구슬 두 자리의 조합을 고르면 여섯 배치가 동가능합니다.";
    $("#macroView").innerHTML = `<div class="outcome-grid" style="--columns:2">${outcomeCard("같은 색이 이웃", adjacent.probability.value, "겉모양 A", true)}${outcomeCard("두 색이 번갈아", alternating.probability.value, "겉모양 B")}</div>`;
    $("#microView").innerHTML = `<div class="micro-grid" style="--columns:3">${theory.micro.map((item) => `<div class="micro-chip ${item.type === "adjacent" ? "target" : ""}">${necklaceGraphic(item.value)}<small>${item.value} · ${item.type === "adjacent" ? "이웃형" : "교대형"}</small></div>`).join("")}</div>`;
    $("#formulaLine").textContent = "P(이웃형) = 4/6 = 2/3";
    $("#formulaNote").textContent = "겉모양을 기준으로 먼저 두 칸을 만든 것이 아니라, 동가능한 여섯 자리 배치를 겉모양별로 다시 묶었습니다.";
  }

  function renderBertrandEvidence(theory) {
    $("#microIntro").textContent = theory.possible ? "상자와 동전 위치를 무작위로 고를 때, 관찰될 수 있는 금화 하나하나가 같은 확률의 증거 경로입니다." : "현재 구성에는 관찰할 수 있는 금화가 없습니다.";
    const possibleBoxes = theory.boxes.map((golds, index) => ({ golds, index })).filter((box) => box.golds > 0);
    $("#macroView").innerHTML = possibleBoxes.length
      ? `<div class="box-row" style="grid-template-columns:repeat(${possibleBoxes.length},1fr)">${possibleBoxes.map((box) => boxGraphic(box.golds, box.index)).join("")}</div><p class="inline-note">금화가 가능한 상자 ${possibleBoxes.length}종류</p>`
      : `<div class="empty-simulation">금화가 있는 상자가 없습니다.</div>`;
    $("#microView").innerHTML = theory.evidence.length
      ? `<div class="micro-grid" style="--columns:3">${theory.evidence.map((item) => `<div class="micro-chip ${item.partner === "G" ? "target" : ""}"><span class="coin-token gold evidence-token">금</span><small>상자 ${item.box + 1} · 반대편 ${item.partner === "G" ? "금" : "은"}</small></div>`).join("")}</div>`
      : `<div class="empty-simulation">조건 사건이 일어날 수 없어 미시 경로가 없습니다.</div>`;
    $("#formulaLine").textContent = theory.possible ? `P(반대편 금 | 금 관찰) = ${theory.partnerGold}/${theory.observedGold} = ${theory.target.text}` : "P(반대편 금 | 금 관찰) = 정의되지 않음";
    $("#formulaNote").textContent = theory.possible ? `분모 ${theory.observedGold}는 금화를 관찰할 수 있었던 동전 위치의 수입니다.` : "조건 사건의 확률이 0이면 조건부확률을 정의할 수 없습니다.";
  }

  function renderTwoStageEvidence(theory) {
    $("#microIntro").textContent = "상자 선택 뒤 공을 뽑는 두 단계 경로는 잎의 확률이 서로 다를 수 있으므로 가지별 곱셈으로 무게를 표시합니다.";
    $("#macroView").innerHTML = `<div class="outcome-grid" style="--columns:2">${outcomeCard("흰 공", theory.target.value, "목표 결과", true)}${outcomeCard("검정 공", 1 - theory.target.value, "나머지 결과")}</div><p class="inline-note">단순 합산: ${theory.naivePooled.text}</p>`;
    $("#microView").innerHTML = `<div class="tree-view"><div class="tree-root">먼저 상자 선택</div><div class="tree-branches">${theory.branches.map((branch, index) => `<div class="tree-branch"><b>상자 ${index === 0 ? "(가)" : "(나)"}</b><span>P = ${branch.select.text}</span><div class="tree-leaves"><small>흰 ${branch.whiteGivenBox.text}<br />경로 ${branch.whitePath.text}</small><small>검정 ${branch.blackGivenBox.text}</small></div></div>`).join("")}</div></div>`;
    const [a, b] = theory.branches;
    $("#formulaLine").textContent = `P(흰) = ${a.select.text}×${a.whiteGivenBox.text} + ${b.select.text}×${b.whiteGivenBox.text} = ${a.whitePath.text} + ${b.whitePath.text} = ${theory.target.text}`;
    $("#formulaNote").textContent = `모든 공을 한데 센 ${theory.naivePooled.text}은 각 공이 같은 확률로 선택된다는 다른 무작위 절차의 계산입니다.`;
  }

  function simulationSeries(mission, theory, result) {
    if (mission.id === "coin") return theory.macro.map((item) => ({ key: item.key, label: item.label, theory: item.probability.value }));
    if (mission.id === "dice") return theory.faces.map((item) => ({ key: `face-${item.face}`, label: `${item.face}번 면`, theory: item.probability.value }));
    if (mission.id === "necklace") return theory.groups.map((item) => ({ key: item.key, label: item.label, theory: item.probability.value }));
    if (mission.id === "bertrand") return [
      { key: "partner-gold", label: "반대편 금", theory: theory.target.value },
      { key: "partner-silver", label: "반대편 은", theory: theory.possible ? 1 - theory.target.value : 0 },
    ];
    return [
      { key: "white", label: "흰 공", theory: theory.target.value },
      { key: "black", label: "검정 공", theory: 1 - theory.target.value },
    ];
  }

  function renderSimulation(mission, theory) {
    const result = state.simulations?.[mission.id];
    if (!result) {
      $("#simulationResult").innerHTML = `<div class="empty-simulation">반복 횟수를 선택하면 관찰 비율과 정확한 이론값을 함께 표시합니다.</div>`;
      return;
    }
    const denominator = mission.id === "bertrand" ? result.evidenceCount : result.trials;
    const series = simulationSeries(mission, theory, result);
    const extra = mission.id === "bertrand" ? ` · 그중 금화 관찰 ${result.evidenceCount.toLocaleString("ko-KR")}회` : "";
    $("#simulationResult").innerHTML = `<div class="simulation-summary"><span><strong>${result.trials.toLocaleString("ko-KR")}회</strong> 절차 반복${extra}</span><span>막대 = 관찰 · 노란 선 = 이론</span></div>
      ${denominator ? `<div class="bar-list">${series.map((item) => {
        const observed = (result.counts[item.key] || 0) / denominator;
        return `<div class="bar-row"><span>${item.label}</span><div class="bar-track"><i style="width:${(observed * 100).toFixed(3)}%"></i><b style="left:${(item.theory * 100).toFixed(3)}%"></b></div><strong>${(observed * 100).toFixed(result.trials > 999 ? 1 : 0)}%</strong></div>`;
      }).join("")}</div>` : `<div class="empty-simulation">이번 반복에서는 금화를 관찰하지 못했습니다. 횟수를 늘려 보세요.</div>`}`;
  }

  function runSimulation(trials) {
    if (!state.records[state.activeMission]) {
      toast("예상과 근거를 기록한 뒤 반복 실험을 시작하세요.");
      return;
    }
    state.seed = Math.max(1, Math.min(2147483646, Math.round(Number($("#seedInput").value) || 2026)));
    state.simulations[state.activeMission] = Model.simulateMission(state.activeMission, state.configs, trials, state.seed);
    renderSimulation(activeMission(), currentTheory());
    toast(`${Number(trials).toLocaleString("ko-KR")}회 반복 실험을 완료했습니다.`);
  }

  function renderRecords() {
    state.score = MISSIONS.reduce((sum, mission) => sum + (state.records[mission.id]?.points || 0), 0);
    $("#totalScore").textContent = state.score;
    $("#recordList").innerHTML = MISSIONS.map((mission) => {
      const record = state.records[mission.id];
      const exact = Model.theoryForMission(mission.id, state.configs).target.text;
      if (!record) return `<article class="record-row empty"><span>${mission.number}</span><div><b>${mission.navTitle}</b><small>아직 예상하지 않았습니다.</small></div><div><b>판단 근거 대기</b><small>사건을 열어 근거를 선택하세요.</small></div><div class="record-answer"><strong>${exact}</strong><small>정확한 답은 수사 뒤 확인</small></div><div class="record-score">—</div></article>`;
      const conditionChanged = Boolean(record.answer && record.answer !== exact);
      return `<article class="record-row"><span>${mission.number}</span><div><b>${mission.navTitle}</b><small>예상 ${escapeHtml(record.prediction)}${record.team ? ` · ${record.team} 모둠` : ""}</small></div><div><b>${escapeHtml(record.assumption)}</b><small>당시 ${record.correct ? "확률값 일치" : "확률값 재검토"} · ${record.assumptionId === mission.soundAssumption ? "가정 타당" : "동가능성 가정 재검토"}</small></div><div class="record-answer"><strong>${exact}</strong><small>${conditionChanged ? `새 조건 정확값 · 당시 ${escapeHtml(record.answer)}` : "현재 설정의 정확값"}</small></div><div class="record-score">${record.points}</div></article>`;
    }).join("");
    $("#printRows").innerHTML = MISSIONS.map((mission) => {
      const record = state.records[mission.id];
      const exact = Model.theoryForMission(mission.id, state.configs).target.text;
      return `<tr><td>${mission.number}. ${mission.navTitle}</td><td>${escapeHtml(record?.prediction || "")}</td><td>${escapeHtml(record?.assumption || "")}${record?.note ? `<br />메모: ${escapeHtml(record.note)}` : ""}</td><td>${exact}</td><td>${record ? `${record.points}/20` : ""}</td></tr>`;
    }).join("");
  }

  function updateConfig(target) {
    const type = target.dataset.config;
    const index = Number(target.dataset.index);
    const value = Math.max(0, Math.round(Number(target.value) || 0));
    if (type === "dice") state.configs.diceWeights[index] = Math.min(20, value);
    if (type === "bertrand") state.configs.bertrandGolds[index] = Math.min(2, value);
    if (type === "two-stage-weight") state.configs.twoStage.boxWeights[index] = Math.min(20, value);
    if (type === "two-stage-black") state.configs.twoStage.boxes[index].black = Math.min(12, value);
    if (type === "two-stage-white") state.configs.twoStage.boxes[index].white = Math.min(12, value);

    if (type.startsWith("two-stage")) state.configs.twoStage = Model.sanitizeTwoStage(state.configs.twoStage);
    if (type === "dice") state.configs.diceWeights = Model.diceTheory(state.configs.diceWeights).pairWeights;
    if (type === "bertrand") state.configs.bertrandGolds = Model.bertrandTheory(state.configs.bertrandGolds).boxes;
    delete state.simulations[state.activeMission];
    saveSession("새 문제 설정 저장됨");
    renderCase();
    renderRecords();
    toast("설정을 바꿔 정확값과 미시 사건을 다시 계산했습니다.");
  }

  function resetConfig(type) {
    const defaults = Model.createDefaultSession().configs;
    if (type === "dice") state.configs.diceWeights = [...defaults.diceWeights];
    if (type === "bertrand") state.configs.bertrandGolds = [...defaults.bertrandGolds];
    if (type === "two-stage") state.configs.twoStage = JSON.parse(JSON.stringify(defaults.twoStage));
    delete state.simulations[state.activeMission];
    saveSession("기본 문제 복원됨");
    renderCase();
    renderRecords();
    toast("원자료의 기본 문제 구성으로 돌아왔습니다.");
  }

  function selectMission(id, focus = false) {
    if (!Model.MISSION_IDS.includes(id)) return;
    state.activeMission = id;
    saveSession("현재 사건 저장됨");
    renderMissionNav();
    renderCase();
    if (focus) $("#caseStage").focus({ preventScroll: true });
  }

  function toast(message) {
    const element = $("#toast");
    element.textContent = message;
    element.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => element.classList.remove("show"), 2200);
  }

  $("#modeSwitch").addEventListener("click", (event) => {
    const button = event.target.closest("[data-mode]");
    if (!button) return;
    state.mode = button.dataset.mode;
    saveSession("탐구 모드 저장됨");
    renderAll();
  });

  $("#modeDashboard").addEventListener("click", (event) => {
    const button = event.target.closest("[data-team]");
    if (!button) return;
    state.activeTeam = button.dataset.team;
    saveSession("현재 모둠 저장됨");
    renderModes();
  });

  $("#missionNav").addEventListener("click", (event) => {
    const button = event.target.closest("[data-mission]");
    if (button) selectMission(button.dataset.mission, true);
  });

  $("#answerChoices").addEventListener("change", (event) => {
    selections.prediction = event.target.value;
    updateRevealButton();
  });
  $("#assumptionChoices").addEventListener("change", (event) => {
    selections.assumption = event.target.value;
    updateRevealButton();
  });
  $("#revealButton").addEventListener("click", revealEvidence);

  $("#configPanel").addEventListener("change", (event) => {
    if (!event.target.dataset.config) return;
    clearTimeout(configInputTimer);
    updateConfig(event.target);
  });
  $("#configPanel").addEventListener("input", (event) => {
    if (!event.target.dataset.config) return;
    clearTimeout(configInputTimer);
    const target = event.target;
    configInputTimer = setTimeout(() => updateConfig(target), 280);
  });
  $("#configPanel").addEventListener("click", (event) => {
    const button = event.target.closest("[data-reset-config]");
    if (button) resetConfig(button.dataset.resetConfig);
  });

  $$("[data-trials]").forEach((button) => button.addEventListener("click", () => runSimulation(Number(button.dataset.trials))));
  $("#simulationReset").addEventListener("click", () => {
    delete state.simulations[state.activeMission];
    renderSimulation(activeMission(), currentTheory());
    toast("현재 사건의 실험 결과를 초기화했습니다.");
  });
  $("#seedInput").addEventListener("change", () => {
    state.seed = Math.max(1, Math.min(2147483646, Math.round(Number($("#seedInput").value) || 2026)));
    $("#seedInput").value = state.seed;
    saveSession("실험 번호 저장됨");
  });

  $("#nextMissionButton").addEventListener("click", () => {
    const next = MISSIONS.find((mission) => !state.records[mission.id]);
    if (!next) { toast("다섯 사건을 모두 수사했습니다. 기록을 인쇄해 정리해 보세요."); return; }
    selectMission(next.id);
    $("#caseStage").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  $("#resetAllButton").addEventListener("click", () => {
    if (!window.confirm("예상, 점수, 실험 결과와 사용자 설정을 모두 초기화할까요?")) return;
    const mode = state.mode;
    state = Model.createDefaultSession();
    state.mode = mode;
    localStorage.removeItem(STORAGE_KEY);
    saveSession("모든 기록 초기화됨");
    renderAll();
    toast("새 수사 기록을 시작합니다.");
  });

  $("#printButton").addEventListener("click", () => {
    renderRecords();
    window.print();
  });

  const helpDialog = $("#helpDialog");
  $("#helpButton").addEventListener("click", () => helpDialog.showModal());
  $("#closeHelpButton").addEventListener("click", () => helpDialog.close());
  $("#dialogStartButton").addEventListener("click", () => helpDialog.close());
  helpDialog.addEventListener("click", (event) => { if (event.target === helpDialog) helpDialog.close(); });

  window.addEventListener("keydown", (event) => {
    const editing = ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName);
    if (event.altKey && event.key.toLowerCase() === "e") { event.preventDefault(); revealEvidence(); return; }
    if (event.altKey && event.key.toLowerCase() === "s") { event.preventDefault(); runSimulation(1000); return; }
    if (!editing && /^[1-5]$/.test(event.key)) {
      event.preventDefault();
      selectMission(MISSIONS[Number(event.key) - 1].id, true);
    }
  });

  renderAll();
})();
