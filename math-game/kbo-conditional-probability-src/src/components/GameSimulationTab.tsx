import { useEffect, useMemo, useState } from "react";
import type { Batter, GamePlay, LineupEntry, RunnerSituation, SavedLineup, SavedLineups } from "../types";
import { formatAvg, getSituationAvg, getSituationFormula, getSituationLabel } from "../utils/batterUtils";
import {
  advanceRunners,
  applyLineupSubstitution,
  buildLineup,
  canUseDefensiveSubstitution,
  countLineupPositions,
  hitOutcome,
  lineupErrors,
  POSITION_LABEL,
  situationFromBases,
  swapLineupEntries,
  type Bases,
} from "../utils/gameUtils";
import { PlayerAvatar } from "./Controls";

type Props = { batters: Batter[]; savedLineups: SavedLineups; onOpenLineupBuilder: () => void };
type GameStatus = "setup" | "playing" | "finished";
type Half = "top" | "bottom";
type TeamIndex = 0 | 1;
type SubstitutionRecord = {
  id: string;
  inning: number;
  half: Half;
  team: string;
  outgoing: string;
  incoming: string;
  phase: "공격" | "수비";
};

function validSavedLineup(saved: SavedLineup | undefined, batters: Batter[], teams: string[]): saved is SavedLineup {
  return Boolean(saved && teams.includes(saved.team) && lineupErrors(saved.team, saved.entries, batters).length === 0);
}

function gameHitProbability(batter: Batter, situation: RunnerSituation, multiplier: number): number {
  return Math.min(0.95, getSituationAvg(batter, situation) * multiplier);
}

