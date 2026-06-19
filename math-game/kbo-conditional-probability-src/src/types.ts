export type Team = "LG" | "KT" | "SSG" | "NC" | "두산" | "KIA" | "롯데" | "삼성" | "한화" | "키움";

export type RunnerSituation =
  | "basesEmpty"
  | "runner1"
  | "runner2"
  | "runner3"
  | "runner12"
  | "runner13"
  | "runner23"
  | "basesLoaded";

export type SortOption = "overall" | "situation" | "rise" | "fall" | "name" | "team";
export type DataSource = "sample" | "csv" | "live";
export type TabId = "data" | "cards" | "compare" | "experiment" | "missions" | "report";

export type Batter = {
  id: string;
  name: string;
  team: string;
  imageUrl?: string;
  overallAvg: number;
  basesEmptyAvg: number;
  runner1Avg: number;
  runner2Avg: number;
  runner3Avg: number;
  runner12Avg: number;
  runner13Avg: number;
  runner23Avg: number;
  basesLoadedAvg: number;
};

export type SingleTrial = {
  randomValue: number;
  probability: number;
  isHit: boolean;
};

export type ExperimentResult = {
  id: string;
  batterName: string;
  situation: RunnerSituation;
  probability: number;
  trials: number;
  hits: number;
  outs: number;
  relativeFrequency: number;
  difference: number;
  createdAt: string;
  recentTrials: boolean[];
  singleTrial?: SingleTrial;
};

export type Mission = {
  id: string;
  title: string;
  scene: string;
  question: string;
  situation: RunnerSituation;
  sortOption: SortOption;
};

export type MissionAnswer = {
  answer: string;
  batterId: string;
  completed: boolean;
};

export type ReportData = {
  studentName: string;
  studentNumber: string;
  team: string;
  batterId: string;
  situation: RunnerSituation;
  learned: string;
  whyNeeded: string;
  nextQuestion: string;
};
