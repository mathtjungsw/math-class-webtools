const ASSETS = [
  { id: "krStock", name: "국내 주식", short: "국내주식", icon: "KR", color: "#0f6b55", expected: 8.5, risk: 22, note: "높은 변동성 · 성장" },
  { id: "globalStock", name: "글로벌 주식", short: "글로벌", icon: "GL", color: "#4d7fe8", expected: 9.2, risk: 19, note: "지역 분산 · 성장" },
  { id: "bond", name: "채권", short: "채권", icon: "BD", color: "#8567d6", expected: 3.8, risk: 7, note: "이자 수익 · 방어" },
  { id: "cash", name: "현금", short: "현금", icon: "₩", color: "#f6c953", expected: 2.5, risk: 1, note: "낮은 위험 · 유동성" },
  { id: "gold", name: "금", short: "금", icon: "AU", color: "#ff7757", expected: 5.2, risk: 16, note: "위기 방어 · 대체자산" }
];

const CORRELATIONS = [
  [1, .72, -.12, .05, .08],
  [.72, 1, -.08, .04, .12],
  [-.12, -.08, 1, .34, .18],
  [.05, .04, .34, 1, .03],
  [.08, .12, .18, .03, 1]
];

const PRESETS = {
  stable: [10, 10, 40, 30, 10],
  balanced: [25, 25, 25, 15, 10],
  growth: [35, 40, 10, 5, 10]
};

