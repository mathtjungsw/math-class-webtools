const express = require("express");
const multer = require("multer");
const { spawn, spawnSync } = require("child_process");
const { randomUUID } = require("crypto");
const fs = require("fs");
const fsp = fs.promises;
const os = require("os");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT) || 3210;
const HOST = "127.0.0.1";
const MAX_FILE_SIZE = 20 * 1024 * 1024 * 1024;
const AUDIO_BITRATE_KBPS = 128;
const SAFETY_FACTOR = 0.97;
const RESULT_TTL_MS = 60 * 60 * 1000;
const TEMP_ROOT = path.join(os.tmpdir(), "school-video-compressor");
const jobs = new Map();
let activeJobId = null;

fs.mkdirSync(TEMP_ROOT, { recursive: true });

function commandExists(command) {
  const result = spawnSync(command, ["-version"], {
    windowsHide: true,
    encoding: "utf8"
  });
  return !result.error && result.status === 0;
}

const ffmpegReady = commandExists("ffmpeg");
const ffprobeReady = commandExists("ffprobe");
const ffmpegStatus = {
  ready: ffmpegReady && ffprobeReady,
  ffmpeg: ffmpegReady,
  ffprobe: ffprobeReady,
  message:
    ffmpegReady && ffprobeReady
      ? "FFmpeg를 사용할 수 있습니다."
      : "FFmpeg 또는 FFprobe를 찾지 못했습니다. FFmpeg를 설치하고 터미널을 다시 연 뒤 실행해 주세요."
};

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, TEMP_ROOT),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).slice(0, 12);
    callback(null, `${randomUUID()}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 }
});

app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));
app.use(express.static(path.join(__dirname, "public")));

function formatError(error) {
  const text = String(error?.message || error || "");
  if (error?.code === "LIMIT_FILE_SIZE") {
    return "파일이 서버의 최대 처리 크기(20GB)를 넘습니다.";
  }
  if (/Invalid data found|moov atom not found|could not find codec parameters/i.test(text)) {
    return "영상 정보를 읽을 수 없습니다. 손상되지 않은 영상 파일인지 확인해 주세요.";
  }
  if (/No space left on device/i.test(text)) {
    return "디스크 여유 공간이 부족합니다. 원본 영상 크기의 2~3배 이상 공간을 확보해 주세요.";
  }
  if (/Permission denied/i.test(text)) {
    return "파일을 저장할 권한이 없습니다. 다른 폴더에서 프로젝트를 실행해 주세요.";
  }
  if (/Unknown encoder|Encoder .* not found/i.test(text)) {
    return "선택한 인코더를 현재 FFmpeg에서 사용할 수 없습니다. 다른 인코더를 선택해 주세요.";
  }
  if (/killed|cancelled|canceled/i.test(text)) {
    return "사용자가 압축을 중지했습니다.";
  }
  return "영상 처리 중 문제가 발생했습니다. 파일 형식과 디스크 여유 공간을 확인한 뒤 다시 시도해 주세요.";
}

async function safeUnlink(filePath) {
  if (!filePath) return;
  try {
    await fsp.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") console.error("임시 파일 삭제 실패:", filePath, error.message);
  }
}

async function cleanupPassLogs(prefix) {
  const directory = path.dirname(prefix);
  const stem = path.basename(prefix);
  try {
    const files = await fsp.readdir(directory);
    await Promise.all(
      files
        .filter((name) => name.startsWith(stem))
        .map((name) => safeUnlink(path.join(directory, name)))
    );
  } catch (error) {
    if (error.code !== "ENOENT") console.error("패스 로그 정리 실패:", error.message);
  }
}

function publicJob(job) {
  return {
    id: job.id,
    state: job.state,
    stage: job.stage,
    progress: job.progress,
    etaSeconds: job.etaSeconds,
    message: job.message,
    original: job.original,
    settings: job.settings,
    result: job.result,
    error: job.error
  };
}

function broadcast(job) {
  const payload = `data: ${JSON.stringify(publicJob(job))}\n\n`;
  for (const response of job.listeners) response.write(payload);
}

function updateJob(job, patch) {
  Object.assign(job, patch);
  broadcast(job);
}

function probeVideo(filePath) {
  return new Promise((resolve, reject) => {
    const args = [
      "-v",
      "error",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      filePath
    ];
    const child = spawn("ffprobe", args, { windowsHide: true });
    let output = "";
    let errors = "";
    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (errors += chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error(errors || "FFprobe 실행 실패"));
      try {
        const data = JSON.parse(output);
        const video = data.streams.find((stream) => stream.codec_type === "video");
        const audio = data.streams.find((stream) => stream.codec_type === "audio");
        const duration = Number(data.format?.duration || video?.duration);
        if (!video || !Number.isFinite(duration) || duration <= 0) {
          throw new Error("영상 스트림 또는 재생시간을 확인할 수 없습니다.");
        }
        resolve({
          duration,
          width: Number(video.width) || 0,
          height: Number(video.height) || 0,
          videoCodec: video.codec_name || "알 수 없음",
          audioCodec: audio?.codec_name || "오디오 없음"
        });
      } catch (error) {
        reject(error);
      }
    });
  });
}

function calculateVideoBitrate(targetBytes, durationSeconds) {
  const safeBits = targetBytes * SAFETY_FACTOR * 8;
  const audioBits = AUDIO_BITRATE_KBPS * 1000 * durationSeconds;
  return Math.floor((safeBits - audioBits) / durationSeconds / 1000);
}

function outputBaseName(originalName) {
  const parsed = path.parse(originalName);
  const safeStem = (parsed.name || "압축영상").replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_").slice(0, 150);
  return `${safeStem}_압축.mp4`;
}

function runFfmpeg(job, args, progressStart, progressEnd) {
  return new Promise((resolve, reject) => {
    if (job.cancelRequested) return reject(new Error("cancelled"));
    const startedAt = Date.now();
    const child = spawn("ffmpeg", args, { windowsHide: true });
    job.child = child;
    let stdoutBuffer = "";
    let stderrTail = "";

    child.stdout.on("data", (chunk) => {
      stdoutBuffer += chunk.toString();
      const lines = stdoutBuffer.split(/\r?\n/);
      stdoutBuffer = lines.pop() || "";
      for (const line of lines) {
        const [key, value] = line.split("=");
        if (key !== "out_time_ms" && key !== "out_time_us") continue;
        const processedSeconds = Number(value) / 1_000_000;
        if (!Number.isFinite(processedSeconds)) continue;
        const passFraction = Math.min(1, processedSeconds / job.original.duration);
        const progress = progressStart + passFraction * (progressEnd - progressStart);
        const elapsedSeconds = (Date.now() - startedAt) / 1000;
        const remainingFraction = Math.max(0, 1 - passFraction);
        const etaSeconds = passFraction > 0.01 ? (elapsedSeconds / passFraction) * remainingFraction : null;
        updateJob(job, {
          progress: Math.min(progressEnd, progress),
          etaSeconds: Number.isFinite(etaSeconds) ? Math.ceil(etaSeconds) : null
        });
      }
    });

    child.stderr.on("data", (chunk) => {
      stderrTail = (stderrTail + chunk.toString()).slice(-12000);
    });
    child.on("error", reject);
    child.on("close", (code, signal) => {
      job.child = null;
      if (job.cancelRequested || signal) return reject(new Error("cancelled"));
      if (code === 0) return resolve();
      reject(new Error(stderrTail || `FFmpeg가 종료 코드 ${code}로 끝났습니다.`));
    });
  });
}

async function encodeAttempt(job, videoBitrateKbps, attempt) {
  const encoder = job.settings.encoder === "h265" ? "libx265" : "libx264";
  const passLog = path.join(TEMP_ROOT, `${job.id}-pass-${attempt}`);
  const nullDevice = process.platform === "win32" ? "NUL" : "/dev/null";
  const common = [
    "-y",
    "-i",
    job.inputPath,
    "-map",
    "0:v:0",
    "-c:v",
    encoder,
    "-b:v",
    `${videoBitrateKbps}k`,
    "-preset",
    "medium",
    "-pix_fmt",
    "yuv420p",
    "-passlogfile",
    passLog
  ];
  if (encoder === "libx265") common.push("-tag:v", "hvc1");

  try {
    updateJob(job, {
      stage: attempt === 1 ? "영상 분석 중 (1/2)" : "다시 맞추는 중: 영상 분석 (1/2)",
      progress: 0,
      etaSeconds: null,
      message: attempt === 1 ? "영상의 비트 배분을 분석하고 있습니다." : "목표 크기에 맞춰 다시 분석하고 있습니다."
    });
    await runFfmpeg(
      job,
      [...common, "-pass", "1", "-an", "-f", "null", "-progress", "pipe:1", "-nostats", nullDevice],
      0,
      50
    );

    updateJob(job, {
      stage: attempt === 1 ? "제출용 영상 만드는 중 (2/2)" : "다시 맞추는 중: 영상 만들기 (2/2)",
      message: "최종 영상 파일을 만들고 있습니다.",
      etaSeconds: null
    });
    await runFfmpeg(
      job,
      [
        ...common,
        "-pass",
        "2",
        "-map",
        "0:a:0?",
        "-c:a",
        "aac",
        "-b:a",
        `${AUDIO_BITRATE_KBPS}k`,
        "-map_metadata",
        "0",
        "-movflags",
        "+faststart",
        "-progress",
        "pipe:1",
        "-nostats",
        job.outputPath
      ],
      50,
      100
    );
  } finally {
    await cleanupPassLogs(passLog);
  }
}

async function processJob(job) {
  const targetBytes = Math.floor(job.settings.targetMB * 1024 * 1024);
  let videoBitrateKbps = calculateVideoBitrate(targetBytes, job.original.duration);
  if (videoBitrateKbps < 100) {
    throw new Error("목표 용량이 영상 길이에 비해 너무 작습니다. 목표 용량을 늘려 주세요.");
  }
  job.settings.videoBitrateKbps = videoBitrateKbps;
  broadcast(job);

  await encodeAttempt(job, videoBitrateKbps, 1);
  let resultSize = (await fsp.stat(job.outputPath)).size;
  let retried = false;

  if (resultSize > targetBytes) {
    retried = true;
    videoBitrateKbps = Math.max(
      100,
      Math.floor(videoBitrateKbps * (targetBytes / resultSize) * SAFETY_FACTOR)
    );
    job.settings.videoBitrateKbps = videoBitrateKbps;
    updateJob(job, {
      stage: "크기를 다시 맞추고 있습니다",
      progress: 0,
      etaSeconds: null,
      message: "결과가 목표보다 커서 비트레이트를 낮춰 한 번 더 압축합니다."
    });
    await safeUnlink(job.outputPath);
    await encodeAttempt(job, videoBitrateKbps, 2);
    resultSize = (await fsp.stat(job.outputPath)).size;
  }

  job.result = {
    size: resultSize,
    targetBytes,
    withinTarget: resultSize <= targetBytes,
    retried,
    downloadUrl: `/api/jobs/${job.id}/download`,
    fileName: job.downloadName
  };
  updateJob(job, {
    state: "completed",
    stage: "압축 완료",
    progress: 100,
    etaSeconds: 0,
    message: resultSize <= targetBytes
      ? "목표 용량 이하로 압축했습니다."
      : "자동 재압축까지 마쳤지만 목표 용량을 조금 초과했습니다. 목표값을 낮춰 다시 시도해 주세요."
  });
}

async function runJob(job) {
  activeJobId = job.id;
  try {
    await processJob(job);
  } catch (error) {
    const cancelled = job.cancelRequested || /cancelled/i.test(error.message);
    updateJob(job, {
      state: cancelled ? "cancelled" : "error",
      stage: cancelled ? "압축 중지됨" : "오류 발생",
      etaSeconds: null,
      error: cancelled ? null : formatError(error),
      message: cancelled ? "압축을 중지하고 임시 파일을 정리했습니다." : formatError(error)
    });
    await safeUnlink(job.outputPath);
  } finally {
    activeJobId = null;
    await safeUnlink(job.inputPath);
    job.inputPath = null;
    job.cleanupTimer = setTimeout(() => cleanupJob(job.id), RESULT_TTL_MS);
    job.cleanupTimer.unref?.();
  }
}

async function cleanupJob(id) {
  const job = jobs.get(id);
  if (!job) return;
  if (job.child) {
    job.cancelRequested = true;
    job.child.kill("SIGTERM");
  }
  clearTimeout(job.cleanupTimer);
  await Promise.all([safeUnlink(job.inputPath), safeUnlink(job.outputPath)]);
  for (const response of job.listeners) response.end();
  jobs.delete(id);
}

app.get("/api/status", (_req, res) => res.json(ffmpegStatus));

app.post("/api/jobs/upload", (req, res) => {
  upload.single("video")(req, res, async (uploadError) => {
    if (uploadError) {
      if (req.file?.path) await safeUnlink(req.file.path);
      return res.status(400).json({ error: formatError(uploadError) });
    }
    if (!req.file) return res.status(400).json({ error: "영상 파일을 선택해 주세요." });
    if (!ffmpegStatus.ready) {
      await safeUnlink(req.file.path);
      return res.status(503).json({ error: ffmpegStatus.message });
    }
    try {
      const metadata = await probeVideo(req.file.path);
      const id = randomUUID();
      const job = {
        id,
        state: "ready",
        stage: "압축 준비 완료",
        progress: 0,
        etaSeconds: null,
        message: "목표 용량과 인코더를 확인한 뒤 압축을 시작하세요.",
        original: {
          name: req.file.originalname,
          size: req.file.size,
          ...metadata
        },
        settings: null,
        result: null,
        error: null,
        inputPath: req.file.path,
        outputPath: path.join(TEMP_ROOT, `${id}-output.mp4`),
        downloadName: outputBaseName(req.file.originalname),
        listeners: new Set(),
        child: null,
        cancelRequested: false,
        cleanupTimer: null
      };
      jobs.set(id, job);
      job.cleanupTimer = setTimeout(() => cleanupJob(id), RESULT_TTL_MS);
      job.cleanupTimer.unref?.();
      res.json(publicJob(job));
    } catch (error) {
      await safeUnlink(req.file.path);
      res.status(400).json({ error: formatError(error) });
    }
  });
});

app.get("/api/jobs/:id/events", (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).end();
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive"
  });
  res.flushHeaders();
  job.listeners.add(res);
  res.write(`data: ${JSON.stringify(publicJob(job))}\n\n`);
  const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 15000);
  req.on("close", () => {
    clearInterval(heartbeat);
    job.listeners.delete(res);
  });
});

app.post("/api/jobs/:id/compress", (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: "작업을 찾을 수 없습니다. 영상을 다시 선택해 주세요." });
  if (job.state !== "ready") return res.status(409).json({ error: "이미 시작했거나 끝난 작업입니다." });
  if (activeJobId && activeJobId !== job.id) {
    return res.status(409).json({ error: "다른 영상이 압축 중입니다. 완료된 뒤 다시 시도해 주세요." });
  }
  const targetMB = Number(req.body.targetMB);
  const encoder = req.body.encoder === "h265" ? "h265" : "h264";
  if (!Number.isFinite(targetMB) || targetMB < 5 || targetMB > 20000) {
    return res.status(400).json({ error: "목표 용량은 5MB 이상 20,000MB 이하로 입력해 주세요." });
  }
  if (targetMB * 1024 * 1024 >= job.original.size) {
    return res.status(400).json({ error: "목표 용량을 원본 파일보다 작게 입력해 주세요." });
  }
  const estimatedBitrate = calculateVideoBitrate(targetMB * 1024 * 1024, job.original.duration);
  if (estimatedBitrate < 100) {
    return res.status(400).json({ error: "목표 용량이 영상 길이에 비해 너무 작습니다. 목표 용량을 늘려 주세요." });
  }
  job.settings = { targetMB, encoder, audioBitrateKbps: AUDIO_BITRATE_KBPS, videoBitrateKbps: estimatedBitrate };
  clearTimeout(job.cleanupTimer);
  job.cleanupTimer = null;
  job.state = "processing";
  job.message = "압축 작업을 시작합니다.";
  broadcast(job);
  res.status(202).json(publicJob(job));
  runJob(job);
});

app.post("/api/jobs/:id/cancel", async (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: "중지할 작업을 찾을 수 없습니다." });
  if (job.state === "completed" || job.state === "error" || job.state === "cancelled") {
    return res.json(publicJob(job));
  }
  job.cancelRequested = true;
  if (job.child) {
    if (process.platform === "win32" && job.child.pid) {
      spawn("taskkill", ["/pid", String(job.child.pid), "/t", "/f"], { windowsHide: true });
    } else {
      job.child.kill("SIGTERM");
    }
  } else {
    updateJob(job, { state: "cancelled", stage: "압축 중지됨", message: "작업을 중지했습니다." });
    await cleanupJob(job.id);
  }
  res.json({ ok: true });
});

app.get("/api/jobs/:id/download", (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job || job.state !== "completed" || !job.outputPath) {
    return res.status(404).send("다운로드할 결과 파일을 찾을 수 없습니다.");
  }
  res.download(job.outputPath, job.downloadName, async (error) => {
    if (error && !res.headersSent) res.status(500).send("결과 파일을 전송하지 못했습니다.");
    if (!error) await cleanupJob(job.id);
  });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: formatError(error) });
});

async function clearOldTemporaryFiles() {
  try {
    const entries = await fsp.readdir(TEMP_ROOT, { withFileTypes: true });
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    await Promise.all(
      entries.map(async (entry) => {
        const filePath = path.join(TEMP_ROOT, entry.name);
        const stats = await fsp.stat(filePath);
        if (stats.mtimeMs < cutoff && entry.isFile()) await safeUnlink(filePath);
      })
    );
  } catch (error) {
    console.error("이전 임시 파일 정리 실패:", error.message);
  }
}

const server = app.listen(PORT, HOST, async () => {
  await clearOldTemporaryFiles();
  const url = `http://${HOST}:${PORT}`;
  console.log(`\n동영상 용량 줄이기: ${url}`);
  console.log(ffmpegStatus.message);
  if (process.env.NO_OPEN !== "1") {
    setTimeout(async () => {
      try {
        const { default: open } = await import("open");
        await open(url);
      } catch (error) {
        console.log(`브라우저를 자동으로 열지 못했습니다. 직접 접속해 주세요: ${url}`);
      }
    }, 500);
  }
});

server.requestTimeout = 0;
server.headersTimeout = 0;

async function shutdown() {
  for (const job of jobs.values()) {
    if (job.child) job.child.kill("SIGTERM");
    await Promise.all([safeUnlink(job.inputPath), safeUnlink(job.outputPath)]);
  }
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
