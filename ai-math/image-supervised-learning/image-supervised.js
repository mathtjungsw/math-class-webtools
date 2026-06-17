const MANUAL_GITHUB_REPOSITORY_URL = "https://github.com/mathtjungsw/math-class-webtools";
const MIN_IMAGES_PER_CLASS = 5;
const CAPTURE_SIZE = 224;
const MAX_PDF_THUMBNAILS_PER_CLASS = 5;

// 앱 전체 상태는 브라우저 메모리에만 보관한다.
// 이미지와 예측 기록을 서버로 보내지 않기 때문에 수업 중 학생 기기 안에서 활동이 끝난다.
const state = {
  classes: [],
  nextClassId: 1,
  featureExtractor: null,
  classifier: null,
  webcamStream: null,
  trainingInfo: null,
  predictionHistory: [],
  pendingPredictionImage: null,
};

const els = {
  statusMessage: document.querySelector("#statusMessage"),
  classNameInput: document.querySelector("#classNameInput"),
  addClassButton: document.querySelector("#addClassButton"),
  classCountBadge: document.querySelector("#classCountBadge"),
  classCards: document.querySelector("#classCards"),
  collectionClassSelect: document.querySelector("#collectionClassSelect"),
  collectionVideo: document.querySelector("#collectionVideo"),
  collectionVideoPlaceholder: document.querySelector("#collectionVideoPlaceholder"),
  predictionVideo: document.querySelector("#predictionVideo"),
  predictionVideoPlaceholder: document.querySelector("#predictionVideoPlaceholder"),
  webcamState: document.querySelector("#webcamState"),
  startWebcamButton: document.querySelector("#startWebcamButton"),
  startPredictionWebcamButton: document.querySelector("#startPredictionWebcamButton"),
  captureImageButton: document.querySelector("#captureImageButton"),
  resetTrainingDataButton: document.querySelector("#resetTrainingDataButton"),
  trainingSummary: document.querySelector("#trainingSummary"),
  epochInput: document.querySelector("#epochInput"),
  batchSizeInput: document.querySelector("#batchSizeInput"),
  trainModelButton: document.querySelector("#trainModelButton"),
  modelState: document.querySelector("#modelState"),
  progressText: document.querySelector("#progressText"),
  progressPercent: document.querySelector("#progressPercent"),
  trainingProgressBar: document.querySelector("#trainingProgressBar"),
  trainingLog: document.querySelector("#trainingLog"),
  predictWebcamButton: document.querySelector("#predictWebcamButton"),
  predictionFileInput: document.querySelector("#predictionFileInput"),
  predictFileButton: document.querySelector("#predictFileButton"),
  predictionPreviewImage: document.querySelector("#predictionPreviewImage"),
  predictionImagePlaceholder: document.querySelector("#predictionImagePlaceholder"),
  topPredictionLabel: document.querySelector("#topPredictionLabel"),
  probabilityList: document.querySelector("#probabilityList"),
  predictionHistoryList: document.querySelector("#predictionHistoryList"),
  clearHistoryButton: document.querySelector("#clearHistoryButton"),
  reportTopic: document.querySelector("#reportTopic"),
  reportUseCase: document.querySelector("#reportUseCase"),
  reportStrength: document.querySelector("#reportStrength"),
  reportLimit: document.querySelector("#reportLimit"),
  reportReflection: document.querySelector("#reportReflection"),
  generatePdfButton: document.querySelector("#generatePdfButton"),
  pdfProgress: document.querySelector("#pdfProgress"),
  captureCanvas: document.querySelector("#captureCanvas"),
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
  els.statusMessage.classList.toggle("is-error", type === "error");
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function formatDateTime(dateInput) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getClassById(classId) {
  return state.classes.find((item) => item.id === Number(classId));
}

function getClassName(classItem) {
  return classItem.name.trim() || `클래스 ${classItem.id}`;
}

function getTotalImageCount() {
  return state.classes.reduce((total, classItem) => total + classItem.samples.length, 0);
}

function sanitizeClassName(name) {
  return name.trim().replace(/\s+/g, " ");
}

function markModelStale(reason = "학습 데이터가 바뀌었습니다. 다시 학습해 주세요.") {
  if (state.classifier) {
    state.classifier.dispose();
  }

  state.classifier = null;
  state.trainingInfo = null;
  els.modelState.textContent = "다시 학습 필요";
  els.modelState.classList.remove("is-ready");
  els.topPredictionLabel.textContent = "-";
  els.probabilityList.replaceChildren();
  showStatus(reason, "warning");
  renderTrainingSummary();
}

function addClass(name) {
  const className = sanitizeClassName(name);

  if (!className) {
    showStatus("클래스 이름을 입력한 뒤 추가해 주세요.", "warning");
    els.classNameInput.focus();
    return;
  }

  const duplicate = state.classes.some(
    (classItem) => getClassName(classItem).toLowerCase() === className.toLowerCase(),
  );

  if (duplicate) {
    showStatus("이미 같은 이름의 클래스가 있습니다. 다른 이름을 사용해 주세요.", "warning");
    return;
  }

  state.classes.push({
    id: state.nextClassId,
    name: className,
    samples: [],
  });
  state.nextClassId += 1;
  els.classNameInput.value = "";
  markModelStale("새 클래스가 추가되었습니다. 학습 전 이미지를 모아 주세요.");
  renderAll();
}

function removeClass(classId) {
  const classItem = getClassById(classId);

  if (!classItem) {
    return;
  }

  const shouldRemove = window.confirm(`"${getClassName(classItem)}" 클래스를 삭제할까요?`);

  if (!shouldRemove) {
    return;
  }

  state.classes = state.classes.filter((item) => item.id !== Number(classId));
  markModelStale("클래스가 삭제되었습니다. 모델을 다시 학습해 주세요.");
  renderAll();
}

function setClassName(classId, name) {
  const classItem = getClassById(classId);

  if (!classItem) {
    return;
  }

  classItem.name = sanitizeClassName(name);
  markModelStale("클래스 이름이 바뀌었습니다. 모델을 다시 학습해 주세요.");
  renderAll();
}

function addSampleToClass(classId, dataUrl, source) {
  const classItem = getClassById(classId);

  if (!classItem) {
    showStatus("이미지를 추가할 클래스를 먼저 선택해 주세요.", "warning");
    return;
  }

  classItem.samples.push({
    id: window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    dataUrl,
    source,
    createdAt: new Date().toISOString(),
  });
  markModelStale(`"${getClassName(classItem)}" 클래스에 이미지가 추가되었습니다.`);
  renderAll();
}

function clearClassSamples(classId) {
  const classItem = getClassById(classId);

  if (!classItem) {
    return;
  }

  const shouldClear = window.confirm(`"${getClassName(classItem)}" 클래스의 이미지를 모두 지울까요?`);

  if (!shouldClear) {
    return;
  }

  classItem.samples = [];
  markModelStale("클래스 이미지가 삭제되었습니다. 다시 학습해 주세요.");
  renderAll();
}

function renderClassCards() {
  els.classCards.replaceChildren();

  if (state.classes.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-message";
    empty.textContent = "아직 클래스가 없습니다. 위 입력칸에 이름을 쓰고 클래스를 추가해 주세요.";
    els.classCards.append(empty);
    return;
  }

  state.classes.forEach((classItem) => {
    const card = document.createElement("article");
    card.className = "class-card";

    const head = document.createElement("div");
    head.className = "class-card-head";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = getClassName(classItem);
    nameInput.setAttribute("aria-label", "클래스 이름");
    nameInput.addEventListener("change", () => setClassName(classItem.id, nameInput.value));

    const count = document.createElement("span");
    count.className = "sample-count";
    count.classList.toggle("is-low", classItem.samples.length < MIN_IMAGES_PER_CLASS);
    count.textContent = `${classItem.samples.length}장`;

    head.append(nameInput, count);

    const thumbs = document.createElement("div");
    thumbs.className = "thumb-grid";

    if (classItem.samples.length === 0) {
      const note = document.createElement("span");
      note.className = "empty-note";
      note.textContent = "이미지를 업로드하거나 웹캠으로 캡처하세요.";
      thumbs.append(note);
    } else {
      classItem.samples.slice(-10).forEach((sample) => {
        const img = document.createElement("img");
        img.src = sample.dataUrl;
        img.alt = `${getClassName(classItem)} 학습 이미지`;
        thumbs.append(img);
      });
    }

    const actions = document.createElement("div");
    actions.className = "class-actions";

    const uploadLabel = document.createElement("label");
    uploadLabel.className = "upload-button";
    uploadLabel.textContent = "이미지 업로드";

    const uploadInput = document.createElement("input");
    uploadInput.type = "file";
    uploadInput.accept = "image/*";
    uploadInput.multiple = true;
    uploadInput.addEventListener("change", () => handleTrainingFiles(classItem.id, uploadInput.files));
    uploadLabel.append(uploadInput);

    const selectButton = document.createElement("button");
    selectButton.className = "plain-button";
    selectButton.type = "button";
    selectButton.textContent = "웹캠 대상";
    selectButton.addEventListener("click", () => {
      els.collectionClassSelect.value = String(classItem.id);
      showStatus(`웹캠 캡처 대상이 "${getClassName(classItem)}" 클래스로 설정되었습니다.`, "success");
    });

    const clearButton = document.createElement("button");
    clearButton.className = "danger-button";
    clearButton.type = "button";
    clearButton.textContent = "이미지 비우기";
    clearButton.addEventListener("click", () => clearClassSamples(classItem.id));

    const removeButton = document.createElement("button");
    removeButton.className = "plain-button";
    removeButton.type = "button";
    removeButton.textContent = "클래스 삭제";
    removeButton.addEventListener("click", () => removeClass(classItem.id));

    actions.append(uploadLabel, selectButton, clearButton, removeButton);
    card.append(head, thumbs, actions);
    els.classCards.append(card);
  });
}

// 클래스 목록은 웹캠 수집 드롭다운과 학습 요약에서 함께 사용하므로,
// 클래스 이름이 바뀔 때마다 한 번에 다시 그려 일관성을 맞춘다.
function renderClassSelect() {
  const previousValue = els.collectionClassSelect.value;
  els.collectionClassSelect.replaceChildren();

  if (state.classes.length === 0) {
    const option = document.createElement("option");
    option.textContent = "클래스 없음";
    option.value = "";
    els.collectionClassSelect.append(option);
    return;
  }

  state.classes.forEach((classItem) => {
    const option = document.createElement("option");
    option.value = String(classItem.id);
    option.textContent = getClassName(classItem);
    els.collectionClassSelect.append(option);
  });

  if (state.classes.some((item) => String(item.id) === previousValue)) {
    els.collectionClassSelect.value = previousValue;
  }
}

function makeSummaryTile(label, value) {
  const tile = document.createElement("div");
  tile.className = "summary-tile";

  const labelEl = document.createElement("span");
  labelEl.textContent = label;

  const valueEl = document.createElement("strong");
  valueEl.textContent = value;

  tile.append(labelEl, valueEl);
  return tile;
}

function renderTrainingSummary() {
  const classCount = state.classes.length;
  const totalImages = getTotalImageCount();
  const readyClasses = state.classes.filter(
    (classItem) => classItem.samples.length >= MIN_IMAGES_PER_CLASS,
  ).length;
  const predictionCount = state.predictionHistory.length;

  els.trainingSummary.replaceChildren(
    makeSummaryTile("클래스 수", `${classCount}개`),
    makeSummaryTile("총 학습 이미지", `${totalImages}장`),
    makeSummaryTile("최소 기준 통과", `${readyClasses}/${classCount}`),
    makeSummaryTile("예측 기록", `${predictionCount}회`),
  );

  els.classCountBadge.textContent = `${classCount}개 클래스`;
  els.classCountBadge.classList.toggle("is-ready", classCount >= 2);
}

function renderHistory() {
  els.predictionHistoryList.replaceChildren();

  if (state.predictionHistory.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-message";
    empty.textContent = "아직 예측 기록이 없습니다. 예측하기 탭에서 이미지를 예측하면 여기에 누적됩니다.";
    els.predictionHistoryList.append(empty);
    return;
  }

  state.predictionHistory.forEach((item) => {
    const article = document.createElement("article");
    article.className = "history-item";

    const thumb = document.createElement("img");
    thumb.className = "history-thumb";
    thumb.src = item.imageDataUrl;
    thumb.alt = `${item.number}번 예측 이미지`;

    const body = document.createElement("div");
    body.className = "history-body";

    const title = document.createElement("div");
    title.className = "history-title";

    const titleText = document.createElement("div");
    const strong = document.createElement("strong");
    const meta = document.createElement("p");
    strong.textContent = `${item.number}. ${item.topClass}`;
    meta.textContent = `${formatDateTime(item.createdAt)} · ${item.method}`;
    titleText.append(strong, meta);

    const topProbability = document.createElement("span");
    topProbability.className = "history-pill is-top";
    topProbability.textContent = `${formatPercent(item.probabilities[0].probability)}`;

    title.append(titleText, topProbability);

    const pillRow = document.createElement("div");
    pillRow.className = "history-pill-row";
    item.probabilities.forEach((probability, index) => {
      const pill = document.createElement("span");
      pill.className = `history-pill${index === 0 ? " is-top" : ""}`;
      pill.textContent = `${probability.className} ${formatPercent(probability.probability)}`;
      pillRow.append(pill);
    });

    body.append(title, pillRow);
    article.append(thumb, body);
    els.predictionHistoryList.append(article);
  });
}

function renderAll() {
  renderClassCards();
  renderClassSelect();
  renderTrainingSummary();
  renderHistory();
}

function isImageFile(file) {
  return file && file.type.startsWith("image/");
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(new Error("이미지 파일을 읽는 중 문제가 생겼습니다.")));
    reader.readAsDataURL(file);
  });
}

