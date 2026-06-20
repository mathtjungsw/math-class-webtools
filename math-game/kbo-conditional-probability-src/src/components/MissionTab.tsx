import type { Batter, MissionAnswer, RunnerSituation, SortOption } from "../types";
import { MISSIONS } from "../data/missions";
import { getSituationLabel } from "../utils/batterUtils";

type Props = {
  batters: Batter[];
  answers: Record<string, MissionAnswer>;
  onAnswersChange: (answers: Record<string, MissionAnswer>) => void;
  onApplyMission: (situation: RunnerSituation, sortOption: SortOption) => void;
};

export function MissionTab({ batters, answers, onAnswersChange, onApplyMission }: Props) {
  const completed = Object.values(answers).filter((answer) => answer.completed).length;
  const update = (id: string, patch: Partial<MissionAnswer>) => {
    const current = answers[id] ?? { answer: "", batterId: "", completed: false };
    onAnswersChange({ ...answers, [id]: { ...current, ...patch } });
  };
  return <section className="tab-page"><div className="section-heading"><div><p className="overline dark">STEP 07 · MISSIONS</p><h2>감독처럼 판단하고, 확률로 설명하세요</h2><p>미션을 열면 관련 주자 상황과 추천 정렬이 선수 카드에 자동으로 적용됩니다.</p></div><div className="mission-progress"><strong>{completed}</strong><span>/ {MISSIONS.length} 완료</span></div></div>
    <div className="daily-question"><span>오늘의 탐구 질문</span><p>전체 타율이 낮아도 특정 상황에서 강한 선수는 감독에게 어떤 의미가 있을까?</p></div>
    <div className="mission-grid">{MISSIONS.map((mission, index) => { const answer = answers[mission.id] ?? { answer: "", batterId: "", completed: false }; return <article className={`mission-card ${answer.completed ? "completed" : ""}`} key={mission.id}><div className="mission-top"><span>MISSION {String(index + 1).padStart(2, "0")}</span><label><input type="checkbox" checked={answer.completed} onChange={(event) => update(mission.id, { completed: event.target.checked })} /> 완료</label></div><h3>{mission.title}</h3><p className="mission-scene"><b>상황</b> {mission.scene}</p><p>{mission.question}</p><div className="mission-condition">조건: {getSituationLabel(mission.situation)} · 추천 정렬 자동 적용</div><button className="button small" onClick={() => onApplyMission(mission.situation, mission.sortOption)}>선수 카드에서 탐색</button><label className="field"><span>선택한 선수</span><select value={answer.batterId} onChange={(event) => update(mission.id, { batterId: event.target.value })}><option value="">선수를 선택하세요</option>{batters.map((batter) => <option value={batter.id} key={batter.id}>{batter.name} · {batter.team}</option>)}</select></label><label className="field"><span>나의 판단과 근거</span><textarea value={answer.answer} onChange={(event) => update(mission.id, { answer: event.target.value })} placeholder="P(안타)와 P(안타 | 조건)을 사용해 설명하세요." /></label></article>; })}</div>
  </section>;
}