const SCENARIOS = [
  {
    id: "asia97", year: "1997", title: "아시아 외환위기", mark: "₩", tags: ["환율 급등", "유동성 위기"],
    blurb: "통화 가치와 주가가 흔들릴 때 현금·채권·금의 역할을 살펴봅니다.",
    description: "태국에서 시작된 외환 불안이 한국을 포함한 아시아로 확산된 흐름을 6개 국면으로 단순화했습니다.",
    mission: "생존 자금을 확보하라", missionText: "최대 낙폭을 관찰하고, 손실이 커질 때 선택한 행동의 근거를 남기세요.",
    events: [
      { label: "7월", title: "태국 바트화 위기", text: "외환 불안이 주변 국가로 번지기 시작합니다.", r: [-9, -5, 2, .5, 5] },
      { label: "10월", title: "아시아 증시 급락", text: "투자 심리가 얼어붙고 위험자산 매도가 확대됩니다.", r: [-18, -8, 3, .5, 7] },
      { label: "12월", title: "한국 IMF 구제금융", text: "환율과 금리가 크게 움직이며 기업의 자금 조달 부담이 커집니다.", r: [-14, -5, -2, .5, 4] },
      { label: "1998.초", title: "긴축과 구조조정", text: "실물경제가 위축되지만 시장은 새 균형을 찾기 시작합니다.", r: [-7, 2, 4, .6, -2] },
      { label: "1998.중", title: "외환시장 안정", text: "불안이 조금씩 진정되며 위험자산에 매수세가 돌아옵니다.", r: [16, 7, 3, .6, -4] },
      { label: "1999", title: "회복 국면", text: "수출과 금융시장이 회복되며 주가가 반등합니다.", r: [24, 11, 2, .6, 1] }
    ]
  },
  {
    id: "dotcom00", year: "2000", title: "닷컴 버블 붕괴", mark: ".COM", tags: ["기술주 과열", "버블 붕괴"],
    blurb: "좋은 이야기와 지나치게 높은 가격이 만날 때 어떤 위험이 생기는지 탐구합니다.",
    description: "인터넷 기업에 대한 낙관이 정점을 찍은 뒤 기술주 중심의 하락이 이어진 과정을 모의합니다.",
    mission: "유행과 가치를 구분하라", missionText: "급등한 자산을 계속 보유할 때 집중 위험이 어떻게 커지는지 확인하세요.",
    events: [
      { label: "1999", title: "인터넷 열풍", text: "성장 기대가 기술주 가격을 빠르게 끌어올립니다.", r: [12, 18, -1, .7, -2] },
      { label: "2000.3", title: "나스닥 정점", text: "높은 기대 속에서 기업 가치에 대한 의문이 생깁니다.", r: [5, 6, 1, .7, 1] },
      { label: "2000.하", title: "버블 붕괴", text: "기술주를 중심으로 매도가 쏟아집니다.", r: [-14, -22, 5, .7, 3] },
      { label: "2001", title: "경기 둔화", text: "기업 투자가 줄고 수익성 없는 기업이 시장에서 퇴장합니다.", r: [-11, -18, 6, .7, 2] },
      { label: "2002", title: "신뢰 위축", text: "회계 문제와 경기 불안이 투자 심리를 누릅니다.", r: [-8, -12, 4, .7, 4] },
      { label: "2003", title: "완만한 회복", text: "살아남은 기업을 중심으로 시장이 회복을 시도합니다.", r: [15, 16, 1, .7, -2] }
    ]
  },
  {
    id: "gfc08", year: "2008", title: "글로벌 금융위기", mark: "↓", tags: ["신용 경색", "시스템 위기"],
    blurb: "주택시장 부실이 금융 시스템 전체로 퍼질 때 분산투자의 한계를 경험합니다.",
    description: "미국 주택시장 부실과 리먼브라더스 파산 전후의 글로벌 금융 충격을 6개 국면으로 재구성했습니다.",
    mission: "공포 속 원칙을 지켜라", missionText: "손실 회피 심리가 가장 강할 때 계획과 다른 행동을 하는지 관찰하세요.",
    events: [
      { label: "2007", title: "서브프라임 경고", text: "주택대출 부실이 늘며 금융시장에 첫 균열이 생깁니다.", r: [-4, -3, 3, .6, 5] },
      { label: "2008.상", title: "금융사 불안 확산", text: "신용 경색 우려로 주식시장의 변동성이 커집니다.", r: [-10, -9, 4, .6, 6] },
      { label: "9월", title: "리먼브라더스 파산", text: "글로벌 금융시장이 극심한 공포에 빠집니다.", r: [-24, -21, 6, .6, 4] },
      { label: "2008.말", title: "실물경제 침체", text: "기업 실적과 고용이 악화되고 현금 선호가 커집니다.", r: [-12, -11, 3, .6, 2] },
      { label: "2009.초", title: "대규모 정책 대응", text: "금리 인하와 유동성 공급이 금융시장을 지지합니다.", r: [8, 7, 2, .6, -3] },
      { label: "2009.하", title: "위험자산 반등", text: "공포가 완화되며 주식시장이 빠르게 회복합니다.", r: [24, 20, -1, .6, -4] }
    ]
  },
  {
    id: "covid20", year: "2020", title: "코로나19 시장 충격", mark: "V", tags: ["팬데믹", "급락과 반등"],
    blurb: "빠른 급락과 빠른 반등에서 시장 타이밍을 맞히기 어려운 이유를 확인합니다.",
    description: "세계적 감염 확산과 경제 봉쇄, 전례 없는 정책 대응, 비대면 산업 반등을 짧은 국면으로 압축했습니다.",
    mission: "V자 반등을 놓치지 마라", missionText: "급락 직후 위험자산을 모두 팔았을 때 회복 과정이 어떻게 달라지는지 살펴보세요.",
    events: [
      { label: "1월", title: "감염병 확산 조짐", text: "시장에 불확실성이 커지지만 영향의 크기는 아직 분명하지 않습니다.", r: [-3, -2, 2, .3, 3] },
      { label: "3월", title: "세계 증시 급락", text: "봉쇄와 경기 중단 우려로 위험자산이 빠르게 하락합니다.", r: [-23, -20, 5, .3, -2] },
      { label: "4월", title: "정책 대응", text: "정부와 중앙은행의 대규모 지원이 시장 불안을 낮춥니다.", r: [11, 13, 2, .3, 4] },
      { label: "여름", title: "비대면 경제 성장", text: "기술기업과 성장주를 중심으로 반등이 이어집니다.", r: [9, 16, -1, .3, 6] },
      { label: "11월", title: "백신 기대", text: "경제 정상화 기대가 경기민감 자산으로 퍼집니다.", r: [14, 10, -2, .3, -4] },
      { label: "2021", title: "회복과 과열 논쟁", text: "경제 활동이 회복되지만 자산 가격 과열 우려도 커집니다.", r: [10, 12, -3, .3, -2] }
    ]
  },
  {
    id: "rates22", year: "2022", title: "인플레이션·금리 충격", mark: "↑", tags: ["물가 급등", "주식·채권 동반 하락"],
    blurb: "주식과 채권이 함께 하락할 때 전통적 분산 전략이 받는 압박을 살펴봅니다.",
    description: "높은 인플레이션과 빠른 기준금리 인상이 주식·채권 가격을 동시에 압박한 환경을 모의합니다.",
    mission: "상관관계 변화를 찾아라", missionText: "평소와 달리 주식과 채권이 함께 하락할 때 어떤 자산이 완충 역할을 하는지 찾으세요.",
    events: [
      { label: "2021.말", title: "물가 압력 확대", text: "공급망 혼란과 수요 회복으로 물가가 빠르게 오릅니다.", r: [-2, -3, -3, .3, 6] },
      { label: "2022.3", title: "금리 인상 시작", text: "할인율 상승이 성장주와 장기채 가격을 압박합니다.", r: [-7, -10, -7, .5, 5] },
      { label: "6월", title: "긴축 가속", text: "예상보다 높은 물가에 공격적인 금리 인상이 이어집니다.", r: [-11, -12, -8, .7, -3] },
      { label: "9월", title: "강달러와 변동성", text: "글로벌 자금 흐름이 흔들리고 위험 회피가 강해집니다.", r: [-7, -8, -5, .9, -2] },
      { label: "연말", title: "물가 둔화 기대", text: "긴축 속도 조절 기대가 일부 자산을 지지합니다.", r: [4, 5, 2, 1, 1] },
      { label: "2023.초", title: "연착륙 기대", text: "경기 침체를 피할 수 있다는 기대가 시장에 퍼집니다.", r: [8, 9, 4, 1, 2] }
    ]
  },
  {
    id: "ai23", year: "2023", title: "AI 기대와 시장 반등", mark: "AI", tags: ["기술 혁신", "쏠림 현상"],
    blurb: "새로운 기술에 대한 기대가 커질 때 성장 기회와 집중 위험을 함께 평가합니다.",
    description: "생성형 AI 확산과 대형 기술주 중심의 상승, 뒤늦은 시장 확산을 학습용 국면으로 구성했습니다.",
    mission: "FOMO를 통제하라", missionText: "오르는 자산을 뒤늦게 더 사는 행동과 목표 비중을 지키는 행동을 비교하세요.",
    events: [
      { label: "2023.초", title: "AI 관심 급증", text: "생성형 AI가 대중화되며 관련 기업에 관심이 쏠립니다.", r: [5, 9, 2, 1, 1] },
      { label: "봄", title: "대형 기술주 강세", text: "일부 대형 기업이 시장 수익의 큰 부분을 이끕니다.", r: [3, 12, -1, 1, -2] },
      { label: "여름", title: "밸류에이션 논쟁", text: "성장 가능성과 지나친 가격 상승을 둘러싼 논쟁이 커집니다.", r: [-2, 5, -2, 1, 1] },
      { label: "가을", title: "금리 부담 재등장", text: "높은 금리가 오래갈 수 있다는 우려가 성장주를 흔듭니다.", r: [-6, -7, -3, 1, 3] },
      { label: "연말", title: "금리 전환 기대", text: "금리 인하 기대가 위험자산 전반으로 확산됩니다.", r: [9, 11, 4, 1, 1] },
      { label: "2024.초", title: "상승 확산과 쏠림 공존", text: "시장 회복이 이어지지만 일부 종목 의존도는 여전히 높습니다.", r: [7, 10, 1, 1, 2] }
    ]
  }
];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const formatPct = (value, digits = 1) => `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`;
const formatMoney = (value) => `${Math.round(value).toLocaleString("ko-KR")}만원`;

