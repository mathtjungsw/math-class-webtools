import type { RunnerSituation } from "../types";
import { getSituationFormula, getSituationLabel } from "../utils/batterUtils";
import { RunnerDiamond } from "./RunnerDiamond";

type Props = {
  situation: RunnerSituation;
  classMode: boolean;
  onClassModeChange: (value: boolean) => void;
};

export function Header({ situation, classMode, onClassModeChange }: Props) {
  return (
    <header className="hero">
      <a className="home-link" href="../../index.html" aria-label="수학 수업 웹툴 모음으로 돌아가기">← 웹툴 모음</a>
      <div className="hero-main">
        <div>
          <p className="overline">⚾ CONDITIONAL PROBABILITY LAB</p>
          <h1>KBO 조건부 확률<br /><span>타자 카드 실험실</span></h1>
          <p className="hero-copy">주자 상황이 달라지면 안타 확률도 달라질까?</p>
          <div className="formula-strip">
            <span>전체 타율 = <b>P(안타)</b></span>
            <i>VS</i>
            <span>주자 상황별 타율 = <b>{getSituationFormula(situation)}</b></span>
          </div>
        </div>
        <div className="hero-board">
          <RunnerDiamond situation={situation} />
          <div className="board-label">현재 조건 <strong>{getSituationLabel(situation)}</strong></div>
        </div>
      </div>
      <label className="class-toggle">
        <input type="checkbox" checked={classMode} onChange={(event) => onClassModeChange(event.target.checked)} />
        <span>수업 모드</span>
      </label>
    </header>
  );
}