async function handleTrainingFiles(classId, fileList) {
  const files = [...fileList];

  if (files.length === 0) {
    return;
  }

  const imageFiles = files.filter(isImageFile);

  if (imageFiles.length !== files.length) {
    showStatus("이미지 형식이 아닌 파일은 제외했습니다.", "warning");
  }

  if (imageFiles.length === 0) {
    showStatus("JPG, PNG, WebP 같은 이미지 파일을 선택해 주세요.", "warning");
    return;
  }

  try {
    for (const file of imageFiles) {
      const dataUrl = await readFileAsDataUrl(file);
      addSampleToClass(classId, dataUrl, "이미지 업로드");
    }

    const classItem = getClassById(classId);
    showStatus(
      `"${getClassName(classItem)}" 클래스에 이미지 ${imageFiles.length}장을 추가했습니다.`,
      "success",
    );
  } catch (error) {
    showStatus(error.message, "error");
  }
}

// 하나의 웹캠 스트림을 데이터 수집 탭과 예측 탭에서 함께 사용한다.
// 브라우저 권한 요청을 여러 번 띄우지 않게 하려는 목적이다.
async function startWebcam() {
  if (!navigator.mediaDevices?.getUserMedia) {
    showStatus("이 브라우저에서는 웹캠을 사용할 수 없습니다.", "error");
    return false;
  }

  if (!window.isSecureContext && window.location.hostname !== "localhost") {
    showStatus("웹캠은 보안 연결 또는 localhost에서 가장 안정적으로 작동합니다.", "warning");
  }

  if (!state.webcamStream) {
    try {
      state.webcamStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "environment",
        },
        audio: false,
      });
    } catch (error) {
      showStatus("웹캠 권한을 얻지 못했습니다. 브라우저 권한을 확인해 주세요.", "error");
      return false;
    }
  }

  [els.collectionVideo, els.predictionVideo].forEach((video) => {
    video.srcObject = state.webcamStream;
    video.parentElement.classList.add("has-stream");
    video.play();
  });

  els.webcamState.textContent = "켜짐";
  els.webcamState.classList.add("is-ready");
  showStatus("웹캠이 켜졌습니다. 원하는 클래스나 예측 화면에서 캡처할 수 있습니다.", "success");
  return true;
}