const state = {
  weights: [...PRESETS.balanced],
  profile: "balanced",
  scenarioId: "gfc08",
  period: -1,
  balances: [],
  history: [],
  periodReturns: [],
  decisions: [],
  running: false,
  result: null
};

function portfolioMetrics(weights = state.weights) {
  const w = weights.map((n) => n / 100);
  const expected = w.reduce((sum, weight, index) => sum + weight * ASSETS[index].expected, 0);
  let variance = 0;
  for (let i = 0; i < ASSETS.length; i += 1) {
    for (let j = 0; j < ASSETS.length; j += 1) {
      variance += w[i] * w[j] * (ASSETS[i].risk / 100) * (ASSETS[j].risk / 100) * CORRELATIONS[i][j];
    }
  }
  const risk = Math.sqrt(Math.max(0, variance)) * 100;
  const hhi = w.reduce((sum, value) => sum + value ** 2, 0);
  let weightedCorr = 0;
  let pairWeight = 0;
  for (let i = 0; i < ASSETS.length; i += 1) {
    for (let j = i + 1; j < ASSETS.length; j += 1) {
      weightedCorr += w[i] * w[j] * CORRELATIONS[i][j];
      pairWeight += w[i] * w[j];
    }
  }
  const avgCorr = pairWeight ? weightedCorr / pairWeight : 1;
  const active = weights.filter((v) => v >= 5).length;
  const diversification = Math.round(clamp(45 + active * 7 + (1 - hhi) * 35 - Math.max(0, avgCorr) * 15, 0, 100));
  return { expected, risk, diversification, sharpe: risk ? (expected - 2.5) / risk : 0 };
}

function renderAssetControls() {
  const container = $("[data-asset-controls]");
  container.innerHTML = ASSETS.map((asset, index) => `
    <div class="asset-row" style="--asset-color:${asset.color}">
      <div class="asset-name">
        <span class="asset-icon" style="background:${asset.color}">${asset.icon}</span>
        <div><b>${asset.name}</b><small>${asset.note}</small></div>
      </div>
      <div class="range-wrap">
        <input type="range" min="0" max="100" step="1" value="${state.weights[index]}" data-asset-range="${index}" aria-label="${asset.name} 비중" />
        <div class="range-track-labels"><span>0</span><span>50</span><span>100</span></div>
      </div>
      <label class="weight-input"><input type="number" min="0" max="100" value="${state.weights[index]}" data-asset-number="${index}" aria-label="${asset.name} 비중 직접 입력" /><span>%</span></label>
    </div>
  `).join("");

  $$("[data-asset-range]").forEach((input) => input.addEventListener("input", () => setWeight(Number(input.dataset.assetRange), Number(input.value))));
  $$("[data-asset-number]").forEach((input) => input.addEventListener("change", () => setWeight(Number(input.dataset.assetNumber), clamp(Number(input.value) || 0, 0, 100))));
}

function setWeight(changedIndex, requested) {
  const next = [...state.weights];
  const target = Math.round(clamp(requested, 0, 100));
  const remaining = 100 - target;
  const otherIndexes = next.map((_, index) => index).filter((index) => index !== changedIndex);
  const oldOtherTotal = otherIndexes.reduce((sum, index) => sum + next[index], 0);
  const raw = otherIndexes.map((index) => oldOtherTotal > 0 ? next[index] / oldOtherTotal * remaining : remaining / otherIndexes.length);
  const floors = raw.map(Math.floor);
  let leftover = remaining - floors.reduce((sum, n) => sum + n, 0);
  raw.map((value, position) => ({ position, fraction: value - floors[position] }))
    .sort((a, b) => b.fraction - a.fraction)
    .forEach(({ position }) => { if (leftover > 0) { floors[position] += 1; leftover -= 1; } });
  next[changedIndex] = target;
  otherIndexes.forEach((index, position) => { next[index] = floors[position]; });
  state.weights = next;
  syncAllocationUI();
}

function syncAllocationUI() {
  ASSETS.forEach((_, index) => {
    const range = $(`[data-asset-range="${index}"]`);
    const number = $(`[data-asset-number="${index}"]`);
    if (range) range.value = state.weights[index];
    if (number) number.value = state.weights[index];
  });
  $("[data-total-weight]").textContent = `${state.weights.reduce((a, b) => a + b, 0)}%`;
  const metrics = portfolioMetrics();
  $("[data-expected-return]").textContent = formatPct(metrics.expected);
  $("[data-expected-risk]").textContent = `${metrics.risk.toFixed(1)}%`;
  $("[data-diversification]").textContent = `${metrics.diversification}점`;
  $("[data-sharpe]").textContent = metrics.sharpe.toFixed(2);
  $("[data-hero-return]").textContent = `${metrics.expected.toFixed(1)}%`;
  $("[data-hero-risk]").textContent = `${metrics.risk.toFixed(1)}%`;
  $("[data-weight-proof]").textContent = (state.weights.reduce((a, b) => a + b, 0) / 100).toFixed(2);
  $("[data-formula-live]").innerHTML = ASSETS.map((asset, index) =>
    `${(state.weights[index] / 100).toFixed(2)} × ${asset.expected.toFixed(1)}%`
  ).join(" + ") + ` = <b>${metrics.expected.toFixed(2)}%</b>`;
  renderDonuts();
  renderCoach(metrics);
  renderFrontier(false);
  updateReportPreview();
}

