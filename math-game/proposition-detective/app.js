(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const shuffle = (items) => {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[swap]] = [copy[swap], copy[index]];
    }
    return copy;
  };
  const sample = (items) => items[Math.floor(Math.random() * items.length)];
  const logic = window.PropositionDetectiveLogic;
  const balancedBooleans = (count, trueCount = Math.ceil(count / 2)) => shuffle([...Array(trueCount).fill(true), ...Array(count - trueCount).fill(false)]);
  const repeatToLength = (items, count) => shuffle(Array.from({ length: count }, (_item, index) => items[index % items.length]));

  const names = ["강하루", "고은결", "김도담", "나지우", "류시온", "문해솔", "박여울", "서이안", "윤가람", "이로운", "정다온", "최한별"];
  const shirts = [
    { key: "red", label: "빨간 옷", color: "#c94a3b" },
    { key: "blue", label: "파란 옷", color: "#3c718e" },
    { key: "yellow", label: "노란 옷", color: "#d6a635" },
    { key: "green", label: "초록 옷", color: "#40745c" }
  ];
  const hairs = [
    { key: "black", label: "검은 머리", color: "#282a28" },
    { key: "brown", label: "갈색 머리", color: "#704a35" },
    { key: "light", label: "밝은 머리", color: "#c39456" }
  ];
  const shoes = [
    { key: "sneakers", label: "운동화", color: "#f4f0e5" },
    { key: "boots", label: "부츠", color: "#51372e" },
    { key: "loafers", label: "구두", color: "#1f2d30" }
  ];
  const photoBackgrounds = ["#dbe4dc", "#e7dcca", "#d8e1e8", "#ead8d3"];
  const accentColors = ["#c94a3b", "#326d88", "#d2a12e", "#39715b"];
  const roleLabels = { truth: "진실을 말함", lie: "반대로 말함", free: "마음대로 말함" };

  const templates = [
    { key: "allC", label: "범인은 모두 P이다", fields: ["a"], text: (a) => `범인은 모두 ${a.phrase}이다.`, evaluate: (people, a) => logic.evaluateProposition("allC", people, a.test) },
    { key: "pAreC", label: "P인 사람은 범인이다", fields: ["a"], text: (a) => `${a.subject} 사람은 모두 범인이다.`, evaluate: (people, a) => logic.evaluateProposition("pAreC", people, a.test) },
    { key: "somePC", label: "P인 사람 중 범인이 있다", fields: ["a"], text: (a) => `${a.subject} 사람 중에 범인이 있다.`, evaluate: (people, a) => logic.evaluateProposition("somePC", people, a.test) },
    { key: "countC", label: "범인은 n명이다", fields: ["n"], text: (_a, _b, n) => `범인은 ${n}명이다.`, evaluate: (people, _a, _b, n) => logic.evaluateProposition("countC", people, null, null, n) },
    { key: "ifThen", label: "P이면 Q이다", fields: ["a", "b"], text: (a, b) => `${a.subject} 사람이면 ${b.phrase}이다.`, evaluate: (people, a, b) => logic.evaluateProposition("ifThen", people, a.test, b.test) },
    { key: "allCor", label: "범인은 모두 P 또는 Q이다", fields: ["a", "b"], text: (a, b) => `범인은 모두 ${a.phrase}이거나 ${b.phrase}이다.`, evaluate: (people, a, b) => logic.evaluateProposition("allCor", people, a.test, b.test) },
    { key: "someCand", label: "P이면서 Q인 범인이 있다", fields: ["a", "b"], text: (a, b) => `${a.phrase}이면서 ${b.phrase}인 범인이 있다.`, evaluate: (people, a, b) => logic.evaluateProposition("someCand", people, a.test, b.test) },
    { key: "exactP", label: "P인 사람은 n명이다", fields: ["a", "n"], text: (a, _b, n) => `${a.subject} 사람은 ${n}명이다.`, evaluate: (people, a, _b, n) => logic.evaluateProposition("exactP", people, a.test, null, n) }
  ];

  const defaultTeams = ["1조", "2조", "3조", "4조", "5조", "6조"];
  const storedTeams = (() => {
    try {
      const parsed = JSON.parse(localStorage.getItem("proposition-detective-teams"));
      return Array.isArray(parsed) && parsed.length >= 2 ? parsed.slice(0, 10) : defaultTeams;
    } catch (_error) { return defaultTeams; }
  })();

  const state = {
    mode: "detective",
    people: [],
    properties: [],
    teams: storedTeams,
    activeTeam: 0,
    scores: {},
    logs: [],
    asked: new Set(),
    cycle: 1,
    respondent: null,
    guess: new Set(),
    practiceRound: 1,
    practice: null,
    practiceAnswered: false,
    conditionSelection: new Set(),
    personCount: 4,
    roleCounts: { truth: 2, lie: 1, free: 1 }
  };

  function saveTeams() {
    localStorage.setItem("proposition-detective-teams", JSON.stringify(state.teams));
  }

  function buildPeople() {
    const count = state.personCount;
    const chosenNames = shuffle(names).slice(0, count);
    const glassesPattern = balancedBooleans(count);
    const hatPattern = balancedBooleans(count, Math.floor(count / 2));
    const scarfPattern = balancedBooleans(count, Math.max(1, Math.floor(count / 3)));
    const bagPattern = balancedBooleans(count, Math.ceil(count / 2));
    const heights = repeatToLength(["tall", "short"], count);
    const shirtOrder = repeatToLength(shirts, count);
    const hairOrder = repeatToLength([hairs[0], hairs[0], hairs[1], hairs[2]], count);
    const shoeOrder = repeatToLength([shoes[0], shoes[0], shoes[1], shoes[2]], count);
    const { truth: truthCount, lie: lieCount, free: freeCount } = logic.distributeRoles(count);
    state.roleCounts = { truth: truthCount, lie: lieCount, free: freeCount };
    const roles = shuffle([...Array(truthCount).fill("truth"), ...Array(lieCount).fill("lie"), ...Array(freeCount).fill("free")]);
    const culpritCount = Math.floor(Math.random() * (count + 1));
    const culpritIndices = new Set(shuffle(Array.from({ length: count }, (_item, index) => index)).slice(0, culpritCount));

    state.people = chosenNames.map((name, index) => ({
      id: index,
      name,
      glasses: glassesPattern[index],
      hat: hatPattern[index],
      scarf: scarfPattern[index],
      bag: bagPattern[index],
      height: heights[index],
      shirt: shirtOrder[index],
      hair: hairOrder[index],
      shoes: shoeOrder[index],
      role: roles[index],
      culprit: culpritIndices.has(index),
      photoBg: photoBackgrounds[index % photoBackgrounds.length],
      accent: accentColors[index % accentColors.length]
    }));
    buildProperties();
  }

  function buildProperties() {
    const basic = [
      ["glasses", "안경을 쓴", "안경을 쓰고 있다", (p) => p.glasses],
      ["no-glasses", "안경을 쓰지 않은", "안경을 쓰지 않았다", (p) => !p.glasses],
      ["hat", "모자를 쓴", "모자를 쓰고 있다", (p) => p.hat],
      ["no-hat", "모자를 쓰지 않은", "모자를 쓰지 않았다", (p) => !p.hat],
      ["scarf", "목도리를 한", "목도리를 하고 있다", (p) => p.scarf],
      ["bag", "가방을 든", "가방을 들고 있다", (p) => p.bag],
      ["tall", "키가 큰", "키가 크다", (p) => p.height === "tall"],
      ["short", "키가 작은", "키가 작다", (p) => p.height === "short"]
    ];
    const dynamic = [
      ...shirts.map((item) => [`shirt-${item.key}`, `${item.label}을 입은`, `${item.label}을 입고 있다`, (p) => p.shirt.key === item.key]),
      ...hairs.map((item) => [`hair-${item.key}`, `${item.label}인`, `${item.label}이다`, (p) => p.hair.key === item.key]),
      ...shoes.map((item) => [`shoes-${item.key}`, `${item.label}를 신은`, `${item.label}를 신고 있다`, (p) => p.shoes.key === item.key])
    ];
    state.properties = [...basic, ...dynamic].map(([key, subject, phrase, test]) => ({ key, subject, phrase, test }));
  }

  function avatarMarkup(person) {
    return `<div class="height-lines" aria-hidden="true"></div>
      <div class="avatar" aria-hidden="true" style="--shirt:${person.shirt.color};--hair:${person.hair.color};--shoe:${person.shoes.color};--hat:${person.accent};--scarf:${person.accent};--bag:${person.accent};--avatar-scale:${person.height === "short" ? ".91" : "1"}">
        <i class="hair"></i><i class="face"></i><i class="mouth"></i><i class="body"></i><i class="legs"></i><i class="shoes"></i>
        ${person.glasses ? '<i class="glasses"></i>' : ""}${person.hat ? '<i class="hat"></i>' : ""}${person.scarf ? '<i class="scarf"></i>' : ""}${person.bag ? '<i class="bag"></i>' : ""}
      </div>`;
  }

  function featureMarkup(person) {
    const features = [person.glasses ? "안경" : "안경 없음", person.hat ? "모자" : "모자 없음", person.scarf ? "목도리" : null, person.bag ? "가방" : null, person.shirt.label, person.shoes.label, person.height === "tall" ? "큰 키" : "작은 키"];
    return features.filter(Boolean).map((item) => `<span class="feature-chip ${item.includes("없음") ? "absent" : ""}">${item}</span>`).join("");
  }

  function renderPeople() {
    const count = state.people.length;
    const columns = count <= 5 ? count : count === 6 ? 3 : count <= 8 ? 4 : 5;
    $("#suspectGrid").style.setProperty("--suspect-columns", columns);
    $("#suspectTitle").textContent = `가상 용의자 ${count}명`;
    $("#roleSummary").innerHTML = `<b>진실 ${state.roleCounts.truth}명</b> · <b>반대 ${state.roleCounts.lie}명</b> · <b>자유 ${state.roleCounts.free}명</b>`;
    $("#rolePublic").innerHTML = `<span>공개된 역할 수</span><strong><b>진실 ${state.roleCounts.truth}명</b> · <b>반대 ${state.roleCounts.lie}명</b> · <b>자유 ${state.roleCounts.free}명</b></strong>`;
    $("#suspectGrid").innerHTML = state.people.map((person, index) => `
      <article class="suspect-card ${state.asked.has(person.id) && state.mode === "detective" ? "is-asked" : ""}">
        <div class="suspect-photo" style="--photo-bg:${person.photoBg}">${avatarMarkup(person)}</div>
        <div class="suspect-info">
          <div class="suspect-name-row"><div><span class="suspect-index">SUSPECT 0${index + 1}</span><h3 class="suspect-name">${person.name}</h3></div></div>
          <div class="feature-list">${featureMarkup(person)}</div>
        </div>
      </article>`).join("");
  }

  function renderTeams() {
    $("#teamSelect").innerHTML = state.teams.map((team, index) => `<option value="${index}">${escapeHtml(team)}</option>`).join("");
    $("#teamSelect").value = String(Math.min(state.activeTeam, state.teams.length - 1));
    state.teams.forEach((team) => { if (state.scores[team] == null) state.scores[team] = 0; });
    $("#teamScoreboard").innerHTML = state.teams.map((team, index) => `<span class="team-pill ${index === state.activeTeam ? "active" : ""}">${escapeHtml(team)} · ${state.scores[team] || 0}점</span>`).join("");
    updatePracticeScore();
  }

  function renderRespondents() {
    $("#respondentOptions").innerHTML = state.people.map((person) => {
      const unavailable = state.asked.has(person.id);
      return `<button class="respondent-option ${state.respondent === person.id ? "is-selected" : ""}" type="button" data-person="${person.id}" ${unavailable ? "disabled" : ""}>
        <span>${person.name.slice(-2, -1)}</span><div><b>${person.name}</b><small>${unavailable ? "이번 회차 질문 완료" : "질문 가능"}</small></div>
      </button>`;
    }).join("");
    $$(".respondent-option").forEach((button) => button.addEventListener("click", () => {
      state.respondent = Number(button.dataset.person);
      renderRespondents();
    }));
    $("#cycleBadge").innerHTML = `<span>질문 차례</span><strong>${state.cycle}회차 · ${state.asked.size}/${state.people.length}명</strong>`;
  }

  function setupBuilder() {
    $("#templateSelect").innerHTML = templates.map((template) => `<option value="${template.key}">${template.label}</option>`).join("");
    const propertyOptions = state.properties.map((property) => `<option value="${property.key}">${property.phrase}</option>`).join("");
    $("#propertyASelect").innerHTML = propertyOptions;
    $("#propertyBSelect").innerHTML = propertyOptions;
    $("#propertyBSelect").selectedIndex = 2;
    $("#numberSelect").innerHTML = Array.from({ length: state.people.length + 1 }, (_item, number) => `<option value="${number}">${number}명</option>`).join("");
    updateBuilder();
  }

  function getProperty(key) { return state.properties.find((property) => property.key === key) || state.properties[0]; }
  function getTemplate() { return templates.find((template) => template.key === $("#templateSelect").value) || templates[0]; }

  function updateBuilder() {
    const template = getTemplate();
    const hasA = template.fields.includes("a");
    const hasB = template.fields.includes("b");
    const hasN = template.fields.includes("n");
    $("#propertyAField").hidden = !hasA;
    $("#propertyBField").hidden = !hasB;
    $("#numberField").hidden = !hasN;
    const a = getProperty($("#propertyASelect").value);
    const b = getProperty($("#propertyBSelect").value);
    const n = $("#numberSelect").value;
    $("#statementPreview").textContent = template.text(a, b, n);
  }

  function askQuestion() {
    if (state.respondent == null) {
      showToast("먼저 대답할 용의자를 선택하세요.");
      return;
    }
    const person = state.people[state.respondent];
    const template = getTemplate();
    const a = getProperty($("#propertyASelect").value);
    const b = getProperty($("#propertyBSelect").value);
    const n = $("#numberSelect").value;
    const statement = template.text(a, b, n);
    const actual = template.evaluate(state.people, a, b, n);
    const response = logic.answerByRole(person.role, actual);
    const askedCycle = state.cycle;

    state.logs.unshift({ type: "question", team: state.teams[state.activeTeam], person: person.name, statement, response, cycle: askedCycle });
    state.asked.add(person.id);
    $("#answerAvatar").textContent = person.name.slice(-2, -1);
    $("#answerMeta").textContent = `${person.name}의 답 · ${askedCycle}회차`;
    $("#answerValue").textContent = response ? "예, 참입니다." : "아니요, 거짓입니다.";
    $("#answerStatement").textContent = `“${statement}”`;
    $("#answerCard").hidden = false;

    if (state.asked.size === state.people.length) {
      state.asked.clear();
      state.cycle += 1;
      showToast(`${askedCycle}회차 완료! 이제 누구에게나 다시 질문할 수 있습니다.`);
    }
    state.respondent = null;
    renderPeople();
    renderRespondents();
    renderLog();
  }

  function renderLog() {
    const logList = $("#logList");
    if (!state.logs.length) {
      logList.innerHTML = '<div class="empty-state"><span>⌕</span><strong>아직 기록이 없습니다.</strong><p>첫 명제를 질문하면 이곳에 단서가 쌓입니다.</p></div>';
      return;
    }
    logList.innerHTML = state.logs.map((entry, index) => {
      if (entry.type === "guess") {
        return `<article class="log-entry guess"><span class="log-number">${state.logs.length - index}</span><div><strong>${escapeHtml(entry.team)}이(가) 범인 ${entry.count}명을 지목</strong><small>${escapeHtml(entry.names || "아무도 지목하지 않음")} · ${entry.correct ? "정답" : "오답"}</small></div><span class="log-answer">${entry.correct ? "성공" : "실패"}</span></article>`;
      }
      return `<article class="log-entry"><span class="log-number">${state.logs.length - index}</span><div><strong>${escapeHtml(entry.statement)}</strong><small>${escapeHtml(entry.team)} → ${escapeHtml(entry.person)} · ${entry.cycle}회차</small></div><span class="log-answer">${entry.response ? "참" : "거짓"}</span></article>`;
    }).join("");
  }

  function openGuess() {
    state.guess.clear();
    $("#guessTeamName").textContent = state.teams[state.activeTeam];
    renderGuess();
    $("#guessDialog").showModal();
  }

  function renderGuess() {
    $("#guessGrid").innerHTML = state.people.map((person) => `<button class="guess-person ${state.guess.has(person.id) ? "is-selected" : ""}" data-guess="${person.id}" type="button"><b>${person.name}</b><span>${person.shirt.label} · ${person.glasses ? "안경" : "안경 없음"}</span></button>`).join("");
    $("#guessCount").textContent = `${state.guess.size}명`;
    $$("[data-guess]").forEach((button) => button.addEventListener("click", () => {
      const id = Number(button.dataset.guess);
      state.guess.has(id) ? state.guess.delete(id) : state.guess.add(id);
      renderGuess();
    }));
  }

  function submitGuess() {
    const culprits = state.people.filter((person) => person.culprit).map((person) => person.id);
    const correct = logic.sameSelection(culprits, state.guess);
    const guessedNames = state.people.filter((person) => state.guess.has(person.id)).map((person) => person.name).join(", ");
    state.logs.unshift({ type: "guess", team: state.teams[state.activeTeam], count: state.guess.size, names: guessedNames, correct });
    if (correct) state.scores[state.teams[state.activeTeam]] += 3;
    renderTeams();
    renderLog();
    $("#guessDialog").close();
    showResult(correct);
  }

  function showResult(correct) {
    const culprits = state.people.filter((person) => person.culprit);
    $("#resultStamp").textContent = correct ? "✓" : "!";
    $("#resultTitle").textContent = correct ? "추리가 맞았습니다!" : "아직 단서가 더 필요합니다.";
    $("#resultCopy").textContent = correct
      ? `범인은 ${culprits.length ? culprits.map((p) => p.name).join(", ") : "아무도"}였습니다. 답변 역할도 함께 확인해 보세요.`
      : "지목은 수사 기록에 남았습니다. 아래 정답 공개 없이 계속 수사할 수 있습니다.";
    $("#revealGrid").hidden = !correct;
    $("#revealGrid").innerHTML = state.people.map((person) => `<div class="reveal-person ${person.culprit ? "culprit" : ""}"><b>${person.name}</b><span>${person.culprit ? "범인" : "범인 아님"} · ${roleLabels[person.role]}</span></div>`).join("");
    $("#resultNewGameButton").hidden = !correct;
    $("#continueButton").textContent = correct ? "수사 기록 보기" : "계속 수사하기";
    $("#resultDialog").showModal();
  }

  function newCase() {
    state.personCount = Number($("#suspectCountSelect").value) || 4;
    buildPeople();
    state.logs = [];
    state.asked.clear();
    state.cycle = 1;
    state.respondent = null;
    state.practiceRound = 1;
    $("#caseNumber").textContent = `CASE ${String(Math.floor(10 + Math.random() * 90)).padStart(3, "0")}`;
    $("#answerCard").hidden = true;
    renderPeople();
    renderRespondents();
    renderLog();
    setupBuilder();
    if (state.mode !== "detective") newPractice();
    showToast("새 사건이 준비되었습니다. 외형 조건을 먼저 살펴보세요.");
  }

  const modeCopy = {
    detective: { kicker: "MAIN INVESTIGATION", title: "범인을 찾아라", description: "대답할 사람을 먼저 정하고, 정확한 명제로 질문하세요." },
    truth: { kicker: "TRUTH VALUE SPRINT", title: "참·거짓 속보", description: "보이는 외형을 근거로 명제의 진리값을 빠르게 판단하세요." },
    counter: { kicker: "COUNTEREXAMPLE UNIT", title: "반례 수사대", description: "전체명제를 단번에 무너뜨리는 반례를 찾으세요." },
    condition: { kicker: "SET CONDITION LAB", title: "조건 포착", description: "조건을 만족하는 용의자를 빠짐없이 선택하세요." }
  };

  function switchMode(mode) {
    state.mode = mode;
    $$(".mode-tab").forEach((button) => {
      const active = button.dataset.mode === mode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
    });
    const copy = modeCopy[mode];
    $("#modeKicker").textContent = copy.kicker;
    $("#modeTitle").textContent = copy.title;
    $("#modeDescription").textContent = copy.description;
    $("#detectivePanel").hidden = mode !== "detective";
    $("#practicePanel").hidden = mode === "detective";
    $("#cycleBadge").hidden = mode !== "detective";
    $("#rolePublic").hidden = mode !== "detective";
    $("#boardNote").innerHTML = mode === "detective"
      ? '<span aria-hidden="true">●</span> 외형 조건은 모두 공개됩니다. 범인 여부와 답변 역할은 사건이 끝날 때까지 비밀입니다.'
      : '<span aria-hidden="true">●</span> 이 모드에서는 네 사람의 보이는 외형만 근거로 판단합니다.';
    renderPeople();
    if (mode !== "detective") {
      state.practiceRound = 1;
      newPractice();
    }
  }

  function findPropertyPair(requireFalse = false) {
    let a;
    let b;
    let attempts = 0;
    do {
      a = sample(state.properties);
      b = sample(state.properties.filter((item) => item.key !== a.key));
      attempts += 1;
      const counterexamples = state.people.filter((p) => a.test(p) && !b.test(p));
      if (!requireFalse || counterexamples.length) break;
    } while (attempts < 100);
    return { a, b };
  }

  function makeTruthPractice() {
    const { a, b } = findPropertyPair(false);
    const kinds = ["if", "some", "all"];
    const kind = sample(kinds);
    if (kind === "if") return { statement: `${a.subject} 사람이면 ${b.phrase}이다.`, answer: state.people.every((p) => !a.test(p) || b.test(p)), explanation: `조건을 만족하는 사람을 먼저 찾고, 그중 결론을 만족하지 않는 사람이 있는지 확인합니다.` };
    if (kind === "some") return { statement: `${a.phrase}이면서 ${b.phrase}인 사람이 있다.`, answer: state.people.some((p) => a.test(p) && b.test(p)), explanation: `두 조건을 동시에 만족하는 사람이 한 명이라도 있으면 참입니다.` };
    return { statement: `모든 사람은 ${a.phrase}이거나 ${b.phrase}이다.`, answer: state.people.every((p) => a.test(p) || b.test(p)), explanation: `네 사람 모두가 두 조건 중 적어도 하나를 만족하는지 확인합니다.` };
  }

  function makeCounterPractice() {
    const { a, b } = findPropertyPair(true);
    const counters = state.people.filter((p) => a.test(p) && !b.test(p)).map((p) => p.id);
    return { statement: `${a.subject} 사람은 모두 ${b.phrase}이다.`, counters, explanation: `반례는 조건 P를 만족하지만 결론 Q는 만족하지 않는 사람입니다.` };
  }

  function makeConditionPractice() {
    let a = sample(state.properties);
    let b = sample(state.properties.filter((item) => item.key !== a.key));
    const operator = sample(["and", "or", "not"]);
    const matches = state.people.filter((person) => operator === "and" ? a.test(person) && b.test(person) : operator === "or" ? a.test(person) || b.test(person) : a.test(person) && !b.test(person)).map((p) => p.id);
    const statement = operator === "and" ? `${a.phrase}이면서 ${b.phrase}인 사람` : operator === "or" ? `${a.phrase}이거나 ${b.phrase}인 사람` : `${a.phrase}이지만 ${b.phrase}은 아닌 사람`;
    return { statement, matches, explanation: operator === "and" ? "‘이면서’는 두 조건을 모두 만족해야 합니다." : operator === "or" ? "‘이거나’는 두 조건 중 하나 이상을 만족하면 됩니다." : "첫 조건은 만족하고, 두 번째 조건은 만족하지 않아야 합니다." };
  }

  function newPractice() {
    state.practiceAnswered = false;
    state.conditionSelection.clear();
    $("#practiceRound").textContent = `문제 ${state.practiceRound}`;
    $("#practiceFeedback").hidden = true;
    $("#nextPracticeButton").hidden = true;
    if (state.mode === "truth") {
      state.practice = makeTruthPractice();
      $("#practiceType").textContent = "TRUTH OR FALSE";
      $("#practicePrompt").textContent = "이 명제는 참일까요, 거짓일까요?";
      $("#practiceHelp").textContent = "네 사람의 외형을 관찰하고 진리값을 선택하세요.";
      $("#practiceChoices").innerHTML = '<button class="practice-choice" data-truth="true" type="button">참이다</button><button class="practice-choice" data-truth="false" type="button">거짓이다</button>';
      $$("[data-truth]").forEach((button) => button.addEventListener("click", () => answerTruth(button.dataset.truth === "true")));
      setConcept("명제의 진리값", "명제는 참 또는 거짓을 분명하게 판단할 수 있는 문장입니다.", "참(T) / 거짓(F)");
    } else if (state.mode === "counter") {
      state.practice = makeCounterPractice();
      $("#practiceType").textContent = "FIND A COUNTEREXAMPLE";
      $("#practicePrompt").textContent = "이 전체명제의 반례는 누구일까요?";
      $("#practiceHelp").textContent = "명제를 거짓으로 만드는 사람 한 명을 선택하세요.";
      $("#practiceChoices").innerHTML = state.people.map((p) => `<button class="practice-choice person-choice" data-counter="${p.id}" type="button">${p.name}<small>${p.shirt.label} · ${p.glasses ? "안경" : "안경 없음"}</small></button>`).join("");
      $$("[data-counter]").forEach((button) => button.addEventListener("click", () => answerCounter(Number(button.dataset.counter))));
      setConcept("반례", "‘모든 P는 Q이다’를 거짓으로 만들려면 P이지만 Q가 아닌 대상을 단 하나만 찾으면 됩니다.", "P ∧ not Q");
    } else {
      state.practice = makeConditionPractice();
      $("#practiceType").textContent = "CAPTURE THE SET";
      $("#practicePrompt").textContent = "조건을 만족하는 사람을 모두 선택하세요.";
      $("#practiceHelp").textContent = "0명일 수도 있습니다. 선택을 마치면 확인을 누르세요.";
      renderConditionChoices();
      setConcept("조건과 집합", "조건을 만족하는 사람만 모으면 하나의 집합이 됩니다. ‘그리고’는 교집합, ‘또는’은 합집합으로 생각할 수 있습니다.", "P ∩ Q  /  P ∪ Q");
    }
    $("#practiceStatement").textContent = state.practice.statement;
    updatePracticeScore();
  }

  function renderConditionChoices() {
    $("#practiceChoices").innerHTML = `${state.people.map((p) => `<button class="practice-choice person-choice ${state.conditionSelection.has(p.id) ? "selected" : ""}" data-condition="${p.id}" type="button">${p.name}<small>${p.shirt.label} · ${p.hat ? "모자" : "모자 없음"}</small></button>`).join("")}<button class="button dark large" id="submitConditionButton" type="button">선택 완료</button>`;
    $$("[data-condition]").forEach((button) => button.addEventListener("click", () => {
      const id = Number(button.dataset.condition);
      state.conditionSelection.has(id) ? state.conditionSelection.delete(id) : state.conditionSelection.add(id);
      renderConditionChoices();
    }));
    $("#submitConditionButton").addEventListener("click", answerCondition);
  }

  function answerTruth(value) {
    if (state.practiceAnswered) return;
    finishPractice(value === state.practice.answer, state.practice.explanation + ` 실제 진리값은 ${state.practice.answer ? "참" : "거짓"}입니다.`);
  }

  function answerCounter(id) {
    if (state.practiceAnswered) return;
    const correct = state.practice.counters.includes(id);
    const counterNames = state.people.filter((p) => state.practice.counters.includes(p.id)).map((p) => p.name).join(", ");
    finishPractice(correct, `${state.practice.explanation} 가능한 반례: ${counterNames}`);
  }

  function answerCondition() {
    if (state.practiceAnswered) return;
    const matches = state.practice.matches;
    const correct = logic.sameSelection(matches, state.conditionSelection);
    const names = state.people.filter((p) => matches.includes(p.id)).map((p) => p.name).join(", ") || "아무도 없음";
    finishPractice(correct, `${state.practice.explanation} 정답: ${names}`);
  }

  function finishPractice(correct, explanation) {
    state.practiceAnswered = true;
    if (correct) state.scores[state.teams[state.activeTeam]] += 1;
    const feedback = $("#practiceFeedback");
    feedback.hidden = false;
    feedback.classList.toggle("is-wrong", !correct);
    feedback.innerHTML = `<strong>${correct ? "정답입니다! +1점" : "아쉽지만 다시 근거를 확인해 보세요."}</strong><br>${escapeHtml(explanation)}`;
    $("#nextPracticeButton").hidden = false;
    $$(".practice-choice").forEach((button) => { button.disabled = true; });
    renderTeams();
  }

  function setConcept(title, copy, formula) {
    $("#conceptTitle").textContent = title;
    $("#conceptBody").innerHTML = `<p>${copy}</p><div class="formula">${formula}</div><p><strong>수사 요령</strong><br>조건을 만족하는 사람부터 표시하면 문장의 구조가 선명해집니다.</p>`;
  }

  function updatePracticeScore() {
    if (!$("#practiceScore")) return;
    const team = state.teams[state.activeTeam] || state.teams[0];
    $("#practiceScore").textContent = `${team} · ${state.scores[team] || 0}점`;
  }

  function openTeamEditor() {
    $("#teamEditor").innerHTML = state.teams.map((team, index) => `<div class="team-editor-row"><span>${String(index + 1).padStart(2, "0")}</span><input type="text" maxlength="16" value="${escapeHtml(team)}" aria-label="${index + 1}번째 모둠 이름"><button type="button" data-remove-team="${index}" aria-label="이 모둠 삭제">×</button></div>`).join("");
    $$('[data-remove-team]').forEach((button) => button.addEventListener("click", () => {
      if ($$(".team-editor-row").length <= 2) return showToast("모둠은 최소 2개가 필요합니다.");
      button.closest(".team-editor-row").remove();
      renumberTeamEditor();
    }));
    $("#teamsDialog").showModal();
  }

  function renumberTeamEditor() { $$(".team-editor-row").forEach((row, index) => { $("span", row).textContent = String(index + 1).padStart(2, "0"); }); }

  function addTeamEditorRow() {
    const count = $$(".team-editor-row").length;
    if (count >= 10) return showToast("모둠은 최대 10개까지 만들 수 있습니다.");
    const row = document.createElement("div");
    row.className = "team-editor-row";
    row.innerHTML = `<span>${String(count + 1).padStart(2, "0")}</span><input type="text" maxlength="16" value="${count + 1}조" aria-label="${count + 1}번째 모둠 이름"><button type="button" aria-label="이 모둠 삭제">×</button>`;
    $("button", row).addEventListener("click", () => { row.remove(); renumberTeamEditor(); });
    $("#teamEditor").append(row);
  }

  function commitTeams() {
    const nextTeams = $$("#teamEditor input").map((input, index) => input.value.trim() || `${index + 1}조`);
    if (new Set(nextTeams).size !== nextTeams.length) return showToast("모둠 이름은 서로 다르게 적어주세요.");
    const previousScores = { ...state.scores };
    state.teams = nextTeams;
    state.scores = Object.fromEntries(nextTeams.map((team) => [team, previousScores[team] || 0]));
    state.activeTeam = Math.min(state.activeTeam, nextTeams.length - 1);
    saveTeams();
    renderTeams();
    $("#teamsDialog").close();
  }

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("is-visible"), 2700);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]);
  }

  function bindEvents() {
    $$(".mode-tab").forEach((button) => button.addEventListener("click", () => switchMode(button.dataset.mode)));
    $("#teamSelect").addEventListener("change", (event) => { state.activeTeam = Number(event.target.value); renderTeams(); });
    $("#suspectCountSelect").addEventListener("change", () => showToast("‘새 사건 시작’을 누르면 선택한 인원으로 바뀝니다."));
    ["templateSelect", "propertyASelect", "propertyBSelect", "numberSelect"].forEach((id) => $("#" + id).addEventListener("change", updateBuilder));
    $("#askButton").addEventListener("click", askQuestion);
    $("#guessButton").addEventListener("click", openGuess);
    $("#submitGuessButton").addEventListener("click", submitGuess);
    $("#clearLogButton").addEventListener("click", () => { state.logs = []; renderLog(); showToast("수사 기록을 지웠습니다."); });
    $("#newGameButton").addEventListener("click", newCase);
    $("#resultNewGameButton").addEventListener("click", () => { $("#resultDialog").close(); newCase(); });
    $("#continueButton").addEventListener("click", () => $("#resultDialog").close());
    $("#nextPracticeButton").addEventListener("click", () => { state.practiceRound += 1; newPractice(); });
    $("#guideButton").addEventListener("click", () => $("#guideDialog").showModal());
    $("#editTeamsButton").addEventListener("click", openTeamEditor);
    $("#addTeamButton").addEventListener("click", addTeamEditorRow);
    $("#saveTeamsButton").addEventListener("click", commitTeams);
    $$('[data-close]').forEach((button) => button.addEventListener("click", () => $("#" + button.dataset.close).close()));
    $("#fullscreenButton").addEventListener("click", async () => {
      try {
        if (!document.fullscreenElement) await document.documentElement.requestFullscreen(); else await document.exitFullscreen();
      } catch (_error) { showToast("이 브라우저에서는 전체 화면을 사용할 수 없습니다."); }
    });
    $$('dialog').forEach((dialog) => dialog.addEventListener("click", (event) => {
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    }));
  }

  buildPeople();
  bindEvents();
  renderPeople();
  renderTeams();
  renderRespondents();
  renderLog();
  setupBuilder();
})();
