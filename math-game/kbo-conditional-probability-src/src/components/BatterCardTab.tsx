import { useMemo, useState } from "react";
import type { Batter, RunnerSituation, SortOption } from "../types";
import { SITUATIONS, formatAvg, formatDifference, getChangeLabel, getDifference, getInterpretation, getSituationAvg, getSituationFormula, getSituationLabel } from "../utils/batterUtils";
import { PlayerAvatar, SituationSelect } from "./Controls";
import { RunnerDiamond } from "./RunnerDiamond";

type Props = {
  batters: Batter[];
  selectedTeam: string;
  situation: RunnerSituation;
  sortOption: SortOption;
  searchKeyword: string;
  onTeamChange: (value: string) => void;
  onSituationChange: (value: RunnerSituation) => void;
  onSortChange: (value: SortOption) => void;
  onSearchChange: (value: string) => void;
  onSelectBatter: (batter: Batter) => void;
};

const sortLabels: Record<SortOption, string> = {
  overall: "전체 타율 높은 순", situation: "선택 상황 타율 높은 순", rise: "상승폭 큰 순",
  fall: "하락폭 큰 순", name: "이름순", team: "구단순",
};

export function BatterCardTab(props: Props) {
  const { batters, selectedTeam, situation, sortOption, searchKeyword } = props;
  const [detail, setDetail] = useState<Batter | null>(null);
  const teams = [...new Set(batters.map((batter) => batter.team))].sort();
  const filtered = useMemo(() => {
    const list = batters.filter((batter) => (selectedTeam === "전체" || batter.team === selectedTeam) && batter.name.includes(searchKeyword.trim()));
    return list.sort((a, b) => {
      if (sortOption === "overall") return b.overallAvg - a.overallAvg;
      if (sortOption === "situation") return getSituationAvg(b, situation) - getSituationAvg(a, situation);
      if (sortOption === "rise") return getDifference(b, situation) - getDifference(a, situation);
      if (sortOption === "fall") return getDifference(a, situation) - getDifference(b, situation);
      return String(a[sortOption]).localeCompare(String(b[sortOption]), "ko");
    });
  }, [batters, selectedTeam, searchKeyword, sortOption, situation]);

  const rankings = [
    { label: "상황 타율 TOP 5", items: [...batters].sort((a, b) => getSituationAvg(b, situation) - getSituationAvg(a, situation)).slice(0, 5), value: (b: Batter) => getSituationAvg(b, situation) },
    { label: "상승폭 TOP 5", items: [...batters].sort((a, b) => getDifference(b, situation) - getDifference(a, situation)).slice(0, 5), value: (b: Batter) => getDifference(b, situation) },
    { label: "하락폭 TOP 5", items: [...batters].sort((a, b) => getDifference(a, situation) - getDifference(b, situation)).slice(0, 5), value: (b: Batter) => getDifference(b, situation) },
  ];

  return (
    <section className="tab-page">
      <div className="section-heading compact"><div><p className="overline dark">STEP 02 · PLAYER DECK</p><h2>조건을 바꾸며 타자 카드를 탐색하세요</h2></div><RunnerDiamond situation={situation} compact /></div>
      <div className="explainer"><span>개념 체크</span><p>타율 0.300은 비슷한 조건의 타석 100번 중 약 30번 안타를 친다는 뜻으로 볼 수 있습니다. <b>주자 상황</b>이 조건이고, <b>안타</b>가 사건입니다.</p></div>
      <div className="filter-bar card-panel">
        <label className="field"><span>구단</span><select value={selectedTeam} onChange={(event) => props.onTeamChange(event.target.value)}><option>전체</option>{teams.map((team) => <option key={team}>{team}</option>)}</select></label>
        <label className="field search-field"><span>선수 검색</span><input value={searchKeyword} onChange={(event) => props.onSearchChange(event.target.value)} placeholder="이름을 입력하세요" /></label>
        <SituationSelect value={situation} onChange={props.onSituationChange} />
        <label className="field"><span>정렬</span><select value={sortOption} onChange={(event) => props.onSortChange(event.target.value as SortOption)}>{Object.entries(sortLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      </div>

      <div className="ranking-grid">
        {rankings.map((ranking) => <details key={ranking.label}><summary>{ranking.label}</summary><ol>{ranking.items.map((batter) => <li key={batter.id}><span>{batter.name} <small>{batter.team}</small></span><b>{formatDifference(ranking.value(batter))}</b></li>)}</ol></details>)}
      </div>

      <div className="result-count"><strong>{filtered.length}명</strong>의 타자를 찾았습니다</div>
      {filtered.length === 0 ? <div className="empty-state">조건에 맞는 선수가 없습니다. 필터나 검색어를 바꿔 보세요.</div> : <div className="batter-grid">
        {filtered.map((batter, index) => {
          const situationAvg = getSituationAvg(batter, situation);
          const difference = getDifference(batter, situation);
          return (
            <button className="batter-card" key={batter.id} onClick={() => { setDetail(batter); props.onSelectBatter(batter); }}>
              <div className="card-rank">#{index + 1}</div><div className="player-line"><PlayerAvatar batter={batter} /><div><span className="team-tag">{batter.team}</span><h3>{batter.name}</h3></div></div>
              <div className="probability-score"><div><span>전체 타율</span><small>P(안타)</small><strong>{formatAvg(batter.overallAvg)}</strong></div><i>→</i><div className="highlight"><span>{getSituationLabel(situation)} 타율</span><small>{getSituationFormula(situation)}</small><strong>{formatAvg(situationAvg)}</strong></div></div>
              <div className={`change-chip ${difference > 0.005 ? "up" : difference < -0.005 ? "down" : "same"}`}><b>{formatDifference(difference)}</b>{getChangeLabel(difference)}</div>
              <p className="interpretation">{getInterpretation(batter, situation)}</p><span className="detail-link">8가지 상황 자세히 보기 →</span>
            </button>
          );
        })}
      </div>}

      {detail && <BatterDetail batter={detail} onClose={() => setDetail(null)} />}
    </section>
  );
}

function BatterDetail({ batter, onClose }: { batter: Batter; onClose: () => void }) {
  const values = SITUATIONS.map((situation) => ({ situation, avg: getSituationAvg(batter, situation), difference: getDifference(batter, situation) }));
  const strongest = [...values].sort((a, b) => b.avg - a.avg)[0];
  const weakest = [...values].sort((a, b) => a.avg - b.avg)[0];
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><article className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title"><button className="close-button" onClick={onClose} aria-label="닫기">×</button><div className="detail-header"><PlayerAvatar batter={batter} size="large" /><div><span className="team-tag">{batter.team}</span><h2 id="detail-title">{batter.name}</h2><p>전체 타율 <b>P(안타) = {formatAvg(batter.overallAvg)}</b></p></div></div><div className="heatmap"><h3>8가지 주자 상황별 타율</h3><div>{values.map((item) => { const intensity = Math.max(0, Math.min(1, (item.avg - 0.18) / 0.25)); return <div key={item.situation} style={{ background: `rgba(34, 133, 91, ${0.1 + intensity * 0.75})`, color: intensity > 0.48 ? "white" : "inherit" }}><span>{getSituationLabel(item.situation)}</span><strong>{formatAvg(item.avg)}</strong><small>{item.difference >= 0 ? "▲" : "▼"} {formatDifference(item.difference)}</small></div>; })}</div></div><div className="detail-summary"><div><span>가장 강한 상황</span><strong>{getSituationLabel(strongest.situation)} · {formatAvg(strongest.avg)}</strong></div><div><span>가장 약한 상황</span><strong>{getSituationLabel(weakest.situation)} · {formatAvg(weakest.avg)}</strong></div></div><p className="math-note">▲는 P(안타 | 주자 상황) ≥ P(안타), ▼는 P(안타 | 주자 상황) &lt; P(안타)를 뜻합니다.</p></article></div>;
}
