import type { Batter, Team } from "../types";

const rosters: Record<Team, string[]> = {
  LG: ["김도윤", "박준호", "이현우"],
  KT: ["최민재", "정우진", "강태윤"],
  SSG: ["윤시우", "한지훈", "오승민"],
  NC: ["서준혁", "임도현", "배건우"],
  두산: ["조하준", "문지환", "백승현"],
  KIA: ["신재민", "권민준", "황서진"],
  롯데: ["유태경", "송현준", "장도훈"],
  삼성: ["남우석", "홍지호", "노준영"],
  한화: ["차민규", "안성현", "류동혁"],
  키움: ["고준서", "전민호", "양재원"],
};

const clamp = (value: number) => Math.min(0.48, Math.max(0.16, Number(value.toFixed(3))));
const offsets = [-0.031, 0.018, 0.046, -0.024, 0.033, -0.012, 0.057, -0.041];

export const SAMPLE_BATTERS: Batter[] = Object.entries(rosters).flatMap(([team, names], teamIndex) =>
  names.map((name, playerIndex) => {
    const seed = teamIndex * 3 + playerIndex;
    const overallAvg = Number((0.245 + ((seed * 17) % 73) / 1000).toFixed(3));
    const shift = (seed % 5 - 2) * 0.006;
    const situationValues = offsets.map((offset, index) =>
      clamp(overallAvg + offset * (index % 2 === seed % 2 ? 1 : -0.72) + shift),
    );

    return {
      id: `sample-${seed + 1}`,
      name,
      team,
      overallAvg,
      basesEmptyAvg: situationValues[0],
      runner1Avg: situationValues[1],
      runner2Avg: situationValues[2],
      runner3Avg: situationValues[3],
      runner12Avg: situationValues[4],
      runner13Avg: situationValues[5],
      runner23Avg: situationValues[6],
      basesLoadedAvg: situationValues[7],
    };
  }),
);
