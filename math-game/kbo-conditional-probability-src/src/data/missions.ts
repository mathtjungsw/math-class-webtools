import type { Mission } from "../types";

export const MISSIONS: Mission[] = [
  { id: "m1", title: "끝내기 찬스", scene: "9회말 2사 만루, 1점 뒤진 상황", question: "전체 타율 1위와 만루 타율 1위 중 누구를 선택하겠습니까?", situation: "basesLoaded", sortOption: "situation" },
  { id: "m2", title: "득점권의 반전", scene: "무사 2루", question: "전체 타율은 낮지만 2루 상황 타율이 높은 선수를 찾아보세요.", situation: "runner2", sortOption: "rise" },
  { id: "m3", title: "조건의 힘", scene: "1사 1,3루", question: "P(안타)와 P(안타 | 1,3루)의 차이가 가장 큰 선수를 찾아보세요.", situation: "runner13", sortOption: "rise" },
  { id: "m4", title: "선두 타자의 조건", scene: "주자 없음", question: "주자 없음 상황에서 전체 타율보다 더 강한 선수는 누구인가요?", situation: "basesEmpty", sortOption: "rise" },
  { id: "m5", title: "만루에 약하다?", scene: "만루", question: "전체 타율은 높지만 만루 타율이 낮은 선수를 찾고, 중요한 상황에 약하다고 단정할 수 있는지 토론하세요.", situation: "basesLoaded", sortOption: "fall" },
  { id: "m6", title: "100번의 타석", scene: "2,3루", question: "조건부 타율 1위 선수를 선택해 100번 실험하면 안타가 몇 번 나오는지 확인하세요.", situation: "runner23", sortOption: "situation" },
  { id: "m7", title: "흔들리지 않는 타자", scene: "1루", question: "전체 타율과 1루 상황 타율이 거의 같은 선수를 찾아보세요.", situation: "runner1", sortOption: "name" },
  { id: "m8", title: "내가 감독이라면", scene: "자유 선택", question: "어떤 상황에서 어떤 선수를 선택할지 확률을 근거로 설명하세요.", situation: "runner12", sortOption: "situation" },
];
