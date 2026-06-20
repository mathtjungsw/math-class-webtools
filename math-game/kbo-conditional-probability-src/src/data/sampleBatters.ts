import kbo2025Csv from "./kbo_2025_hitters_base_state.csv?raw";
import { parseCsvToBatters } from "../utils/csvUtils";

export const SAMPLE_BATTERS = parseCsvToBatters(kbo2025Csv, "kbo-2025");

export const SAMPLE_DATA_DESCRIPTION =
  "사용자가 제공한 2025 KBO 타자 주자 상황별 타율 및 포지션 데이터입니다.";
