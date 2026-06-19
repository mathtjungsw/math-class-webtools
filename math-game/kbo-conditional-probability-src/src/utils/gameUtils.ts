import type { Batter, LineupEntry, PlateAppearanceOutcome, PositionGroup, RunnerSituation } from "../types";

export type Bases = [string | null, string | null, string | null];

export const POSITION_SLOTS: PositionGroup[] = ["C", "IF", "IF", "IF", "IF", "OF", "OF", "OF", "DH"];
export const POSITION_LABEL: Record<PositionGroup, string> = { C: "포수", IF: "내야수", OF: "외야수", DH: "지명타자" };

export function buildLineup(team: string, batters: Batter[]): LineupEntry[] {
  const roster = batters.filter((batter) => batter.team === team).sort((a, b) => b.overallAvg - a.overallAvg);
  const used = new Set<string>();
  return POSITION_SLOTS.map((position) => {
    const batter = roster.find((item) => item.positionGroup === position && !used.has(item.id));
    if (batter) used.add(batter.id);
    return { batterId: batter?.id ?? "", position };
  });
}

export function lineupErrors(team: string, lineup: LineupEntry[], batters: Batter[]): string[] {
  const errors: string[] = [];
  const counts = lineup.reduce<Record<PositionGroup, number>>((acc, item) => ({ ...acc, [item.position]: acc[item.position] + 1 }), { C: 0, IF: 0, OF: 0, DH: 0 });
  if (lineup.some((entry) => !entry.batterId)) errors.push(`${team}: 9명의 선수를 모두 선택하세요.`);
  if (new Set(lineup.map((entry) => entry.batterId).filter(Boolean)).size !== 9) errors.push(`${team}: 같은 선수를 두 번 넣을 수 없습니다.`);
  if (counts.C !== 1 || counts.IF !== 4 || counts.OF !== 3 || counts.DH !== 1) errors.push(`${team}: 포수 1명·내야수 4명·외야수 3명·지명타자 1명이 필요합니다.`);
  lineup.forEach((entry) => {
    const batter = batters.find((item) => item.id === entry.batterId);
    if (batter && (batter.team !== team || batter.positionGroup !== entry.position)) errors.push(`${batter.name}: ${POSITION_LABEL[entry.position]} 자격을 확인하세요.`);
  });
  return errors;
}

export function situationFromBases(bases: Bases): RunnerSituation {
  const [first, second, third] = bases.map(Boolean);
  if (first && second && third) return "basesLoaded";
  if (first && second) return "runner12";
  if (first && third) return "runner13";
  if (second && third) return "runner23";
  if (first) return "runner1";
  if (second) return "runner2";
  if (third) return "runner3";
  return "basesEmpty";
}

export function hitOutcome(value = Math.random()): PlateAppearanceOutcome {
  if (value < 0.68) return "1루타";
  if (value < 0.88) return "2루타";
  if (value < 0.94) return "3루타";
  return "홈런";
}

export function advanceRunners(outcome: PlateAppearanceOutcome, bases: Bases, batterId: string): { bases: Bases; runs: number } {
  const [first, second, third] = bases;
  if (outcome === "아웃") return { bases, runs: 0 };
  if (outcome === "1루타") return { bases: [batterId, first, second], runs: third ? 1 : 0 };
  if (outcome === "2루타") return { bases: [null, batterId, first], runs: Number(Boolean(second)) + Number(Boolean(third)) };
  if (outcome === "3루타") return { bases: [null, null, batterId], runs: bases.filter(Boolean).length };
  return { bases: [null, null, null], runs: bases.filter(Boolean).length + 1 };
}
