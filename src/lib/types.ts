/** 归一化后的训放记录（有效行与待补行共用同一结构） */
export interface FlightRecord {
  id: string;
  ring: string; // 足环号（大写、去空格）
  bloodline: string; // 血统，未标注时为 ""
  location: string; // 训放地点
  distanceKm: number | null; // 放飞距离
  weather: string | null; // 天气
  releaseAt: string; // 放飞时刻，归一化为 YYYY-MM-DD HH:mm
  arrivalAt: string | null; // 归巢时刻；null 表示未归巢 / 未报时
  health: string | null;
  source: string; // 首次写入的来源批次
  createdAt: number;
}

/** 决定能否进排行的三个关键字段 */
export type MissingField = "distanceKm" | "weather" | "arrivalAt";
export type EditableField = MissingField;

export const FIELD_LABEL: Record<MissingField, string> = {
  distanceKm: "放飞距离",
  weather: "天气",
  arrivalAt: "归巢时刻",
};

/** 缺距离、天气或归巢时刻的记录留在待补，不进排行 */
export function missingFields(
  r: Pick<FlightRecord, "distanceKm" | "weather" | "arrivalAt">
): MissingField[] {
  const out: MissingField[] = [];
  if (r.distanceKm === null) out.push("distanceKm");
  if (r.weather === null || r.weather === "") out.push("weather");
  if (r.arrivalAt === null) out.push("arrivalAt");
  return out;
}

/** 粘贴解析出的单行字段 */
export interface ParsedRecordFields {
  ring: string | null;
  bloodline: string;
  location: string;
  distanceKm: number | null;
  weather: string | null;
  releaseAt: string | null;
  arrivalAt: string | null;
  health: string | null;
}

export interface ParsedRow {
  rowNo: number;
  raw: string;
  fields: ParsedRecordFields;
  errors: string[];
  missing: MissingField[];
}

export interface ParseResult {
  rows: ParsedRow[];
  delimiter: string;
  headerFound: boolean;
  rowCount: number;
}

/** 合并判定：新增（有效/待补）、重复（沿用首次来源）、无法解析 */
export type MergePlanItem =
  | { kind: "error"; row: ParsedRow }
  | { kind: "duplicate"; row: ParsedRow; keptSource: string }
  | { kind: "new"; row: ParsedRow; status: "valid" | "pending" };

export interface RankedRecord {
  record: FlightRecord;
  speed: number; // 米/分
  rank: number;
}

/** 修改留痕：前后值 + 名次变化 */
export interface AuditEntry {
  id: string;
  recordId: string;
  ring: string;
  field: EditableField;
  before: string;
  after: string;
  rankBefore: number | null;
  rankAfter: number | null;
  at: number;
}

/** 界面层保存修改后的回执 */
export interface EditReply {
  error: string | null;
  changed: boolean;
}

export type EditHandler = (id: string, field: EditableField, value: string) => EditReply;
