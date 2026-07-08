const MANUAL_GITHUB_REPOSITORY_URL = "https://github.com/mathtjungsw/math-class-webtools";
const MIN_IMAGES_PER_CLASS = 5;
const CAPTURE_SIZE = 224;
const MAX_PDF_THUMBNAILS_PER_CLASS = 5;
const MOBILENET_CONFIG = { version: 2, alpha: 1.0 };
const PDF_FONT_URL = "./assets/fonts/NotoSansKR-VF.ttf";
const PDF_FONT_NAME = "NotoSansKR";
let pdfFontBase64Promise = null;

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
  pendingPredictionRead: null,
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

function formatProbability(value) {
  return Number.isFinite(value) ? formatPercent(value) : "0%";
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

    const uploadText = document.createElement("span");
    uploadText.textContent = "이미지 업로드";

    const uploadInput = document.createElement("input");
    uploadInput.type = "file";
    uploadInput.accept = "image/*";
    uploadInput.multiple = true;
    uploadInput.addEventListener("change", () => handleTrainingFiles(classItem.id, uploadInput, uploadText, uploadLabel));
    uploadLabel.append(uploadText, uploadInput);

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
    strong.textContent = `${item.number}. ${item.topClass} · ${formatProbability(item.topProbability)}`;
    meta.textContent = `${formatDateTime(item.createdAt)} · ${item.method}`;
    titleText.append(strong, meta);

    const topProbability = document.createElement("span");
    topProbability.className = "history-pill is-top";
    topProbability.textContent = `${formatProbability(item.topProbability ?? item.probabilities[0]?.probability)}`;

    title.append(titleText, topProbability);

    const pillRow = document.createElement("div");
    pillRow.className = "history-pill-row";
    item.probabilities.forEach((probability, index) => {
      const pill = document.createElement("span");
      pill.className = `history-pill${index === 0 ? " is-top" : ""}`;
      pill.textContent = `${probability.className} ${formatProbability(probability.probability)}`;
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
  if (!file) {
    return false;
  }

  if (file.type?.startsWith("image/")) {
    return true;
  }

  return /\.(avif|bmp|gif|heic|heif|jpe?g|png|webp)$/i.test(file.name || "");
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(new Error("이미지 파일을 읽는 중 문제가 생겼습니다.")));
    reader.readAsDataURL(file);
  });
}

function setTrainingUploadBusy(uploadInput, uploadText, uploadLabel, isBusy) {
  if (uploadInput) {
    uploadInput.disabled = isBusy;
  }

  if (uploadText) {
    uploadText.textContent = isBusy ? "업로드 중..." : "이미지 업로드";
  }

  uploadLabel?.classList.toggle("is-busy", isBusy);
  uploadLabel?.setAttribute("aria-busy", String(isBusy));
}

