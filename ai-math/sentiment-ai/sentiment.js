const MANUAL_GITHUB_REPOSITORY_URL = "https://github.com/mathtjungsw/math-class-webtools";
const MIN_SENTENCE_COUNT = 10;
const NGRAM_SIZES = [2, 3];

const state = {
  model: null,
};

const els = {
  positiveRows: document.querySelector("#positiveRows"),
  negativeRows: document.querySelector("#negativeRows"),
  positiveCount: document.querySelector("#positiveCount"),
  negativeCount: document.querySelector("#negativeCount"),
  trainButton: document.querySelector("#trainButton"),
  saveButton: document.querySelector("#saveButton"),
  loadFile: document.querySelector("#loadFile"),
  clearButton: document.querySelector("#clearButton"),
  statusMessage: document.querySelector("#statusMessage"),
  modelState: document.querySelector("#modelState"),
  testSentence: document.querySelector("#testSentence"),
  predictButton: document.querySelector("#predictButton"),
  resultArea: document.querySelector("#resultArea"),
  predictionLabel: document.querySelector("#predictionLabel"),
  positiveScoreText: document.querySelector("#positiveScoreText"),
  negativeScoreText: document.querySelector("#negativeScoreText"),
  positiveBar: document.querySelector("#positiveBar"),
  negativeBar: document.querySelector("#negativeBar"),
  reasonText: document.querySelector("#reasonText"),
  highlightedSentence: document.querySelector("#highlightedSentence"),
  expressionList: document.querySelector("#expressionList"),
};

function inferGithubRepositoryUrl() {
  const host = window.location.hostname;

  if (!host.endsWith(".github.io")) {
    return "";
  }

  const owner = host.replace(".github.io", "");
  const firstPath = window.location.pathname.split("/").filter(Boolean)[0];
  const repo = firstPath || `${owner}.github.io`;

  return `https://github.com/${owner}/${repo}`;
}

function wireGithubLinks() {
  const githubUrl = MANUAL_GITHUB_REPOSITORY_URL || inferGithubRepositoryUrl();

  document.querySelectorAll("[data-github-link]").forEach((link) => {
    if (!githubUrl) {
      link.setAttribute("aria-disabled", "true");
      link.setAttribute("title", "GitHub 원격 저장소를 연결하면 자동으로 활성화됩니다.");
      link.addEventListener("click", (event) => event.preventDefault());
      return;
    }

    link.href = githubUrl;
  });
}

function showStatus(message, type = "info") {
  els.statusMessage.textContent = message;
  els.statusMessage.classList.toggle("is-warning", type === "warning");
  els.statusMessage.classList.toggle("is-success", type === "success");
}

function makeSentenceRow(label, index, value = "") {
  const row = document.createElement("div");
  row.className = "sentence-row";

  const number = document.createElement("span");
  number.textContent = index + 1;

  const textarea = document.createElement("textarea");
  textarea.rows = 2;
  textarea.value = value;
  textarea.placeholder =
    label === "positive"
      ? `긍정 문장 ${index + 1}`
      : `부정 문장 ${index + 1}`;
  textarea.dataset.label = label;
  textarea.addEventListener("input", () => {
    updateCounts();
    markModelStale();
  });

  row.append(number, textarea);
  return row;
}

function addSentenceRow(label, value = "") {
  const container = label === "positive" ? els.positiveRows : els.negativeRows;
  container.append(makeSentenceRow(label, container.children.length, value));
}

function fillInitialRows() {
  for (let i = 0; i < MIN_SENTENCE_COUNT; i += 1) {
    addSentenceRow("positive");
    addSentenceRow("negative");
  }
}

function getSentences(label) {
  const selector = `textarea[data-label="${label}"]`;
  return [...document.querySelectorAll(selector)]
    .map((textarea) => textarea.value.trim())
    .filter(Boolean);
}

function setSentences(label, sentences) {
  const container = label === "positive" ? els.positiveRows : els.negativeRows;
  container.replaceChildren();

  const rows = Math.max(MIN_SENTENCE_COUNT, sentences.length);
  for (let i = 0; i < rows; i += 1) {
    addSentenceRow(label, sentences[i] || "");
  }
}

function updateCounts() {
  const positiveCount = getSentences("positive").length;
  const negativeCount = getSentences("negative").length;
  els.positiveCount.textContent = `${positiveCount}개`;
  els.negativeCount.textContent = `${negativeCount}개`;
}