function captureFromVideo(video) {
  if (!state.webcamStream || video.readyState < 2) {
    showStatus("먼저 웹캠을 켜고 화면이 표시될 때까지 기다려 주세요.", "warning");
    return "";
  }

  const canvas = els.captureCanvas;
  const ctx = canvas.getContext("2d");
  canvas.width = CAPTURE_SIZE;
  canvas.height = CAPTURE_SIZE;

  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;
  const sourceSize = Math.min(sourceWidth, sourceHeight);
  const sx = (sourceWidth - sourceSize) / 2;
  const sy = (sourceHeight - sourceSize) / 2;

  ctx.drawImage(video, sx, sy, sourceSize, sourceSize, 0, 0, CAPTURE_SIZE, CAPTURE_SIZE);
  return canvas.toDataURL("image/jpeg", 0.92);
}

function captureTrainingImage() {
  const classId = Number(els.collectionClassSelect.value);

  if (!classId) {
    showStatus("웹캠 이미지를 추가할 클래스를 먼저 만들어 주세요.", "warning");
    return;
  }

  const dataUrl = captureFromVideo(els.collectionVideo);

  if (!dataUrl) {
    return;
  }

  addSampleToClass(classId, dataUrl, "웹캠");
  showStatus("웹캠 이미지를 학습 데이터에 추가했습니다.", "success");
}