export function GameSimulationTab({ batters, savedLineups, onOpenLineupBuilder }: Props) {
  const teams = useMemo(() => [...new Set(batters.map((batter) => batter.team))].sort(), [batters]);
  const savedAway = validSavedLineup(savedLineups.away, batters, teams) ? savedLineups.away : undefined;
  const savedHome = validSavedLineup(savedLineups.home, batters, teams) ? savedLineups.home : undefined;
  const firstAwayTeam = savedAway?.team ?? teams[0] ?? "";
  const firstHomeTeam = savedHome?.team !== firstAwayTeam ? savedHome?.team ?? teams.find((team) => team !== firstAwayTeam) ?? "" : teams.find((team) => team !== firstAwayTeam) ?? "";
  const [awayTeam, setAwayTeam] = useState(firstAwayTeam);
  const [homeTeam, setHomeTeam] = useState(firstHomeTeam);
  const [awayLineup, setAwayLineup] = useState<LineupEntry[]>(() => savedAway ? savedAway.entries.map((entry) => ({ ...entry })) : buildLineup(firstAwayTeam, batters));
  const [homeLineup, setHomeLineup] = useState<LineupEntry[]>(() => savedHome && savedHome.team === firstHomeTeam ? savedHome.entries.map((entry) => ({ ...entry })) : buildLineup(firstHomeTeam, batters));
  const [multiplier, setMultiplier] = useState(1.5);
  const [status, setStatus] = useState<GameStatus>("setup");
  const [inning, setInning] = useState(1);
  const [half, setHalf] = useState<Half>("top");
  const [outs, setOuts] = useState(0);
  const [bases, setBases] = useState<Bases>([null, null, null]);
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [inningRuns, setInningRuns] = useState<[number[], number[]]>([Array(9).fill(0), Array(9).fill(0)]);
  const [battingIndexes, setBattingIndexes] = useState<[number, number]>([0, 0]);
  const [plays, setPlays] = useState<GamePlay[]>([]);
  const [lastPlay, setLastPlay] = useState<GamePlay | null>(null);
  const [message, setMessage] = useState("");
  const [retiredIds, setRetiredIds] = useState<[string[], string[]]>([[], []]);
  const [substitutions, setSubstitutions] = useState<SubstitutionRecord[]>([]);
  const [offenseSubOpen, setOffenseSubOpen] = useState(false);
  const [offenseIncomingId, setOffenseIncomingId] = useState("");

  useEffect(() => {
    if (!teams.includes(awayTeam) || !teams.includes(homeTeam) || awayTeam === homeTeam) {
      const nextAway = teams[0] ?? "";
      const nextHome = teams.find((team) => team !== nextAway) ?? "";
      setAwayTeam(nextAway);
      setHomeTeam(nextHome);
      setAwayLineup(buildLineup(nextAway, batters));
      setHomeLineup(buildLineup(nextHome, batters));
    }
  }, [awayTeam, homeTeam, teams, batters]);

  const lineups: [LineupEntry[], LineupEntry[]] = [awayLineup, homeLineup];
  const gameTeams: [string, string] = [awayTeam, homeTeam];
  const activeIndex: TeamIndex = half === "top" ? 0 : 1;
  const defenseIndex: TeamIndex = activeIndex === 0 ? 1 : 0;
  const activeLineup = lineups[activeIndex];
  const activeTeam = gameTeams[activeIndex];
  const currentSlotIndex = battingIndexes[activeIndex] % 9;
  const currentEntry = activeLineup[currentSlotIndex];
  const currentBatter = batters.find((batter) => batter.id === currentEntry?.batterId);
  const situation = situationFromBases(bases);
  const baseProbability = currentBatter ? getSituationAvg(currentBatter, situation) : 0;
  const adjustedProbability = currentBatter ? gameHitProbability(currentBatter, situation, multiplier) : 0;
  const defenseErrors = status === "playing" ? lineupErrors(gameTeams[defenseIndex], lineups[defenseIndex], batters) : [];
  const activeIds = new Set(activeLineup.map((entry) => entry.batterId));
  const offenseCandidates = batters.filter((batter) => batter.team === activeTeam
    && !activeIds.has(batter.id)
    && !retiredIds[activeIndex].includes(batter.id)
    && batter.positionGroup
    && batter.positionGroup !== "DH");
  const selectedOffenseCandidate = offenseCandidates.find((batter) => batter.id === offenseIncomingId);

  const resetGame = () => {
    setStatus("setup");
    setInning(1);
    setHalf("top");
    setOuts(0);
    setBases([null, null, null]);
    setScores([0, 0]);
    setInningRuns([Array(9).fill(0), Array(9).fill(0)]);
    setBattingIndexes([0, 0]);
    setPlays([]);
    setLastPlay(null);
    setRetiredIds([[], []]);
    setSubstitutions([]);
    setOffenseSubOpen(false);
    setOffenseIncomingId("");
    setMessage("");
  };

  const startGame = () => {
    const errors = awayTeam === homeTeam
      ? ["원정팀과 홈팀은 서로 달라야 합니다."]
      : [...lineupErrors(awayTeam, awayLineup, batters), ...lineupErrors(homeTeam, homeLineup, batters)];
    if (errors.length) {
      setMessage(errors.slice(0, 4).join("\n"));
      return;
    }
    resetGame();
    setStatus("playing");
    setMessage("PLAY BALL! 원정팀의 1회초 공격입니다.");
  };

  const playAtBat = () => {
    if (status !== "playing" || !currentBatter) return;
    if (defenseErrors.length) {
      setMessage(`${gameTeams[defenseIndex]}의 수비 포지션을 먼저 맞춰 주세요.`);
      return;
    }
    setOffenseSubOpen(false);
    setOffenseIncomingId("");

    const randomValue = Math.random();
    const outcome = randomValue <= adjustedProbability ? hitOutcome() : "아웃";
    const advanced = advanceRunners(outcome, bases, currentBatter.id);
    const nextScores: [number, number] = [...scores];
    nextScores[activeIndex] += advanced.runs;
    const nextRuns: [number[], number[]] = [inningRuns[0].slice(), inningRuns[1].slice()];
    nextRuns[activeIndex][inning - 1] += advanced.runs;
    const play: GamePlay = {
      id: crypto.randomUUID(),
      inning,
      half,
      batterName: currentBatter.name,
      team: activeTeam,
      situation,
      probability: adjustedProbability,
      randomValue,
      outcome,
      runs: advanced.runs,
      score: nextScores,
    };
    setScores(nextScores);
    setInningRuns(nextRuns);
    setLastPlay(play);
    setPlays((items) => [play, ...items]);
    setBattingIndexes((indexes) => indexes.map((value, index) => index === activeIndex ? value + 1 : value) as [number, number]);

    if (half === "bottom" && inning === 9 && nextScores[1] > nextScores[0]) {
      setBases(advanced.bases);
      setStatus("finished");
      setMessage(`${homeTeam}의 끝내기! 경기가 종료되었습니다.`);
      return;
    }
    if (outcome !== "아웃") {
      setBases(advanced.bases);
      setMessage(`${currentBatter.name} ${outcome}${advanced.runs ? ` · ${advanced.runs}점 득점` : ""}`);
      return;
    }
    const nextOuts = outs + 1;
    if (nextOuts < 3) {
      setOuts(nextOuts);
      setMessage(`${currentBatter.name} 아웃 · ${nextOuts}아웃`);
      return;
    }

    setOuts(0);
    setBases([null, null, null]);
    if (half === "top") {
      if (inning === 9 && nextScores[1] > nextScores[0]) {
        setStatus("finished");
        setMessage(`${homeTeam} 승리! 9회말 공격 없이 경기가 종료되었습니다.`);
      } else {
        setHalf("bottom");
        setMessage(`${inning}회초 종료 · ${homeTeam} 공격으로 교대합니다.`);
      }
    } else if (inning === 9) {
      setStatus("finished");
      setMessage(nextScores[0] === nextScores[1] ? "9이닝 무승부로 경기가 종료되었습니다." : `${nextScores[0] > nextScores[1] ? awayTeam : homeTeam} 승리!`);
    } else {
      setInning((value) => value + 1);
      setHalf("top");
      setMessage(`${inning}회 종료 · ${inning + 1}회초로 이동합니다.`);
    }
  };

  const setTeam = (side: "away" | "home", team: string) => {
    if (side === "away") {
      setAwayTeam(team);
      setAwayLineup(buildLineup(team, batters));
    } else {
      setHomeTeam(team);
      setHomeLineup(buildLineup(team, batters));
    }
    setMessage("");
  };

  const reloadSavedLineups = () => {
    if (!savedAway || !savedHome || savedAway.team === savedHome.team) {
      setMessage("라인업 구성 탭에서 서로 다른 두 팀의 라인업을 먼저 저장하세요.");
      return;
    }
    setAwayTeam(savedAway.team);
    setHomeTeam(savedHome.team);
    setAwayLineup(savedAway.entries.map((entry) => ({ ...entry })));
    setHomeLineup(savedHome.entries.map((entry) => ({ ...entry })));
    setMessage("저장된 홈·원정 라인업을 다시 불러왔습니다.");
  };

  const substitutePlayer = (teamIndex: TeamIndex, slotIndex: number, incomingId: string): boolean => {
    if (status !== "playing") return false;
    const lineup = lineups[teamIndex];
    const isBatting = teamIndex === activeIndex;
    const result = applyLineupSubstitution({
      team: gameTeams[teamIndex], lineup, retiredIds: retiredIds[teamIndex], slotIndex,
      incomingId, batters, isBatting, bases,
    });
    if (!result.ok) { setMessage(result.error); return false; }
    if (teamIndex === 0) setAwayLineup(result.lineup);
    else setHomeLineup(result.lineup);
    setBases(result.bases);
    setRetiredIds((current) => current.map((items, index) => index === teamIndex ? result.retiredIds : items) as [string[], string[]]);
    setSubstitutions((items) => [{
      id: crypto.randomUUID(),
      inning,
      half,
      team: gameTeams[teamIndex],
      outgoing: result.outgoing.name,
      incoming: result.incoming.name,
      phase: isBatting ? "공격" : "수비",
    }, ...items]);
    setMessage(`${gameTeams[teamIndex]} 선수 교체: ${result.outgoing.name} OUT → ${result.incoming.name} IN`);
    return true;
  };

  const winner = status === "finished"
    ? (scores[0] === scores[1] ? "무승부" : scores[0] > scores[1] ? awayTeam : homeTeam)
    : "";

  return <section className="tab-page game-tab">
    <div className="section-heading">
      <div>
        <p className="overline dark">STEP 06 · GAME DAY</p>
        <h2>9이닝 모의 경기</h2>
        <p>라인업을 완성하고 한 타석씩 진행하며 주자 상황별 조건부 타율이 경기의 흐름을 어떻게 바꾸는지 관찰하세요.</p>
      </div>
      <div className={`game-status ${status}`}><i />{status === "setup" ? "라인업 준비" : status === "playing" ? `${inning}회${half === "top" ? "초" : "말"}` : "경기 종료"}</div>
    </div>

    <div className="game-settings card-panel">
      <label className="field"><span>원정팀</span><select disabled={status !== "setup"} value={awayTeam} onChange={(event) => setTeam("away", event.target.value)}>{teams.map((team) => <option key={team}>{team}</option>)}</select></label>
      <b className="versus">VS</b>
      <label className="field"><span>홈팀</span><select disabled={status !== "setup"} value={homeTeam} onChange={(event) => setTeam("home", event.target.value)}>{teams.map((team) => <option key={team}>{team}</option>)}</select></label>
      <label className="multiplier-control"><span>공격 확률 배율 <b>{multiplier.toFixed(1)}×</b></span><input type="range" min="1" max="2.5" step="0.1" value={multiplier} onChange={(event) => setMultiplier(Number(event.target.value))} /><small>득점이 적으면 1.5×~2.0×를 추천합니다. 최대 확률은 0.950입니다.</small></label>
    </div>

    {status === "setup" ? <>
      <div className="saved-game-lineups">
        <div><span>저장 원정</span><strong>{savedAway?.team ?? "미저장"}</strong></div>
        <i>VS</i>
        <div><span>저장 홈</span><strong>{savedHome?.team ?? "미저장"}</strong></div>
        <button className="button" onClick={reloadSavedLineups} disabled={!savedAway || !savedHome}>저장 라인업 다시 불러오기</button>
        <button className="button primary" onClick={onOpenLineupBuilder}>라인업 구성 화면</button>
      </div>
      <div className="lineup-rules"><strong>라인업 조건</strong><span>포수 1</span><span>내야수 4</span><span>외야수 3</span><span>지명타자 1</span><em>총 9명 · 중복 선수 불가</em></div>
      <div className="lineup-grid">
        <LineupBuilder title={`${awayTeam} · 원정`} team={awayTeam} lineup={awayLineup} batters={batters} onChange={setAwayLineup} />
        <LineupBuilder title={`${homeTeam} · 홈`} team={homeTeam} lineup={homeLineup} batters={batters} onChange={setHomeLineup} />
      </div>
      {message && <div className="notice error">{message}</div>}
      <div className="game-launch">
        <button className="button" onClick={() => { setAwayLineup(buildLineup(awayTeam, batters)); setHomeLineup(buildLineup(homeTeam, batters)); }}>추천 라인업 다시 짜기</button>
        <button className="button action" onClick={startGame}>⚾ PLAY BALL</button>
      </div>
    </> : <>
      <Scoreboard awayTeam={awayTeam} homeTeam={homeTeam} scores={scores} inningRuns={inningRuns} inning={inning} half={half} />
      <div className="game-live-grid">
        <GameField bases={bases} batters={batters} outs={outs} lastPlay={lastPlay} />
        <article className="at-bat-panel card-panel">
          {currentBatter && <>
            <div className="at-bat-label">NOW BATTING · {activeTeam}</div>
            <div className="game-batter"><PlayerAvatar batter={currentBatter} size="large" /><div><span>{currentEntry.position} · {POSITION_LABEL[currentEntry.position]}</span><h3>{currentBatter.name}</h3><small>{getSituationLabel(situation)} 상황</small></div></div>
            <div className="game-probability"><div><span>현재 주자상황에 따른 확률</span><strong>{formatAvg(baseProbability)}</strong></div><b>× {multiplier.toFixed(1)}</b><div className="adjusted"><span>배율 적용 · {getSituationFormula(situation)}</span><strong>{formatAvg(adjustedProbability)}</strong></div></div>
            <div className="probability-meter"><i style={{ width: `${adjustedProbability * 100}%` }} /><span>{Math.round(adjustedProbability * 100)}%</span></div>
          </>}
          {lastPlay && <div className={`last-result ${lastPlay.outcome === "아웃" ? "out" : "hit"}`}><strong>{lastPlay.outcome}</strong><span>난수 {lastPlay.randomValue.toFixed(3)} {lastPlay.outcome === "아웃" ? ">" : "≤"} {formatAvg(lastPlay.probability)}</span></div>}
          <div className="at-bat-substitution">
            <button className="button batter-sub-button" disabled={status !== "playing" || currentEntry?.position === "DH" || offenseCandidates.length === 0} onClick={() => { setOffenseSubOpen((open) => !open); setOffenseIncomingId(""); }}>
              {currentEntry?.position === "DH" ? "지명타자는 교체할 수 없음" : "현재 타자 교체"}
            </button>
            {offenseSubOpen && <div className="at-bat-sub-picker">
              <label><span>현재 주자상황에 따른 확률 · {getSituationLabel(situation)}</span><small>{currentBatter?.name} 대신 출전할 선수를 고르세요.</small><select aria-label="현재 타자 교체 선수" value={offenseIncomingId} onChange={(event) => setOffenseIncomingId(event.target.value)}><option value="">교체 선수 선택 · 조건부 확률 비교</option>{offenseCandidates.map((batter) => <option value={batter.id} key={batter.id}>{batter.name} · {POSITION_LABEL[batter.positionGroup ?? "DH"]} · 현재 {formatAvg(getSituationAvg(batter, situation))} · 경기 {formatAvg(gameHitProbability(batter, situation, multiplier))}</option>)}</select></label>
              {selectedOffenseCandidate && <div className="sub-candidate-probability"><div><span>현재 주자상황에 따른 확률</span><small>{getSituationLabel(situation)}</small><strong>{formatAvg(getSituationAvg(selectedOffenseCandidate, situation))}</strong></div><i>× {multiplier.toFixed(1)}</i><div><span>배율 적용 경기 확률</span><small>최대 0.950</small><strong>{formatAvg(gameHitProbability(selectedOffenseCandidate, situation, multiplier))}</strong></div></div>}
              <button className="button small primary" disabled={!offenseIncomingId} onClick={() => { if (substitutePlayer(activeIndex, currentSlotIndex, offenseIncomingId)) { setOffenseSubOpen(false); setOffenseIncomingId(""); } }}>교체 확정</button>
            </div>}
          </div>
          <button className="button action plate-button" disabled={status === "finished" || defenseErrors.length > 0} onClick={playAtBat}>한 타석 진행</button>
          <button className="button" onClick={resetGame}>새 경기 준비</button>
        </article>
        <GameLineupRail team={activeTeam} lineup={activeLineup} batters={batters} currentIndex={currentSlotIndex} />
      </div>
      <div className={`game-message ${status}`}>{status === "finished" && <strong>{winner === "무승부" ? "DRAW" : `${winner} WIN`}</strong>}<span>{message}</span></div>
      <SubstitutionLog records={substitutions} />
      <GameLog plays={plays} />
      {defenseErrors.length > 0 && <DefenseSubstitutionModal
        team={gameTeams[defenseIndex]}
        lineup={lineups[defenseIndex]}
        batters={batters}
        retiredIds={retiredIds[defenseIndex]}
        error={defenseErrors[0]}
        situation={situation}
        multiplier={multiplier}
        onSubstitute={(slotIndex, incomingId) => substitutePlayer(defenseIndex, slotIndex, incomingId)}
      />}
    </>}
  </section>;
}

