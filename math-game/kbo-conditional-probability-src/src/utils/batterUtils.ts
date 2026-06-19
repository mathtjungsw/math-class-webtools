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

export function getSituationAvg(batter: Batter, situation: RunnerSituation): number {
  return batter[avgKeys[situation]] as number;
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
  if (Math.abs(difference) < 0.005) return `${batter.name} 선수는 ${label} 상황에서도 전체 타율과 비슷합니다.`;
  return `${batter.name} 선수는 ${label} 상황에서 전체 타율보다 안타 확률이 ${difference > 0 ? "높습니다" : "낮습니다"}.`;
}

export function getChangeLabel(value: number): string {
  if (value > 0.005) return "조건이 주어졌을 때 더 강함";
  if (value < -0.005) return "조건이 주어졌을 때 약해짐";
  return "전체 타율과 비슷함";
}