function renderDonuts() {
  let cursor = 0;
  const stops = state.weights.map((weight, index) => {
    const start = cursor;
    cursor += weight;
    return `${ASSETS[index].color} ${start}% ${cursor}%`;
  }).join(",");
  const gradient = `conic-gradient(${stops})`;
  $("[data-donut]").style.background = gradient;
  $("[data-preview-donut]").style.background = gradient;
  $("[data-donut-legend]").innerHTML = ASSETS.map((asset, index) =>
    `<div><i style="background:${asset.color}"></i><span>${asset.name}</span><b>${state.weights[index]}%</b></div>`
  ).join("");
}

function renderCoach(metrics) {
  const max = Math.max(...state.weights);
  const maxIndex = state.weights.indexOf(max);
  let message = `현재 위험 대비 수익 지수는 ${metrics.sharpe.toFixed(2)}입니다.`;
  if (max >= 55) message = `${ASSETS[maxIndex].name} 비중이 ${max}%로 높아 집중 위험이 큽니다. 다른 자산과 나눠 보세요.`;
  else if (state.weights[2] + state.weights[3] >= 65) message = "방어 자산 비중이 높아 흔들림은 작지만, 장기 성장 가능성도 낮아질 수 있습니다.";
  else if (metrics.diversification >= 80) message = `분산 효과 ${metrics.diversification}점! 서로 다르게 움직이는 자산이 비교적 고르게 섞였습니다.`;
  $("[data-coach] p").textContent = message;
}

function applyPreset(name) {
  if (name === "random") {
    const values = ASSETS.map(() => Math.random());
    const sum = values.reduce((a, b) => a + b, 0);
    const weights = values.map((v) => Math.floor(v / sum * 100));
    let remain = 100 - weights.reduce((a, b) => a + b, 0);
    for (let i = 0; remain > 0; i = (i + 1) % weights.length) { weights[i] += 1; remain -= 1; }
    state.weights = weights;
  } else {
    state.weights = [...PRESETS[name]];
    state.profile = name;
    $$("[data-profile]").forEach((button) => button.classList.toggle("is-selected", button.dataset.profile === name));
  }
  syncAllocationUI();
  showToast(`${name === "random" ? "무작위" : ({ stable: "방어형", balanced: "균형형", growth: "성장형" })[name]} 배분을 적용했습니다.`);
}

function renderCorrelationMap() {
  const map = $("[data-correlation-map]");
  const cells = [`<div class="corr-cell corr-head"></div>`, ...ASSETS.map((a) => `<div class="corr-cell corr-head">${a.short}</div>`)];
  CORRELATIONS.forEach((row, i) => {
    cells.push(`<div class="corr-cell corr-head">${ASSETS[i].short}</div>`);
    row.forEach((value) => {
      const hue = value < 0 ? "77,127,232" : "255,119,87";
      const alpha = .08 + Math.abs(value) * .42;
      cells.push(`<div class="corr-cell" style="background:rgba(${hue},${alpha});color:${Math.abs(value) > .65 ? "#fff" : "#344054"}">${value.toFixed(2)}</div>`);
    });
  });
  map.innerHTML = `<div class="corr-table" style="grid-template-columns:90px repeat(5,1fr)">${cells.join("")}</div>`;
}

function renderFrontier(regenerate = false) {
  const svg = $("[data-frontier-svg]");
  if (!svg) return;
  if (regenerate || !svg.dataset.points) {
    const points = [];
    for (let n = 0; n < 80; n += 1) {
      const raw = ASSETS.map(() => -Math.log(Math.max(.0001, Math.random())));
      const total = raw.reduce((a, b) => a + b, 0);
      const weights = raw.map((v) => v / total * 100);
      points.push(portfolioMetrics(weights));
    }
    svg.dataset.points = JSON.stringify(points);
  }
  const points = JSON.parse(svg.dataset.points);
  const current = portfolioMetrics();
  const x = (risk) => 58 + clamp(risk / 22, 0, 1) * 625;
  const y = (ret) => 258 - clamp((ret - 2) / 8, 0, 1) * 220;
  const grid = [0, 5, 10, 15, 20].map((tick) => `<path d="M${x(tick)} 25V258" stroke="#e4e8e2"/><text x="${x(tick)}" y="278" text-anchor="middle" fill="#7a8491" font-size="10">${tick}%</text>`).join("")
    + [2, 4, 6, 8, 10].map((tick) => `<path d="M58 ${y(tick)}H683" stroke="#e4e8e2"/><text x="47" y="${y(tick) + 4}" text-anchor="end" fill="#7a8491" font-size="10">${tick}%</text>`).join("");
  svg.innerHTML = `
    ${grid}
    <text x="370" y="297" text-anchor="middle" fill="#667085" font-size="11">예상 위험(표준편차)</text>
    <text x="14" y="145" text-anchor="middle" fill="#667085" font-size="11" transform="rotate(-90 14 145)">기대수익률</text>
    ${points.map((p) => `<circle cx="${x(p.risk)}" cy="${y(p.expected)}" r="4" fill="#4d7fe8" opacity=".24"/>`).join("")}
    <circle cx="${x(current.risk)}" cy="${y(current.expected)}" r="12" fill="#65e0be" stroke="#10172a" stroke-width="3"/>
    <text x="${x(current.risk)}" y="${y(current.expected) + 4}" text-anchor="middle" fill="#10172a" font-size="11" font-weight="900">★</text>
    <text x="${clamp(x(current.risk) + 17, 80, 610)}" y="${y(current.expected) - 13}" fill="#10172a" font-size="11" font-weight="800">나의 설계</text>`;
}

