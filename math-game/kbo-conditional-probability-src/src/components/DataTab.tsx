import { useMemo, useRef, useState } from "react";
import type { Batter, DataSource } from "../types";
import { parseCsvToBatters, validateBatters } from "../utils/csvUtils";

type Props = {
  batters: Batter[];
  dataSource: DataSource;
  season: string;
  onSeasonChange: (season: string) => void;
  onImport: (batters: Batter[]) => void;
  onReset: () => void;
};

const sourceLabel: Record<DataSource, string> = { sample: "샘플 데이터 사용 중", csv: "CSV 데이터 사용 중", live: "실제 데이터 사용 중" };

export function DataTab({ batters, dataSource, season, onSeasonChange, onImport, onReset }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
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

  const tryLiveData = async () => {
    setLoading(true);
    setMessage("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 4500);
    try {
      const response = await fetch("https://www.koreabaseball.com/Record/Player/HitterBasic/Basic1.aspx", { signal: controller.signal });
      if (!response.ok) throw new Error("응답을 받을 수 없습니다.");
      throw new Error("공식 기록실이 브라우저용 데이터 형식을 제공하지 않습니다.");
    } catch {
      setMessage("KBO 기록실 데이터는 브라우저 보안 정책 때문에 직접 불러오지 못할 수 있습니다. KBO 기록을 안내된 형식의 CSV로 저장한 뒤 업로드하면 실제 데이터로 수업을 진행할 수 있습니다. 현재 샘플 데이터는 그대로 유지됩니다.");
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  };

  return (
    <section className="tab-page">
      <div className="section-heading">
        <div><p className="overline dark">STEP 01 · DATA DUGOUT</p><h2>수업에 쓸 데이터를 준비하세요</h2><p>인터넷이 없어도 10개 구단, 30명의 샘플 데이터로 모든 활동을 할 수 있습니다.</p></div>
        <div className={`status-pill ${dataSource}`}><i />{sourceLabel[dataSource]}</div>
      </div>

      <div className="stats-row">
        <div className="stat-card"><span>{teamFilter === "전체" ? "사용 중인 선수" : `${teamFilter} 선수`}</span><strong>{displayBatters.length}<small>명</small></strong></div>
        <div className="stat-card"><span>등록 구단</span><strong>{teams.length}<small>개</small></strong></div>
        <div className="stat-card"><span>선택 시즌</span><strong>{season}<small>시즌</small></strong></div>
      </div>

      <div className="data-actions card-panel">
        <label className="field"><span>시즌</span><select value={season} onChange={(event) => onSeasonChange(event.target.value)}>{[2026, 2025, 2024, 2023].map((year) => <option key={year}>{year}</option>)}</select></label>
        <label className="field"><span>구단 필터</span><select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)}><option>전체</option>{teams.map((team) => <option key={team}>{team}</option>)}</select></label>
        <input ref={fileRef} hidden type="file" accept=".csv,text/csv" onChange={(event) => readCsv(event.target.files?.[0])} />
        <button className="button primary" onClick={() => fileRef.current?.click()}>CSV 업로드</button>
        <button className="button" onClick={() => { onReset(); setMessage("샘플 데이터로 초기화했습니다."); }}>샘플 데이터로 초기화</button>
        <button className="button dark" disabled={loading} onClick={tryLiveData}>{loading ? "불러오는 중…" : "실제 KBO 데이터 불러오기"}</button>
      </div>
      {message && <div className="notice" role="status">{message}</div>}

      <div className="chart-grid">
        <article className="card-panel chart-panel"><div className="card-title"><h3>구단별 선수 수</h3><span>TEAM ROSTER</span></div><div className="bar-chart team-bars">{counts.filter(({ team }) => teamFilter === "전체" || team === teamFilter).map(({ team, count }) => <div className="bar-row" key={team}><b>{team}</b><div><i style={{ width: `${count / Math.max(...counts.map((item) => item.count)) * 100}%` }} /></div><span>{count}</span></div>)}</div></article>
        <article className="card-panel chart-panel"><div className="card-title"><h3>전체 타율 분포</h3><span>P(안타)</span></div><div className="histogram">{histogram.map((bin) => <div key={bin.label}><span>{bin.count}</span><i style={{ height: `${Math.max(7, bin.count / Math.max(...histogram.map((item) => item.count), 1) * 130)}px` }} /><small>{bin.label}</small></div>)}</div></article>
      </div>

      <div className="csv-guide"><strong>CSV 컬럼 안내</strong><code>name, team, imageUrl, overallAvg, basesEmptyAvg, runner1Avg, runner2Avg, runner3Avg, runner12Avg, runner13Avg, runner23Avg, basesLoadedAvg</code><p>한국어 컬럼명(선수명, 구단, 사진, 전체타율, 주자없음, 1루…만루)도 지원합니다.</p></div>
    </section>
  );
}
