import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const client = path.join(dist, "client");
const server = path.join(dist, "server");

const publicEntries = [
  "index.html",
  "motion-shot.html",
  "assets",
  "ai-math",
  "common-math2",
  "economic-math",
  "geometry",
  "math-game",
  "math-history",
  "middle-school",
  "probability-statistics",
  "school-work"
];

const excludedNames = new Set([
  ".git",
  ".openai",
  "dist",
  "node_modules",
  "outputs",
  "tests",
  "tmp",
  "kbo-conditional-probability-src"
]);

async function copyPublicEntry(entry) {
  const source = path.join(root, entry);
  const target = path.join(client, entry);
  await cp(source, target, {
    recursive: true,
    filter(sourcePath) {
      const relative = path.relative(root, sourcePath);
      return relative
        .split(path.sep)
        .every((part) => !excludedNames.has(part));
    }
  });
}

await rm(dist, { recursive: true, force: true });
await mkdir(client, { recursive: true });
await mkdir(server, { recursive: true });
await Promise.all(publicEntries.map(copyPublicEntry));

const worker = `const INDEX_PATH = "/index.html";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let response = await env.ASSETS.fetch(request);

    if (response.status === 404 && request.method === "GET" && !pathHasExtension(url.pathname)) {
      const fallback = new URL(INDEX_PATH, url);
      response = await env.ASSETS.fetch(new Request(fallback, request));
    }

    return response;
  }
};

function pathHasExtension(pathname) {
  const last = pathname.split("/").pop() || "";
  return last.includes(".");
}
`;

await writeFile(path.join(server, "index.js"), worker, "utf8");

const geometryApp = await readFile(path.join(client, "geometry", "app.js"), "utf8");
if (!geometryApp.includes("const TOPICS") || !geometryApp.includes("geometry-compact-tool")) {
  throw new Error("기하 통합 웹툴 파일이 빌드에 포함되지 않았습니다.");
}

const moduleFiles = await readdir(path.join(client, "geometry", "modules"));
if (moduleFiles.filter((file) => file.endsWith(".html")).length !== 62) {
  throw new Error("기하 탐구 탭 62개가 모두 빌드되지 않았습니다.");
}

const workerStat = await stat(path.join(server, "index.js"));
if (workerStat.size < 100) throw new Error("배포 실행 파일이 비어 있습니다.");

console.log(`Built ${publicEntries.length} public entries with ${moduleFiles.length} geometry modules.`);