function renderScenarios() {
  const grid = $("[data-scenario-grid]");
  grid.innerHTML = SCENARIOS.map((scenario) => `
    <button class="scenario-card ${scenario.id === state.scenarioId ? "is-selected" : ""}" type="button" data-scenario="${scenario.id}">
      <span class="shock">${scenario.mark}</span>
      <span class="year">${scenario.year}</span>
      <h3>${scenario.title}</h3>
      <p>${scenario.blurb}</p>
      <div class="tags">${scenario.tags.map((tag) => `<span>${tag}</span>`).join("")}</div>
    </button>`).join("");
  $$("[data-scenario]").forEach((button) => button.addEventListener("click", () => selectScenario(button.dataset.scenario)));
  selectScenario(state.scenarioId, false);
}

function selectedScenario() {
  return SCENARIOS.find((scenario) => scenario.id === state.scenarioId) || SCENARIOS[2];
}

function selectScenario(id, notify = true) {
  state.scenarioId = id;
  $$("[data-scenario]").forEach((button) => button.classList.toggle("is-selected", button.dataset.scenario === id));
  const scenario = selectedScenario();
  $("[data-sim-title]").textContent = `${scenario.year} ${scenario.title}`;
  $("[data-sim-description]").textContent = scenario.description;
  $("[data-mission-title]").textContent = scenario.mission;
  $("[data-mission-text]").textContent = scenario.missionText;
  renderTimeline();
  if (notify) showToast(`${scenario.title} 시나리오를 선택했습니다.`);
}

function renderTimeline() {
  const events = selectedScenario().events;
  $("[data-event-timeline]").innerHTML = events.map((event, index) =>
    `<div data-label="${event.label}" class="${index < state.period ? "is-done" : index === state.period ? "is-current" : ""}"></div>`
  ).join("");
}

function initialCapital() {
  return clamp(Number($("#initialCapital").value) || 1000, 100, 100000);
}

function startSimulation() {
  const capital = initialCapital();
  state.period = -1;
  state.balances = state.weights.map((weight) => capital * weight / 100);
  state.history = [capital];
  state.periodReturns = [];
  state.decisions = [];
  state.result = null;
  state.running = true;
  resetResultUI();
  advanceMarket();
  document.querySelector("#scenario").scrollIntoView({ behavior: "smooth", block: "start" });
}

function advanceMarket() {
  const scenario = selectedScenario();
  state.period += 1;
  const event = scenario.events[state.period];
  state.balances = state.balances.map((value, index) => value * (1 + event.r[index] / 100));
  const previous = state.history.at(-1);
  const current = state.balances.reduce((a, b) => a + b, 0);
  state.history.push(current);
  state.periodReturns.push((current / previous - 1) * 100);
  renderSimulationDashboard();
  renderEventStage(event);
}

function renderEventStage(event) {
  const scenario = selectedScenario();
  const isFinal = state.period === scenario.events.length - 1;
  const rule = $("#rebalanceRule").value;
  const returnChips = ASSETS.map((asset, index) => `<span class="${event.r[index] >= 0 ? "up" : "down"}">${asset.short} ${formatPct(event.r[index])}</span>`).join("");
  let buttons = "";
  if (isFinal) {
    buttons = `<button type="button" data-finish><b>분석 결과 열기 →</b><small>전체 기간의 성과와 의사결정을 계산합니다.</small></button>`;
  } else if (rule === "choice") {
    buttons = `
      <button type="button" data-decision="hold"><b>✋ 그대로 유지</b><small>시장 타이밍을 예측하지 않고 현재 구성을 유지</small></button>
      <button type="button" data-decision="rebalance"><b>⚖ 목표 비중 복원</b><small>오르고 내린 자산을 처음 목표 비중으로 조정</small></button>
      <button type="button" data-decision="safety"><b>🛡 안전자산 이동</b><small>두 주식 자산의 20%를 현금으로 이동</small></button>`;
  } else {
    const action = rule === "always" ? "rebalance" : "hold";
    buttons = `<button type="button" data-decision="${action}"><b>${rule === "always" ? "⚖ 자동 리밸런싱 후" : "✋ 현재 비중 유지 후"} 다음 사건 →</b><small>선택한 운용 규칙대로 진행합니다.</small></button>`;
  }
  $("[data-event-stage]").innerHTML = `
    <div class="event-content">
      <div class="event-news">
        <span>MARKET FLASH · ${event.label}</span>
        <h4>${event.title}</h4>
        <p>${event.text}</p>
        <div class="return-chips">${returnChips}</div>
      </div>
      <div class="decision-area">
        <b>${isFinal ? "마지막 국면까지 도달했습니다." : "이 상황에서 다음 국면을 어떻게 준비할까요?"}</b>
        <p>${isFinal ? "수익률과 최대 낙폭뿐 아니라 선택한 원칙을 함께 평가하세요." : "과거를 이미 알고 선택하는 ‘사후 확신 편향’에 주의하세요."}</p>
        <div class="decision-buttons">${buttons}</div>
      </div>
    </div>`;
  $$("[data-decision]", $("[data-event-stage]")).forEach((button) => button.addEventListener("click", () => makeDecision(button.dataset.decision)));
  $("[data-finish]")?.addEventListener("click", finishSimulation);
}

