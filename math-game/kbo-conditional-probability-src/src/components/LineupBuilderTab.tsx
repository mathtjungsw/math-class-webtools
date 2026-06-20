import { useMemo, useState, type DragEvent } from "react";
import type { Batter, LineupEntry, PositionGroup, SavedLineup, SavedLineups } from "../types";
import { SITUATIONS, formatAvg, getSituationAvg, getSituationLabel } from "../utils/batterUtils";
import {
  assignBatterToLineupSlot,
  buildLineup,
  countLineupPositions,
  createEmptyLineup,
  lineupErrors,
  POSITION_LABEL,
  swapLineupEntries,
} from "../utils/gameUtils";
import { PlayerAvatar } from "./Controls";

type Side = "away" | "home";
type Props = {
  batters: Batter[];
  savedLineups: SavedLineups;
  onSave: (side: Side, lineup: SavedLineup) => void;
  onOpenGame: () => void;
};

const SIDE_LABEL: Record<Side, string> = { away: "원정", home: "홈" };
const PRINT_PAGE_SIZE = 9;
const PRINT_POSITION_ORDER: Record<string, number> = { C: 0, IF: 1, OF: 2 };

function cloneEntries(entries: LineupEntry[]): LineupEntry[] {
  return entries.map((entry) => ({ ...entry }));
}

function chunkBatters(batters: Batter[], size: number): Batter[][] {
  return Array.from({ length: Math.ceil(batters.length / size) }, (_, index) => batters.slice(index * size, (index + 1) * size));
}

