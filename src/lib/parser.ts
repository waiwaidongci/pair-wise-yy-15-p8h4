// 表格解析层：把鸽棚导出的各种训放表规范成统一字段。
// 只负责「看懂表格」（分隔符、表头别名、日期写法），去重与有效性判断在 merge.ts。

import type { ParseResult, ParsedRecordFields, ParsedRow } from "./types";
import { missingFields } from "./types";

const EMPTY_MARKERS = new Set(["", "-", "--", "—", "/", "\\", "无", "未知", "暂无", "na", "n/a", "null"]);
const NOT_RETURNED_MARKERS = new Set(["未归", "未归巢", "未报到", "未返", "丢失", "失鸽"]);

export function isEmptyMarker(v: string): boolean {
  return EMPTY_MARKERS.has(v.trim().toLowerCase());
}

export function isNotReturnedMarker(v: string): boolean {
  return NOT_RETURNED_MARKERS.has(v.trim());
}

export function normalizeRing(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/** 「80km / 80.5公里 / 120」→ 数字公里；空值与无法解析都返回 null（调用方按原文区分） */
export function parseDistance(raw: string): number | null {
  const t = raw
    .trim()
    .toLowerCase()
    .replace(/[，,]/g, "")
    .replace(/公里|千米|km/g, "")
    .trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0 || n > 2000) return null;
  return Math.round(n * 10) / 10;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

function canonical(y: number, mo: number, d: number, h: number, mi: number): string | null {
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
  return `${y}-${pad2(mo)}-${pad2(d)} ${pad2(h)}:${pad2(mi)}`;
}

/** 各种日期时间写法 → YYYY-MM-DD HH:mm；缺年份按今年，仅写时刻时需给默认日期 */
export function normalizeDateTime(raw: string, defaultDate?: string): string | null {
  let t = raw.trim();
  if (!t || isEmptyMarker(t)) return null;
  t = t.replace(/T/i, " ").replace(/：/g, ":");
  t = t.replace(/[年月]/g, "-").replace(/日/g, " ").replace(/时/g, ":").replace(/分/g, "");
  t = t.replace(/[./]/g, "-").replace(/\s+/g, " ").trim();

  const full = t.match(/^(?:(\d{4})-)?(\d{1,2})-(\d{1,2}) (\d{1,2}):(\d{1,2})(?::\d{1,2})?$/);
  if (full) {
    const year = full[1] ? Number(full[1]) : new Date().getFullYear();
    return canonical(year, Number(full[2]), Number(full[3]), Number(full[4]), Number(full[5]));
  }

  const timeOnly = t.match(/^(\d{1,2}):(\d{1,2})(?::\d{1,2})?$/);
  if (timeOnly && defaultDate && /^\d{4}-\d{2}-\d{2}$/.test(defaultDate)) {
    return canonical(
      Number(defaultDate.slice(0, 4)),
      Number(defaultDate.slice(5, 7)),
      Number(defaultDate.slice(8, 10)),
      Number(timeOnly[1]),
      Number(timeOnly[2])
    );
  }
  return null;
}

export const dateOf = (canonicalDT: string) => canonicalDT.slice(0, 10);

/** 归一化时间串 → 分钟数（用于算飞行时长） */
export function toMinutes(canonicalDT: string): number {
  const [date, time] = canonicalDT.split(" ");
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  return new Date(y, mo - 1, d, h, mi).getTime() / 60000;
}

function addDays(canonicalDT: string, days: number): string {
  const [date, time] = canonicalDT.split(" ");
  const [y, mo, d] = date.split("-").map(Number);
  const dt = new Date(y, mo - 1, d + days);
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())} ${time}`;
}

/** 归巢报时：允许只写时刻（默认放飞当天）；早于放飞时刻按次日归巢处理 */
export function normalizeArrival(raw: string, releaseAt: string | null): string | null {
  const t = raw.trim();
  if (!t || isEmptyMarker(t) || isNotReturnedMarker(t)) return null;
  const timeOnly = /^\d{1,2}\s*[:：时]\d{1,2}/.test(t) && !/\d{4}|\d{1,2}[-/.月]\d{1,2}/.test(t);
  const v = normalizeDateTime(t, releaseAt ? dateOf(releaseAt) : undefined);
  if (v && timeOnly && releaseAt && toMinutes(v) <= toMinutes(releaseAt)) {
    return addDays(v, 1);
  }
  return v;
}

export const DELIMITER_LABEL: Record<string, string> = {
  "\t": "制表符",
  ",": "逗号",
  "，": "中文逗号",
  ";": "分号",
  "；": "中文分号",
  "|": "竖线",
  " ": "空格",
};

const CANDIDATE_DELIMITERS = ["\t", ",", "，", ";", "；", "|"];

function detectDelimiter(lines: string[]): string {
  let best = " ";
  let bestScore = 0;
  for (const d of CANDIDATE_DELIMITERS) {
    const counts = lines.map((l) => l.split(d).length).filter((c) => c >= 2);
    if (counts.length < Math.max(1, lines.length * 0.6)) continue;
    const sorted = [...counts].sort((a, b) => a - b);
    const mode = sorted[Math.floor(sorted.length / 2)];
    const score = counts.filter((c) => c === mode).length * 100 + mode;
    if (score > bestScore) {
      bestScore = score;
      best = d;
    }
  }
  return best;
}

/** 把「日期 时间」之间的空格换成 T，避免空格分隔的表把日期时间拆成两列 */
function glueDateTime(line: string): string {
  return line
    .replace(/(\d{4}[年\-/.]\d{1,2}[月\-/.]\d{1,2}日?)\s+(?=\d{1,2}\s*[:：时])/g, "$1T")
    .replace(/(^|[^\d\-/.])(\d{1,2}[月\-/.]\d{1,2}日?)\s+(?=\d{1,2}\s*[:：时])/g, "$1$2T");
}

const HEADER_ALIASES: Array<[keyof ParsedRecordFields, string[]]> = [
  ["ring", ["足环号", "足环", "环号", "ring"]],
  ["bloodline", ["血统", "品系", "血系", "bloodline"]],
  ["location", ["训放地点", "放飞地点", "司放地点", "司放地", "开笼地", "地点", "location"]],
  ["distanceKm", ["放飞距离", "空距", "距离", "distance"]],
  ["weather", ["天气", "weather"]],
  ["releaseAt", ["放飞时间", "放飞时刻", "开笼时间", "司放时间", "放飞日期", "release"]],
  ["arrivalAt", ["归巢时间", "归巢时刻", "归巢报时", "报时", "到达时间", "arrival"]],
  ["health", ["健康状态", "健康", "状态", "health"]],
];

function matchHeaderCell(cell: string): keyof ParsedRecordFields | null {
  const t = cell.trim().toLowerCase().replace(/[\s:：()（）]/g, "");
  if (!t) return null;
  for (const [field, aliases] of HEADER_ALIASES) {
    if (aliases.some((a) => t.includes(a))) return field;
  }
  return null;
}

const DEFAULT_ORDER: Array<keyof ParsedRecordFields> = [
  "ring",
  "bloodline",
  "location",
  "distanceKm",
  "weather",
  "releaseAt",
  "arrivalAt",
  "health",
];

function buildRow(
  cells: string[],
  raw: string,
  rowNo: number,
  map: Partial<Record<keyof ParsedRecordFields, number>>
): ParsedRow {
  const get = (f: keyof ParsedRecordFields): string => {
    const i = map[f];
    return i === undefined ? "" : (cells[i] ?? "").trim();
  };

  const errors: string[] = [];

  const ring = normalizeRing(get("ring"));
  if (!ring) errors.push("缺足环号");

  const distanceRaw = get("distanceKm");
  const distanceKm = parseDistance(distanceRaw);
  if (distanceRaw && !isEmptyMarker(distanceRaw) && distanceKm === null) {
    errors.push(`距离「${distanceRaw}」无法解析`);
  }

  const releaseRaw = get("releaseAt");
  const releaseAt = normalizeDateTime(releaseRaw);
  if (!releaseAt) {
    errors.push(releaseRaw && !isEmptyMarker(releaseRaw) ? `放飞时刻「${releaseRaw}」无法解析` : "缺放飞时刻");
  }

  const arrivalRaw = get("arrivalAt");
  const arrivalAt = normalizeArrival(arrivalRaw, releaseAt);
  if (arrivalRaw && !isEmptyMarker(arrivalRaw) && !isNotReturnedMarker(arrivalRaw) && arrivalAt === null) {
    errors.push(`归巢时刻「${arrivalRaw}」无法解析`);
  }

  const weatherRaw = get("weather");
  const weather = weatherRaw && !isEmptyMarker(weatherRaw) ? weatherRaw : null;

  const fields: ParsedRecordFields = {
    ring: ring || null,
    bloodline: get("bloodline"),
    location: get("location"),
    distanceKm,
    weather,
    releaseAt,
    arrivalAt,
    health: get("health") || null,
  };

  return { rowNo, raw, fields, errors, missing: missingFields(fields) };
}

export function parseTable(text: string): ParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) {
    return { rows: [], delimiter: "", headerFound: false, rowCount: 0 };
  }

  const glued = lines.map(glueDateTime);
  const delimiter = detectDelimiter(glued);
  const table = glued.map((l) =>
    delimiter === " " ? l.split(/\s+/) : l.split(delimiter).map((c) => c.trim())
  );

  // 表头探测：前几行里能认出 ≥2 个别名列且含足环列，就按表头映射；否则按默认列序
  let columnMap: Partial<Record<keyof ParsedRecordFields, number>> = {};
  let headerFound = false;
  let start = 0;
  for (let i = 0; i < Math.min(3, table.length); i++) {
    const map: Partial<Record<keyof ParsedRecordFields, number>> = {};
    let hits = 0;
    table[i].forEach((cell, idx) => {
      const field = matchHeaderCell(cell);
      if (field && map[field] === undefined) {
        map[field] = idx;
        hits++;
      }
    });
    if (hits >= 2 && map.ring !== undefined) {
      columnMap = map;
      headerFound = true;
      start = i + 1;
      break;
    }
  }
  if (!headerFound) {
    DEFAULT_ORDER.forEach((f, i) => {
      columnMap[f] = i;
    });
  }

  const rows = table.slice(start).map((cells, i) => buildRow(cells, lines[start + i], i + 1, columnMap));
  return { rows, delimiter, headerFound, rowCount: rows.length };
}
