const state = {
  serverReady: false,
  job: null,
  events: null,
  uploadRequest: null,
  downloading: false
};

const elements = {
  serverPill: document.querySelector("#serverPill"),
  ffmpegNotice: document.querySelector("#ffmpegNotice"),
  dropZone: document.querySelector("#dropZone"),
  fileInput: document.querySelector("#fileInput"),
  uploadStatus: document.querySelector("#uploadStatus"),
  uploadLabel: document.querySelector("#uploadLabel"),
  uploadPercent: document.querySelector("#uploadPercent"),
  uploadBar: document.querySelector("#uploadBar"),
  uploadCancelButton: document.querySelector("#uploadCancelButton"),
  fileCard: document.querySelector("#fileCard"),
  fileName: document.querySelector("#fileName"),
  fileCodec: document.querySelector("#fileCodec"),
  fileSize: document.querySelector("#fileSize"),
  fileDuration: document.querySelector("#fileDuration"),
  fileResolution: document.querySelector("#fileResolution"),
  replaceButton: document.querySelector("#replaceButton"),
  settingsCard: document.querySelector("#settingsCard"),
  targetSize: document.querySelector("#targetSize"),
  codecField: document.querySelector("#codecField"),
  bitrateValue: document.querySelector("#bitrateValue"),
  bitrateTechnical: document.querySelector("#bitrateTechnical"),
  stageMessage: document.querySelector("#stageMessage"),
  progressPanel: document.querySelector("#progressPanel"),
  stageLabel: document.querySelector("#stageLabel"),
  etaLabel: document.querySelector("#etaLabel"),
  progressPercent: document.querySelector("#progressPercent"),
  progressTrack: document.querySelector("#progressTrack"),
  progressBar: document.querySelector("#progressBar"),
  startButton: document.querySelector("#startButton"),
  cancelButton: document.querySelector("#cancelButton"),
  resultCard: document.querySelector("#resultCard"),
  resultSize: document.querySelector("#resultSize"),
  resultCompare: document.querySelector("#resultCompare"),
  downloadButton: document.querySelector("#downloadButton"),
  errorNotice: document.querySelector("#errorNotice"),
  errorMessage: document.querySelector("#errorMessage")
};

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "-";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit >= 3 ? 2 : unit === 2 ? 1 : 0;
  return `${value.toFixed(digits)} ${units[unit]}`;
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`
    : `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function formatEta(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "남은 시간 계산 중";
  if (seconds < 60) return `약 ${Math.max(1, Math.ceil(seconds))}초 남음`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `약 ${minutes}분 남음`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `약 ${hours}시간 ${rest}분 남음`;
}

function showError(message) {
  elements.errorMessage.textContent = message;
  elements.errorNotice.hidden = false;
  elements.errorNotice.scrollIntoView({ behavior: "smooth", block: "center" });
}

function clearError() {
  elements.errorNotice.hidden = true;
  elements.errorMessage.textContent = "";
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "서버와 통신하지 못했습니다.");
  return data;
}

async function checkServer() {
  try {
    const status = await api("/api/status");
    state.serverReady = status.ready;
    elements.serverPill.className = `server-pill ${status.ready ? "ready" : "error"}`;
    elements.serverPill.querySelector("span").textContent = status.ready ? "압축 준비 완료" : "첫 실행 준비 필요";
    elements.ffmpegNotice.hidden = status.ready;
    elements.dropZone.classList.toggle("disabled", !status.ready);
  } catch (_error) {
    state.serverReady = false;
    elements.serverPill.className = "server-pill error";
    elements.serverPill.querySelector("span").textContent = "서버 연결 오류";
    showError("로컬 서버에 연결할 수 없습니다. 실행 중인 명령창을 확인해 주세요.");
  }
}

function calculateBitrate() {
  if (!state.job?.original) {
    elements.bitrateValue.textContent = "영상 선택 후 자동 설정";
    elements.bitrateTechnical.textContent = "—";
    return null;
  }
  const targetMB = Number(elements.targetSize.value);
  const duration = state.job.original.duration;
  const safeBits = targetMB * 1024 * 1024 * 0.97 * 8;
  const audioBits = 128000 * duration;
  const bitrate = Math.floor((safeBits - audioBits) / duration / 1000);
  elements.bitrateValue.textContent = bitrate >= 100 ? "영상에 맞게 자동 설정됨" : "원하는 크기를 조금 늘려주세요";
  elements.bitrateTechnical.textContent = bitrate >= 100 ? `영상 ${bitrate.toLocaleString("ko-KR")} kbps · 음성 128 kbps · 2단계 압축` : "계산할 수 없음";
  return bitrate;
}

