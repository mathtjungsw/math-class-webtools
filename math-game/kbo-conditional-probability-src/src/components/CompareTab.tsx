import type { Batter, RunnerSituation } from "../types";
import { formatAvg, formatDifference, getDifference, getSituationAvg, getSituationFormula, getSituationLabel } from "../utils/batterUtils";
import { BatterSelect, PlayerAvatar, SituationSelect } from "./Controls";

type Props = {
  batters: Batter[];
  batterAId: string;
  batterBId: string;
  situation: RunnerSituation;
  answer: string;
  onBatterAChange: (value: string) => void;
  onBatterBChange: (value: string) => void;
  onSituationChange: (value: RunnerSituation) => void;
  onAnswerChange: (value: string) => void;
};

export function CompareTab(props: Props) {
  const batterA = props.batters.find((batter) => batter.id === props.batterAId) ?? props.batters[0];
  const batterB = props.batters.find((batter) => batter.id === props.batterBId) ?? props.batters[1];
  if (!batterA || !batterB) return <div className="empty-state">비교할 선수 데이터가 없습니다.</div>;
  const same = batterA.id === batterB.id;
  const players = [batterA, batterB];
  const max = Math.max(...players.flatMap((batter) => [batter.overallAvg, getSituationAvg(batter, props.situation)]), 0.4);

  return <section className="tab-page"><div className="section-heading"><div><p className="overline dark">STEP 03 · MATCHUP</p><h2>두 타자, 조건이 바꾸는 선택</h2><p>전체 성적만 볼 때와 지금의 주자 상황을 고려할 때 선택이 같은지 비교하세요.</p></div></div>
    <div className="filter-bar compare-controls card-panel"><BatterSelect label="선수 A" batters={props.batters} value={batterA.id} onChange={props.onBatterAChange} /><span className="versus">VS</span><BatterSelect label="선수 B" batters={props.batters} value={batterB.id} onChange={props.onBatterBChange} /><SituationSelect value={props.situation} onChange={props.onSituationChange} /></div>
    {same && <div className="notice error">선수 A와 B는 서로 달라야 합니다. 다른 선수를 선택해 주세요.</div>}
    {!same && <><div className="compare-players">{players.map((batter, index) => { const difference = getDifference(batter, props.situation); return <article className={`compare-player player-${index}`} key={batter.id}><div className="player-line"><PlayerAvatar batter={batter} /><div><span className="team-tag">선수 {index === 0 ? "A" : "B"} · {batter.team}</span><h3>{batter.name}</h3></div></div><div className="compare-value"><span>P(안타)</span><strong>{formatAvg(batter.overallAvg)}</strong></div><div className="compare-value hot"><span>{getSituationFormula(props.situation)}</span><strong>{formatAvg(getSituationAvg(batter, props.situation))}</strong></div><div className={`change-chip ${difference >= 0 ? "up" : "down"}`}><b>{formatDifference(difference)}</b> 변화</div></article>; })}</div>
      <div className="card-panel compare-chart"><div className="card-title"><h3>{getSituationLabel(props.situation)} 상황 비교</h3><span>확률 막대</span></div>{players.map((batter) => <div className="chart-group" key={batter.id}><b>{batter.name}</b><div className="metric-bar"><span>P(안타)</span><div><i className="overall" style={{ width: `${batter.overallAvg / max * 100}%` }} /></div><strong>{formatAvg(batter.overallAvg)}</strong></div><div className="metric-bar"><span>{getSituationFormula(props.situation)}</span><div><i className="conditional" style={{ width: `${getSituationAvg(batter, props.situation) / max * 100}%` }} /></div><strong>{formatAvg(getSituationAvg(batter, props.situation))}</strong></div></div>)}</div>
      <div className="comparison-table-wrap"><table><thead><tr><th>선수</th><th>전체 타율 P(안타)</th><th>{getSituationFormula(props.situation)}</th><th>변화</th></tr></thead><tbody>{players.map((batter) => <tr key={batter.id}><th>{batter.name}</th><td>{formatAvg(batter.overallAvg)}</td><td>{formatAvg(getSituationAvg(batter, props.situation))}</td><td className={getDifference(batter, props.situation) >= 0 ? "positive" : "negative"}>{formatDifference(getDifference(batter, props.situation))}</td></tr>)}</tbody></table></div>
    </>}
    <article className="question-card"><div><span>THINK LIKE A MANAGER</span><h3>감독의 선택은 달라졌나요?</h3></div><ul><li>전체 타율만 본다면 누구를 선택하겠습니까?</li><li>현재 주자 상황을 고려하면 누구를 선택하겠습니까?</li><li>두 판단이 달라졌다면 그 이유는 무엇입니까?</li><li>이것이 조건부 확률과 어떤 관련이 있습니까?</li></ul><textarea value={props.answer} onChange={(event) => props.onAnswerChange(event.target.value)} placeholder="확률을 근거로 나의 판단을 적어 보세요." /></article>
  </section>;
}