// 학습 전 검사는 학생에게 바로 고칠 수 있는 형태의 메시지를 돌려준다.
// 클래스 수와 클래스별 이미지 수가 충분하지 않으면 TensorFlow 학습을 시작하지 않는다.
function validateTrainingData() {
  if (state.classes.length < 2) {
    return "클래스가 2개 미만이면 학습할 수 없습니다. 클래스를 2개 이상 만들어 주세요.";
  }

  const lacking = state.classes.filter(
    (classItem) => classItem.samples.length < MIN_IMAGES_PER_CLASS,
  );

  if (lacking.length > 0) {
    const detail = lacking
      .map((classItem) => `${getClassName(classItem)} ${classItem.samples.length}장`)
      .join(", ");
    return `클래스별 이미지가 부족합니다. 각 클래스에 ${MIN_IMAGES_PER_CLASS}장 이상 필요합니다. 현재 부족한 클래스: ${detail}`;
  }

  return "";
}

async function ensureLibrariesReady() {
  if (!window.tf || !window.mobilenet) {
    throw new Error("TensorFlow.js 또는 MobileNet 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.");
  }

  if (!state.featureExtractor) {
    showStatus("MobileNet 이미지 특징 추출 모델을 불러오는 중입니다.", "warning");
    state.featureExtractor = await mobilenet.load({ version: 2, alpha: 1.0 });
  }
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", () => reject(new Error("이미지를 모델 입력으로 불러오지 못했습니다.")));
    img.src = dataUrl;
  });
}

