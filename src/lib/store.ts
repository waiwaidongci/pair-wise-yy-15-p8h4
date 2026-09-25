// 界面动作层：reducer 承接界面动作，调用 merge.ts 完成状态迁移；附本地持久化。

import type { AuditEntry, EditableField, FlightRecord, ParsedRow } from "./types";
import { applyFieldEdit, buildMergePlan, toRecord } from "./merge";
import { seedRecords } from "./seed";

export interface MergeState {
  records: FlightRecord[];
  audit: AuditEntry[];
}

export type MergeAction =
  | { type: "confirm"; rows: ParsedRow[]; source: string }
  | { type: "edit"; id: string; field: EditableField; value: string }
  | { type: "remove"; id: string }
  | { type: "reset" };

export function mergeReducer(state: MergeState, action: MergeAction): MergeState {
  switch (action.type) {
    case "confirm": {
      // 确认时以当前记录为准再判一次重，重复行沿用首次来源
      const plan = buildMergePlan(action.rows, state.records, action.source);
      const additions = plan
        .filter((p) => p.kind === "new")
        .map((p) => toRecord(p.row, action.source));
      if (additions.length === 0) return state;
      return { ...state, records: [...state.records, ...additions] };
    }
    case "edit": {
      const { records, audit } = applyFieldEdit(state.records, action.id, action.field, action.value);
      return audit ? { records, audit: [audit, ...state.audit] } : { ...state, records };
    }
    case "remove":
      return { ...state, records: state.records.filter((r) => r.id !== action.id) };
    case "reset":
      return { records: seedRecords(), audit: [] };
  }
}

const STORAGE_KEY = "hxyfront-62014-merge-state";

export function loadState(): MergeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MergeState;
      if (Array.isArray(parsed.records) && Array.isArray(parsed.audit)) return parsed;
    }
  } catch {
    // 忽略损坏的本地缓存
  }
  return { records: seedRecords(), audit: [] };
}

export function saveState(state: MergeState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 存储不可用时静默失败
  }
}
