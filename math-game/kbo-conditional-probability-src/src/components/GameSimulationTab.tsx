import { useEffect, useMemo, useState } from "react";
import type { Batter, GamePlay, LineupEntry } from "../types";
import { formatAvg, getSituationAvg, getSituationFormula, getSituationLabel } from "../utils/batterUtils";
import { advanceRunners, buildLineup, hitOutcome, lineupErrors, POSITION_LABEL, situationFromBases, type Bases } from "../utils/gameUtils";
import { PlayerAvatar } from "./Controls";

type Props = { batters: Batter[] };
type GameStatus = "setup" | "playing" | "finished";
type Half = "top" | "bottom";
export function GameSimulationTab({ batters }: Props) {
  const teams = useMemo(() => [...new Set(batters.map((batter) => batter.team))].sort(), [batters]);
  const [awayTeam, setAwayTeam] = useState(teams[0] ?? "");
  const [homeTeam, setHomeTeam] = useState(teams[1] ?? "");
  const [awayLineup, setAwayLineup] = useState<LineupEntry[]>(() => buildLineup(teams[0] ?? "", batters));
  const [homeLineup, setHomeLineup] = useState<LineupEntry[]>(() => buildLineup(teams[1] ?? "", batters));
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

  useEffect(() => {
    if (!teams.includes(awayTeam) || !teams.includes(homeTeam) || awayTeam === homeTeam) {
      const nextAway = teams[0] ?? "";
      const nextHome = teams.find((team) => team !== nextAway) ?? "";
      setAwayTeam(nextAway); setHomeTeam(nextHome);
      setAwayLineup(buildLineup(nextAway, batters)); setHomeLineup(buildLineup(nextHome, batters));
    }
  }, [awayTeam, homeTeam, teams, batters]);

  const activeIndex = half === "top" ? 0 : 1;
  const activeLineup = activeIndex === 0 ? awayLineup : homeLineup;
  const activeTeam = activeIndex === 0 ? awayTeam : homeTeam;
  const currentEntry = activeLineup[battingIndexes[activeIndex] % 9];
  const currentBatter = batters.find((batter) => batter.id === currentEntry?.batterId);
  const situation = situationFromBases(bases);
  const baseProbability = currentBatter ? getSituationAvg(currentBatter, situation) : 0;
  const adjustedProbability = Math.min(0.95, baseProbability * multiplier);

  const resetGame = () => {
    setStatus("setup"); setInning(1); setHalf("top"); setOuts(0); setBases([null, null, null]);
    setScores([0, 0]); setInningRuns([Array(9).fill(0), Array(9).fill(0)]); setBattingIndexes([0, 0]);
    setPlays([]); setLastPlay(null); setMessage("");
  };

  const startGame = () => {
    const errors = awayTeam === homeTeam ? ["원정팀과 홈팀은 서로 달라야 합니다."] : [
      ...lineupErrors(awayTeam, awayLineup, batters), ...lineupErrors(homeTeam, homeLineup, batters),
    ];
    if (errors.length) { setMessage(errors.slice(0, 4).join("\n")); return; }
    resetGame(); setStatus("playing"); setMessage("PLAY BALL! 원정팀의 1회초 공격입니다.");
  };

  const playAtBat = () => {
    if (status !== "playing" || !currentBatter) return;
    const randomValue = Math.random();
    const outcome = randomValue <= adjustedProbability ? hitOutcome() : "아웃";
    const advanced = advanceRunners(outcome, bases, currentBatter.id);
    const nextScores: [number, number] = [...scores];
    nextScores[activeIndex] += advanced.runs;
    const nextRuns: [number[], number[]] = [inningRuns[0].slice(), inningRuns[1].slice()];
    nextRuns[activeIndex][inning - 1] += advanced.runs;
    const play: GamePlay = { id: crypto.randomUUID(), inning, half, batterName: currentBatter.name, team: activeTeam,
      situation, probability: adjustedProbability, randomValue, outcome, runs: advanced.runs, score: nextScores };
    setScores(nextScores); setInningRuns(nextRuns); setLastPlay(play); setPlays((items) => [play, ...items]);
    setBattingIndexes((indexes) => indexes.map((value, index) => index === activeIndex ? value + 1 : value) as [number, number]);

    if (half === "bottom" && inning === 9 && nextScores[1] > nextScores[0]) {
      setBases(advanced.bases); setStatus("finished"); setMessage(`${homeTeam}의 끝내기! 경기가 종료되었습니다.`); return;
    }
    if (outcome !== "아웃") {
      setBases(advanced.bases); setMessage(`${currentBatter.name} ${outcome}${advanced.runs ? ` · ${advanced.runs}점 득점` : ""}`); return;
    }
    const nextOuts = outs + 1;
    if (nextOuts < 3) { setOuts(nextOuts); setMessage(`${currentBatter.name} 아웃 · ${nextOuts}아웃`); return; }

    setOuts(0); setBases([null, null, null]);
    if (half === "top") {
      if (inning === 9 && nextScores[1] > nextScores[0]) { setStatus("finished"); setMessage(`${homeTeam} 승리! 9회말 공격 없이 경기가 종료되었습니다.`); }
      else { setHalf("bottom"); setMessage(`${inning}회초 종료 · ${homeTeam} 공격으로 교대합니다.`); }
    } else if (inning === 9) {
      setStatus("finished"); setMessage(nextScores[0] === nextScores[1] ? "9이닝 무승부로 경기가 종료되었습니다." : `${nextScores[0] > nextScores[1] ? awayTeam : homeTeam} 승리!`);
    } else {
      setInning((value) => value + 1); setHalf("top"); setMessage(`${inning}회 종료 · ${inning + 1}회초로 이동합니다.`);
    }
  };

  const setTeam = (side: "away" | "home", team: string) => {
    if (side === "away") { setAwayTeam(team); setAwayLineup(buildLineup(team, batters)); }
    else { setHomeTeam(team); setHomeLineup(buildLineup(team, batters)); }
    setMessage("");
  };

  const winner = status === "finished" ? (scores[0] === scores[1] ? "무승부" : scores[0] > scores[1] ? awayTeam : homeTeam) : "";

  return <section className="tab-page game-tab">
    <div className="section-heading"><div><p className="overline dark">STEP 05 · GAME DAY</p><h2>9이닝 모의 경기</h2><p>라인업을 완성하고 한 타석씩 진행하며 주자 상황별 조건부 타율이 경기의 흐름을 어떻게 바꾸는지 관찰하세요.</p></div><div className={`game-status ${status}`}><i />{status === "setup" ? "라인업 준비" : status === "playing" ? `${inning}회${half === "top" ? "초" : "말"}` : "경기 종료"}</div></div>

    <div className="game-settings card-panel"><label className="field"><span>원정팀</span><select disabled={status !== "setup"} value={awayTeam} onChange={(event) => setTeam("away", event.target.value)}>{teams.map((team) => <option key={team}>{team}</option>)}</select></label><b className="versus">VS</b><label className="field"><span>홈팀</span><select disabled={status !== "setup"} value={homeTeam} onChange={(event) => setTeam("home", event.target.value)}>{teams.map((team) => <option key={team}>{team}</option>)}</select></label><label className="multiplier-control"><span>공격 확률 배율 <b>{multiplier.toFixed(1)}×</b></span><input type="range" min="1" max="2.5" step="0.1" value={multiplier} onChange={(event) => setMultiplier(Number(event.target.value))} /><small>득점이 적으면 1.5×~2.0×를 추천합니다. 최대 확률은 0.950입니다.</small></label></div>

    {status === "setup" ? <>
      <div className="lineup-rules"><strong>라인업 조건</strong><span>포수 1</span><span>내야수 4</span><span>외야수 3</span><span>지명타자 1</span><em>총 9명 · 중복 선수 불가</em></div>
      <div className="lineup-grid"><LineupBuilder title={`${awayTeam} · 원정`} team={awayTeam} lineup={awayLineup} batters={batters} onChange={setAwayLineup} /><LineupBuilder title={`${homeTeam} · 홈`} team={homeTeam} lineup={homeLineup} batters={batters} onChange={setHomeLineup} /></div>
      {message && <div className="notice error">{message}</div>}
      <div className="game-launch"><button className="button" onClick={() => { setAwayLineup(buildLineup(awayTeam, batters)); setHomeLineup(buildLineup(homeTeam, batters)); }}>추천 라인업 다시 짜기</button><button className="button action" onClick={startGame}>⚾ PLAY BALL</button></div>
    </> : <>
      <Scoreboard awayTeam={awayTeam} homeTeam={homeTeam} scores={scores} inningRuns={inningRuns} inning={inning} half={half} />
      <div className="game-live-grid"><GameField bases={bases} batters={batters} outs={outs} lastPlay={lastPlay} /><article className="at-bat-panel card-panel">{currentBatter && <><div className="at-bat-label">NOW BATTING · {activeTeam}</div><div className="game-batter"><PlayerAvatar batter={currentBatter} size="large" /><div><span>{currentEntry.position} · {POSITION_LABEL[currentEntry.position]}</span><h3>{currentBatter.name}</h3><small>{getSituationLabel(situation)} 상황</small></div></div><div className="game-probability"><div><span>원 타율</span><strong>{formatAvg(baseProbability)}</strong></div><b>× {multiplier.toFixed(1)}</b><div className="adjusted"><span>{getSituationFormula(situation)}</span><strong>{formatAvg(adjustedProbability)}</strong></div></div><div className="probability-meter"><i style={{ width: `${adjustedProbability * 100}%` }} /><span>{Math.round(adjustedProbability * 100)}%</span></div></>}{lastPlay && <div className={`last-result ${lastPlay.outcome === "아웃" ? "out" : "hit"}`}><strong>{lastPlay.outcome}</strong><span>난수 {lastPlay.randomValue.toFixed(3)} {lastPlay.outcome === "아웃" ? ">" : "≤"} {formatAvg(lastPlay.probability)}</span></div>}<button className="button action plate-button" disabled={status === "finished"} onClick={playAtBat}>한 타석 진행</button><button className="button" onClick={resetGame}>새 경기 준비</button></article></div>
      <div className={`game-message ${status}`}>{status === "finished" && <strong>{winner === "무승부" ? "DRAW" : `${winner} WIN`}</strong>}<span>{message}</span></div>
      <GameLog plays={plays} />
    </>}
  </section>;
}