function makeDecision(action) {
  const before = state.balances.reduce((a, b) => a + b, 0);
  if (action === "rebalance") {
    state.balances = state.weights.map((weight) => before * weight / 100);
  } else if (action === "safety") {
    const transfer = state.balances[0] * .2 + state.balances[1] * .2;
    state.balances[0] *= .8;
    state.balances[1] *= .8;
    state.balances[3] += transfer;
  }
  const labels = { hold: "그대로 유지", rebalance: "목표 비중 복원", safety: "안전자산 이동" };
  state.decisions.push({ period: selectedScenario().events[state.period].label, action, label: labels[action], value: before });
  advanceMarket();
}

function renderSimulationDashboard() {
  const capital = initialCapital();
  const current = state.history.at(-1);
  const profit = current - capital;
  const peak = Math.max(...state.history);
  const currentDrawdown = (current / peak - 1) * 100;
  const maxDrawdown = calculateMaxDrawdown(state.history);
  $("[data-current-value]").textContent = formatMoney(current);
  $("[data-profit-value]").textContent = `${profit >= 0 ? "수익" : "손실"} ${Math.abs(Math.round(profit)).toLocaleString("ko-KR")}만원`;
  $("[data-profit-value]").style.color = profit >= 0 ? "#0f6b55" : "#bf3d2b";
  $("[data-sim-period]").textContent = selectedScenario().events[state.period]?.label || "시작 전";
  $("[data-max-drawdown]").textContent = `${Math.abs(maxDrawdown).toFixed(1)}%`;
  const stress = clamp(Math.abs(currentDrawdown) * 2.6, 0, 100);
  $("[data-stress-gauge]").style.width = `${stress}%`;
  $("[data-stress-label]").textContent = stress < 20 ? "평온" : stress < 50 ? "주의" : stress < 75 ? "긴장" : "공포";
  renderTimeline();
  renderPerformanceChart();
}