function setReady(job) {
  state.job = job;
  elements.fileName.textContent = job.original.name;
  elements.fileCodec.textContent = `${job.original.videoCodec.toUpperCase()} 영상 · ${job.original.audioCodec.toUpperCase()} 오디오`;
  elements.fileSize.textContent = formatBytes(job.original.size);
  elements.fileDuration.textContent = formatDuration(job.original.duration);
  elements.fileResolution.textContent = job.original.width && job.original.height ? `${job.original.width} × ${job.original.height}` : "알 수 없음";
  elements.dropZone.hidden = true;
  elements.uploadStatus.hidden = true;
  elements.fileCard.hidden = false;
  elements.settingsCard.setAttribute("aria-disabled", "false");
  elements.targetSize.disabled = false;
  elements.codecField.disabled = false;
  elements.startButton.disabled = false;
  elements.stageMessage.textContent = "원하는 크기를 확인한 뒤 시작 버튼을 눌러 주세요.";
  calculateBitrate();
}

function uploadFile(file) {
  if (!state.serverReady) return showError("FFmpeg 설치를 먼저 완료해 주세요.");
  if (!file) return;
  clearError();
  elements.resultCard.hidden = true;
  elements.dropZone.hidden = true;
  elements.uploadStatus.hidden = false;
  elements.uploadLabel.textContent = `${file.name} 불러오는 중`;
  elements.uploadPercent.textContent = "0%";
  elements.uploadBar.style.width = "0%";

  const form = new FormData();
  form.append("video", file, file.name);
  const request = new XMLHttpRequest();
  state.uploadRequest = request;
  request.open("POST", "/api/jobs/upload");
  request.upload.onprogress = (event) => {
    if (!event.lengthComputable) return;
    const progress = Math.round((event.loaded / event.total) * 100);
    elements.uploadPercent.textContent = `${progress}%`;
    elements.uploadBar.style.width = `${progress}%`;
    if (progress === 100) elements.uploadLabel.textContent = "영상 정보를 확인하는 중";
  };
  request.onload = () => {
    state.uploadRequest = null;
    try {
      const data = JSON.parse(request.responseText || "{}");
      if (request.status < 200 || request.status >= 300) throw new Error(data.error || "영상을 불러오지 못했습니다.");
      setReady(data);
    } catch (error) {
      resetSelection();
      showError(error.message);
    }
  };
  request.onerror = () => {
    state.uploadRequest = null;
    resetSelection();
    showError("영상을 불러오는 중 연결이 끊겼습니다. 다시 시도해 주세요.");
  };
  request.onabort = () => {
    state.uploadRequest = null;
    resetSelection();
  };
  request.send(form);
}