async function handleTrainingFiles(classId, fileInputOrList, uploadText = null, uploadLabel = null) {
  const fileList = fileInputOrList?.files || fileInputOrList;
  const files = fileList ? [...fileList] : [];

  if (files.length === 0) {
    return;
  }

  const uploadInput = fileInputOrList instanceof HTMLInputElement ? fileInputOrList : null;

  const imageFiles = files.filter(isImageFile);

  if (imageFiles.length !== files.length) {
    showStatus("이미지 형식이 아닌 파일은 제외했습니다.", "warning");
  }

  if (imageFiles.length === 0) {
    showStatus("JPG, PNG, WebP 같은 이미지 파일을 선택해 주세요.", "warning");
    return;
  }

  const classItem = getClassById(classId);

  if (!classItem) {
    showStatus("이미지를 추가할 클래스를 먼저 선택해 주세요.", "warning");
    return;
  }

  setTrainingUploadBusy(uploadInput, uploadText, uploadLabel, true);

  try {
    // 갤러리에서 여러 장을 고를 때는 파일 input이 살아 있는 동안 먼저 모두 읽는다.
    // 읽는 중간에 카드 전체를 다시 그리면 일부 브라우저에서 남은 파일 접근이나 다음 클릭이 끊길 수 있다.
    const samples = [];

    for (const file of imageFiles) {
      const dataUrl = await readFileAsDataUrl(file);
      samples.push({
        id: window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
        dataUrl,
        source: "이미지 업로드",
        createdAt: new Date().toISOString(),
      });
    }

    classItem.samples.push(...samples);
    markModelStale(`"${getClassName(classItem)}" 클래스에 이미지가 추가되었습니다.`);
    renderAll();
    showStatus(
      `"${getClassName(classItem)}" 클래스에 이미지 ${imageFiles.length}장을 추가했습니다.`,
      "success",
    );
  } catch (error) {
    showStatus(error.message || "이미지 파일을 읽는 중 문제가 생겼습니다.", "error");
  } finally {
    setTrainingUploadBusy(uploadInput, uploadText, uploadLabel, false);

    if (uploadInput) {
      uploadInput.value = "";
    }
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

  [els.collectionVideo, els.predictionVideo].forEach(async (video) => {
    if (video.srcObject !== state.webcamStream) {
      video.srcObject = state.webcamStream;
    }

    video.parentElement.classList.add("has-stream");

    try {
      await video.play();
    } catch (error) {
      console.warn("webcam video play failed", error);
    }
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

function waitForVideoFrame(video, timeoutMs = 3000) {
  if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    let settled = false;

    function finish(isReady) {
      if (settled) {
        return;
      }

      settled = true;
      video.removeEventListener("loadeddata", handleReady);
      video.removeEventListener("canplay", handleReady);
      resolve(isReady);
    }

    function handleReady() {
      finish(video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0);
    }

    video.addEventListener("loadeddata", handleReady);
    video.addEventListener("canplay", handleReady);
    window.setTimeout(() => finish(false), timeoutMs);
  });
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
    state.featureExtractor = await mobilenet.load(MOBILENET_CONFIG);
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
  // 학습과 예측 모두 이 함수만 사용하므로 같은 MobileNet 버전, 같은 레이어, 같은 전처리를 거친다.
  return tf.tidy(() => state.featureExtractor.infer(image, true));
}

function createClassifier(classCount, featureDim) {
  const model = tf.sequential();

  model.add(
    tf.layers.dense({
      inputShape: [featureDim],
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
  els.modelState.textContent = "학습 준비";
  els.modelState.classList.remove("is-ready");

  if (state.classifier) {
    state.classifier.dispose();
    state.classifier = null;
    state.trainingInfo = null;
  }

  const embeddings = [];
  let xs = null;
  let ys = null;
  let labelsTensor = null;
  let tensorsDisposed = false;

  function disposeTrainingTensors() {
    if (tensorsDisposed) {
      return;
    }

    embeddings.forEach((tensor) => tensor.dispose());
    xs?.dispose();
    ys?.dispose();
    labelsTensor?.dispose();
    tensorsDisposed = true;
  }

  try {
    await ensureLibrariesReady();

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

    const featureDim = embeddings[0]?.shape?.[1];

    if (!featureDim) {
      throw new Error("이미지 특징 벡터의 차원을 확인하지 못했습니다. 이미지를 다시 추가한 뒤 학습해 주세요.");
    }

    const hasMismatchedFeature = embeddings.some((embedding) => embedding.shape[1] !== featureDim);

    if (hasMismatchedFeature) {
      throw new Error("학습 이미지의 특징 벡터 차원이 서로 다릅니다. 같은 MobileNet 설정으로 다시 학습해 주세요.");
    }

    xs = tf.concat(embeddings);
    embeddings.forEach((tensor) => tensor.dispose());
    embeddings.length = 0;

    labelsTensor = tf.tensor1d(labelIndices, "int32");
    ys = tf.oneHot(labelsTensor, state.classes.length);
    labelsTensor.dispose();
    labelsTensor = null;

    state.classifier = createClassifier(state.classes.length, featureDim);
    els.modelState.textContent = "학습 중";
    els.modelState.classList.remove("is-ready");
    showStatus(`수집한 이미지로 ${featureDim}차원 특징 벡터 분류기를 학습하는 중입니다.`, "warning");

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

    disposeTrainingTensors();

    state.trainingInfo = {
      trainedAt: new Date().toISOString(),
      epochs,
      batchSize,
      featureDim,
      mobileNet: { ...MOBILENET_CONFIG },
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
    if (state.classifier && !state.trainingInfo) {
      state.classifier.dispose();
      state.classifier = null;
      els.modelState.textContent = "학습 실패";
      els.modelState.classList.remove("is-ready");
    }
    showStatus(error.message || "모델 학습 중 오류가 생겼습니다.", "error");
  } finally {
    disposeTrainingTensors();
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

  const classNames = getPredictionClassNames();

  if (classNames.length === 0) {
    showStatus("예측에 사용할 클래스 이름이 없습니다. 클래스를 확인한 뒤 모델을 다시 학습해 주세요.", "warning");
    return false;
  }

  return true;
}

function getPredictionClassNames() {
  const trainedNames = state.trainingInfo?.classStats
    ?.map((classItem) => String(classItem.name || "").trim())
    .filter(Boolean);

  if (trainedNames?.length) {
    return trainedNames;
  }

  return state.classes.map(getClassName).filter(Boolean);
}

function buildPredictionRows(probabilities, classNames) {
  const probabilityValues = [...probabilities];

  if (probabilityValues.length === 0) {
    throw new Error("예측 확률 배열이 비어 있습니다. 모델을 다시 학습해 주세요.");
  }

  if (probabilityValues.length !== classNames.length) {
    throw new Error(
      `예측 확률 개수(${probabilityValues.length})와 클래스 이름 개수(${classNames.length})가 다릅니다. 모델을 다시 학습해 주세요.`,
    );
  }

  const invalidProbability = probabilityValues.some((probability) => !Number.isFinite(probability));

  if (invalidProbability) {
    throw new Error("예측 확률에 유효하지 않은 값이 포함되어 있습니다. 학습 데이터를 확인한 뒤 다시 학습해 주세요.");
  }

  const rowsInClassOrder = probabilityValues.map((probability, index) => ({
    index,
    className: classNames[index],
    probability,
  }));

  const rowsByProbability = [...rowsInClassOrder].sort((a, b) => b.probability - a.probability);

  return {
    rowsInClassOrder,
    rowsByProbability,
    top: rowsByProbability[0],
  };
}

function showPredictionPreview(dataUrl) {
  if (!dataUrl) {
    return;
  }

  els.predictionPreviewImage.src = dataUrl;
  els.predictionPreviewImage.parentElement.classList.add("has-image");
}

function renderPredictionError(message) {
  els.topPredictionLabel.textContent = "예측 실패";
  els.probabilityList.replaceChildren();

  const errorMessage = document.createElement("p");
  errorMessage.className = "empty-message";
  errorMessage.textContent = message;
  els.probabilityList.append(errorMessage);
}

function disposePredictionTensor(prediction) {
  if (Array.isArray(prediction)) {
    prediction.forEach((tensor) => tensor?.dispose?.());
    return;
  }

  prediction?.dispose?.();
}

async function predictImage(dataUrl, method) {
  if (!validatePredictionReady()) {
    return;
  }

  if (!dataUrl) {
    const message = "예측할 이미지가 준비되지 않았습니다. 웹캠 화면이나 업로드 이미지를 확인해 주세요.";
    showStatus(message, "warning");
    renderPredictionError(message);
    return;
  }

  showPredictionPreview(dataUrl);
  els.predictWebcamButton.disabled = true;
  els.predictFileButton.disabled = true;
  let embedding = null;
  let prediction = null;

  try {
    await ensureLibrariesReady();

    if (!state.featureExtractor) {
      throw new Error("이미지 특징 추출 모델이 준비되지 않았습니다. 잠시 뒤 다시 시도해 주세요.");
    }

    const classNames = getPredictionClassNames();
    embedding = await extractEmbedding(dataUrl);
    const actualFeatureDim = embedding.shape[1];

    if (state.trainingInfo.featureDim && actualFeatureDim !== state.trainingInfo.featureDim) {
      throw new Error(
        `예측 이미지의 특징 벡터 차원(${actualFeatureDim})이 학습된 모델의 입력 차원(${state.trainingInfo.featureDim})과 다릅니다. 모델을 다시 학습해 주세요.`,
      );
    }

    prediction = state.classifier.predict(embedding);
    const predictionTensor = Array.isArray(prediction) ? prediction[0] : prediction;

    if (!predictionTensor?.data) {
      throw new Error("모델 예측 결과를 읽지 못했습니다. 모델을 다시 학습해 주세요.");
    }

    const probabilities = await predictionTensor.data();
    const predictionRows = buildPredictionRows(probabilities, classNames);

    console.log("prediction", prediction);
    console.log("probabilities", [...probabilities]);
    console.log("classNames", classNames);

    const record = {
      number: state.predictionHistory.length + 1,
      createdAt: new Date().toISOString(),
      imageDataUrl: dataUrl,
      topClass: predictionRows.top.className,
      topProbability: predictionRows.top.probability,
      probabilities: predictionRows.rowsByProbability,
      probabilitiesByClass: predictionRows.rowsInClassOrder,
      method,
    };

    state.predictionHistory.push(record);
    renderPredictionResult(record);
    renderHistory();
    renderTrainingSummary();
    showStatus(`${record.number}번째 예측 결과를 기록했습니다.`, "success");
  } catch (error) {
    console.error(error);
    const message = error.message || "예측 중 오류가 생겼습니다.";
    showStatus(message, "error");
    renderPredictionError(message);
  } finally {
    embedding?.dispose();
    disposePredictionTensor(prediction);
    els.predictWebcamButton.disabled = false;
    els.predictFileButton.disabled = false;
  }
}

function renderPredictionResult(record) {
  showPredictionPreview(record.imageDataUrl);
  els.topPredictionLabel.textContent = `${record.topClass} · ${formatProbability(record.topProbability)}`;
  els.probabilityList.replaceChildren();

  if (!record.probabilities.length) {
    const empty = document.createElement("p");
    empty.className = "empty-message";
    empty.textContent = "표시할 클래스별 확률이 없습니다.";
    els.probabilityList.append(empty);
    return;
  }

  record.probabilities.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = `probability-row${index === 0 ? " is-top" : ""}`;

    const head = document.createElement("div");
    head.className = "probability-row-head";

    const name = document.createElement("span");
    name.textContent = item.className;

    const percent = document.createElement("strong");
    percent.textContent = formatProbability(item.probability);

    const track = document.createElement("div");
    track.className = "bar-track";

    const fill = document.createElement("div");
    fill.className = "bar-fill";
    fill.style.width = formatProbability(item.probability);

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

  console.log("predictFromWebcam clicked");
  showStatus("웹캠 화면을 예측 이미지로 캡처하는 중입니다.", "warning");
  const started = await startWebcam();

  if (!started) {
    return;
  }

  const isFrameReady = await waitForVideoFrame(els.predictionVideo);

  if (!isFrameReady) {
    const message = "웹캠 화면이 아직 준비되지 않았습니다. 화면이 보인 뒤 다시 예측해 주세요.";
    showStatus(message, "warning");
    renderPredictionError(message);
    return;
  }

  const dataUrl = captureFromVideo(els.predictionVideo);

  if (dataUrl) {
    await predictImage(dataUrl, "웹캠");
    return;
  }

  renderPredictionError("웹캠 이미지를 캡처하지 못했습니다. 웹캠 권한과 화면 상태를 확인해 주세요.");
}

async function handlePredictionFile(file) {
  if (!file) {
    state.pendingPredictionImage = null;
    state.pendingPredictionRead = null;
    return;
  }

  if (!isImageFile(file)) {
    showStatus("이미지 파일 형식이 아닙니다. JPG, PNG, WebP 파일을 선택해 주세요.", "warning");
    state.pendingPredictionImage = null;
    state.pendingPredictionRead = null;
    return;
  }

  state.pendingPredictionImage = null;
  state.pendingPredictionRead = readFileAsDataUrl(file)
    .then((dataUrl) => {
      state.pendingPredictionImage = {
        dataUrl,
        method: "이미지 업로드",
      };
      showPredictionPreview(dataUrl);
      showStatus("예측할 이미지가 준비되었습니다. 업로드 이미지 예측하기 버튼을 눌러 주세요.", "success");
      return state.pendingPredictionImage;
    })
    .catch((error) => {
      state.pendingPredictionImage = null;
      showStatus(error.message || "이미지 파일을 읽지 못했습니다.", "error");
      renderPredictionError(error.message || "이미지 파일을 읽지 못했습니다.");
      return null;
    })
    .finally(() => {
      state.pendingPredictionRead = null;
    });

  await state.pendingPredictionRead;
}

async function predictFromUploadedFile() {
  if (!validatePredictionReady()) {
    return;
  }

  console.log("predictFromUploadedFile clicked");

  if (state.pendingPredictionRead) {
    showStatus("업로드 이미지를 읽는 중입니다. 잠시만 기다려 주세요.", "warning");
    await state.pendingPredictionRead;
  }

  if (!state.pendingPredictionImage) {
    showStatus("먼저 예측할 이미지 파일을 선택해 주세요.", "warning");
    renderPredictionError("먼저 예측할 이미지 파일을 선택해 주세요.");
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
  state.pendingPredictionRead = null;
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

function setPdfBusy(isBusy) {
  els.generatePdfButton.disabled = isBusy;
  els.generatePdfButton.textContent = isBusy ? "생성 중..." : "보고서 PDF 생성";
  els.pdfProgress.hidden = !isBusy;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  const chunks = [];

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    chunks.push(String.fromCharCode(...chunk));
  }

  return window.btoa(chunks.join(""));
}

async function loadPdfFontBase64() {
  if (!pdfFontBase64Promise) {
    pdfFontBase64Promise = fetch(PDF_FONT_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error("한국어 PDF 폰트 파일을 불러오지 못했습니다.");
        }

        return response.arrayBuffer();
      })
      .then(arrayBufferToBase64);
  }

  return pdfFontBase64Promise;
}

async function prepareTextPdf() {
  if (!window.jspdf?.jsPDF) {
    throw new Error("PDF 생성 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.");
  }

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({
    orientation: "p",
    unit: "mm",
    format: "a4",
    compress: true,
    putOnlyUsedFonts: true,
  });
  const fontBase64 = await loadPdfFontBase64();

  pdf.addFileToVFS("NotoSansKR-VF.ttf", fontBase64);
  pdf.addFont("NotoSansKR-VF.ttf", PDF_FONT_NAME, "normal");
  pdf.setFont(PDF_FONT_NAME, "normal");
  pdf.setLanguage("ko-KR");

  return pdf;
}

function getReportTrainingInfo() {
  return state.trainingInfo || {
    epochs: Number(els.epochInput.value) || 20,
    batchSize: Number(els.batchSizeInput.value) || 16,
    classCount: state.classes.length,
    totalImages: getTotalImageCount(),
    classStats: state.classes.map((classItem) => ({
      id: classItem.id,
      name: getClassName(classItem),
      count: classItem.samples.length,
    })),
  };
}

function getReportText(value) {
  const text = String(value || "").trim();

  return text || "작성하지 않음";
}

function makeTextPdfWriter(pdf) {
  const page = {
    width: pdf.internal.pageSize.getWidth(),
    height: pdf.internal.pageSize.getHeight(),
    margin: 16,
    y: 18,
    footer: 1,
  };
  const contentWidth = page.width - page.margin * 2;

  function drawFooter() {
    pdf.setFont(PDF_FONT_NAME, "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(130, 139, 132);
    pdf.text(String(page.footer), page.width / 2, page.height - 8, { align: "center" });
  }

  function addPage() {
    drawFooter();
    pdf.addPage();
    page.footer += 1;
    page.y = 18;
  }

  function ensureSpace(height) {
    if (page.y + height <= page.height - 18) {
      return;
    }

    addPage();
  }

  function textLines(text, maxWidth = contentWidth) {
    return pdf.splitTextToSize(String(text || ""), maxWidth);
  }

  function writeText(text, options = {}) {
    const fontSize = options.fontSize || 10;
    const lineHeight = options.lineHeight || fontSize * 0.52;
    const gap = options.gap ?? 2;
    const color = options.color || [31, 39, 34];
    const x = options.x || page.margin;
    const maxWidth = options.maxWidth || contentWidth;
    const lines = textLines(text, maxWidth);

    pdf.setFont(PDF_FONT_NAME, "normal");
    pdf.setFontSize(fontSize);
    pdf.setTextColor(...color);
    ensureSpace(lines.length * lineHeight + gap);
    pdf.text(lines, x, page.y);
    page.y += lines.length * lineHeight + gap;
  }

  function title(text) {
    writeText(text, {
      fontSize: 19,
      lineHeight: 9.5,
      gap: 7,
      color: [31, 39, 34],
    });
  }

  function section(text) {
    ensureSpace(16);
    page.y += 2;
    pdf.setDrawColor(217, 226, 219);
    pdf.line(page.margin, page.y, page.width - page.margin, page.y);
    page.y += 7;
    writeText(text, {
      fontSize: 13,
      lineHeight: 6.5,
      gap: 3,
      color: [33, 122, 85],
    });
  }

  function keyValue(label, value) {
    const labelWidth = 38;
    const valueX = page.margin + labelWidth + 3;
    const valueWidth = contentWidth - labelWidth - 3;
    const valueLines = textLines(value, valueWidth);
    const rowHeight = Math.max(8, valueLines.length * 5.2 + 3);

    ensureSpace(rowHeight);
    pdf.setFillColor(237, 245, 240);
    pdf.rect(page.margin, page.y - 4.2, labelWidth, rowHeight, "F");
    pdf.setDrawColor(217, 226, 219);
    pdf.rect(page.margin, page.y - 4.2, contentWidth, rowHeight, "S");
    pdf.line(valueX - 3, page.y - 4.2, valueX - 3, page.y - 4.2 + rowHeight);
    pdf.setFontSize(9);
    pdf.setTextColor(31, 39, 34);
    pdf.text(String(label), page.margin + 2, page.y);
    pdf.text(valueLines, valueX, page.y);
    page.y += rowHeight;
  }

  function bullet(text) {
    writeText(`- ${text}`, {
      fontSize: 9.5,
      lineHeight: 5.2,
      gap: 1.2,
    });
  }

  function image(dataUrl, x, y, width, height) {
    try {
      pdf.addImage(dataUrl, undefined, x, y, width, height);
      return true;
    } catch (error) {
      console.warn("PDF 이미지 추가 실패", error);
      return false;
    }
  }

  function imageRow(samples, options = {}) {
    const size = options.size || 18;
    const gap = options.gap || 3;
    const maxCount = Math.min(samples.length, Math.floor(contentWidth / (size + gap)));

    if (maxCount === 0) {
      bullet("대표 이미지 없음");
      return;
    }

    ensureSpace(size + 4);
    samples.slice(0, maxCount).forEach((sample, index) => {
      const x = page.margin + index * (size + gap);
      image(sample.dataUrl, x, page.y, size, size);
    });
    page.y += size + 5;
  }

  function finish() {
    drawFooter();
  }

  return {
    page,
    title,
    section,
    keyValue,
    bullet,
    writeText,
    image,
    imageRow,
    ensureSpace,
    finish,
  };
}

function writeTextPdfReport(pdf) {
  const generatedAt = new Date();
  const trainingInfo = getReportTrainingInfo();
  const writer = makeTextPdfWriter(pdf);

  writer.title("이미지 지도학습 인공지능 활동 보고서");

  writer.section("1. 기본 정보");
  writer.keyValue("주제", getReportText(els.reportTopic.value));
  writer.keyValue("생성 일시", formatDateTime(generatedAt));
  writer.keyValue("클래스 수", `${trainingInfo.classCount}개`);
  writer.keyValue("총 학습 이미지 수", `${trainingInfo.totalImages}장`);
  writer.keyValue(
    "학습 설정값",
    `epoch ${trainingInfo.epochs}, batch size ${trainingInfo.batchSize}${trainingInfo.featureDim ? `, feature ${trainingInfo.featureDim}차원` : ""}`,
  );

  writer.section("2. 학습 데이터 구성");
  if (trainingInfo.classStats.length === 0) {
    writer.bullet("학습 데이터 없음");
  } else {
    trainingInfo.classStats.forEach((item) => {
      writer.bullet(`${item.name}: ${item.count}장`);
    });
  }

  state.classes.forEach((classItem) => {
    writer.writeText(`${getClassName(classItem)} 대표 이미지`, {
      fontSize: 10.5,
      lineHeight: 5.8,
      gap: 1,
      color: [31, 39, 34],
    });
    writer.imageRow(classItem.samples.slice(0, MAX_PDF_THUMBNAILS_PER_CLASS));
  });

  writer.section("3. 예측 활동 기록");
  if (state.predictionHistory.length === 0) {
    writer.bullet("예측 기록 없음");
  } else {
    state.predictionHistory.forEach((item) => {
      writer.ensureSpace(30);
      writer.writeText(`${item.number}. ${formatDateTime(item.createdAt)} · ${item.method}`, {
        fontSize: 9.5,
        lineHeight: 5,
        gap: 1,
        color: [102, 113, 104],
      });

      const imageY = writer.page.y;
      const hasImage = writer.image(item.imageDataUrl, writer.page.margin, imageY, 18, 18);
      const textX = hasImage ? writer.page.margin + 22 : writer.page.margin;
      const textWidth = hasImage ? writer.page.width - writer.page.margin * 2 - 22 : writer.page.width - writer.page.margin * 2;
      const probabilityText = item.probabilities
        .map((probability) => `${probability.className} ${formatProbability(probability.probability)}`)
        .join(", ");

      writer.writeText(`최종 예측 클래스: ${item.topClass}`, {
        x: textX,
        maxWidth: textWidth,
        fontSize: 9.5,
        lineHeight: 5,
        gap: 1,
      });
      writer.writeText(`클래스별 확률: ${probabilityText}`, {
        x: textX,
        maxWidth: textWidth,
        fontSize: 9.5,
        lineHeight: 5,
        gap: 3,
      });
      writer.page.y = Math.max(writer.page.y, imageY + 21);
    });
  }

  writer.section("4. 학생 작성 내용");
  writer.writeText("인공지능 활용 방안", {
    fontSize: 10.5,
    lineHeight: 5.8,
    gap: 1,
    color: [33, 122, 85],
  });
  writer.writeText(getReportText(els.reportUseCase.value), { fontSize: 9.5, lineHeight: 5.3, gap: 4 });
  writer.writeText("잘된 점", {
    fontSize: 10.5,
    lineHeight: 5.8,
    gap: 1,
    color: [33, 122, 85],
  });
  writer.writeText(getReportText(els.reportStrength.value), { fontSize: 9.5, lineHeight: 5.3, gap: 4 });
  writer.writeText("한계점 및 개선점", {
    fontSize: 10.5,
    lineHeight: 5.8,
    gap: 1,
    color: [33, 122, 85],
  });
  writer.writeText(getReportText(els.reportLimit.value), { fontSize: 9.5, lineHeight: 5.3, gap: 4 });
  writer.writeText("배운 점 및 느낀 점", {
    fontSize: 10.5,
    lineHeight: 5.8,
    gap: 1,
    color: [33, 122, 85],
  });
  writer.writeText(getReportText(els.reportReflection.value), { fontSize: 9.5, lineHeight: 5.3, gap: 4 });

  writer.section("5. 자동 정리 문장");
  writer.writeText(buildAutoSummary(), { fontSize: 10, lineHeight: 5.6, gap: 2 });
  writer.finish();
}

async function generatePdf() {
  setPdfBusy(true);

  try {
    const pdf = await prepareTextPdf();
    writeTextPdfReport(pdf);
    const dateText = new Date().toISOString().slice(0, 10);

    pdf.save(`이미지지도학습_활동보고서_${dateText}.pdf`);
    showStatus("텍스트 선택이 가능한 보고서 PDF를 생성했습니다.", "success");
  } catch (error) {
    console.error(error);
    showStatus(error.message || "보고서 PDF를 생성하는 중 문제가 생겼습니다.", "error");
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
