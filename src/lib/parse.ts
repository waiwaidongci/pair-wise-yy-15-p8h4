import type { ParsedRow } from "./types";

/**
 * 表格解析层：把格式不一的粘贴文本解析成结构化行。
 * 只做解析，不做合并判断，也不碰界面状态。
 */

export interface ParseOptions {
  /** YYYY-MM-DD，只有时刻没有日期的单元格按此日计 */
  defaultDate: string;
}

export interface ParseResult {
  rows: ParsedRow[];
  delimiter: string;
  headerFound: boolean;
}

export interface ParsedMoment {
  ms: number;
  timeOnly: boolean; // 只填了时刻（如 "09:40"）
}

type Role = "ring" | "bloodline" | "location" | "distance" | "weather" | "releaseAt" | "arrivalAt";

const DELIMITERS = ["\t", "|", ",", "，", ";", "；"];
const WEATHER_WORDS = ["晴", "阴", "雨", "雪", "雾", "霾", "风", "云", "雷"];
const BLOODLINE_WORDS = ["系", "血", "詹森", "凡龙", "慕利门", "杨阿腾", "电脑", "戈马力", "胡本", "李鸟", "种"];

const RING_PATTERNS = [
  /^[A-Za-z]{0,4}[-\s]?\d{2,4}([-\s]\d{1,2})?[-\s]\d{3,7}$/, // CHN-24-001839 / 2024-01-001839 / 24-001839
  /^[A-Za-z]{0,4}[-\s]?\d{6,8}$/, // 001839 / CHN001839
];

const HEADER_ALIASES: [Role, string[]][] = [
  ["ring", ["足环", "环号", "鸽环", "ring", "band"]],
  ["releaseAt", ["放飞时间", "放飞时刻", "开笼", "司放时间", "release"]],
  ["arrivalAt", ["归巢", "报到", "报时", "到达", "还巢", "arrival", "return"]],
  ["distance", ["距离", "空距", "公里", "里程", "distance"]],
  ["weather", ["天气", "气象", "weather"]],
  ["bloodline", ["血统", "品系", "血系", "bloodline", "strain"]],
  ["location", ["地点", "训放地", "司放地", "放飞地", "站点", "location", "site"]],
];

export function looksLikeWeather(s: string): boolean {
  const t = s.trim();
  return t.length > 0 && t.length <= 12 && WEATHER_WORDS.some((w) => t.includes(w));
}

export function looksLikeBloodline(s: string): boolean {
  return BLOODLINE_WORDS.some((w) => s.includes(w));
}

/** 解析各种写法的日期时刻；只有时刻的按 defaultDate 计 */
export function parseMoment(s: string, defaultDate: string): ParsedMoment | null {
  const t = s
    .trim()
    .replace(/[年月]/g, "-")
    .replace(/日/g, " ")
    .replace(/[/.]/g, "-")
    .replace(/T/i, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return null;
  const [defY, defM, defD] = defaultDate.split("-").map(Number);
  const make = (y: number, mo: number, d: number, h: number, mi: number, timeOnly: boolean): ParsedMoment | null => {
    if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 24 || mi > 59) return null;
    const dt = new Date(y, mo - 1, d, h, mi, 0, 0);
    if (dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
    return { ms: dt.getTime(), timeOnly };
  };
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2}) (\d{1,2}):(\d{2})(?::\d{1,2})?$/);
  if (m) return make(+m[1], +m[2], +m[3], +m[4], +m[5], false);
  m = t.match(/^(\d{1,2})-(\d{1,2}) (\d{1,2}):(\d{2})(?::\d{1,2})?$/);
  if (m) return make(defY, +m[1], +m[2], +m[3], +m[4], false);
  m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (m) return make(defY, defM, defD, +m[1], +m[2], true);
  return null;
}

/** 提取单元格里的距离（可带单位，可与天气同格，如 "118km，阴"） */
export function parseDistanceCell(s: string): { distance: number | null; rest: string } {
  const t = s.trim();
  if (t.includes(":")) return { distance: null, rest: t }; // 时刻不是距离
  const m = t.match(/^(\d+(?:\.\d+)?)\s*(?:km|公里|千米)?/i);
  if (!m) return { distance: null, rest: t };
  const value = Number(m[1]);
  const rest = t
    .slice(m[0].length)
    .replace(/^[\s,，、:：-]+/, "")
    .trim();
  if (value > 0 && value <= 2000) return { distance: value, rest };
  return { distance: null, rest: t };
}

export function looksLikeDistance(s: string): boolean {
  const t = s.trim();
  if (!/^[\d.]+\s*(km|公里|千米)?$/i.test(t)) return false;
  return parseDistanceCell(t).distance != null;
}