function LineupBuilder({ title, team, lineup, batters, onChange }: { title: string; team: string; lineup: LineupEntry[]; batters: Batter[]; onChange: (lineup: LineupEntry[]) => void }) {
  const move = (index: number, direction: -1 | 1) => { const next = lineup.slice(); const target = index + direction; if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target], next[index]]; onChange(next); };
  return <article className="lineup-card card-panel"><div className="card-title"><h3>{title}</h3><span>BATTING ORDER</span></div>{lineup.map((entry, index) => { const selectedElsewhere = new Set(lineup.filter((_, itemIndex) => itemIndex !== index).map((item) => item.batterId)); const eligible = batters.filter((batter) => batter.team === team && batter.positionGroup === entry.position); return <div className="lineup-row" key={`${entry.position}-${index}`}><b>{index + 1}</b><span className={`position-badge ${entry.position.toLowerCase()}`}>{entry.position}</span><select aria-label={`${title} ${index + 1}번 타자`} value={entry.batterId} onChange={(event) => onChange(lineup.map((item, itemIndex) => itemIndex === index ? { ...item, batterId: event.target.value } : item))}><option value="">선수 선택</option>{eligible.map((batter) => <option value={batter.id} disabled={selectedElsewhere.has(batter.id)} key={batter.id}>{batter.name} · {formatAvg(batter.overallAvg)}</option>)}</select><div className="order-buttons"><button onClick={() => move(index, -1)} disabled={index === 0} aria-label={`${index + 1}번 타자 위로`}>↑</button><button onClick={() => move(index, 1)} disabled={index === lineup.length - 1} aria-label={`${index + 1}번 타자 아래로`}>↓</button></div></div>; })}</article>;
}