function LineupBuilder({ title, team, lineup, batters, onChange }: {
  title: string;
  team: string;
  lineup: LineupEntry[];
  batters: Batter[];
  onChange: (lineup: LineupEntry[]) => void;
}) {
  const move = (index: number, direction: -1 | 1) => {
    const next = lineup.slice();
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  const drop = (event: React.DragEvent<HTMLDivElement>, toIndex: number) => {
    event.preventDefault();
    const fromIndex = Number(event.dataTransfer.getData("application/x-game-lineup-index"));
    if (Number.isInteger(fromIndex)) onChange(swapLineupEntries(lineup, fromIndex, toIndex));
  };
  return <article className="lineup-card card-panel">
    <div className="card-title"><h3>{title}</h3><span>BATTING ORDER</span></div>
    {lineup.map((entry, index) => {
      const selectedElsewhere = new Set(lineup.filter((_, itemIndex) => itemIndex !== index).map((item) => item.batterId));
      const eligible = batters.filter((batter) => batter.team === team && (entry.position === "DH" || batter.positionGroup === entry.position));
      return <div className="lineup-row draggable" draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("application/x-game-lineup-index", String(index)); }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }} onDrop={(event) => drop(event, index)} title="끌어서 타순 바꾸기" key={`${entry.position}-${index}`}>
        <b>{index + 1}</b>
        <span className={`position-badge ${entry.position.toLowerCase()}`}>{entry.position}</span>
        <select aria-label={`${title} ${index + 1}번 타자`} value={entry.batterId} onChange={(event) => onChange(lineup.map((item, itemIndex) => itemIndex === index ? { ...item, batterId: event.target.value } : item))}>
          <option value="">선수 선택</option>
          {eligible.map((batter) => <option value={batter.id} disabled={selectedElsewhere.has(batter.id)} key={batter.id}>{batter.name} · {POSITION_LABEL[batter.positionGroup ?? "DH"]} · {formatAvg(batter.overallAvg)}</option>)}
        </select>
        <div className="order-buttons"><button onClick={() => move(index, -1)} disabled={index === 0} aria-label={`${index + 1}번 타자 위로`}>↑</button><button onClick={() => move(index, 1)} disabled={index === lineup.length - 1} aria-label={`${index + 1}번 타자 아래로`}>↓</button></div>
      </div>;
    })}
  </article>;
}

