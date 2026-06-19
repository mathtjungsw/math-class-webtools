import { useState } from "react";
import type { Batter, ExperimentResult, RunnerSituation } from "../types";
import { formatAvg, formatDifference, getSituationAvg, getSituationFormula, getSituationLabel } from "../utils/batterUtils";
import { runMultipleExperiments } from "../utils/experimentUtils";
import { BatterSelect, SituationSelect } from "./Controls";

type Props = {
  batters: Batter[];
  batterId: string;
  situation: RunnerSituation;
  results: ExperimentResult[];
  onBatterChange: (value: string) => void;
  onSituationChange: (value: RunnerSituation) => void;
  onResultsChange: (results: ExperimentResult[]) => void;
};

export function ExperimentTab(props: Props) {
  const [count, setCount] = useState(100);
  const batter = props.batters.find((item) => item.id === props.batterId) ?? props.batters[0];
  if (!batter) return <div className="empty-state">실험할 선수 데이터가 없습니다.</div>;
  const probability = getSituationAvg(batter, props.situation);
  const latest = props.results[0];
  const graphResults = [...props.results].reverse().slice(-8);
  const run = () => props.onResultsChange([runMultipleExperiments(probability, count, batter.name, props.situation), ...props.results]);

  return <section className="tab-page"><div className="section-heading"><div><p className="overline dark">STEP 04 · SIMULATION</p><h2>확률을 실제 타석처럼 실험하세요</h2><p>난수와 조건부 타율을 비교해 안타 또는 아웃을 판정합니다.</p></div><div className="scoreboard-mini"><span>{getSituationFormula(props.situation)}</span><strong>{formatAvg(probability)}</strong></div></div>
    <div className="experiment-setup card-panel"><BatterSelect label="실험 선수" batters={props.batters} value={batter.id} onChange={props.onBatterChange} /><SituationSelect value={props.situation} onChange={props.onSituationChange} /><fieldset><legend>실험 횟수</legend><div className="segmented">{[1, 10, 100, 1000].map((value) => <button type="button" className={count === value ? "active" : ""} onClick={() => setCount(value)} key={value}>{value.toLocaleString()}회</button>)}</div></fieldset><button className="button action" onClick={run}>⚾ 실험 시작</button><button className="button" onClick={() => props.onResultsChange([])}>결과 초기화</button></div>
    {latest ? <><div className="result-scoreboard"><div><span>실험 횟수</span><strong>{latest.trials.toLocaleString()}</strong></div><div><span>안타</span><strong className="hit-color">{latest.hits}</strong></div><div><span>아웃</span><strong>{latest.outs}</strong></div><div><span>상대도수</span><strong>{formatAvg(latest.relativeFrequency)}</strong></div><div><span>이론값과 차이</span><strong className={latest.difference >= 0 ? "hit-color" : "out-color"}>{formatDifference(latest.difference)}</strong></div></div>
      {latest.singleTrial && <article className={`single-verdict ${latest.singleTrial.isHit ? "is-hit" : "is-out"}`}><div className="verdict-icon">{latest.singleTrial.isHit ? "HIT" : "OUT"}</div><div><p>생성된 난수 <strong>{latest.singleTrial.randomValue.toFixed(3)}</strong></p><h3>{latest.singleTrial.randomValue.toFixed(3)} {latest.singleTrial.isHit ? "≤" : ">"} {formatAvg(latest.probability)} 이므로 <b>{latest.singleTrial.isHit ? "안타" : "아웃"}</b></h3><small>판정 기준: 난수 ≤ {getSituationFormula(latest.situation)} 이면 안타</small></div></article>}
      <div className="experiment-charts"><article className="card-panel"><div className="card-title"><h3>상대도수의 변화</h3><span>큰 수의 법칙 관찰</span></div><FrequencyChart results={graphResults} /></article><article className="card-panel"><div className="card-title"><h3>최근 {latest.recentTrials.length}회</h3><span>● 안타 · ○ 아웃</span></div><div className="recent-trials">{latest.recentTrials.map((isHit, index) => <i className={isHit ? "hit" : "out"} key={index}>{isHit ? "●" : "○"}</i>)}</div><div className="ratio-bar"><i style={{ width: `${latest.relativeFrequency * 100}%` }} /><span>{Math.round(latest.relativeFrequency * 100)}% 안타</span></div></article></div>
      <div className="comparison-table-wrap"><table><thead><tr><th>시각</th><th>선수 · 상황</th><th>횟수</th><th>이론 확률</th><th>안타 / 아웃</th><th>상대도수</th><th>차이</th></tr></thead><tbody>{props.results.map((result) => <tr key={result.id}><td>{result.createdAt}</td><th>{result.batterName} · {getSituationLabel(result.situation)}</th><td>{result.trials}</td><td>{formatAvg(result.probability)}</td><td>{result.hits} / {result.outs}</td><td>{formatAvg(result.relativeFrequency)}</td><td>{formatDifference(result.difference)}</td></tr>)}</tbody></table></div>
      <div className="explainer large"><span>관찰 결과</span><p>실험 횟수가 적을 때는 상대도수가 이론 확률과 크게 다를 수 있습니다. 하지만 실험 횟수가 많아질수록 상대도수는 이론 확률에 가까워지는 경향이 있습니다.</p></div>
    </> : <div className="experiment-empty"><span>⚾</span><h3>아직 실험 기록이 없습니다</h3><p>{batter.name} 선수의 {getSituationLabel(props.situation)} 타율 {formatAvg(probability)}을 확률로 사용합니다.</p><code>난수 ≤ {formatAvg(probability)} → 안타</code></div>}
  </section>;
}

function FrequencyChart({ results }: { results: ExperimentResult[] }) {
  if (results.length === 0) return null;
  const width = 560, height = 210, pad = 36;
  const x = (index: number) => results.length === 1 ? width / 2 : pad + index * (width - pad * 2) / (results.length - 1);
  const y = (value: number) => height - pad - value * (height - pad * 1.5);
  const points = results.map((result, index) => `${x(index)},${y(result.relativeFrequency)}`).join(" ");
  const probability = results[results.length - 1].probability;
  return <svg className="line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="실험 상대도수 변화 그래프"><line className="grid-line" x1={pad} x2={width - pad} y1={y(probability)} y2={y(probability)} /><text x={pad} y={y(probability) - 7}>이론값 {formatAvg(probability)}</text><polyline points={points} /><g>{results.map((result, index) => <g key={result.id}><circle cx={x(index)} cy={y(result.relativeFrequency)} r="6" /><text className="axis-label" x={x(index)} y={height - 10} textAnchor="middle">{result.trials}회</text></g>)}</g></svg>;
}
