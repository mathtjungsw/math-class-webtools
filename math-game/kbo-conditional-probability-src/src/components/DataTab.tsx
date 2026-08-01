import { useMemo, useRef, useState } from "react";
import type { Batter, DataSource } from "../types";
import { parseCsvToBatters, validateBatters } from "../utils/csvUtils";

type Props = {
  batters: Batter[];
  dataSource: DataSource;
  onImport: (batters: Batter[]) => void;
  onReset: () => void;
};

const sourceLabel: Record<DataSource, string> = { sample: "2025 KBO 기록값 사용 중", csv: "CSV 데이터 사용 중", live: "사용자 데이터 사용 중" };

export function DataTab({ batters, dataSource, onImport, onReset }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [teamFilter, setTeamFilter] = useState("전체");
  const teams = useMemo(() => [...new Set(batters.map((batter) => batter.team))].sort(), [batters]);
  const displayBatters = teamFilter === "전체" ? batters : batters.filter((batter) => batter.team === teamFilter);
  const counts = teams.map((team) => ({ team, count: batters.filter((batter) => batter.team === team).length }));
  const bins = [0.2, 0.24, 0.26, 0.28, 0.3, 0.32, 0.36];
  const histogram = bins.slice(0, -1).map((start, index) => ({
    label: `${start.toFixed(2)}~${bins[index + 1].toFixed(2)}`,
    count: displayBatters.filter((batter) => batter.overallAvg >= start && batter.overallAvg < bins[index + 1]).length,
  }));

  const readCsv = async (file?: File) => {
    if (!file) return;
    try {
      const parsed = parseCsvToBatters(await file.text());
      const errors = validateBatters(parsed);
      if (errors.length) throw new Error(errors.slice(0, 4).join("\n"));
      onImport(parsed);
      setMessage(`✓ ${parsed.length}명의 CSV 데이터를 불러왔습니다.`);
    } catch (error) {
      setMessage(`CSV를 확인해 주세요.\n${error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다."}`);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <section className="tab-page">
      <div className="section-heading">
        <div><p className="overline dark">STEP 01 · DATA DUGOUT</p><h2>수업에 쓸 데이터를 준비하세요</h2><p>인터넷이 없어도 제공된 2025 KBO 타자 데이터로 모든 활동과 모의 경기를 진행할 수 있습니다.</p></div>
        <div className={`status-pill ${dataSource}`}><i />{sourceLabel[dataSource]}</div>
      </div>

      <div className="stats-row">
        <div className="stat-card"><span>{teamFilter === "전체" ? "사용 중인 선수" : `${teamFilter} 선수`}</span><strong>{displayBatters.length}<small>명</small></strong></div>
        <div className="stat-card"><span>등록 구단</span><strong>{teams.length}<small>개</small></strong></div>
        <div className="stat-card"><span>자료 기준</span><strong>{dataSource === "sample" ? "2025" : "CSV"}<small>{dataSource === "sample" ? "시즌" : "파일 기준"}</small></strong></div>
      </div>

      <div className="data-actions card-panel">
        <label className="field"><span>구단 필터</span><select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)}><option>전체</option>{teams.map((team) => <option key={team}>{team}</option>)}</select></label>
        <input ref={fileRef} hidden type="file" accept=".csv,text/csv" onChange={(event) => readCsv(event.target.files?.[0])} />
        <button className="button primary" onClick={() => fileRef.current?.click()}>CSV 업로드</button>
        <button className="button" onClick={() => { onReset(); setMessage("기본 2025 KBO 데이터로 초기화했습니다."); }}>2025 기본 데이터로 초기화</button>
      </div>
      <div className="notice">기본 자료는 2025 시즌 기록값입니다. 2024·2023 자료로 자동 전환되지 않으며, 다른 시즌은 해당 시즌 CSV를 올려 사용하세요. 기본 자료에는 상황별 타석 수가 없어 기록값의 크기만으로 선수를 평가할 수 없습니다.</div>
      {message && <div className="notice" role="status">{message}</div>}

      <div className="chart-grid">
        <article className="card-panel chart-panel"><div className="card-title"><h3>구단별 선수 수</h3><span>TEAM ROSTER</span></div><div className="bar-chart team-bars">{counts.filter(({ team }) => teamFilter === "전체" || team === teamFilter).map(({ team, count }) => <div className="bar-row" key={team}><b>{team}</b><div><i style={{ width: `${count / Math.max(...counts.map((item) => item.count)) * 100}%` }} /></div><span>{count}</span></div>)}</div></article>
        <article className="card-panel chart-panel"><div className="card-title"><h3>전체 타율 분포</h3><span>P(안타)</span></div><div className="histogram">{histogram.map((bin) => <div key={bin.label}><span>{bin.count}</span><i style={{ height: `${Math.max(7, bin.count / Math.max(...histogram.map((item) => item.count), 1) * 130)}px` }} /><small>{bin.label}</small></div>)}</div></article>
      </div>

      <div className="csv-guide"><strong>CSV 컬럼 안내</strong><code>name, team, imageUrl, position, overallAvg, basesEmptyAvg, …, basesLoadedAvg, overallPA, basesEmptyPA, …, basesLoadedPA</code><p>타율 컬럼은 필수입니다. 타석 수(PA) 컬럼은 선택이지만 함께 넣으면 최소 표본 필터와 표본 표시를 사용할 수 있습니다. 한국어 컬럼명도 지원하며 포지션이 없으면 모의 경기용 그룹을 자동 배정합니다.</p></div>
    </section>
  );
}
