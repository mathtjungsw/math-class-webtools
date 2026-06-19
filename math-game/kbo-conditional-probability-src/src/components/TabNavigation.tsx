import type { TabId } from "../types";

const tabs: Array<{ id: TabId; label: string; icon: string }> = [
  { id: "data", label: "데이터 준비", icon: "▦" },
  { id: "cards", label: "선수 카드", icon: "◫" },
  { id: "compare", label: "확률 비교", icon: "⇄" },
  { id: "experiment", label: "확률 실험", icon: "⚾" },
  { id: "missions", label: "미션 활동", icon: "✓" },
  { id: "report", label: "탐구 보고서", icon: "▤" },
];

export function TabNavigation({ active, onChange }: { active: TabId; onChange: (tab: TabId) => void }) {
  return (
    <nav className="tabs" aria-label="실험실 메뉴">
      {tabs.map((tab) => (
        <button className={active === tab.id ? "active" : ""} key={tab.id} onClick={() => onChange(tab.id)}>
          <span>{tab.icon}</span>{tab.label}
        </button>
      ))}
    </nav>
  );
}