function renderPerformanceChart() {
  const svg = $("[data-performance-chart]");
  const values = state.history.length ? state.history : [initialCapital()];
  const capital = initialCapital();
  const benchmark = values.map((_, i) => capital * (1 + .006 * i));
  const all = [...values, ...benchmark];
  const min = Math.min(...all) * .94;
  const max = Math.max(...all) * 1.06;
  const x = (index) => 48 + (index / Math.max(1, selectedScenario().events.length)) * 820;
  const y = (value) => 286 - ((value - min) / Math.max(1, max - min)) * 240;
  const line = (array) => array.map((value, i) => `${i ? "L" : "M"}${x(i)} ${y(value)}`).join(" ");
  const ticks = [0, .25, .5, .75, 1].map((t) => {
    const value = min + (max - min) * t;
    return `<path d="M48 ${y(value)}H868" stroke="#e9ede7"/><text x="40" y="${y(value) + 4}" text-anchor="end" fill="#98a09c" font-size="9">${Math.round(value)}</text>`;
  }).join("");
  svg.innerHTML = `
    ${ticks}
    <path d="${line(benchmark)}" fill="none" stroke="#b9c0ca" stroke-width="2" stroke-dasharray="7 6"/>
    <path d="${line(values)}" fill="none" stroke="#0f6b55" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    ${values.map((value, i) => `<circle cx="${x(i)}" cy="${y(value)}" r="${i === values.length - 1 ? 6 : 3}" fill="${i === values.length - 1 ? "#65e0be" : "#0f6b55"}" stroke="white" stroke-width="2"/>`).join("")}
    ${selectedScenario().events.map((event, index) => `<text x="${x(index + 1)}" y="313" text-anchor="middle" fill="#7e8792" font-size="8">${event.label}</text>`).join("")}`;
}

function calculateMaxDrawdown(history) {
  let peak = history[0] || 1;
  let maxDrawdown = 0;
  history.forEach((value) => {
    peak = Math.max(peak, value);
    maxDrawdown = Math.min(maxDrawdown, (value / peak - 1) * 100);
  });
  return maxDrawdown;
}

function finishSimulation() {
  state.running = false;
  const capital = initialCapital();
  const finalValue = state.history.at(-1);
  const totalReturn = (finalValue / capital - 1) * 100;
  const drawdown = calculateMaxDrawdown(state.history);
  const mean = state.periodReturns.reduce((a, b) => a + b, 0) / state.periodReturns.length;
  const volatility = Math.sqrt(state.periodReturns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / state.periodReturns.length);
  const lowestIndex = state.history.indexOf(Math.min(...state.history));
  const low = state.history[lowestIndex];
  const peakBefore = Math.max(...state.history.slice(0, lowestIndex + 1));
  const recoveryTarget = Math.max(1, peakBefore - low);
  const resilience = clamp((finalValue - low) / recoveryTarget * 100, 0, 100);
  state.result = { totalReturn, drawdown, volatility, resilience, finalValue };
  $("[data-result-return]").textContent = formatPct(totalReturn);
  $("[data-result-return]").style.color = totalReturn >= 0 ? "var(--mint)" : "var(--orange)";
  $("[data-result-drawdown]").textContent = `${Math.abs(drawdown).toFixed(1)}%`;
  $("[data-result-volatility]").textContent = `${volatility.toFixed(1)}%`;
  $("[data-result-resilience]").textContent = `${resilience.toFixed(0)}점`;
  const grade = resilience >= 85 && Math.abs(drawdown) < 20 ? "RESILIENT" : totalReturn >= 0 ? "SURVIVED" : "LEARNED";
  $("[data-grade]").textContent = grade;
  renderDecisionLog();
  updateReportPreview();
  showToast("시뮬레이션 완료! 결과 분석으로 이동합니다.");
  document.querySelector("#analysis").scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetResultUI() {
  ["[data-result-return]", "[data-result-drawdown]", "[data-result-volatility]", "[data-result-resilience]"].forEach((selector) => { $(selector).textContent = "—"; });
  $("[data-grade]").textContent = "RUNNING";
  $("[data-decision-count]").textContent = "0개의 선택";
  $("[data-decision-log]").innerHTML = `<p class="empty-log">시뮬레이션이 진행 중입니다.</p>`;
}

function renderDecisionLog() {
  $("[data-decision-count]").textContent = `${state.decisions.length}개의 선택`;
  $("[data-decision-log]").innerHTML = state.decisions.length ? state.decisions.map((decision) =>
    `<div class="log-item"><span>${decision.period}</span><b>${decision.label}</b><small>${formatMoney(decision.value)}</small></div>`
  ).join("") : `<p class="empty-log">‘끝까지 유지’ 규칙으로 별도 조정 없이 운용했습니다.</p>`;
}

function autoFillReport() {
  const name = $("#studentName").value.trim() || "우리 모둠";
  const metrics = portfolioMetrics();
  const profileLabel = { stable: "안정형", balanced: "균형형", growth: "성장형" }[state.profile];
  const allocation = ASSETS.map((asset, index) => `${asset.name} ${state.weights[index]}%`).join(", ");
  const scenario = selectedScenario();
  $("#reportGoal").value = `${name}은(는) ${profileLabel} 투자자로서 위험을 감당하면서도 자산의 장기 성장을 추구하도록 포트폴리오를 구성하였다. 초기 투자금 ${formatMoney(initialCapital())}을 ${allocation}로 배분하였다.`;
  $("#reportMath").value = `포트폴리오 기대수익률은 각 자산의 기대수익률에 투자 비중을 곱한 가중평균 E(Rp)=ΣwiE(Ri)로 계산하여 ${metrics.expected.toFixed(1)}%가 나왔다. 공분산과 상관계수를 반영한 예상 표준편차는 ${metrics.risk.toFixed(1)}%이며, 분산 효과는 ${metrics.diversification}점이다. 특히 서로 완전히 같은 방향으로 움직이지 않는 자산을 함께 보유하면 개별 자산 위험의 일부를 줄일 수 있다.`;
  $("#reportScenario").value = state.result
    ? `${scenario.year} ${scenario.title} 시나리오에서 최종 누적 수익률은 ${formatPct(state.result.totalReturn)}, 최대 낙폭은 ${Math.abs(state.result.drawdown).toFixed(1)}%, 기간 변동성은 ${state.result.volatility.toFixed(1)}%였다. 나는 ${state.decisions.map((d) => `${d.period}에 '${d.label}'`).join(", ") || "처음 비중을 계속 유지"}하였다. 수익률만 보면 놓치기 쉬운 손실의 깊이를 최대 낙폭으로 함께 확인할 수 있었다.`
    : `${scenario.year} ${scenario.title}를 선택했다. 아직 시뮬레이션을 완료하지 않았으므로, 사건별 선택과 수익률·최대 낙폭을 확인한 뒤 이 문단을 보완해야 한다.`;
  $("#reportReflection").value = `이 모형은 실제 사건을 몇 개의 기간 수익률로 단순화했으며 세금, 거래 비용, 환율, 물가, 개별 종목 차이를 충분히 반영하지 못한다. 또한 과거 결과를 안다고 해서 미래를 예측할 수 있는 것은 아니다. 다음 실험에서는 다른 자산 배분과 운용 규칙을 적용해 같은 사건의 결과가 어떻게 달라지는지 비교하고 싶다.`;
  $$("[data-evidence]").forEach((checkbox) => { checkbox.checked = true; });
  updateReportPreview();
  showToast("시뮬레이션 결과로 보고서 초안을 만들었습니다.");
}

function updateReportPreview() {
  const metrics = portfolioMetrics();
  const name = $("#studentName")?.value.trim() || "이름 또는 모둠명";
  if ($("[data-preview-name]")) $("[data-preview-name]").textContent = name;
  if ($("[data-preview-date]")) $("[data-preview-date]").textContent = new Intl.DateTimeFormat("ko-KR", { dateStyle: "long" }).format(new Date());
  if ($("[data-preview-allocation]")) $("[data-preview-allocation]").textContent = ASSETS.map((asset, index) => `${asset.short} ${state.weights[index]}%`).join(" · ");
  if ($("[data-preview-return]")) $("[data-preview-return]").textContent = `${metrics.expected.toFixed(1)}%`;
  if ($("[data-preview-risk]")) $("[data-preview-risk]").textContent = `${metrics.risk.toFixed(1)}%`;
  const mappings = [
    ["#reportGoal", "[data-preview-goal]"],
    ["#reportMath", "[data-preview-math]"],
    ["#reportScenario", "[data-preview-scenario]"],
    ["#reportReflection", "[data-preview-reflection]"]
  ];
  mappings.forEach(([inputSelector, previewSelector]) => {
    const input = $(inputSelector);
    const preview = $(previewSelector);
    if (input && preview) preview.textContent = input.value.trim() || "작성한 내용이 이곳에 표시됩니다.";
  });
}

function saveState() {
  const report = {};
  ["studentName", "initialCapital", "reflectionQuick", "reportGoal", "reportMath", "reportScenario", "reportReflection"].forEach((id) => { report[id] = $(`#${id}`)?.value || ""; });
  localStorage.setItem("portfolioLabState", JSON.stringify({
    weights: state.weights, profile: state.profile, scenarioId: state.scenarioId, result: state.result,
    history: state.history, periodReturns: state.periodReturns, decisions: state.decisions, report,
    evidence: $$("[data-evidence]").map((checkbox) => checkbox.checked)
  }));
  showToast("이 브라우저에 활동 내용을 저장했습니다.");
}