async function extractEmbedding(dataUrl) {
  const image = await loadImage(dataUrl);

  // MobileNet의 마지막 분류층 대신 중간 특징 벡터를 사용한다.
  // 학생들이 모은 작은 데이터셋으로도 새 분류기를 빠르게 학습할 수 있는 전이학습 방식이다.
  return tf.tidy(() => state.featureExtractor.infer(image, true));
}

function createClassifier(classCount) {
  const model = tf.sequential();

  model.add(
    tf.layers.dense({
      inputShape: [1024],
      units: 128,
      activation: "relu",
      kernelRegularizer: tf.regularizers.l2({ l2: 0.0001 }),
    }),
  );
  model.add(tf.layers.dropout({ rate: 0.25 }));
  model.add(tf.layers.dense({ units: classCount, activation: "softmax" }));
  model.compile({
    optimizer: tf.train.adam(0.0007),
    loss: "categoricalCrossentropy",
    metrics: ["accuracy"],
  });

  return model;
}

function setTrainingProgress(epoch, epochs, logs) {
  const percent = Math.round(((epoch + 1) / epochs) * 100);
  els.progressText.textContent = `Epoch ${epoch + 1}/${epochs} 진행`;
  els.progressPercent.textContent = `${percent}%`;
  els.trainingProgressBar.style.width = `${percent}%`;

  const row = document.createElement("div");
  const accuracy = logs.acc ?? logs.accuracy ?? 0;
  row.textContent = `Epoch ${epoch + 1}: loss ${logs.loss.toFixed(4)}, accuracy ${(accuracy * 100).toFixed(1)}%`;
  els.trainingLog.prepend(row);
}

async function trainModel() {
  const validationMessage = validateTrainingData();

  if (validationMessage) {
    showStatus(validationMessage, "warning");
    window.alert(validationMessage);
    return;
  }

  const epochs = Number(els.epochInput.value) || 20;
  const batchSize = Number(els.batchSizeInput.value) || 16;

  if (epochs < 1 || batchSize < 1) {
    showStatus("Epoch와 batch size는 1 이상의 숫자로 입력해 주세요.", "warning");
    return;
  }

  els.trainModelButton.disabled = true;
  els.progressText.textContent = "학습 데이터를 특징 벡터로 변환하는 중입니다.";
  els.progressPercent.textContent = "0%";
  els.trainingProgressBar.style.width = "0%";
  els.trainingLog.replaceChildren();

  try {
    await ensureLibrariesReady();

    const embeddings = [];
    const labelIndices = [];

    for (let classIndex = 0; classIndex < state.classes.length; classIndex += 1) {
      const classItem = state.classes[classIndex];

      for (let sampleIndex = 0; sampleIndex < classItem.samples.length; sampleIndex += 1) {
        const sample = classItem.samples[sampleIndex];
        els.progressText.textContent = `"${getClassName(classItem)}" 이미지 ${sampleIndex + 1}/${classItem.samples.length} 특징 추출 중`;
        embeddings.push(await extractEmbedding(sample.dataUrl));
        labelIndices.push(classIndex);
        await tf.nextFrame();
      }
    }

    const xs = tf.concat(embeddings);
    embeddings.forEach((tensor) => tensor.dispose());

    const labelsTensor = tf.tensor1d(labelIndices, "int32");
    const ys = tf.oneHot(labelsTensor, state.classes.length);
    labelsTensor.dispose();

    if (state.classifier) {
      state.classifier.dispose();
    }

    state.classifier = createClassifier(state.classes.length);
    els.modelState.textContent = "학습 중";
    els.modelState.classList.remove("is-ready");
    showStatus("수집한 이미지로 새 분류기를 학습하는 중입니다.", "warning");

    await state.classifier.fit(xs, ys, {
      epochs,
      batchSize,
      shuffle: true,
      callbacks: {
        onEpochEnd: async (epoch, logs) => {
          setTrainingProgress(epoch, epochs, logs);
          await tf.nextFrame();
        },
      },
    });

    xs.dispose();
    ys.dispose();

    state.trainingInfo = {
      trainedAt: new Date().toISOString(),
      epochs,
      batchSize,
      classCount: state.classes.length,
      totalImages: getTotalImageCount(),
      classStats: state.classes.map((classItem) => ({
        id: classItem.id,
        name: getClassName(classItem),
        count: classItem.samples.length,
      })),
    };

    els.modelState.textContent = "학습 완료";
    els.modelState.classList.add("is-ready");
    els.progressText.textContent = "모델 학습 완료";
    els.progressPercent.textContent = "100%";
    els.trainingProgressBar.style.width = "100%";
    showStatus("모델 학습 완료: 이제 예측하기 탭에서 새 이미지를 분류할 수 있습니다.", "success");
    renderTrainingSummary();
  } catch (error) {
    console.error(error);
    showStatus(error.message || "모델 학습 중 오류가 생겼습니다.", "error");
  } finally {
    els.trainModelButton.disabled = false;
  }
}