function GameLineupRail({ team, lineup, batters, currentIndex }: {
  team: string;
  lineup: LineupEntry[];
  batters: Batter[];
  currentIndex: number;
}) {
  return <aside className="game-lineup-rail card-panel">
    <div className="game-lineup-heading"><span>NOW BATTING</span><h3>{team} 타순</h3></div>
    <div className="game-lineup-list">{lineup.map((entry, index) => {
      const batter = batters.find((item) => item.id === entry.batterId);
      return <div className={`game-lineup-row ${index === currentIndex ? "current" : ""}`} key={`${entry.batterId}-${index}`}><b>{index + 1}</b><strong>{batter?.name ?? "—"}</strong><span>{formatAvg(batter?.overallAvg ?? 0)}</span></div>;
    })}</div>
    <p>다음 타자는 주황색으로 표시됩니다.</p>
  </aside>;
}

function DefenseSubstitutionModal({ team, lineup, batters, retiredIds, error, situation, multiplier, onSubstitute }: {
  team: string;
  lineup: LineupEntry[];
  batters: Batter[];
  retiredIds: string[];
  error: string;
  situation: RunnerSituation;
  multiplier: number;
  onSubstitute: (slotIndex: number, incomingId: string) => boolean;
}) {
  const [selections, setSelections] = useState<Record<number, string>>({});
  const currentIds = new Set(lineup.map((entry) => entry.batterId));
  const counts = countLineupPositions(lineup);
  const roster = batters.filter((batter) => batter.team === team && !currentIds.has(batter.id) && !retiredIds.includes(batter.id) && batter.positionGroup && batter.positionGroup !== "DH");

  return <div className="defense-modal-backdrop" role="presentation">
    <article className="defense-modal" role="dialog" aria-modal="true" aria-labelledby="defense-modal-title">
      <div className="defense-modal-heading"><div><p className="overline dark">DEFENSE CHECK</p><h3 id="defense-modal-title">수비 포지션을 맞춰 주세요</h3><span>{team}이 수비를 시작하기 전에 교체를 완료해야 합니다.</span></div><strong>경기 일시 정지</strong></div>
      <div className="defense-modal-alert">⚠ {error}</div>
      <div className="defense-probability-note"><strong>현재 주자상황에 따른 확률</strong><span>{getSituationLabel(situation)} 기준 · 목록의 ‘현재’는 조건부 타율, ‘경기’는 {multiplier.toFixed(1)}배 적용 확률입니다.</span></div>
      <div className="defense-position-counts">{(["C", "IF", "OF", "DH"] as const).map((position) => <span className={counts[position] === ({ C: 1, IF: 4, OF: 3, DH: 1 })[position] ? "valid" : "invalid"} key={position}>{POSITION_LABEL[position]} <b>{counts[position]}</b> / {({ C: 1, IF: 4, OF: 3, DH: 1 })[position]}</span>)}</div>
      <div className="defense-modal-list">{lineup.map((entry, index) => {
      const current = batters.find((batter) => batter.id === entry.batterId);
      const candidates = entry.position === "DH" ? [] : roster.filter((batter) => canUseDefensiveSubstitution(lineup, index, batter.positionGroup ?? "DH"));
      const locked = entry.position === "DH";
      return <div className={`defense-modal-row ${locked ? "locked" : ""} ${candidates.length ? "actionable" : ""}`} key={`${entry.batterId}-${index}`}>
        <b>{index + 1}</b><span className={`position-badge ${entry.position.toLowerCase()}`}>{entry.position}</span>
        <div className="current-player"><strong>{current?.name ?? "—"}</strong><small>{current?.positionGroup ? POSITION_LABEL[current.positionGroup] : "포지션 없음"}</small></div>
        {locked ? <div className="defense-row-status">지명타자 고정</div> : candidates.length ? <><select aria-label={`${team} ${index + 1}번 수비 교체 선수`} value={selections[index] ?? ""} onChange={(event) => setSelections((values) => ({ ...values, [index]: event.target.value }))}><option value="">부족 포지션 선수 선택 · 확률 비교</option>{candidates.map((batter) => <option value={batter.id} key={batter.id}>{batter.name} · {POSITION_LABEL[batter.positionGroup ?? "DH"]} · 현재 {formatAvg(getSituationAvg(batter, situation))} · 경기 {formatAvg(gameHitProbability(batter, situation, multiplier))}</option>)}</select><button className="button small action" disabled={!selections[index]} onClick={() => { if (onSubstitute(index, selections[index])) setSelections((values) => ({ ...values, [index]: "" })); }}>교체</button></> : <div className="defense-row-status">유지</div>}
      </div>;
    })}</div>
      <div className="defense-modal-footer"><span>퇴장 선수는 재출전할 수 없습니다.</span><strong>인원이 맞으면 자동으로 경기 화면으로 돌아갑니다.</strong></div>
    </article>
  </div>;
}