export function looksLikeRing(s: string, defaultDate: string): boolean {
  const t = s.trim();
  if (!t || t.length > 20) return false;
  if (parseMoment(t, defaultDate)) return false;
  if (looksLikeDistance(t)) return false;
  if (looksLikeWeather(t)) return false;
  return RING_PATTERNS.some((re) => re.test(t));
}

function matchHeader(cell: string): Role | null {
  const t = cell.trim().toLowerCase().replace(/[\s:：]/g, "");
  if (!t) return null;
  for (const [role, aliases] of HEADER_ALIASES) {
    if (aliases.some((a) => t.includes(a))) return role;
  }
  return null;
}

function splitLine(line: string, delimiter: string | null): string[] {
  if (!delimiter) return [line.trim()];
  return line.split(delimiter).map((c) => c.trim());
}

function bestDelimiter(lines: string[]): string | null {
  let best: string | null = null;
  let bestScore = 0;
  for (const d of DELIMITERS) {
    const score = lines.reduce((acc, l) => acc + (l.split(d).length - 1), 0);
    if (score > bestScore) {
      best = d;
      bestScore = score;
    }
  }
  return bestScore > 0 ? best : null;
}

interface SplitRow {
  cells: string[];
  delim: string | null;
}

/** 全局分隔符切不动的行，逐个尝试其它分隔符（混合格式粘贴） */
function splitRow(line: string, global: string | null): SplitRow {
  let cells = splitLine(line, global);
  let delim = global;
  if (cells.length <= 1) {
    for (const d of DELIMITERS) {
      const alt = splitLine(line, d);
      if (alt.length > cells.length) {
        cells = alt;
        delim = d;
      }
    }
    const spaced = line.split(/\s{2,}/).map((c) => c.trim());
    if (spaced.length > cells.length) {
      cells = spaced;
      delim = " ";
    }
  }
  return { cells, delim };
}

interface RowParts {
  ring: string | null;
  bloodline: string;
  location: string;
  distanceKm: number | null;
  weather: string;
  release: ParsedMoment | null;
  arrival: ParsedMoment | null;
  errors: string[];
}

function buildRow(lineNo: number, raw: string, parts: RowParts): ParsedRow {
  const errors = [...parts.errors];
  const releaseAt = parts.release ? parts.release.ms : null;
  let arrivalAt = parts.arrival ? parts.arrival.ms : null;
  // 只填了时刻且早于放飞：按次日归巢计
  if (arrivalAt != null && releaseAt != null && parts.arrival?.timeOnly && arrivalAt <= releaseAt) {
    arrivalAt += 24 * 60 * 60 * 1000;
  }
  if (!parts.ring) errors.push("足环缺失或无法识别（可能错行）");
  if (releaseAt == null) errors.push("放飞时刻缺失或无法识别");
  if (arrivalAt != null && releaseAt != null && arrivalAt <= releaseAt) {
    errors.push("归巢时刻早于放飞时刻");
  }
  return {
    lineNo,
    raw,
    ring: parts.ring,
    bloodline: parts.bloodline,
    location: parts.location,
    distanceKm: parts.distanceKm,
    weather: parts.weather,
    releaseAt,
    arrivalAt,
    errors,
  };
}

/** 有表头且列数、分隔符与表头一致：按表头角色取列 */
function mapByHeader(lineNo: number, raw: string, cells: string[], roles: (Role | null)[], options: ParseOptions): ParsedRow {
  const cellOf = (role: Role): string => {
    const idx = roles.indexOf(role);
    return idx >= 0 ? (cells[idx] ?? "").trim() : "";
  };
  const errors: string[] = [];

  const ringRaw = cellOf("ring");
  let ring: string | null = null;
  if (ringRaw && !parseMoment(ringRaw, options.defaultDate) && (ringRaw.match(/\d/g) ?? []).length >= 4) {
    ring = ringRaw;
  }

  const relRaw = cellOf("releaseAt");
  const release = relRaw ? parseMoment(relRaw, options.defaultDate) : null;

  const arrRaw = cellOf("arrivalAt");
  let arrival: ParsedMoment | null = null;
  if (arrRaw) {
    arrival = parseMoment(arrRaw, options.defaultDate);
    if (!arrival) errors.push(`归巢时刻无法识别：${arrRaw}`);
  }

  let weather = cellOf("weather");
  const distRaw = cellOf("distance");
  let distanceKm: number | null = null;
  if (distRaw) {
    const { distance, rest } = parseDistanceCell(distRaw);
    if (distance != null) {
      distanceKm = distance;
      if (!weather && rest && looksLikeWeather(rest)) weather = rest;
    } else if (looksLikeWeather(distRaw) && !weather) {
      weather = distRaw; // 距离栏错填了天气
    } else {
      errors.push(`距离无法识别：${distRaw}`);
    }
  }

  return buildRow(lineNo, raw, {
    ring,
    bloodline: cellOf("bloodline"),
    location: cellOf("location"),
    distanceKm,
    weather,
    release,
    arrival,
    errors,
  });
}

