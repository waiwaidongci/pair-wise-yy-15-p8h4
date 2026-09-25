// 合并判断层：去重、有效性分级、排行计算、修改留痕、统计汇总。不碰界面。

import type {
  AuditEntry,
  EditableField,
  FlightRecord,
  MergePlanItem,
  ParsedRow,
  RankedRecord,
} from "./types";
import { missingFields } from "./types";
import { isEmptyMarker, isNotReturnedMarker, normalizeArrival, parseDistance, toMinutes } from "./parser";

let seq = 0;
const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${++seq}`;

/** 判重键：足环号 + 放飞时刻 */
export const dedupeKey = (ring: string, releaseAt: string) => `${ring}@${releaseAt}`;

export function toRecord(row: ParsedRow, source: string): FlightRecord {
  const f = row.fields;
  return {
    id: uid(),
    ring: f.ring ?? "",
    bloodline: f.bloodline,
    location: f.location,
    distanceKm: f.distanceKm,
    weather: f.weather,
    releaseAt: f.releaseAt ?? "",
    arrivalAt: f.arrivalAt,
    health: f.health,
    source,
    createdAt: Date.now(),
  };
}

/** 以「足环 + 放飞时刻」判重；同批次内先出现的占坑，重复行沿用首次来源 */
export function buildMergePlan(
  rows: ParsedRow[],
  existing: FlightRecord[],
  batchLabel: string
): MergePlanItem[] {
  const seen = new Map<string, string>();
  existing.forEach((r) => seen.set(dedupeKey(r.ring, r.releaseAt), r.source));

  return rows.map((row) => {
    if (row.errors.length > 0 || !row.fields.ring || !row.fields.releaseAt) {
      return { kind: "error", row };
    }
    const key = dedupeKey(row.fields.ring, row.fields.releaseAt);
    const keptSource = seen.get(key);
    if (keptSource !== undefined) {
      return { kind: "duplicate", row, keptSource };
    }
    seen.set(key, batchLabel);
    return { kind: "new", row, status: row.missing.length === 0 ? "valid" : "pending" };
  });
}

export function planSummary(plan: MergePlanItem[]) {
  return {
    valid: plan.filter((p) => p.kind === "new" && p.status === "valid").length,
    pending: plan.filter((p) => p.kind === "new" && p.status === "pending").length,
    duplicate: plan.filter((p) => p.kind === "duplicate").length,
    error: plan.filter((p) => p.kind === "error").length,
  };
}

export function flightMinutes(r: FlightRecord): number | null {
  if (!r.arrivalAt || !r.releaseAt) return null;
  const diff = toMinutes(r.arrivalAt) - toMinutes(r.releaseAt);
  return diff > 0 ? diff : null;
}

export function speedOf(r: FlightRecord): number | null {
  const m = flightMinutes(r);
  if (m === null || r.distanceKm === null) return null;
  return (r.distanceKm * 1000) / m;
}

/** 有效行：关键字段齐全且飞行时长为正，才进排行 */
export const isValidRecord = (r: FlightRecord) =>
  missingFields(r).length === 0 && flightMinutes(r) !== null;

export function computeRanking(records: FlightRecord[]): RankedRecord[] {
  return records
    .filter(isValidRecord)
    .map((record) => ({ record, speed: speedOf(record)!, rank: 0 }))
    .sort((a, b) => b.speed - a.speed || a.record.releaseAt.localeCompare(b.record.releaseAt))
    .map((item, i) => ({ ...item, rank: i + 1 }));
}

const rankOf = (records: FlightRecord[], id: string): number | null =>
  computeRanking(records).find((x) => x.record.id === id)?.rank ?? null;

export interface EditOutcome {
  records: FlightRecord[];
  audit: AuditEntry | null;
  error: string | null;
}

/** 改动距离、天气或报时：重算排行，并留下前后值与名次变化 */
export function applyFieldEdit(
  records: FlightRecord[],
  id: string,
  field: EditableField,
  rawValue: string
): EditOutcome {
  const target = records.find((r) => r.id === id);
  if (!target) return { records, audit: null, error: "记录不存在" };

  let patch: Partial<FlightRecord>;
  let before: string;
  let after: string;

  if (field === "distanceKm") {
    const v = parseDistance(rawValue);
    if (rawValue.trim() && !isEmptyMarker(rawValue) && v === null) {
      return { records, audit: null, error: `距离「${rawValue}」无法解析` };
    }
    patch = { distanceKm: v };
    before = target.distanceKm === null ? "（空）" : `${target.distanceKm}km`;
    after = v === null ? "（空）" : `${v}km`;
  } else if (field === "weather") {
    const v = rawValue.trim() && !isEmptyMarker(rawValue) ? rawValue.trim() : null;
    patch = { weather: v };
    before = target.weather ?? "（空）";
    after = v ?? "（空）";
  } else {
    const t = rawValue.trim();
    const v = normalizeArrival(t, target.releaseAt);
    if (t && !isEmptyMarker(t) && !isNotReturnedMarker(t) && v === null) {
      return { records, audit: null, error: `归巢时刻「${rawValue}」无法解析` };
    }
    patch = { arrivalAt: v };
    before = target.arrivalAt ?? "（未归巢）";
    after = v ?? "（未归巢）";
  }

  if (before === after) return { records, audit: null, error: null };

  const rankBefore = rankOf(records, id);
  const nextRecords = records.map((r) => (r.id === id ? { ...r, ...patch } : r));
  const rankAfter = rankOf(nextRecords, id);

  return {
    records: nextRecords,
    audit: {
      id: uid(),
      recordId: id,
      ring: target.ring,
      field,
      before,
      after,
      rankBefore,
      rankAfter,
      at: Date.now(),
    },
    error: null,
  };
}

export interface OverviewStats {
  totalRecords: number;
  uniqueRings: number;
  validCount: number;
  pendingCount: number;
  unreturned: number;
  returnRate: number | null;
  avgSpeed: number | null;
  bloodlineCount: number;
}

export function overviewStats(records: FlightRecord[]): OverviewStats {
  const ranking = computeRanking(records);
  const arrived = records.filter((r) => r.arrivalAt !== null).length;
  return {
    totalRecords: records.length,
    uniqueRings: new Set(records.map((r) => r.ring)).size,
    validCount: ranking.length,
    pendingCount: records.filter((r) => missingFields(r).length > 0).length,
    unreturned: records.length - arrived,
    returnRate: records.length ? (arrived / records.length) * 100 : null,
    avgSpeed: ranking.length ? ranking.reduce((s, x) => s + x.speed, 0) / ranking.length : null,
    bloodlineCount: new Set(records.map((r) => r.bloodline || "未标注")).size,
  };
}

export interface BloodlineStat {
  name: string;
  pigeons: number;
  total: number;
  arrived: number;
  validCount: number;
  avgSpeed: number | null;
  bestSpeed: number | null;
}

export function bloodlineStats(records: FlightRecord[]): BloodlineStat[] {
  const ranking = computeRanking(records);
  const groups = new Map<string, FlightRecord[]>();
  records.forEach((r) => {
    const k = r.bloodline || "未标注";
    groups.set(k, [...(groups.get(k) ?? []), r]);
  });
  return [...groups.entries()]
    .map(([name, rs]) => {
      const speeds = ranking
        .filter((x) => (x.record.bloodline || "未标注") === name)
        .map((x) => x.speed);
      return {
        name,
        pigeons: new Set(rs.map((r) => r.ring)).size,
        total: rs.length,
        arrived: rs.filter((r) => r.arrivalAt !== null).length,
        validCount: speeds.length,
        avgSpeed: speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : null,
        bestSpeed: speeds.length ? Math.max(...speeds) : null,
      };
    })
    .sort((a, b) => (b.bestSpeed ?? 0) - (a.bestSpeed ?? 0));
}