// 예측 결과는 화면 표시용으로 정렬하고, 같은 객체를 예측 기록과 PDF 보고서에 재사용한다.
// 이렇게 하면 학생이 본 결과와 보고서에 들어가는 결과가 달라지지 않는다.
function validatePredictionReady() {
  if (!state.classifier || !state.trainingInfo) {
    showStatus("모델 학습 전에는 예측할 수 없습니다. 먼저 학습하기 버튼을 눌러 주세요.", "warning");
    return false;
  }

  return true;
}

async function predictImage(dataUrl, method) {
  if (!validatePredictionReady()) {
    return;
  }

  try {
    await ensureLibrariesReady();
    const embedding = await extractEmbedding(dataUrl);
    const prediction = state.classifier.predict(embedding);
    const probabilities = await prediction.data();
    embedding.dispose();
    prediction.dispose();

    const rows = state.classes
      .map((classItem, index) => ({
        className: getClassName(classItem),
        probability: probabilities[index],
      }))
      .sort((a, b) => b.probability - a.probability);

    const record = {
      number: state.predictionHistory.length + 1,
      createdAt: new Date().toISOString(),
      imageDataUrl: dataUrl,
      topClass: rows[0].className,
      probabilities: rows,
      method,
    };

    state.predictionHistory.push(record);
    renderPredictionResult(record);
    renderHistory();
    renderTrainingSummary();
    showStatus(`${record.number}번째 예측 결과를 기록했습니다.`, "success");
  } catch (error) {
    console.error(error);
    showStatus(error.message || "예측 중 오류가 생겼습니다.", "error");
  }
}

function renderPredictionResult(record) {
  els.predictionPreviewImage.src = record.imageDataUrl;
  els.predictionPreviewImage.parentElement.classList.add("has-image");
  els.topPredictionLabel.textContent = record.topClass;
  els.probabilityList.replaceChildren();

  record.probabilities.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = `probability-row${index === 0 ? " is-top" : ""}`;

    const head = document.createElement("div");
    head.className = "probability-row-head";

    const name = document.createElement("span");
    name.textContent = item.className;

    const percent = document.createElement("strong");
    percent.textContent = formatPercent(item.probability);

    const track = document.createElement("div");
    track.className = "bar-track";

    const fill = document.createElement("div");
    fill.className = "bar-fill";
    fill.style.width = formatPercent(item.probability);

    head.append(name, percent);
    track.append(fill);
    row.append(head, track);
    els.probabilityList.append(row);
  });
}

async function predictFromWebcam() {
  if (!validatePredictionReady()) {
    return;
  }

  const started = await startWebcam();

  if (!started) {
    return;
  }

  const dataUrl = captureFromVideo(els.predictionVideo);

  if (dataUrl) {
    await predictImage(dataUrl, "웹캠");
  }
}

async function handlePredictionFile(file) {
  if (!file) {
    state.pendingPredictionImage = null;
    return;
  }

  if (!isImageFile(file)) {
    showStatus("이미지 파일 형식이 아닙니다. JPG, PNG, WebP 파일을 선택해 주세요.", "warning");
    state.pendingPredictionImage = null;
    return;
  }

  const dataUrl = await readFileAsDataUrl(file);
  state.pendingPredictionImage = {
    dataUrl,
    method: "이미지 업로드",
  };
  els.predictionPreviewImage.src = dataUrl;
  els.predictionPreviewImage.parentElement.classList.add("has-image");
  showStatus("예측할 이미지가 준비되었습니다. 업로드 이미지 예측하기 버튼을 눌러 주세요.", "success");
}

async function predictFromUploadedFile() {
  if (!validatePredictionReady()) {
    return;
  }

  if (!state.pendingPredictionImage) {
    showStatus("먼저 예측할 이미지 파일을 선택해 주세요.", "warning");
    return;
  }

  await predictImage(state.pendingPredictionImage.dataUrl, state.pendingPredictionImage.method);
}

function resetTrainingData() {
  const shouldReset = window.confirm("클래스와 수집한 학습 이미지를 모두 초기화할까요?");

  if (!shouldReset) {
    return;
  }

  if (state.classifier) {
    state.classifier.dispose();
  }

  state.classes = [];
  state.nextClassId = 1;
  state.classifier = null;
  state.trainingInfo = null;
  state.pendingPredictionImage = null;
  els.modelState.textContent = "학습 전";
  els.modelState.classList.remove("is-ready");
  els.progressText.textContent = "아직 학습을 시작하지 않았습니다.";
  els.progressPercent.textContent = "0%";
  els.trainingProgressBar.style.width = "0%";
  els.trainingLog.replaceChildren();
  els.topPredictionLabel.textContent = "-";
  els.probabilityList.replaceChildren();
  els.predictionPreviewImage.parentElement.classList.remove("has-image");
  renderAll();
  showStatus("학습 데이터를 초기화했습니다. 예측 기록은 별도 버튼으로 지울 수 있습니다.", "success");
}

