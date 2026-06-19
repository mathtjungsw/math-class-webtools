import { useMemo, useState } from "react";
import type { Batter, DataSource, ExperimentResult, MissionAnswer, ReportData, RunnerSituation, SortOption, TabId } from "./types";
import { SAMPLE_BATTERS } from "./data/sampleBatters";
import { Header } from "./components/Header";
import { TabNavigation } from "./components/TabNavigation";
import { DataTab } from "./components/DataTab";
import { BatterCardTab } from "./components/BatterCardTab";
import { CompareTab } from "./components/CompareTab";
import { ExperimentTab } from "./components/ExperimentTab";
import { MissionTab } from "./components/MissionTab";
import { ReportTab } from "./components/ReportTab";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("cards");
  const [selectedTeam, setSelectedTeam] = useState("전체");
  const [selectedRunnerSituation, setSelectedRunnerSituation] = useState<RunnerSituation>("basesLoaded");
  const [selectedBatterId, setSelectedBatterId] = useState(SAMPLE_BATTERS[0].id);
  const [selectedBatterA, setSelectedBatterA] = useState(SAMPLE_BATTERS[0].id);
  const [selectedBatterB, setSelectedBatterB] = useState(SAMPLE_BATTERS[1].id);
  const [sortOption, setSortOption] = useState<SortOption>("situation");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [experimentResults, setExperimentResults] = useState<ExperimentResult[]>([]);
  const [missionAnswers, setMissionAnswers] = useState<Record<string, MissionAnswer>>({});
  const [comparisonAnswer, setComparisonAnswer] = useState("");
  const [dataSource, setDataSource] = useState<DataSource>("sample");
  const [batters, setBatters] = useState<Batter[]>(SAMPLE_BATTERS);
  const [season, setSeason] = useState("2026");
  const [classMode, setClassMode] = useState(false);
  const [reportData, setReportData] = useState<ReportData>({
    studentName: "", studentNumber: "", team: "전체", batterId: SAMPLE_BATTERS[0].id,
    situation: "basesLoaded", learned: "", whyNeeded: "", nextQuestion: "",
  });

  const selectedBatter = useMemo(() => batters.find((batter) => batter.id === selectedBatterId) ?? batters[0], [batters, selectedBatterId]);
  const safeUpdateData = (nextBatters: Batter[], source: DataSource) => {
    setBatters(nextBatters); setDataSource(source); setSelectedTeam("전체"); setSearchKeyword(""); setExperimentResults([]);
    const first = nextBatters[0]; const second = nextBatters[1] ?? first;
    if (first) { setSelectedBatterId(first.id); setSelectedBatterA(first.id); setSelectedBatterB(second.id); setReportData((data) => ({ ...data, team: "전체", batterId: first.id })); }
  };

  return <div className={`${classMode ? "app class-mode" : "app"} min-h-screen antialiased`}>
    <Header situation={selectedRunnerSituation} classMode={classMode} onClassModeChange={setClassMode} />
    <main className="workspace"><TabNavigation active={activeTab} onChange={setActiveTab} />
      <div className="content-shell">
        {activeTab === "data" && <DataTab batters={batters} dataSource={dataSource} season={season} onSeasonChange={setSeason} onImport={(value) => safeUpdateData(value, "csv")} onReset={() => safeUpdateData(SAMPLE_BATTERS, "sample")} />}
        {activeTab === "cards" && <BatterCardTab batters={batters} selectedTeam={selectedTeam} situation={selectedRunnerSituation} sortOption={sortOption} searchKeyword={searchKeyword} onTeamChange={setSelectedTeam} onSituationChange={setSelectedRunnerSituation} onSortChange={setSortOption} onSearchChange={setSearchKeyword} onSelectBatter={(batter) => setSelectedBatterId(batter.id)} />}
        {activeTab === "compare" && <CompareTab batters={batters} batterAId={selectedBatterA} batterBId={selectedBatterB} situation={selectedRunnerSituation} answer={comparisonAnswer} onBatterAChange={setSelectedBatterA} onBatterBChange={setSelectedBatterB} onSituationChange={setSelectedRunnerSituation} onAnswerChange={setComparisonAnswer} />}
        {activeTab === "experiment" && <ExperimentTab batters={batters} batterId={selectedBatter?.id ?? ""} situation={selectedRunnerSituation} results={experimentResults} onBatterChange={setSelectedBatterId} onSituationChange={setSelectedRunnerSituation} onResultsChange={setExperimentResults} />}
        {activeTab === "missions" && <MissionTab batters={batters} answers={missionAnswers} onAnswersChange={setMissionAnswers} onApplyMission={(situation, sort) => { setSelectedRunnerSituation(situation); setSortOption(sort); setActiveTab("cards"); }} />}
        {activeTab === "report" && <ReportTab batters={batters} data={reportData} results={experimentResults} onChange={setReportData} />}
      </div>
    </main>
    <footer><p>현재 표시된 샘플 데이터는 수업용 예시 데이터이며 실제 KBO 기록이 아닙니다. 실제 기록은 CSV 업로드 기능을 사용하세요.</p><span>전체 타율 = P(안타) · 주자 상황별 타율 = P(안타 | 주자 상황)</span></footer>
  </div>;
}
