import type { Batter, RunnerSituation } from "../types";
import { SITUATIONS, getSituationLabel } from "../utils/batterUtils";

export function SituationSelect({ value, onChange, label = "주자 상황" }: { value: RunnerSituation; onChange: (value: RunnerSituation) => void; label?: string }) {
  return (
    <label className="field"><span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as RunnerSituation)}>
        {SITUATIONS.map((situation) => <option value={situation} key={situation}>{getSituationLabel(situation)}</option>)}
      </select>
    </label>
  );
}

export function BatterSelect({ label, batters, value, onChange }: { label: string; batters: Batter[]; value: string; onChange: (value: string) => void }) {
  return (
    <label className="field"><span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {batters.map((batter) => <option value={batter.id} key={batter.id}>{batter.name} · {batter.team}</option>)}
      </select>
    </label>
  );
}

export function PlayerAvatar({ batter, size = "normal" }: { batter: Batter; size?: "normal" | "large" }) {
  return (
    <div className={`avatar ${size === "large" ? "large" : ""}`}>
      {batter.imageUrl ? <img src={batter.imageUrl} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}
      <span aria-hidden="true">⚾</span>
    </div>
  );
}