function loadState() {
  const saved = localStorage.getItem("portfolioLabState");
  if (!saved) { showToast("저장된 활동이 아직 없습니다."); return; }
  try {
    const data = JSON.parse(saved);
    state.weights = Array.isArray(data.weights) && data.weights.length === 5 ? data.weights : [...PRESETS.balanced];
    state.profile = data.profile || "balanced";
    state.scenarioId = data.scenarioId || "gfc08";
    state.result = data.result || null;
    state.history = data.history || [];
    state.periodReturns = data.periodReturns || [];
    state.decisions = data.decisions || [];
    Object.entries(data.report || {}).forEach(([id, value]) => { if ($(`#${id}`)) $(`#${id}`).value = value; });
    (data.evidence || []).forEach((checked, index) => { if ($$("[data-evidence]")[index]) $$("[data-evidence]")[index].checked = checked; });
    $$("[data-profile]").forEach((button) => button.classList.toggle("is-selected", button.dataset.profile === state.profile));
    syncAllocationUI();
    selectScenario(state.scenarioId, false);
    if (state.result) {
      $("[data-result-return]").textContent = formatPct(state.result.totalReturn);
      $("[data-result-drawdown]").textContent = `${Math.abs(state.result.drawdown).toFixed(1)}%`;
      $("[data-result-volatility]").textContent = `${state.result.volatility.toFixed(1)}%`;
      $("[data-result-resilience]").textContent = `${state.result.resilience.toFixed(0)}점`;
      $("[data-grade]").textContent = "RESTORED";
      renderDecisionLog();
    }
    updateReportPreview();
    showToast("저장한 활동을 불러왔습니다.");
  } catch {
    showToast("저장 데이터를 읽지 못했습니다.");
  }
}

let toastTimer;
function showToast(message) {
  const toast = $("[data-toast]");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function wireInteractions() {
  $$("[data-preset]").forEach((button) => button.addEventListener("click", () => applyPreset(button.dataset.preset)));
  $$("[data-profile]").forEach((button) => button.addEventListener("click", () => applyPreset(button.dataset.profile)));
  $$("[data-jump]").forEach((button) => button.addEventListener("click", () => document.querySelector(`#${button.dataset.jump}`).scrollIntoView({ behavior: "smooth" })));
  $$("[data-math-tab]").forEach((button) => button.addEventListener("click", () => {
    $$("[data-math-tab]").forEach((tab) => tab.classList.toggle("is-active", tab === button));
    $$("[data-math-view]").forEach((view) => view.classList.toggle("is-active", view.dataset.mathView === button.dataset.mathTab));
  }));
  $("[data-generate-frontier]").addEventListener("click", () => { renderFrontier(true); showToast("새 무작위 포트폴리오를 만들었습니다."); });
  $("[data-start-simulation]").addEventListener("click", startSimulation);
  $("[data-autofill]").addEventListener("click", autoFillReport);
  $$("[data-save]").forEach((button) => button.addEventListener("click", saveState));
  $$("[data-load]").forEach((button) => button.addEventListener("click", loadState));
  $$("[data-print]").forEach((button) => button.addEventListener("click", () => { updateReportPreview(); window.print(); }));
  ["studentName", "initialCapital", "reportGoal", "reportMath", "reportScenario", "reportReflection"].forEach((id) => {
    $(`#${id}`)?.addEventListener("input", updateReportPreview);
  });
  $$("[data-tooltip]").forEach((button) => button.addEventListener("click", () => showToast(button.dataset.tooltip)));
  $$("[data-open-guide]").forEach((button) => button.addEventListener("click", () => {
    $("[data-guide-modal]").hidden = false;
    $(".guide-dialog").focus();
  }));
  $$("[data-close-guide]").forEach((button) => button.addEventListener("click", () => { $("[data-guide-modal]").hidden = true; }));
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") $("[data-guide-modal]").hidden = true; });

  $$(".quiz-list input").forEach((input) => input.addEventListener("change", () => {
    const fieldset = input.closest("fieldset");
    const correct = input.value === fieldset.dataset.answer;
    fieldset.classList.add("is-answered");
    $(".quiz-feedback", fieldset).textContent = correct ? "정답입니다. 개념을 정확히 연결했어요." : "다시 생각해 보세요. 위의 수학 렌즈와 결과 지표를 확인해 보세요.";
    $(".quiz-feedback", fieldset).style.color = correct ? "var(--mint)" : "var(--orange)";
    const score = $$(".quiz-list fieldset").filter((item) => $(`input:checked`, item)?.value === item.dataset.answer).length;
    $("[data-quiz-score]").textContent = `${score} / 3`;
  }));

  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    $$(".progress-nav li").forEach((li) => li.classList.toggle("is-active", $("button", li).dataset.jump === visible.target.id));
  }, { rootMargin: "-25% 0px -55%", threshold: [0, .25, .5] });
  $$("[data-step]").forEach((section) => observer.observe(section));
}

function init() {
  renderAssetControls();
  renderCorrelationMap();
  renderScenarios();
  wireInteractions();
  syncAllocationUI();
  renderPerformanceChart();
  updateReportPreview();
}

init();
