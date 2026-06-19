import type { RunnerSituation } from "../types";
import { getSituationLabel } from "../utils/batterUtils";

type Props = { situation: RunnerSituation; compact?: boolean };

const occupied: Record<RunnerSituation, number[]> = {
  basesEmpty: [], runner1: [1], runner2: [2], runner3: [3], runner12: [1, 2],
  runner13: [1, 3], runner23: [2, 3], basesLoaded: [1, 2, 3],
};

export function RunnerDiamond({ situation, compact = false }: Props) {
  return (
    <div className={`diamond-wrap ${compact ? "is-compact" : ""}`} aria-label={`주자 상황: ${getSituationLabel(situation)}`}>
      <svg viewBox="0 0 160 125" role="img">
        <path className="infield" d="M80 12 142 72 80 116 18 72Z" />
        <path className="base-path" d="M80 26 128 72 80 106 32 72Z" />
        <rect className={`base base-1 ${occupied[situation].includes(1) ? "occupied" : ""}`} x="120" y="64" width="16" height="16" transform="rotate(45 128 72)" />
        <rect className={`base base-2 ${occupied[situation].includes(2) ? "occupied" : ""}`} x="72" y="18" width="16" height="16" transform="rotate(45 80 26)" />
        <rect className={`base base-3 ${occupied[situation].includes(3) ? "occupied" : ""}`} x="24" y="64" width="16" height="16" transform="rotate(45 32 72)" />
        <path className="home" d="M72 101h16l4 6-12 10-12-10Z" />
      </svg>
      {!compact && <strong>{getSituationLabel(situation)}</strong>}
    </div>
  );
}