/** 无表头（或列对不上）：按内容逐格推断，容错对错行 */
function inferRow(lineNo: number, raw: string, cells: string[], options: ParseOptions): ParsedRow {
  const trimmed = cells.map((c) => c.trim());
  const used = new Set<number>();
  const isFree = (i: number) => !used.has(i) && trimmed[i].length > 0;

  // 1) 时刻列先占位，避免被误判成足环
  const moments: ParsedMoment[] = [];
  trimmed.forEach((c, i) => {
    if (!c || moments.length >= 2) return;
    const m = parseMoment(c, options.defaultDate);
    if (m) {
      moments.push(m);
      used.add(i);
    }
  });

  // 2) 足环
  let ring: string | null = null;
  let ringIdx = trimmed.findIndex((c, i) => isFree(i) && looksLikeRing(c, options.defaultDate));
  if (ringIdx < 0) {
    // 兜底：包含 6 位以上数字且不是距离的格子
    ringIdx = trimmed.findIndex((c, i) => {
      if (!isFree(i)) return false;
      const digits = (c.match(/\d/g) ?? []).length;
      return digits >= 6 && parseDistanceCell(c).distance == null;
    });
  }
  if (ringIdx >= 0) {
    ring = trimmed[ringIdx];
    used.add(ringIdx);
  }

  // 3) 距离（可与天气同格）
  let distanceKm: number | null = null;
  let weather = "";
  const loose: string[] = [];
  for (let i = 0; i < trimmed.length; i += 1) {
    if (!isFree(i)) continue;
    const { distance, rest } = parseDistanceCell(trimmed[i]);
    if (distance != null) {
      distanceKm = distance;
      used.add(i);
      if (rest) {
        if (looksLikeWeather(rest)) weather = rest;
        else loose.push(rest);
      }
      break;
    }
  }

  // 4) 天气
  if (!weather) {
    const wIdx = trimmed.findIndex((c, i) => isFree(i) && looksLikeWeather(c));
    if (wIdx >= 0) {
      weather = trimmed[wIdx];
      used.add(wIdx);
    }
  }

  // 5) 血统 / 地点：剩余文本
  const pool = trimmed.filter((_, i) => isFree(i)).concat(loose);
  let bloodline = "";
  let location = "";
  const bIdx = pool.findIndex(looksLikeBloodline);
  if (bIdx >= 0) {
    bloodline = pool.splice(bIdx, 1)[0];
    location = pool.join(" ");
  } else if (pool.length >= 2) {
    bloodline = pool[0];
    location = pool.slice(1).join(" ");
  } else {
    location = pool.join(" ");
  }

  return buildRow(lineNo, raw, {
    ring,
    bloodline,
    location,
    distanceKm,
    weather,
    release: moments[0] ?? null,
    arrival: moments[1] ?? null,
    errors: [],
  });
}

function delimiterName(d: string | null): string {
  if (d === "\t") return "制表符";
  if (d === " ") return "空格";
  return d ?? "单栏";
}

export function parseTable(text: string, options: ParseOptions): ParseResult {
  const entries = text
    .split(/\r?\n/)
    .map((raw, i) => ({ raw: raw.trim(), lineNo: i + 1 }))
    .filter((e) => e.raw.length > 0);

  if (entries.length === 0) return { rows: [], delimiter: "-", headerFound: false };

  const delimiter = bestDelimiter(entries.map((e) => e.raw));
  const table = entries.map((e) => ({ ...e, ...splitRow(e.raw, delimiter) }));

  let roles: (Role | null)[] = [];
  let headerFound = false;
  let headerDelim: string | null = null;
  let dataRows = table;
  const first = table[0];
  if (first) {
    roles = first.cells.map(matchHeader);
    if (roles.filter(Boolean).length >= 2) {
      headerFound = true;
      headerDelim = first.delim;
      dataRows = table.slice(1);
    }
  }

  const rows = dataRows.map((row) =>
    headerFound && row.delim === headerDelim && row.cells.length === roles.length
      ? mapByHeader(row.lineNo, row.raw, row.cells, roles, options)
      : inferRow(row.lineNo, row.raw, row.cells, options)
  );

  return { rows, delimiter: delimiterName(delimiter), headerFound };
}