function clearPredictionHistory() {
  if (state.predictionHistory.length === 0) {
    showStatus("초기화할 예측 기록이 없습니다.");
    return;
  }

  const shouldClear = window.confirm("누적된 예측 기록을 모두 지울까요?");

  if (!shouldClear) {
    return;
  }

  state.predictionHistory = [];
  renderHistory();
  renderTrainingSummary();
  showStatus("예측 기록을 초기화했습니다.", "success");
}

function switchTab(tabName) {
  document.querySelectorAll("[data-tab-target]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tabTarget === tabName);
  });

  document.querySelectorAll("[data-tab-panel]").forEach((panel) => {
    const isActive = panel.dataset.tabPanel === tabName;
    panel.hidden = !isActive;
    panel.classList.toggle("is-active", isActive);
  });
}

function buildAutoSummary() {
  const classCount = state.trainingInfo?.classCount || state.classes.length;
  const totalImages = state.trainingInfo?.totalImages || getTotalImageCount();
  const predictionCount = state.predictionHistory.length;

  return `이 활동에서는 총 ${classCount}개의 클래스를 분류하는 이미지 인공지능 모델을 만들었다. 총 ${totalImages}장의 이미지를 수집하여 학습하였고, 학습 후 ${predictionCount}번의 예측 활동을 수행하였다.`;
}

