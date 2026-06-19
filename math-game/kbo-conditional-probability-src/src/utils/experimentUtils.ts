import type { ExperimentResult, RunnerSituation, SingleTrial } from "../types";

export function runSingleExperiment(probability: number): SingleTrial {
  const randomValue = Math.random();
  return { randomValue, probability, isHit: randomValue <= probability };
}

export function runMultipleExperiments(
  probability: number,
  count: number,
  batterName: string,
  situation: RunnerSituation,
): ExperimentResult {
  const trials = Array.from({ length: count }, () => runSingleExperiment(probability));
  const hits = trials.filter((trial) => trial.isHit).length;
  const relativeFrequency = hits / count;
  return {
    id: crypto.randomUUID(), batterName, situation, probability, trials: count, hits,
    outs: count - hits, relativeFrequency, difference: relativeFrequency - probability,
    createdAt: new Date().toLocaleTimeString("ko-KR"),
    recentTrials: trials.slice(-20).map((trial) => trial.isHit),
    singleTrial: count === 1 ? trials[0] : undefined,
  };
}