function resetSelection({ release = false } = {}) {
  const previousJob = state.job;
  if (release && previousJob && (previousJob.state === "ready" || previousJob.state === "processing")) {
    fetch(`/api/jobs/${previousJob.id}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      keepalive: true
    }).catch(() => {});
  }
  if (state.events) state.events.close();
  state.events = null;
  state.job = null;
  elements.fileInput.value = "";
  elements.dropZone.hidden = false;
  elements.uploadStatus.hidden = true;
  elements.fileCard.hidden = true;
  elements.settingsCard.setAttribute("aria-disabled", "true");
  elements.targetSize.disabled = true;
  elements.codecField.disabled = true;
  elements.startButton.disabled = true;
  elements.startButton.hidden = false;
  elements.cancelButton.hidden = true;
  elements.progressPanel.hidden = true;
  elements.resultCard.hidden = true;
  elements.stageMessage.textContent = "영상을 선택하면 시작할 수 있습니다.";
  calculateBitrate();
}

function renderJob(job) {
  state.job = job;
  const progress = Math.max(0, Math.min(100, Number(job.progress) || 0));
  elements.progressBar.style.width = `${progress}%`;
  elements.progressPercent.textContent = `${Math.round(progress)}%`;
  elements.progressTrack.setAttribute("aria-valuenow", String(Math.round(progress)));
  elements.stageLabel.textContent = job.stage || "처리 중";
  elements.etaLabel.textContent = formatEta(job.etaSeconds);
  elements.stageMessage.textContent = job.message || "영상을 처리하고 있습니다.";

  if (job.state === "processing") {
    elements.progressPanel.hidden = false;
    elements.startButton.hidden = true;
    elements.cancelButton.hidden = false;
    return;
  }
  if (job.state === "completed") {
    state.events?.close();
    elements.cancelButton.hidden = true;
    elements.resultSize.textContent = formatBytes(job.result.size);
    const saved = Math.max(0, job.original.size - job.result.size);
    const percent = job.original.size ? Math.round((saved / job.original.size) * 100) : 0;
    const retryText = job.result.retried ? " · 자동 재압축 적용" : "";
    elements.resultCompare.textContent = `${formatBytes(saved)} 절약 (${percent}%)${retryText}`;
    elements.downloadButton.href = job.result.downloadUrl;
    elements.downloadButton.download = job.result.fileName;
    elements.resultCard.hidden = false;
    elements.resultCard.scrollIntoView({ behavior: "smooth", block: "center" });
    if (!job.result.withinTarget) showError(job.message);
    return;
  }
  if (job.state === "error" || job.state === "cancelled") {
    state.events?.close();
    elements.cancelButton.hidden = true;
    elements.startButton.hidden = false;
    elements.startButton.disabled = true;
    if (job.state === "error") showError(job.error || job.message);
  }
}

function connectEvents(jobId) {
  state.events?.close();
  const events = new EventSource(`/api/jobs/${jobId}/events`);
  state.events = events;
  events.onmessage = (event) => {
    try { renderJob(JSON.parse(event.data)); } catch (_error) { /* 잘못된 이벤트는 무시 */ }
  };
  events.onerror = () => {
    if (state.job?.state === "processing") {
      elements.etaLabel.textContent = "진행 정보 다시 연결 중";
    }
  };
}

async function startCompression() {
  if (!state.job || state.job.state !== "ready") return;
  clearError();
  const targetMB = Number(elements.targetSize.value);
  const bitrate = calculateBitrate();
  if (!Number.isFinite(targetMB) || targetMB < 5) return showError("목표 용량을 5MB 이상으로 입력해 주세요.");
  if (targetMB * 1024 * 1024 >= state.job.original.size) return showError("목표 용량을 원본 파일보다 작게 입력해 주세요.");
  if (!bitrate || bitrate < 100) return showError("목표 용량이 영상 길이에 비해 너무 작습니다. 목표 용량을 늘려 주세요.");
  const encoder = document.querySelector('input[name="codec"]:checked').value;
  elements.startButton.disabled = true;
  elements.targetSize.disabled = true;
  elements.codecField.disabled = true;
  try {
    connectEvents(state.job.id);
    const job = await api(`/api/jobs/${state.job.id}/compress`, {
      method: "POST",
      body: JSON.stringify({ targetMB, encoder })
    });
    renderJob(job);
  } catch (error) {
    state.events?.close();
    elements.startButton.disabled = false;
    elements.targetSize.disabled = false;
    elements.codecField.disabled = false;
    showError(error.message);
  }
}

async function cancelCompression() {
  if (!state.job) return;
  elements.cancelButton.disabled = true;
  elements.cancelButton.textContent = "중지하는 중…";
  try {
    await api(`/api/jobs/${state.job.id}/cancel`, { method: "POST", body: "{}" });
    elements.stageMessage.textContent = "압축을 중지하고 임시 파일을 정리하고 있습니다.";
  } catch (error) {
    showError(error.message);
  } finally {
    elements.cancelButton.disabled = false;
    elements.cancelButton.textContent = "압축 중지";
  }
}

elements.fileInput.addEventListener("change", () => uploadFile(elements.fileInput.files[0]));
elements.dropZone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    elements.fileInput.click();
  }
});
for (const eventName of ["dragenter", "dragover"]) {
  elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    if (state.serverReady) elements.dropZone.classList.add("dragging");
  });
}
for (const eventName of ["dragleave", "drop"]) {
  elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.remove("dragging");
  });
}
elements.dropZone.addEventListener("drop", (event) => uploadFile(event.dataTransfer.files[0]));
elements.uploadCancelButton.addEventListener("click", () => state.uploadRequest?.abort());
elements.replaceButton.addEventListener("click", () => resetSelection({ release: true }));
elements.targetSize.addEventListener("input", calculateBitrate);
elements.startButton.addEventListener("click", startCompression);
elements.cancelButton.addEventListener("click", cancelCompression);
elements.downloadButton.addEventListener("click", () => {
  state.downloading = true;
  setTimeout(() => {
    elements.downloadButton.style.pointerEvents = "none";
    elements.downloadButton.querySelector("span").textContent = "다운로드 완료";
  }, 1000);
});

window.addEventListener("beforeunload", () => state.events?.close());
checkServer();
