import type { Batter, PositionGroup } from "../types";

type CsvKey = keyof Omit<Batter, "id">;

const headers: Record<CsvKey, string[]> = {
  name: ["name", "선수명"], team: ["team", "구단"], imageUrl: ["imageUrl", "사진"],
  positionGroup: ["positionGroup", "position", "포지션"],
  overallAvg: ["overallAvg", "전체타율"], basesEmptyAvg: ["basesEmptyAvg", "주자없음"],
  runner1Avg: ["runner1Avg", "1루"], runner2Avg: ["runner2Avg", "2루"], runner3Avg: ["runner3Avg", "3루"],
  runner12Avg: ["runner12Avg", "1_2루"], runner13Avg: ["runner13Avg", "1_3루"],
  runner23Avg: ["runner23Avg", "2_3루"], basesLoadedAvg: ["basesLoadedAvg", "만루"],
  overallPA: ["overallPA", "전체타석"], basesEmptyPA: ["basesEmptyPA", "주자없음타석"],
  runner1PA: ["runner1PA", "1루타석"], runner2PA: ["runner2PA", "2루타석"], runner3PA: ["runner3PA", "3루타석"],
  runner12PA: ["runner12PA", "1_2루타석"], runner13PA: ["runner13PA", "1_3루타석"],
  runner23PA: ["runner23PA", "2_3루타석"], basesLoadedPA: ["basesLoadedPA", "만루타석"],
};

const optionalKeys: CsvKey[] = [
  "imageUrl", "positionGroup", "overallPA", "basesEmptyPA", "runner1PA", "runner2PA", "runner3PA",
  "runner12PA", "runner13PA", "runner23PA", "basesLoadedPA",
];

const sampleKeys: CsvKey[] = [
  "overallPA", "basesEmptyPA", "runner1PA", "runner2PA", "runner3PA",
  "runner12PA", "runner13PA", "runner23PA", "basesLoadedPA",
];

const POSITION_PATTERN: PositionGroup[] = ["C", "IF", "IF", "IF", "IF", "OF", "OF", "OF", "DH"];

function normalizePosition(value: string): PositionGroup | undefined {
  const position = value.trim().toUpperCase();
  if (["C", "포수"].includes(position)) return "C";
  if (["IF", "내야", "내야수", "1B", "2B", "3B", "SS"].includes(position)) return "IF";
  if (["OF", "외야", "외야수", "LF", "CF", "RF"].includes(position)) return "OF";
  if (["DH", "지명타자", "지명"].includes(position)) return "DH";
  return undefined;
}

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

export function parseCsvToBatters(csvText: string, idPrefix = "csv"): Batter[] {
  const lines = csvText.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error("CSV에 머리글과 한 명 이상의 선수 데이터가 필요합니다.");
  const csvHeaders = splitCsvLine(lines[0]);
  const indexByKey = Object.fromEntries(
    Object.entries(headers).map(([key, candidates]) => [key, csvHeaders.findIndex((header) => candidates.includes(header))]),
  ) as Record<CsvKey, number>;
  const required = (Object.keys(headers) as CsvKey[]).filter((key) => !optionalKeys.includes(key));
  const missing = required.filter((key) => indexByKey[key] < 0);
  if (missing.length) throw new Error(`필수 컬럼이 없습니다: ${missing.join(", ")}`);

  const teamCounts = new Map<string, number>();
  return lines.slice(1).map((line, rowIndex) => {
    const values = splitCsvLine(line);
    const value = (key: CsvKey) => indexByKey[key] >= 0 ? values[indexByKey[key]] ?? "" : "";
    const number = (key: CsvKey) => Number(value(key));
    const optionalNumber = (key: CsvKey) => value(key).trim() === "" ? undefined : Number(value(key));
    const team = value("team");
    const teamIndex = teamCounts.get(team) ?? 0;
    teamCounts.set(team, teamIndex + 1);
    return {
      id: `${idPrefix}-${rowIndex + 1}`, name: value("name"), team, imageUrl: value("imageUrl"),
      positionGroup: normalizePosition(value("positionGroup")) ?? POSITION_PATTERN[teamIndex % POSITION_PATTERN.length],
      overallAvg: number("overallAvg"), basesEmptyAvg: number("basesEmptyAvg"), runner1Avg: number("runner1Avg"),
      runner2Avg: number("runner2Avg"), runner3Avg: number("runner3Avg"), runner12Avg: number("runner12Avg"),
      runner13Avg: number("runner13Avg"), runner23Avg: number("runner23Avg"), basesLoadedAvg: number("basesLoadedAvg"),
      overallPA: optionalNumber("overallPA"), basesEmptyPA: optionalNumber("basesEmptyPA"), runner1PA: optionalNumber("runner1PA"),
      runner2PA: optionalNumber("runner2PA"), runner3PA: optionalNumber("runner3PA"), runner12PA: optionalNumber("runner12PA"),
      runner13PA: optionalNumber("runner13PA"), runner23PA: optionalNumber("runner23PA"), basesLoadedPA: optionalNumber("basesLoadedPA"),
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
    sampleKeys.forEach((key) => {
      const value = batter[key];
      if (value !== undefined && (typeof value !== "number" || !Number.isInteger(value) || value < 1)) errors.push(`${index + 2}행 ${String(key)}: 1 이상의 정수여야 합니다.`);
    });
  });
  return errors;
}
