import type { Batter } from "../types";

const headers: Record<keyof Omit<Batter, "id">, string[]> = {
  name: ["name", "선수명"], team: ["team", "구단"], imageUrl: ["imageUrl", "사진"],
  overallAvg: ["overallAvg", "전체타율"], basesEmptyAvg: ["basesEmptyAvg", "주자없음"],
  runner1Avg: ["runner1Avg", "1루"], runner2Avg: ["runner2Avg", "2루"], runner3Avg: ["runner3Avg", "3루"],
  runner12Avg: ["runner12Avg", "1_2루"], runner13Avg: ["runner13Avg", "1_3루"],
  runner23Avg: ["runner23Avg", "2_3루"], basesLoadedAvg: ["basesLoadedAvg", "만루"],
};

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"') { current += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { values.push(current.trim()); current = ""; }
    else current += character;
  }
  values.push(current.trim());
  return values;
}

export function parseCsvToBatters(csvText: string): Batter[] {
  const lines = csvText.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error("CSV에 머리글과 한 명 이상의 선수 데이터가 필요합니다.");
  const csvHeaders = splitCsvLine(lines[0]);
  const indexByKey = Object.fromEntries(
    Object.entries(headers).map(([key, candidates]) => [key, csvHeaders.findIndex((header) => candidates.includes(header))]),
  ) as Record<keyof Omit<Batter, "id">, number>;
  const required = Object.keys(headers).filter((key) => key !== "imageUrl") as Array<keyof Omit<Batter, "id">>;
  const missing = required.filter((key) => indexByKey[key] < 0);
  if (missing.length) throw new Error(`필수 컬럼이 없습니다: ${missing.join(", ")}`);

  return lines.slice(1).map((line, rowIndex) => {
    const values = splitCsvLine(line);
    const value = (key: keyof Omit<Batter, "id">) => indexByKey[key] >= 0 ? values[indexByKey[key]] ?? "" : "";
    const number = (key: keyof Omit<Batter, "id">) => Number(value(key));
    return {
      id: `csv-${rowIndex + 1}-${Date.now()}`, name: value("name"), team: value("team"), imageUrl: value("imageUrl"),
      overallAvg: number("overallAvg"), basesEmptyAvg: number("basesEmptyAvg"), runner1Avg: number("runner1Avg"),
      runner2Avg: number("runner2Avg"), runner3Avg: number("runner3Avg"), runner12Avg: number("runner12Avg"),
      runner13Avg: number("runner13Avg"), runner23Avg: number("runner23Avg"), basesLoadedAvg: number("basesLoadedAvg"),
    };
  });
}

export function validateBatters(batters: Batter[]): string[] {
  const averageKeys: Array<keyof Batter> = ["overallAvg", "basesEmptyAvg", "runner1Avg", "runner2Avg", "runner3Avg", "runner12Avg", "runner13Avg", "runner23Avg", "basesLoadedAvg"];
  const errors: string[] = [];
  batters.forEach((batter, index) => {
    if (!batter.name.trim()) errors.push(`${index + 2}행: 선수명이 비어 있습니다.`);
    if (!batter.team.trim()) errors.push(`${index + 2}행: 구단명이 비어 있습니다.`);
    averageKeys.forEach((key) => {
      const value = batter[key] as number;
      if (!Number.isFinite(value)) errors.push(`${index + 2}행 ${String(key)}: 숫자가 아닙니다.`);
      else if (value < 0 || value > 1) errors.push(`${index + 2}행 ${String(key)}: 0 이상 1 이하여야 합니다.`);
    });
  });
  return errors;
}