function Scoreboard({ awayTeam, homeTeam, scores, inningRuns, inning, half }: { awayTeam: string; homeTeam: string; scores: [number, number]; inningRuns: [number[], number[]]; inning: number; half: Half }) {
  return <div className="baseball-scoreboard"><div className="scoreboard-row header"><b>TEAM</b>{Array.from({ length: 9 }, (_, index) => <span className={inning === index + 1 ? "current" : ""} key={index}>{index + 1}</span>)}<strong>R</strong></div>{[awayTeam, homeTeam].map((team, teamIndex) => <div className="scoreboard-row" key={team}><b>{team}{(teamIndex === 0 && half === "top") || (teamIndex === 1 && half === "bottom") ? " ◀" : ""}</b>{inningRuns[teamIndex].map((runs, index) => <span className={inning === index + 1 ? "current" : ""} key={index}>{index + 1 > inning ? "·" : runs}</span>)}<strong>{scores[teamIndex]}</strong></div>)}</div>;
}

function GameField({ bases, batters, outs, lastPlay }: { bases: Bases; batters: Batter[]; outs: number; lastPlay: GamePlay | null }) {
  const name = (id: string | null) => batters.find((batter) => batter.id === id)?.name ?? "";
  return <article className="game-field"><div className="out-lights"><span>OUT</span>{[0, 1, 2].map((index) => <i className={index < outs ? "on" : ""} key={index} />)}</div><svg viewBox="0 0 500 390" aria-label="경기 주자 상황"><path className="field-grass" d="M250 14 486 245 250 382 14 245Z" /><path className="field-dirt" d="M250 96 405 245 250 340 95 245Z" /><path className="field-lines" d="M250 340 95 245 250 96 405 245Z" /><circle className="mound" cx="250" cy="244" r="19" /><rect className={`game-base first ${bases[0] ? "occupied" : ""}`} x="390" y="230" width="29" height="29" transform="rotate(45 404 244)" /><rect className={`game-base second ${bases[1] ? "occupied" : ""}`} x="235" y="81" width="29" height="29" transform="rotate(45 249 95)" /><rect className={`game-base third ${bases[2] ? "occupied" : ""}`} x="80" y="230" width="29" height="29" transform="rotate(45 94 244)" /><path className="game-home" d="M236 326h28l8 11-22 23-22-23Z" /></svg>{bases.map((runner, index) => runner && <span className={`runner-name base-${index + 1}`} key={runner}>{name(runner)}</span>)}{lastPlay && <div className={`animated-ball result-${lastPlay.outcome}`} key={lastPlay.id}>⚾</div>}<div className="field-caption">{getSituationLabel(situationFromBases(bases))}</div></article>;
}