// html2canvas가 읽을 수 있도록 보고서 전용 DOM을 잠깐 만든 뒤,
// jsPDF에 이미지로 넣어 학생이 바로 저장할 수 있는 PDF 파일을 만든다.
function makePdfReportElement() {
  const report = document.createElement("article");
  report.className = "pdf-report";
  report.style.position = "fixed";
  report.style.left = "-10000px";
  report.style.top = "0";
  report.setAttribute("aria-hidden", "true");

  const generatedAt = new Date();
  const trainingInfo = state.trainingInfo || {
    epochs: Number(els.epochInput.value) || 20,
    batchSize: Number(els.batchSizeInput.value) || 16,
    classCount: state.classes.length,
    totalImages: getTotalImageCount(),
    classStats: state.classes.map((classItem) => ({
      name: getClassName(classItem),
      count: classItem.samples.length,
    })),
  };

  const topic = els.reportTopic.value.trim() || "작성하지 않음";
  const rows = trainingInfo.classStats
    .map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${item.count}장</td></tr>`)
    .join("");

  const classBlocks = state.classes
    .map((classItem) => {
      const thumbs = classItem.samples
        .slice(0, MAX_PDF_THUMBNAILS_PER_CLASS)
        .map((sample) => `<img src="${sample.dataUrl}" alt="${escapeHtml(getClassName(classItem))} 대표 이미지" />`)
        .join("");

      return `
        <h3>${escapeHtml(getClassName(classItem))} · ${classItem.samples.length}장</h3>
        <div class="pdf-thumb-row">${thumbs || "대표 이미지 없음"}</div>
      `;
    })
    .join("");

  const historyRows = state.predictionHistory
    .map((item) => {
      const probabilityText = item.probabilities
        .map((probability) => `${escapeHtml(probability.className)} ${formatPercent(probability.probability)}`)
        .join("<br />");

      return `
        <tr>
          <td>${item.number}</td>
          <td>${escapeHtml(formatDateTime(item.createdAt))}</td>
          <td><img class="pdf-history-image" src="${item.imageDataUrl}" alt="${item.number}번 예측 이미지" /></td>
          <td>${escapeHtml(item.topClass)}</td>
          <td>${probabilityText}</td>
          <td>${escapeHtml(item.method)}</td>
        </tr>
      `;
    })
    .join("");

  report.innerHTML = `
    <h1>이미지 지도학습 인공지능 활동 보고서</h1>

    <h2>1. 기본 정보</h2>
    <table>
      <tbody>
        <tr><th>주제</th><td>${escapeHtml(topic)}</td></tr>
        <tr><th>생성 일시</th><td>${escapeHtml(formatDateTime(generatedAt))}</td></tr>
        <tr><th>클래스 수</th><td>${trainingInfo.classCount}개</td></tr>
        <tr><th>총 학습 이미지 수</th><td>${trainingInfo.totalImages}장</td></tr>
        <tr><th>학습 설정값</th><td>epoch ${trainingInfo.epochs}, batch size ${trainingInfo.batchSize}</td></tr>
      </tbody>
    </table>

    <h2>2. 학습 데이터 구성</h2>
    <table>
      <thead>
        <tr><th>클래스 이름</th><th>이미지 수</th></tr>
      </thead>
      <tbody>${rows || "<tr><td colspan=\"2\">학습 데이터 없음</td></tr>"}</tbody>
    </table>
    ${classBlocks || "<p>수집된 대표 이미지가 없습니다.</p>"}

    <h2>3. 예측 활동 기록</h2>
    <table>
      <thead>
        <tr>
          <th>번호</th>
          <th>예측 시간</th>
          <th>이미지</th>
          <th>최종 예측 클래스</th>
          <th>클래스별 확률</th>
          <th>예측 방식</th>
        </tr>
      </thead>
      <tbody>${historyRows || "<tr><td colspan=\"6\">예측 기록 없음</td></tr>"}</tbody>
    </table>

    <h2>4. 학생 작성 내용</h2>
    <h3>인공지능 활용 방안</h3>
    <p>${escapeHtml(els.reportUseCase.value.trim() || "작성하지 않음")}</p>
    <h3>잘된 점</h3>
    <p>${escapeHtml(els.reportStrength.value.trim() || "작성하지 않음")}</p>
    <h3>한계점 및 개선점</h3>
    <p>${escapeHtml(els.reportLimit.value.trim() || "작성하지 않음")}</p>
    <h3>배운 점 및 느낀 점</h3>
    <p>${escapeHtml(els.reportReflection.value.trim() || "작성하지 않음")}</p>

    <h2>5. 자동 정리 문장</h2>
    <p>${escapeHtml(buildAutoSummary())}</p>
  `;

  return report;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
    .replaceAll("\n", "<br />");
}

function setPdfBusy(isBusy) {
  els.generatePdfButton.disabled = isBusy;
  els.generatePdfButton.textContent = isBusy ? "생성 중..." : "보고서 PDF 생성";
  els.pdfProgress.hidden = !isBusy;
}

function waitForPaint() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
  });
}

async function generatePdf() {
  if (!window.html2canvas || !window.jspdf?.jsPDF) {
    showStatus("PDF 생성 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.", "error");
    return;
  }

  setPdfBusy(true);

  try {
    await waitForPaint();
    const report = makePdfReportElement();
    document.body.append(report);

    const canvas = await html2canvas(report, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
    });

    report.remove();

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = 210;
    const pageHeight = 297;
    const imageWidth = pageWidth;
    const imageHeight = (canvas.height * imageWidth) / canvas.width;
    const imageData = canvas.toDataURL("image/png");
    let heightLeft = imageHeight;
    let position = 0;

    pdf.addImage(imageData, "PNG", 0, position, imageWidth, imageHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imageHeight;
      pdf.addPage();
      pdf.addImage(imageData, "PNG", 0, position, imageWidth, imageHeight);
      heightLeft -= pageHeight;
    }

    const dateText = new Date().toISOString().slice(0, 10);
    pdf.save(`이미지지도학습_활동보고서_${dateText}.pdf`);
    showStatus("보고서 PDF를 생성했습니다.", "success");
  } catch (error) {
    console.error(error);
    showStatus("보고서 PDF를 생성하는 중 문제가 생겼습니다. 예측 기록이 너무 많다면 일부를 정리한 뒤 다시 시도해 주세요.", "error");
  } finally {
    setPdfBusy(false);
  }
}

function wireEvents() {
  document.querySelectorAll("[data-tab-target]").forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.tabTarget));
  });

  els.addClassButton.addEventListener("click", () => addClass(els.classNameInput.value));
  els.classNameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      addClass(els.classNameInput.value);
    }
  });

  els.startWebcamButton.addEventListener("click", startWebcam);
  els.startPredictionWebcamButton.addEventListener("click", startWebcam);
  els.captureImageButton.addEventListener("click", captureTrainingImage);
  els.resetTrainingDataButton.addEventListener("click", resetTrainingData);
  els.trainModelButton.addEventListener("click", trainModel);
  els.predictWebcamButton.addEventListener("click", predictFromWebcam);
  els.predictionFileInput.addEventListener("change", () => handlePredictionFile(els.predictionFileInput.files[0]));
  els.predictFileButton.addEventListener("click", predictFromUploadedFile);
  els.clearHistoryButton.addEventListener("click", clearPredictionHistory);
  els.generatePdfButton.addEventListener("click", generatePdf);
}

function addStarterClasses() {
  state.classes.push(
    {
      id: state.nextClassId,
      name: "클래스 1",
      samples: [],
    },
    {
      id: state.nextClassId + 1,
      name: "클래스 2",
      samples: [],
    },
  );
  state.nextClassId += 2;
}

addStarterClasses();
wireEvents();
renderAll();
wireGithubLinks();
