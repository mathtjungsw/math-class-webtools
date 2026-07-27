import { readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testsDir = path.join(root, "tests");
const tests = (await readdir(testsDir))
  .filter((file) => file.endsWith(".test.js"))
  .sort();

for (const test of tests) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(testsDir, test)], {
      cwd: root,
      stdio: "inherit"
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${test} failed with exit code ${code}`));
    });
  });
}

console.log(`PASS: ${tests.length} test files`);
