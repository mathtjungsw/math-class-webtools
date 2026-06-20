import { useEffect, useMemo, useState } from "react";
import type { Batter, DataSource, ExperimentResult, MissionAnswer, ReportData, RunnerSituation, SavedLineups, SortOption, TabId } from "./types";
import { SAMPLE_BATTERS } from "./data/sampleBatters";
import { Header } from "./components/Header";
import { TabNavigation } from "./components/TabNavigation";
import { DataTab } from "./components/DataTab";
import { BatterCardTab } from "./components/BatterCardTab";
import { CompareTab } from "./components/CompareTab";
import { ExperimentTab } from "./components/ExperimentTab";
import { LineupBuilderTab } from "./components/LineupBuilderTab";
import { GameSimulationTab } from "./components/GameSimulationTab";
import { MissionTab } from "./components/MissionTab";
import { ReportTab } from "./components/ReportTab";

const LINEUP_STORAGE_KEY = "kbo-conditional-probability-saved-lineups";

function loadSavedLineups(): SavedLineups {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(window.localStorage.getItem(LINEUP_STORAGE_KEY) ?? "{}"); }
  catch { return {}; }
}

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
  const [season, setSeason] = useState("2025");
  const [classMode, setClassMode] = useState(false);
  const [savedLineups, setSavedLineups] = useState<SavedLineups>(loadSavedLineups);
  const [reportData, setReportData] = useState<ReportData>({
    studentName: "", studentNumber: "", team: "전체", batterId: SAMPLE_BATTERS[0].id,
    situation: "basesLoaded", learned: "", whyNeeded: "", nextQuestion: "",
  });

  const selectedBatter = useMemo(() => batters.find((batter) => batter.id === selectedBatterId) ?? batters[0], [batters, selectedBatterId]);
  useEffect(() => {
    window.localStorage.setItem(LINEUP_STORAGE_KEY, JSON.stringify(savedLineups));
  }, [savedLineups]);

  const safeUpdateData = (nextBatters: Batter[], source: DataSource) => {
    setBatters(nextBatters); setDataSource(source); setSelectedTeam("전체"); setSearchKeyword(""); setExperimentResults([]); setSavedLineups({});
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
        {activeTab === "lineup" && <LineupBuilderTab batters={batters} savedLineups={savedLineups} onSave={(side, lineup) => setSavedLineups((current) => ({ ...current, [side]: lineup }))} onOpenGame={() => setActiveTab("game")} />}
        {activeTab === "game" && <GameSimulationTab batters={batters} savedLineups={savedLineups} onOpenLineupBuilder={() => setActiveTab("lineup")} />}
        {activeTab === "missions" && <MissionTab batters={batters} answers={missionAnswers} onAnswersChange={setMissionAnswers} onApplyMission={(situation, sort) => { setSelectedRunnerSituation(situation); setSortOption(sort); setActiveTab("cards"); }} />}
        {activeTab === "report" && <ReportTab batters={batters} data={reportData} results={experimentResults} onChange={setReportData} />}
      </div>
    </main>
    <footer><p>기본 자료는 사용자가 제공한 2025 KBO 타자 주자 상황별 기록입니다. 수업 전 원자료와 공식 기록의 최신값을 함께 확인하세요.</p><span>전체 타율 = P(안타) · 주자 상황별 타율 = P(안타 | 주자 상황)</span></footer>
  </div>;
}
