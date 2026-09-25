/** 已确认写入的有效训放记录 */
export interface TrainingRecord {
  id: string;
  ring: string; // 足环号
  bloodline: string; // 血统
  location: string; // 训放地点
  distanceKm: number | null; // 放飞距离
  weather: string; // 天气
  releaseAt: number; // 放飞时刻（毫秒）
  arrivalAt: number | null; // 归巢报时（毫秒），未归巢为 null
  returned: boolean; // false = 确认未归巢
  source: string; // 首次来源批次
  createdAt: number;
}

/** 粘贴表格解析出的单行 */
export interface ParsedRow {
  lineNo: number;
  raw: string;
  ring: string | null;
  bloodline: string;
  location: string;
  distanceKm: number | null;
  weather: string;
  releaseAt: number | null;
  arrivalAt: number | null;
  errors: string[];
}

/** 留在待补区的缺项记录（不进排行） */
export interface PendingRow {
  id: string;
  source: string;
  ring: string;
  bloodline: string;
  location: string;
  distanceKm: number | null;
  weather: string;
  releaseAt: number;
  arrivalAt: number | null;
  missing: string[];
}

export type RowDecision = "valid" | "pending" | "duplicate" | "error";

/** 预览阶段每一行的合并判定 */
export interface PlannedRow {
  parsed: ParsedRow;
  decision: RowDecision;
  missing: string[]; // 缺哪些关键字段（距离/天气/归巢时刻）
  duplicateOf: string | null; // 重复时：首次来源
}

export interface MergePlan {
  source: string;
  rows: PlannedRow[];
  counts: Record<RowDecision, number>;
}

export interface FieldChange {
  field: "distanceKm" | "weather" | "arrivalAt";
  label: string;
  before: string;
  after: string;
}

/** 改动留痕：前后值 + 名次变化 */
export interface EditEntry {
  id: string;
  recordId: string;
  ring: string;
  at: number;
  changes: FieldChange[];
  rankBefore: number | null;
  rankAfter: number | null;
}

export interface LoftState {
  records: TrainingRecord[];
  pending: PendingRow[];
  edits: EditEntry[];
}