export function LineupBuilderTab({ batters, savedLineups, onSave, onOpenGame }: Props) {
  const teams = useMemo(() => [...new Set(batters.map((batter) => batter.team))].sort(), [batters]);
  const initialAwayTeam = savedLineups.away?.team && teams.includes(savedLineups.away.team) ? savedLineups.away.team : teams[0] ?? "";
  const initialHomeTeam = savedLineups.home?.team && teams.includes(savedLineups.home.team) ? savedLineups.home.team : teams.find((team) => team !== initialAwayTeam) ?? "";
  const [activeSide, setActiveSide] = useState<Side>("away");
  const [awayTeam, setAwayTeam] = useState(initialAwayTeam);
  const [homeTeam, setHomeTeam] = useState(initialHomeTeam);
  const [awayLineup, setAwayLineup] = useState<LineupEntry[]>(() => savedLineups.away ? cloneEntries(savedLineups.away.entries) : createEmptyLineup());
  const [homeLineup, setHomeLineup] = useState<LineupEntry[]>(() => savedLineups.home ? cloneEntries(savedLineups.home.entries) : createEmptyLineup());
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState<"ALL" | Exclude<PositionGroup, "DH">>("ALL");
  const [sort, setSort] = useState<"avg" | "name" | "position">("avg");
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [message, setMessage] = useState("선수 카드를 드래그하거나 선택한 뒤 라인업 슬롯을 누르세요.");

  const activeTeam = activeSide === "away" ? awayTeam : homeTeam;
  const activeLineup = activeSide === "away" ? awayLineup : homeLineup;
  const setActiveLineup = (lineup: LineupEntry[]) => activeSide === "away" ? setAwayLineup(lineup) : setHomeLineup(lineup);
  const usedIds = new Set(activeLineup.map((entry) => entry.batterId).filter(Boolean));
  const counts = countLineupPositions(activeLineup.filter((entry) => Boolean(entry.batterId)));
  const printRoster = useMemo(() => batters
    .filter((batter) => batter.team === activeTeam)
    .sort((a, b) => (PRINT_POSITION_ORDER[String(a.positionGroup)] ?? 9) - (PRINT_POSITION_ORDER[String(b.positionGroup)] ?? 9)
      || b.overallAvg - a.overallAvg
      || a.name.localeCompare(b.name, "ko")), [batters, activeTeam]);

  const roster = useMemo(() => batters
    .filter((batter) => batter.team === activeTeam)
    .filter((batter) => !search.trim() || batter.name.includes(search.trim()))
    .filter((batter) => positionFilter === "ALL" || batter.positionGroup === positionFilter)
    .sort((a, b) => {
      if (sort === "avg") return b.overallAvg - a.overallAvg;
      if (sort === "position") return String(a.positionGroup).localeCompare(String(b.positionGroup), "ko") || b.overallAvg - a.overallAvg;
      return a.name.localeCompare(b.name, "ko");
    }), [batters, activeTeam, search, positionFilter, sort]);

  const changeTeam = (side: Side, team: string) => {
    if (side === "away") { setAwayTeam(team); setAwayLineup(createEmptyLineup()); }
    else { setHomeTeam(team); setHomeLineup(createEmptyLineup()); }
    setSelectedPlayerId("");
    setMessage(`${SIDE_LABEL[side]}팀을 ${team}(으)로 바꿨습니다. 라인업을 새로 구성하세요.`);
  };

  const placePlayer = (playerId: string, slotIndex: number) => {
    const batter = batters.find((item) => item.id === playerId);
    if (!batter) return;
    const result = assignBatterToLineupSlot(activeLineup, slotIndex, batter);
    if (!result.ok) { setMessage(result.error); return; }
    setActiveLineup(result.lineup);
    setSelectedPlayerId("");
    setMessage(`${batter.name} 선수를 ${slotIndex + 1}번 타순에 배치했습니다.`);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>, slotIndex: number) => {
    event.preventDefault();
    const lineupIndex = event.dataTransfer.getData("application/x-lineup-index");
    if (lineupIndex !== "") {
      setActiveLineup(swapLineupEntries(activeLineup, Number(lineupIndex), slotIndex));
      setMessage(`${Number(lineupIndex) + 1}번과 ${slotIndex + 1}번 타순을 바꿨습니다.`);
      return;
    }
    const playerId = event.dataTransfer.getData("application/x-player-id");
    if (playerId) placePlayer(playerId, slotIndex);
  };

  const save = (side: Side) => {
    const team = side === "away" ? awayTeam : homeTeam;
    const lineup = side === "away" ? awayLineup : homeLineup;
    if (awayTeam === homeTeam) { setMessage("원정팀과 홈팀은 서로 달라야 합니다."); return; }
    const errors = lineupErrors(team, lineup, batters);
    if (errors.length) { setActiveSide(side); setMessage(errors[0]); return; }
    onSave(side, { team, entries: cloneEntries(lineup), savedAt: new Date().toISOString() });
    setMessage(`${team} ${SIDE_LABEL[side]} 라인업을 저장했습니다.`);
  };

  const restore = (side: Side) => {
    const saved = savedLineups[side];
    if (!saved) return;
    if (side === "away") { setAwayTeam(saved.team); setAwayLineup(cloneEntries(saved.entries)); }
    else { setHomeTeam(saved.team); setHomeLineup(cloneEntries(saved.entries)); }
    setMessage(`${saved.team} ${SIDE_LABEL[side]} 저장본을 다시 불러왔습니다.`);
  };

  const ready = Boolean(
    savedLineups.away && savedLineups.home
    && savedLineups.away.team !== savedLineups.home.team
    && lineupErrors(savedLineups.away.team, savedLineups.away.entries, batters).length === 0
    && lineupErrors(savedLineups.home.team, savedLineups.home.entries, batters).length === 0,
  );

  return <section className="tab-page lineup-prep-tab">
    <div className="section-heading">
      <div><p className="overline dark">STEP 05 · LINEUP ROOM</p><h2>드래그로 만드는 나만의 라인업</h2><p>선수의 사진과 모든 주자 상황별 타율을 비교하고, 카드를 타순 슬롯에 끌어 놓으세요. 모바일에서는 카드를 선택한 뒤 슬롯을 누르면 됩니다.</p></div>
      <div className="lineup-heading-actions"><div className="lineup-ready-count"><strong>{usedIds.size}</strong><span>/ 9명 배치</span></div><button className="button action lineup-print-button" onClick={() => window.print()}>🖨 {activeTeam} 선수 카드 출력</button></div>
    </div>

    <div className="saved-matchup-strip">
      <SavedLineupSummary side="away" saved={savedLineups.away} onRestore={() => restore("away")} />
      <div className="saved-versus">VS</div>
      <SavedLineupSummary side="home" saved={savedLineups.home} onRestore={() => restore("home")} />
      <button className="button action" disabled={!ready} onClick={onOpenGame}>저장 라인업으로 경기 시작 →</button>
    </div>

    <div className="builder-side-tabs">
      {(["away", "home"] as Side[]).map((side) => <button className={activeSide === side ? "active" : ""} onClick={() => { setActiveSide(side); setSelectedPlayerId(""); }} key={side}><span>{SIDE_LABEL[side]} 라인업</span><strong>{side === "away" ? awayTeam : homeTeam}</strong><small>{savedLineups[side] ? "저장됨" : "작성 중"}</small></button>)}
    </div>

    <div className={`lineup-builder-message ${message.includes("해야") || message.includes("없") || message.includes("달라") ? "warning" : ""}`}>{message}</div>

    <div className="lineup-builder-layout">
      <div className="roster-browser">
        <div className="roster-toolbar card-panel">
          <label className="field"><span>구단</span><select value={activeTeam} onChange={(event) => changeTeam(activeSide, event.target.value)}>{teams.map((team) => <option key={team}>{team}</option>)}</select></label>
          <label className="field lineup-search"><span>선수 검색</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="선수 이름" /></label>
          <label className="field"><span>포지션</span><select value={positionFilter} onChange={(event) => setPositionFilter(event.target.value as typeof positionFilter)}><option value="ALL">전체</option><option value="C">포수</option><option value="IF">내야수</option><option value="OF">외야수</option></select></label>
          <label className="field"><span>정렬</span><select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="avg">타율 높은 순</option><option value="name">이름순</option><option value="position">포지션순</option></select></label>
        </div>
        <div className="roster-browser-title"><strong>{activeTeam} 선수 카드 {roster.length}장</strong><span>카드를 드래그하세요</span></div>
        <div className="lineup-player-grid">{roster.map((batter) => <LineupPlayerCard batter={batter} used={usedIds.has(batter.id)} selected={selectedPlayerId === batter.id} onSelect={() => { if (!usedIds.has(batter.id)) { setSelectedPlayerId(selectedPlayerId === batter.id ? "" : batter.id); setMessage(`${batter.name} 선수를 선택했습니다. 오른쪽 슬롯을 누르세요.`); } }} key={batter.id} />)}</div>
      </div>

      <aside className="lineup-board card-panel">
        <div className="lineup-board-header"><div><span>{SIDE_LABEL[activeSide].toUpperCase()} LINEUP</span><h3>{activeTeam}</h3></div><button className="button small" onClick={() => { setActiveLineup(buildLineup(activeTeam, batters)); setMessage("타율을 기준으로 추천 라인업을 자동 완성했습니다."); }}>추천 자동 완성</button></div>
        <div className="position-checks"><span className={counts.C === 1 ? "ok" : ""}>포수 {counts.C}/1</span><span className={counts.IF === 4 ? "ok" : ""}>내야 {counts.IF}/4</span><span className={counts.OF === 3 ? "ok" : ""}>외야 {counts.OF}/3</span><span className={counts.DH === 1 ? "ok" : ""}>DH {counts.DH}/1</span></div>
        <div className="lineup-drop-list">{activeLineup.map((entry, index) => {
          const batter = batters.find((item) => item.id === entry.batterId);
          return <div className={`lineup-drop-row ${selectedPlayerId ? "can-place" : ""} ${batter ? "filled" : "empty"}`} draggable={Boolean(batter)} onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("application/x-lineup-index", String(index)); }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleDrop(event, index)} onClick={() => { if (selectedPlayerId) placePlayer(selectedPlayerId, index); }} key={`${entry.position}-${index}`}>
            <b>{index + 1}</b><span className={`position-badge ${entry.position.toLowerCase()}`}>{entry.position}</span>
            {batter ? <><PlayerAvatar batter={batter} /><div className="lineup-slot-player"><strong>{batter.name}</strong><span>{POSITION_LABEL[batter.positionGroup ?? "DH"]} · {formatAvg(batter.overallAvg)}</span></div><button className="remove-lineup-player" onClick={(event) => { event.stopPropagation(); setActiveLineup(activeLineup.map((item, itemIndex) => itemIndex === index ? { ...item, batterId: "" } : item)); }} aria-label={`${batter.name} 라인업에서 빼기`}>×</button></> : <div className="empty-slot-text"><strong>{POSITION_LABEL[entry.position]} 슬롯</strong><span>카드를 여기에 놓으세요</span></div>}
            <div className="order-buttons"><button onClick={(event) => { event.stopPropagation(); setActiveLineup(swapLineupEntries(activeLineup, index, index - 1)); }} disabled={index === 0} aria-label={`${index + 1}번 타자 위로`}>↑</button><button onClick={(event) => { event.stopPropagation(); setActiveLineup(swapLineupEntries(activeLineup, index, index + 1)); }} disabled={index === activeLineup.length - 1} aria-label={`${index + 1}번 타자 아래로`}>↓</button></div>
          </div>;
        })}</div>
        <div className="lineup-board-actions"><button className="button" onClick={() => { setActiveLineup(createEmptyLineup()); setMessage(`${activeTeam} 라인업을 비웠습니다.`); }}>전체 비우기</button><button className="button action" onClick={() => save(activeSide)}>{SIDE_LABEL[activeSide]} 라인업 저장</button></div>
        <p className="drag-tip">⋮⋮ 채워진 타순 행을 다른 행으로 드래그해 순서를 바꿀 수도 있습니다.</p>
      </aside>
    </div>
    <PrintRosterSheets team={activeTeam} batters={printRoster} />
  </section>;
}

