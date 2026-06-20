import type { Batter, LineupEntry, PlateAppearanceOutcome, PositionGroup, RunnerSituation } from "../types";

export type Bases = [string | null, string | null, string | null];

export const POSITION_SLOTS: PositionGroup[] = ["C", "IF", "IF", "IF", "IF", "OF", "OF", "OF", "DH"];
export const POSITION_LABEL: Record<PositionGroup, string> = { C: "포수", IF: "내야수", OF: "외야수", DH: "지명타자" };
export const REQUIRED_POSITION_COUNTS: Record<PositionGroup, number> = { C: 1, IF: 4, OF: 3, DH: 1 };

export function createEmptyLineup(): LineupEntry[] {
  return POSITION_SLOTS.map((position) => ({ batterId: "", position }));
}

export function assignBatterToLineupSlot(lineup: LineupEntry[], slotIndex: number, batter: Batter): { ok: true; lineup: LineupEntry[] } | { ok: false; error: string } {
  const slot = lineup[slotIndex];
  if (!slot) return { ok: false, error: "라인업 슬롯을 찾을 수 없습니다." };
  if (lineup.some((entry, index) => index !== slotIndex && entry.batterId === batter.id)) return { ok: false, error: `${batter.name} 선수는 이미 라인업에 있습니다.` };
  if (slot.position !== "DH" && batter.positionGroup !== slot.position) {
    return { ok: false, error: `${POSITION_LABEL[slot.position]} 슬롯에는 ${POSITION_LABEL[slot.position]} 선수를 넣어야 합니다.` };
  }
  return { ok: true, lineup: lineup.map((entry, index) => index === slotIndex ? { ...entry, batterId: batter.id } : entry) };
}

export function swapLineupEntries(lineup: LineupEntry[], fromIndex: number, toIndex: number): LineupEntry[] {
  if (!lineup[fromIndex] || !lineup[toIndex] || fromIndex === toIndex) return lineup;
  const next = lineup.slice();
  [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
  return next;
}

export function countLineupPositions(lineup: LineupEntry[]): Record<PositionGroup, number> {
  return lineup.reduce<Record<PositionGroup, number>>(
    (counts, entry) => ({ ...counts, [entry.position]: counts[entry.position] + 1 }),
    { C: 0, IF: 0, OF: 0, DH: 0 },
  );
}

export function canUseDefensiveSubstitution(lineup: LineupEntry[], slotIndex: number, incomingPosition: PositionGroup): boolean {
  const outgoing = lineup[slotIndex];
  if (!outgoing || outgoing.position === "DH" || incomingPosition === "DH") return false;
  const counts = countLineupPositions(lineup);
  const currentValid = (Object.keys(REQUIRED_POSITION_COUNTS) as PositionGroup[])
    .every((position) => counts[position] === REQUIRED_POSITION_COUNTS[position]);
  if (currentValid) return incomingPosition === outgoing.position;
  return counts[outgoing.position] > REQUIRED_POSITION_COUNTS[outgoing.position]
    && counts[incomingPosition] < REQUIRED_POSITION_COUNTS[incomingPosition];
}

export type LineupSubstitutionResult =
  | { ok: false; error: string }
  | { ok: true; lineup: LineupEntry[]; retiredIds: string[]; bases: Bases; outgoing: Batter; incoming: Batter };

export function applyLineupSubstitution({
  team,
  lineup,
  retiredIds,
  slotIndex,
  incomingId,
  batters,
  isBatting,
  bases,
}: {
  team: string;
  lineup: LineupEntry[];
  retiredIds: string[];
  slotIndex: number;
  incomingId: string;
  batters: Batter[];
  isBatting: boolean;
  bases: Bases;
}): LineupSubstitutionResult {
  const outgoingEntry = lineup[slotIndex];
  const outgoing = batters.find((batter) => batter.id === outgoingEntry?.batterId);
  const incoming = batters.find((batter) => batter.id === incomingId);
  if (!outgoingEntry || !outgoing || !incoming) return { ok: false, error: "교체 선수 정보를 찾을 수 없습니다." };
  if (outgoingEntry.position === "DH") return { ok: false, error: "지명타자는 경기 중 교체할 수 없습니다." };
  const currentIds = new Set(lineup.map((entry) => entry.batterId));
  if (incoming.team !== team || currentIds.has(incoming.id) || retiredIds.includes(incoming.id)) {
    return { ok: false, error: "교체할 수 없는 선수입니다. 이미 출전했거나 퇴장한 선수인지 확인하세요." };
  }
  const nextPosition = incoming.positionGroup;
  if (!nextPosition || nextPosition === "DH") return { ok: false, error: "수비 포지션이 확인되는 선수만 교체 출전할 수 있습니다." };
  if (!isBatting && !canUseDefensiveSubstitution(lineup, slotIndex, nextPosition)) {
    return { ok: false, error: "수비 중 교체는 포지션 인원 조건을 유지하거나 부족한 포지션을 복구해야 합니다." };
  }
  return {
    ok: true,
    lineup: lineup.map((entry, index) => index === slotIndex ? { batterId: incoming.id, position: nextPosition } : entry),
    retiredIds: [...retiredIds, outgoing.id],
    bases: bases.map((runner) => runner === outgoing.id ? incoming.id : runner) as Bases,
    outgoing,
    incoming,
  };
}

export function buildLineup(team: string, batters: Batter[]): LineupEntry[] {
  const roster = batters.filter((batter) => batter.team === team).sort((a, b) => b.overallAvg - a.overallAvg);
  const used = new Set<string>();
  return POSITION_SLOTS.map((position) => {
    const batter = roster.find((item) => !used.has(item.id) && (position === "DH" || item.positionGroup === position));
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
    if (batter && (batter.team !== team || (entry.position !== "DH" && batter.positionGroup !== entry.position))) errors.push(`${batter.name}: ${POSITION_LABEL[entry.position]} 자격을 확인하세요.`);
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
