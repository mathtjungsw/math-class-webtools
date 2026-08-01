import type { Batter, RunnerSituation } from "../types";

export const SITUATIONS: RunnerSituation[] = [
  "basesEmpty", "runner1", "runner2", "runner3", "runner12", "runner13", "runner23", "basesLoaded",
];

const labels: Record<RunnerSituation, string> = {
  basesEmpty: "주자 없음", runner1: "1루", runner2: "2루", runner3: "3루",
  runner12: "1,2루", runner13: "1,3루", runner23: "2,3루", basesLoaded: "만루",
};

const avgKeys: Record<RunnerSituation, keyof Batter> = {
  basesEmpty: "basesEmptyAvg", runner1: "runner1Avg", runner2: "runner2Avg", runner3: "runner3Avg",
  runner12: "runner12Avg", runner13: "runner13Avg", runner23: "runner23Avg", basesLoaded: "basesLoadedAvg",
};

const paKeys: Record<RunnerSituation, keyof Batter> = {
  basesEmpty: "basesEmptyPA", runner1: "runner1PA", runner2: "runner2PA", runner3: "runner3PA",
  runner12: "runner12PA", runner13: "runner13PA", runner23: "runner23PA", basesLoaded: "basesLoadedPA",
};

export function getSituationAvg(batter: Batter, situation: RunnerSituation): number {
  return batter[avgKeys[situation]] as number;
}

export function getSituationPA(batter: Batter, situation: RunnerSituation): number | undefined {
  const value = batter[paKeys[situation]];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function formatSampleSize(value?: number): string {
  return value === undefined ? "표본 수 미제공" : `표본 ${value}타석`;
}

export function getSituationLabel(situation: RunnerSituation): string {
  return labels[situation];
}

export function getSituationFormula(situation: RunnerSituation): string {
  return `P(안타 | ${labels[situation]})`;
}

export function formatAvg(value: number): string {
  return Number.isFinite(value) ? value.toFixed(3) : "—";
}

export function formatDifference(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(3)}`;
}

export function getDifference(batter: Batter, situation: RunnerSituation): number {
  return getSituationAvg(batter, situation) - batter.overallAvg;
}

export function getInterpretation(batter: Batter, situation: RunnerSituation): string {
  const difference = getDifference(batter, situation);
  const label = labels[situation];
  const sampleNote = getSituationPA(batter, situation) === undefined ? " 표본 수가 없어 우열이나 실력으로 해석할 수 없습니다." : " 표본 수와 함께 해석하세요.";
  if (Math.abs(difference) < 0.005) return `${batter.name} 선수의 ${label} 기록값은 전체 기록과 비슷합니다.${sampleNote}`;
  return `${batter.name} 선수의 ${label} 기록값은 전체 기록보다 ${difference > 0 ? "높게" : "낮게"} 관찰됩니다.${sampleNote}`;
}

export function getChangeLabel(value: number): string {
  if (value > 0.005) return "전체 기록보다 높은 관찰값";
  if (value < -0.005) return "전체 기록보다 낮은 관찰값";
  return "전체 기록과 비슷한 관찰값";
}