function LineupPlayerCard({ batter, used, selected, onSelect }: { batter: Batter; used: boolean; selected: boolean; onSelect: () => void }) {
  return <article className={`lineup-player-card ${used ? "used" : ""} ${selected ? "selected" : ""}`} role="button" tabIndex={used ? -1 : 0} draggable={!used} onDragStart={(event) => { event.dataTransfer.effectAllowed = "copy"; event.dataTransfer.setData("application/x-player-id", batter.id); }} onClick={onSelect} onKeyDown={(event) => { if ((event.key === "Enter" || event.key === " ") && !used) onSelect(); }}>
    <div className="lineup-card-profile"><PlayerAvatar batter={batter} size="large" /><div><span>{batter.team} · {batter.positionGroup ? POSITION_LABEL[batter.positionGroup] : "포지션 없음"}</span><h3>{batter.name}</h3><p>기본 타율 <strong>{formatAvg(batter.overallAvg)}</strong></p></div>{used && <i>LINEUP</i>}</div>
    <div className="all-situation-avgs">{SITUATIONS.map((situation) => <div key={situation}><span>{getSituationLabel(situation)}</span><strong>{formatAvg(getSituationAvg(batter, situation))}</strong></div>)}</div>
    <div className="lineup-card-footer"><span>전체 P(안타) = {formatAvg(batter.overallAvg)}</span><b>{used ? "배치 완료" : selected ? "선택됨 · 슬롯을 누르세요" : "드래그하여 배치"}</b></div>
  </article>;
}