function Scoreboard({ awayTeam, homeTeam, scores, inningRuns, inning, half }: { awayTeam: string; homeTeam: string; scores: [number, number]; inningRuns: [number[], number[]]; inning: number; half: Half }) {
  return <div className="baseball-scoreboard"><div className="scoreboard-row header"><b>TEAM</b>{Array.from({ length: 9 }, (_, index) => <span className={inning === index + 1 ? "current" : ""} key={index}>{index + 1}</span>)}<strong>R</strong></div>{[awayTeam, homeTeam].map((team, teamIndex) => <div className="scoreboard-row" key={team}><b>{team}{(teamIndex === 0 && half === "top") || (teamIndex === 1 && half === "bottom") ? " ◀" : ""}</b>{inningRuns[teamIndex].map((runs, index) => <span className={inning === index + 1 ? "current" : ""} key={index}>{index + 1 > inning ? "·" : runs}</span>)}<strong>{scores[teamIndex]}</strong></div>)}</div>;
}

function GameField({ bases, batters, outs, lastPlay }: { bases: Bases; batters: Batter[]; outs: number; lastPlay: GamePlay | null }) {
  const name = (id: string | null) => batters.find((batter) => batter.id === id)?.name ?? "";
  return <article className="game-field"><div className="out-lights"><span>OUT</span>{[0, 1, 2].map((index) => <i className={index < outs ? "on" : ""} key={index} />)}</div><svg viewBox="0 0 500 390" aria-label="경기 주자 상황"><path className="field-grass" d="M250 14 486 245 250 382 14 245Z" /><path className="field-dirt" d="M250 96 405 245 250 340 95 245Z" /><path className="field-lines" d="M250 340 95 245 250 96 405 245Z" /><circle className="mound" cx="250" cy="244" r="19" /><rect className={`game-base first ${bases[0] ? "occupied" : ""}`} x="390" y="230" width="29" height="29" transform="rotate(45 404 244)" /><rect className={`game-base second ${bases[1] ? "occupied" : ""}`} x="235" y="81" width="29" height="29" transform="rotate(45 249 95)" /><rect className={`game-base third ${bases[2] ? "occupied" : ""}`} x="80" y="230" width="29" height="29" transform="rotate(45 94 244)" /><path className="game-home" d="M236 326h28l8 11-22 23-22-23Z" /></svg>{bases.map((runner, index) => runner && <span className={`runner-name base-${index + 1}`} key={runner}>{name(runner)}</span>)}{lastPlay && <div className={`animated-ball result-${lastPlay.outcome}`} key={lastPlay.id}>⚾</div>}<div className="field-caption">{getSituationLabel(situationFromBases(bases))}</div></article>;
}

function GameLog({ plays }: { plays: GamePlay[] }) {
  return <article className="game-log card-panel"><div className="card-title"><h3>경기 중계 기록</h3><span>PLAY BY PLAY</span></div>{plays.length === 0 ? <p className="no-plays">첫 타석을 진행하면 여기에 경기 기록이 쌓입니다.</p> : <div>{plays.slice(0, 24).map((play) => <div className="play-row" key={play.id}><b>{play.inning}회{play.half === "top" ? "초" : "말"}</b><span>{play.team} · {play.batterName}</span><em>{getSituationLabel(play.situation)}</em><strong className={play.outcome === "아웃" ? "out" : "hit"}>{play.outcome}</strong><small>{play.runs ? `+${play.runs}점` : ""}</small><i>{play.score[0]} : {play.score[1]}</i></div>)}</div>}</article>;
}