function SubstitutionLog({ records }: { records: SubstitutionRecord[] }) {
  if (!records.length) return null;
  return <article className="substitution-log card-panel"><div className="card-title"><h3>선수 교체 기록</h3><span>SUBSTITUTIONS</span></div>{records.map((record) => <div className="substitution-log-row" key={record.id}><b>{record.inning}회{record.half === "top" ? "초" : "말"}</b><span>{record.team} · {record.phase}</span><strong>{record.outgoing} OUT</strong><i>→</i><strong>{record.incoming} IN</strong></div>)}</article>;
}

function GameLog({ plays }: { plays: GamePlay[] }) {
  return <article className="game-log card-panel"><div className="card-title"><h3>경기 중계 기록</h3><span>PLAY BY PLAY</span></div>{plays.length === 0 ? <p className="no-plays">첫 타석을 진행하면 여기에 경기 기록이 쌓입니다.</p> : <div>{plays.slice(0, 24).map((play) => <div className="play-row" key={play.id}><b>{play.inning}회{play.half === "top" ? "초" : "말"}</b><span>{play.team} · {play.batterName}</span><em>{getSituationLabel(play.situation)}</em><strong className={play.outcome === "아웃" ? "out" : "hit"}>{play.outcome}</strong><small>{play.runs ? `+${play.runs}점` : ""}</small><i>{play.score[0]} : {play.score[1]}</i></div>)}</div>}</article>;
}