function SavedLineupSummary({ side, saved, onRestore }: { side: Side; saved?: SavedLineup; onRestore: () => void }) {
  return <div className={`saved-lineup-summary ${saved ? "saved" : ""}`}><span>{SIDE_LABEL[side]} 라인업</span>{saved ? <><strong>{saved.team}</strong><small>9명 저장 완료</small><button onClick={onRestore}>저장본 보기</button></> : <><strong>미저장</strong><small>라인업을 완성해 저장하세요</small></>}</div>;
}

function PrintRosterSheets({ team, batters }: { team: string; batters: Batter[] }) {
  const pages = chunkBatters(batters, PRINT_PAGE_SIZE);
  return <div className="print-roster-sheets" aria-hidden="true">{pages.map((page, pageIndex) => <section className="print-card-page" key={`${team}-${pageIndex}`}>
    <header className="print-card-page-header"><div><span>KBO CONDITIONAL PROBABILITY · PLAYER CARDS</span><h1>{team} 선수 카드</h1></div><div><strong>{pageIndex + 1} / {pages.length}</strong><small>카드를 잘라 모둠별 라인업을 구성하세요.</small></div></header>
    <div className="print-player-card-grid">{page.map((batter) => <PrintPlayerCard batter={batter} key={batter.id} />)}</div>
  </section>)}</div>;
}

function PrintPlayerCard({ batter }: { batter: Batter }) {
  return <article className="print-player-card">
    <div className="print-card-order">타순 ______</div>
    <div className="print-player-profile"><PlayerAvatar batter={batter} size="large" /><div><span>{batter.team} · {batter.positionGroup ? POSITION_LABEL[batter.positionGroup] : "포지션 없음"}</span><h2>{batter.name}</h2><p>기본 타율 <strong>{formatAvg(batter.overallAvg)}</strong></p></div></div>
    <div className="print-situation-title">현재 주자상황에 따른 확률 · P(안타 | 주자 상황)</div>
    <div className="print-situation-grid">{SITUATIONS.map((situation) => <div key={situation}><span>{getSituationLabel(situation)}</span><strong>{formatAvg(getSituationAvg(batter, situation))}</strong></div>)}</div>
    <footer><span>{POSITION_LABEL[batter.positionGroup ?? "DH"]}</span><b>LINEUP CARD</b></footer>
  </article>;
}
