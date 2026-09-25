import { fmtDateTime, fmtKm } from "./format";
import type {
  EditEntry,
  FieldChange,
  LoftState,
  MergePlan,
  ParsedRow,
  PendingRow,
  PlannedRow,
  RowDecision,
  TrainingRecord,
} from "./types";

/**
 * 合并判断层：去重键、待补判定、排行计算、改数留痕。
 * 全部是纯函数，输入旧状态返回新状态，不碰界面。
 */

let uidCounter = 0;
export function uid(prefix: string): string {
  uidCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${uidCounter}`;
}

export function normalizeRing(ring: string): string {
  return ring
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[‐‑‒–—―]/g, "-");
}

export function minuteKey(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 重复判定键：足环号 + 放飞时刻（分钟级） */
export function recordKey(ring: string, releaseAt: number): string {
  return `${normalizeRing(ring)}|${minuteKey(releaseAt)}`;
}

/** 进排行必需的字段：距离、天气、归巢时刻 */
export function missingOf(r: { distanceKm: number | null; weather: string; arrivalAt: number | null }): string[] {
  const missing: string[] = [];
  if (r.distanceKm == null) missing.push("距离");
  if (!r.weather.trim()) missing.push("天气");
  if (r.arrivalAt == null) missing.push("归巢时刻");
  return missing;
}

/** 预览：对解析出的每一行给出 有效/待补/重复/无法导入 判定 */
export function planMerge(records: TrainingRecord[], pending: PendingRow[], rows: ParsedRow[], source: string): MergePlan {
  const seen = new Map<string, string>();
  for (const r of records) seen.set(recordKey(r.ring, r.releaseAt), r.source);
  for (const p of pending) seen.set(recordKey(p.ring, p.releaseAt), `${p.source}（待补）`);

  const planned: PlannedRow[] = [];
  const counts: Record<RowDecision, number> = { valid: 0, pending: 0, duplicate: 0, error: 0 };

  for (const parsed of rows) {
    if (parsed.errors.length > 0 || parsed.ring == null || parsed.releaseAt == null) {
      planned.push({ parsed, decision: "error", missing: [], duplicateOf: null });
      counts.error += 1;
      continue;
    }
    const key = recordKey(parsed.ring, parsed.releaseAt);
    const firstSource = seen.get(key);
    if (firstSource) {
      // 重复行不写入，沿用首次来源
      planned.push({ parsed, decision: "duplicate", missing: [], duplicateOf: firstSource });
      counts.duplicate += 1;
      continue;
    }
    seen.set(key, source);
    const missing = missingOf(parsed);
    const decision: RowDecision = missing.length > 0 ? "pending" : "valid";
    planned.push({ parsed, decision, missing, duplicateOf: null });
    counts[decision] += 1;
  }
  return { source, rows: planned, counts };
}

/** 确认：有效行写入记录，缺项行留待补，重复/错误行不写入 */
export function applyMerge(state: LoftState, plan: MergePlan): { state: LoftState; summary: string } {
  const records = [...state.records];
  const pending = [...state.pending];
  const now = Date.now();
  for (const row of plan.rows) {
    const p = row.parsed;
    if (p.ring == null || p.releaseAt == null) continue;
    if (row.decision === "valid") {
      records.push({
        id: uid("rec"),
        ring: p.ring,
        bloodline: p.bloodline,
        location: p.location,
        distanceKm: p.distanceKm,
        weather: p.weather,
        releaseAt: p.releaseAt,
        arrivalAt: p.arrivalAt,
        returned: true,
        source: plan.source,
        createdAt: now,
      });
    } else if (row.decision === "pending") {
      pending.push({
        id: uid("pend"),
        source: plan.source,
        ring: p.ring,
        bloodline: p.bloodline,
        location: p.location,
        distanceKm: p.distanceKm,
        weather: p.weather,
        releaseAt: p.releaseAt,
        arrivalAt: p.arrivalAt,
        missing: row.missing,
      });
    }
  }
  const c = plan.counts;
  const summary = `已写入 ${c.valid} 条有效记录；${c.pending} 条留待补；${c.duplicate} 条重复，沿用首次来源；${c.error} 条无法识别未导入。`;
  return { state: { ...state, records, pending }, summary };
}

export function isRankable(r: TrainingRecord): boolean {
  return r.returned && r.distanceKm != null && r.weather.trim() !== "" && r.arrivalAt != null && r.arrivalAt > r.releaseAt;
}

export function speedOf(r: TrainingRecord): number {
  const minutes = ((r.arrivalAt as number) - r.releaseAt) / 60000;
  return ((r.distanceKm as number) * 1000) / minutes;
}

export interface RankEntry {
  record: TrainingRecord;
  speed: number; // m/min
  rank: number;
}

export function computeRanking(records: TrainingRecord[]): RankEntry[] {
  return records
    .filter(isRankable)
    .map((record) => ({ record, speed: speedOf(record), rank: 0 }))
    .sort((a, b) => b.speed - a.speed || a.record.releaseAt - b.record.releaseAt)
    .map((entry, i) => ({ ...entry, rank: i + 1 }));
}

function rankOf(records: TrainingRecord[], recordId: string): number | null {
  const hit = computeRanking(records).find((e) => e.record.id === recordId);
  return hit ? hit.rank : null;
}

export interface FieldPatch {
  distanceKm?: number | null;
  weather?: string;
  arrivalAt?: number | null;
}

export type EditResult = { ok: true; state: LoftState; ring: string } | { ok: false; error: string };

/** 改动距离/天气/报时：校验、重算名次，并在 edits 里留前后记录 */
export function applyEdit(state: LoftState, recordId: string, patch: FieldPatch): EditResult {
  const before = state.records.find((r) => r.id === recordId);
  if (!before) return { ok: false, error: "记录不存在" };
  const next: TrainingRecord = { ...before };
  const changes: FieldChange[] = [];

  if (patch.distanceKm !== undefined && patch.distanceKm !== before.distanceKm) {
    if (patch.distanceKm == null || patch.distanceKm <= 0 || patch.distanceKm > 2000) {
      return { ok: false, error: "距离需在 0–2000 公里之间" };
    }
    changes.push({ field: "distanceKm", label: "距离", before: fmtKm(before.distanceKm), after: fmtKm(patch.distanceKm) });
    next.distanceKm = patch.distanceKm;
  }
  if (patch.weather !== undefined && patch.weather.trim() !== before.weather) {
    if (!patch.weather.trim()) return { ok: false, error: "天气不能为空" };
    changes.push({ field: "weather", label: "天气", before: before.weather || "—", after: patch.weather.trim() });
    next.weather = patch.weather.trim();
  }
  if (patch.arrivalAt !== undefined && patch.arrivalAt !== before.arrivalAt) {
    if (patch.arrivalAt == null) return { ok: false, error: "归巢时刻不能为空；未归巢请在待补区标记" };
    if (patch.arrivalAt <= before.releaseAt) return { ok: false, error: "归巢时刻早于放飞时刻" };
    changes.push({ field: "arrivalAt", label: "归巢时刻", before: fmtDateTime(before.arrivalAt), after: fmtDateTime(patch.arrivalAt) });
    next.arrivalAt = patch.arrivalAt;
    next.returned = true;
  }
  if (changes.length === 0) return { ok: false, error: "没有检测到改动" };

  const rankBefore = rankOf(state.records, recordId);
  const records = state.records.map((r) => (r.id === recordId ? next : r));
  const rankAfter = rankOf(records, recordId);
  const entry: EditEntry = { id: uid("edit"), recordId, ring: before.ring, at: Date.now(), changes, rankBefore, rankAfter };
  return { ok: true, state: { ...state, records, edits: [entry, ...state.edits] }, ring: before.ring };
}

/** 补全待补行：仍缺项则留在待补，齐了则写入有效记录（重复则沿用首次来源） */
export function completePending(state: LoftState, pendingId: string, patch: FieldPatch): { state: LoftState; result: string } {
  const row = state.pending.find((p) => p.id === pendingId);
  if (!row) return { state, result: "待补记录不存在" };
  const merged: PendingRow = {
    ...row,
    distanceKm: patch.distanceKm != null ? patch.distanceKm : row.distanceKm,
    weather: patch.weather != null && patch.weather.trim() ? patch.weather.trim() : row.weather,
    arrivalAt: patch.arrivalAt != null ? patch.arrivalAt : row.arrivalAt,
  };
  if (merged.arrivalAt != null && merged.arrivalAt <= merged.releaseAt) {
    return { state, result: "归巢时刻早于放飞时刻，未写入" };
  }
  const missing = missingOf(merged);
  if (missing.length > 0) {
    const pending = state.pending.map((p) => (p.id === pendingId ? { ...merged, missing } : p));
    return { state: { ...state, pending }, result: `仍缺：${missing.join("、")}，继续留在待补` };
  }
  const key = recordKey(merged.ring, merged.releaseAt);
  if (state.records.some((r) => recordKey(r.ring, r.releaseAt) === key)) {
    const pending = state.pending.filter((p) => p.id !== pendingId);
    return { state: { ...state, pending }, result: "与已有记录重复，沿用首次来源，已移出待补" };
  }
  const record: TrainingRecord = {
    id: uid("rec"),
    ring: merged.ring,
    bloodline: merged.bloodline,
    location: merged.location,
    distanceKm: merged.distanceKm,
    weather: merged.weather,
    releaseAt: merged.releaseAt,
    arrivalAt: merged.arrivalAt,
    returned: true,
    source: merged.source,
    createdAt: Date.now(),
  };
  return {
    state: { ...state, records: [...state.records, record], pending: state.pending.filter((p) => p.id !== pendingId) },
    result: `已补全并写入：${merged.ring}`,
  };
}

/** 待补行确认未归巢：写入记录但不进排行，计入未归巢 */
export function markUnreturned(state: LoftState, pendingId: string): { state: LoftState; result: string } {
  const row = state.pending.find((p) => p.id === pendingId);
  if (!row) return { state, result: "待补记录不存在" };
  const key = recordKey(row.ring, row.releaseAt);
  if (state.records.some((r) => recordKey(r.ring, r.releaseAt) === key)) {
    const pending = state.pending.filter((p) => p.id !== pendingId);
    return { state: { ...state, pending }, result: "已有相同足环与放飞时刻的记录，沿用首次来源，已移出待补" };
  }
  const record: TrainingRecord = {
    id: uid("rec"),
    ring: row.ring,
    bloodline: row.bloodline,
    location: row.location,
    distanceKm: row.distanceKm,
    weather: row.weather,
    releaseAt: row.releaseAt,
    arrivalAt: null,
    returned: false,
    source: row.source,
    createdAt: Date.now(),
  };
  return {
    state: { ...state, records: [...state.records, record], pending: state.pending.filter((p) => p.id !== pendingId) },
    result: `已标记未归巢：${row.ring}`,
  };
}

export function removePending(state: LoftState, pendingId: string): LoftState {
  return { ...state, pending: state.pending.filter((p) => p.id !== pendingId) };
}

export interface OverviewStats {
  total: number;
  returned: number;
  unreturned: number;
  returnRate: number | null; // 0–100
  avgSpeed: number | null; // m/min
  bloodlineCount: number;
}

export function overviewStats(records: TrainingRecord[]): OverviewStats {
  const total = records.length;
  const returned = records.filter((r) => r.returned).length;
  const speeds = records.filter(isRankable).map(speedOf);
  return {
    total,
    returned,
    unreturned: total - returned,
    returnRate: total > 0 ? (returned / total) * 100 : null,
    avgSpeed: speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : null,
    bloodlineCount: new Set(records.map((r) => r.bloodline || "未知血统")).size,
  };
}

export interface BloodlineStat {
  bloodline: string;
  total: number;
  returned: number;
  unreturned: number;
  bestSpeed: number | null;
  avgSpeed: number | null;
}

export function bloodlineStats(records: TrainingRecord[]): BloodlineStat[] {
  const map = new Map<string, TrainingRecord[]>();
  for (const r of records) {
    const name = r.bloodline || "未知血统";
    map.set(name, [...(map.get(name) ?? []), r]);
  }
  return [...map.entries()]
    .map(([bloodline, rs]) => {
      const speeds = rs.filter(isRankable).map(speedOf);
      const returned = rs.filter((r) => r.returned).length;
      return {
        bloodline,
        total: rs.length,
        returned,
        unreturned: rs.length - returned,
        bestSpeed: speeds.length > 0 ? Math.max(...speeds) : null,
        avgSpeed: speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : null,
      };
    })
    .sort((a, b) => b.total - a.total);
}

export function distanceBand(km: number | null): string {
  if (km == null) return "未知";
  if (km < 300) return "短距离";
  if (km <= 600) return "中距离";
  return "长距离";
}