function markModelStale() {
  if (!state.model) {
    return;
  }

  state.model = null;
  els.predictButton.disabled = true;
  els.modelState.textContent = "다시 학습 필요";
  els.modelState.classList.remove("is-ready");
  els.resultArea.hidden = true;
}

function normalizeSentence(sentence) {
  return sentence
    .normalize("NFC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function extractFeatures(sentence) {
  const text = normalizeSentence(sentence);
  const features = new Map();

  // 문장을 글자 조각으로 나눈다.
  // 예를 들어 "좋아요"는 2-gram 기준으로 "좋아", "아요"가 된다.
  // 한국어는 띄어쓰기나 형태소 분석이 어려울 수 있으므로, 글자 n-gram은 수업용으로 안정적인 특징이 된다.
  NGRAM_SIZES.forEach((size) => {
    for (let i = 0; i <= text.length - size; i += 1) {
      const gram = text.slice(i, i + size);

      if (!gram.trim() || /\s/.test(gram)) {
        continue;
      }

      features.set(gram, (features.get(gram) || 0) + 1);
    }
  });

  return features;
}

function averageVectors(vectors) {
  const average = new Map();

  // 같은 레이블의 문장 벡터를 모두 더한 뒤 문장 수로 나누면 그 레이블의 "대표 벡터"가 된다.
  // 수업에서는 긍정 문장의 중심점, 부정 문장의 중심점이라고 설명하면 이해하기 쉽다.
  vectors.forEach((vector) => {
    vector.forEach((value, feature) => {
      average.set(feature, (average.get(feature) || 0) + value / vectors.length);
    });
  });

  return average;
}

function dotProduct(vectorA, vectorB) {
  let total = 0;

  vectorA.forEach((value, feature) => {
    total += value * (vectorB.get(feature) || 0);
  });

  return total;
}

function vectorMagnitude(vector) {
  let squaredSum = 0;

  vector.forEach((value) => {
    squaredSum += value * value;
  });

  return Math.sqrt(squaredSum);
}

function cosineSimilarity(vectorA, vectorB) {
  const magnitude = vectorMagnitude(vectorA) * vectorMagnitude(vectorB);

  if (magnitude === 0) {
    return 0;
  }

  // 코사인 유사도는 두 벡터가 바라보는 방향이 얼마나 비슷한지 보는 값이다.
  // 문장 길이가 조금 달라도 방향을 비교하므로, 단순히 겹친 글자 수만 세는 것보다 수업용 모델에 잘 맞는다.
  return dotProduct(vectorA, vectorB) / magnitude;
}

function buildModel(positiveSentences, negativeSentences) {
  const positiveVectors = positiveSentences.map(extractFeatures);
  const negativeVectors = negativeSentences.map(extractFeatures);

  return {
    positiveAverage: averageVectors(positiveVectors),
    negativeAverage: averageVectors(negativeVectors),
    positiveFeatureSet: new Set(positiveVectors.flatMap((vector) => [...vector.keys()])),
    negativeFeatureSet: new Set(negativeVectors.flatMap((vector) => [...vector.keys()])),
    trainedAt: new Date().toISOString(),
  };
}

function validateTrainingData() {
  const positiveSentences = getSentences("positive");
  const negativeSentences = getSentences("negative");

  if (
    positiveSentences.length < MIN_SENTENCE_COUNT ||
    negativeSentences.length < MIN_SENTENCE_COUNT
  ) {
    const message = `긍정과 부정 문장을 각각 ${MIN_SENTENCE_COUNT}개 이상 입력해야 학습할 수 있습니다. 현재 긍정 ${positiveSentences.length}개, 부정 ${negativeSentences.length}개입니다.`;
    showStatus(message, "warning");
    window.alert(message);
    return null;
  }

  return { positiveSentences, negativeSentences };
}

function trainModel() {
  const trainingData = validateTrainingData();

  if (!trainingData) {
    return;
  }

  state.model = buildModel(
    trainingData.positiveSentences,
    trainingData.negativeSentences,
  );

  els.predictButton.disabled = false;
  els.modelState.textContent = "학습 완료";
  els.modelState.classList.add("is-ready");
  showStatus(
    `학습 완료: 긍정 ${trainingData.positiveSentences.length}개, 부정 ${trainingData.negativeSentences.length}개 문장으로 평균 벡터를 만들었습니다.`,
    "success",
  );

  if (els.testSentence.value.trim()) {
    renderPrediction();
  }
}

function scoreSentence(sentence) {
  const vector = extractFeatures(sentence);
  const positiveSimilarity = cosineSimilarity(vector, state.model.positiveAverage);
  const negativeSimilarity = cosineSimilarity(vector, state.model.negativeAverage);
  const similaritySum = positiveSimilarity + negativeSimilarity;

  let positivePercent = 50;
  let negativePercent = 50;

  if (similaritySum > 0) {
    positivePercent = (positiveSimilarity / similaritySum) * 100;
    negativePercent = (negativeSimilarity / similaritySum) * 100;
  }

  return {
    vector,
    positiveSimilarity,
    negativeSimilarity,
    positivePercent,
    negativePercent,
    label: positivePercent >= negativePercent ? "긍정" : "부정",
  };
}

function getFeatureLean(feature) {
  const positiveWeight = state.model.positiveAverage.get(feature) || 0;
  const negativeWeight = state.model.negativeAverage.get(feature) || 0;

  if (positiveWeight > negativeWeight) {
    return "positive";
  }

  if (negativeWeight > positiveWeight) {
    return "negative";
  }

  return "neutral";
}

function findOverlappingExpressions(vector) {
  const expressions = [];

  vector.forEach((count, feature) => {
    const positiveWeight = state.model.positiveAverage.get(feature) || 0;
    const negativeWeight = state.model.negativeAverage.get(feature) || 0;

    if (positiveWeight === 0 && negativeWeight === 0) {
      return;
    }

    const totalWeight = positiveWeight + negativeWeight;
    const dominance = totalWeight === 0 ? 0 : Math.abs(positiveWeight - negativeWeight) / totalWeight;

    expressions.push({
      text: feature,
      count,
      lean: getFeatureLean(feature),
      strength: dominance * count * (feature.length / Math.max(...NGRAM_SIZES)),
      positiveWeight,
      negativeWeight,
    });
  });

  return expressions
    .sort((a, b) => {
      if (b.strength !== a.strength) {
        return b.strength - a.strength;
      }

      return b.text.length - a.text.length;
    })
    .slice(0, 14);
}

function classifyLean(lean) {
  if (lean === "positive") {
    return "긍정 쪽";
  }

  if (lean === "negative") {
    return "부정 쪽";
  }

  return "양쪽 모두";
}

function buildReason(result, expressions) {
  if (result.vector.size === 0) {
    return "입력한 문장에서 비교할 글자 조각을 만들 수 없습니다. 두 글자 이상인 문장을 입력하면 AI가 다시 계산합니다.";
  }

  if (expressions.length === 0) {
    return "새 문장과 학습 데이터가 공유하는 주요 글자 조각이 거의 없습니다. 그래서 두 평균 벡터와의 유사도가 낮아져 판단이 불안정할 수 있습니다.";
  }

  const topExpressions = expressions
    .slice(0, 4)
    .map((item) => `"${item.text}"`)
    .join(", ");
  const winningAverage = result.label === "긍정" ? "긍정 평균 벡터" : "부정 평균 벡터";

  return `새 문장을 2글자, 3글자 조각으로 나누어 보니 ${topExpressions} 같은 표현이 학습 데이터와 겹쳤습니다. 이 조각들을 벡터로 계산했을 때 ${winningAverage}와 이루는 각도가 더 작아서 ${result.label}으로 예측했습니다.`;
}

function renderHighlightedSentence(sentence, expressions) {
  const text = normalizeSentence(sentence);
  els.highlightedSentence.replaceChildren();

  if (!text) {
    els.highlightedSentence.textContent = "분석할 문장을 입력하세요.";
    return;
  }

  const ranges = [];
  const candidates = [...expressions]
    .sort((a, b) => b.text.length - a.text.length || b.strength - a.strength)
    .filter((item) => item.text.trim());

  candidates.forEach((item) => {
    let start = text.indexOf(item.text);

    while (start !== -1) {
      const end = start + item.text.length;
      const overlaps = ranges.some((range) => start < range.end && end > range.start);

      if (!overlaps) {
        ranges.push({ start, end, lean: item.lean });
      }

      start = text.indexOf(item.text, start + 1);
    }
  });

  ranges.sort((a, b) => a.start - b.start);

  let cursor = 0;
  ranges.forEach((range) => {
    if (cursor < range.start) {
      els.highlightedSentence.append(document.createTextNode(text.slice(cursor, range.start)));
    }

    const mark = document.createElement("mark");
    mark.className = range.lean;
    mark.textContent = text.slice(range.start, range.end);
    els.highlightedSentence.append(mark);
    cursor = range.end;
  });

  if (cursor < text.length) {
    els.highlightedSentence.append(document.createTextNode(text.slice(cursor)));
  }
}

function renderExpressionList(expressions) {
  els.expressionList.replaceChildren();

  if (expressions.length === 0) {
    const chip = document.createElement("span");
    chip.className = "expression-chip neutral";
    chip.textContent = "겹친 주요 표현 없음";
    els.expressionList.append(chip);
    return;
  }

  expressions.slice(0, 10).forEach((item) => {
    const chip = document.createElement("span");
    chip.className = `expression-chip ${item.lean}`;
    chip.textContent = `${item.text} · ${classifyLean(item.lean)}`;
    els.expressionList.append(chip);
  });
}

function renderPrediction() {
  if (!state.model) {
    showStatus("먼저 학습하기 버튼을 눌러 평균 벡터를 만들어 주세요.", "warning");
    return;
  }

  const sentence = els.testSentence.value.trim();

  if (!sentence) {
    els.resultArea.hidden = true;
    return;
  }

  const result = scoreSentence(sentence);
  const expressions = findOverlappingExpressions(result.vector);
  const positivePercent = Math.round(result.positivePercent);
  const negativePercent = Math.round(result.negativePercent);

  els.resultArea.hidden = false;
  els.predictionLabel.textContent = result.label;
  els.predictionLabel.classList.toggle("is-negative", result.label === "부정");
  els.positiveScoreText.textContent = `${positivePercent}%`;
  els.negativeScoreText.textContent = `${negativePercent}%`;
  els.positiveBar.style.width = `${positivePercent}%`;
  els.negativeBar.style.width = `${negativePercent}%`;
  els.reasonText.textContent = buildReason(result, expressions);

  renderHighlightedSentence(sentence, expressions);
  renderExpressionList(expressions);
}

function saveTrainingData() {
  const payload = {
    version: 1,
    subject: "인공지능 수학",
    tool: "감성 분석 인공지능 만들기 실습",
    savedAt: new Date().toISOString(),
    labels: {
      positive: getSentences("positive"),
      negative: getSentences("negative"),
    },
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "sentiment-training-data.json";
  link.click();
  URL.revokeObjectURL(url);

  showStatus("현재 입력한 학습 데이터를 JSON 파일로 저장했습니다.", "success");
}

function extractLoadedSentences(data) {
  const positive =
    data?.labels?.positive ||
    data?.positive ||
    data?.positives ||
    data?.긍정 ||
    [];
  const negative =
    data?.labels?.negative ||
    data?.negative ||
    data?.negatives ||
    data?.부정 ||
    [];

  if (!Array.isArray(positive) || !Array.isArray(negative)) {
    throw new Error("JSON 안에서 긍정/부정 문장 배열을 찾을 수 없습니다.");
  }

  return {
    positive: positive.map(String),
    negative: negative.map(String),
  };
}

function loadTrainingData(file) {
  if (!file) {
    return;
  }

  const reader = new FileReader();

  reader.addEventListener("load", () => {
    try {
      const data = JSON.parse(reader.result);
      const loaded = extractLoadedSentences(data);

      setSentences("positive", loaded.positive);
      setSentences("negative", loaded.negative);
      updateCounts();
      markModelStale();
      showStatus(
        `JSON 불러오기 완료: 긍정 ${loaded.positive.length}개, 부정 ${loaded.negative.length}개 문장을 불러왔습니다.`,
        "success",
      );
    } catch (error) {
      showStatus(error.message, "warning");
      window.alert(error.message);
    } finally {
      els.loadFile.value = "";
    }
  });

  reader.readAsText(file, "utf-8");
}

function clearAll() {
  const shouldClear = window.confirm("입력한 모든 문장을 비울까요?");

  if (!shouldClear) {
    return;
  }

  setSentences("positive", []);
  setSentences("negative", []);
  updateCounts();
  markModelStale();
  showStatus("입력 칸을 모두 비웠습니다. 새 학습 데이터를 입력해 주세요.");
}

document.querySelectorAll("[data-add-row]").forEach((button) => {
  button.addEventListener("click", () => {
    addSentenceRow(button.dataset.addRow);
    updateCounts();
  });
});

els.trainButton.addEventListener("click", trainModel);
els.saveButton.addEventListener("click", saveTrainingData);
els.loadFile.addEventListener("change", () => loadTrainingData(els.loadFile.files[0]));
els.clearButton.addEventListener("click", clearAll);
els.predictButton.addEventListener("click", renderPrediction);
els.testSentence.addEventListener("input", () => {
  if (state.model) {
    renderPrediction();
  }
});

fillInitialRows();
updateCounts();
wireGithubLinks();
