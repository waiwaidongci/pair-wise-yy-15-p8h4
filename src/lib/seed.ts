// 示例数据与一段「格式不一」的示例粘贴文本（制表符分隔、中文日期、含重复/缺项/错误行）

import type { FlightRecord } from "./types";

let n = 0;
const rid = () => `seed-${++n}`;

interface SeedInput extends Partial<FlightRecord> {
  ring: string;
  releaseAt: string;
}

const rec = (r: SeedInput): FlightRecord => ({
  id: rid(),
  bloodline: "",
  location: "",
  distanceKm: null,
  weather: null,
  arrivalAt: null,
  health: null,
  source: "鸽棚导出A",
  createdAt: 0,
  ...r,
});

export function seedRecords(): FlightRecord[] {
  n = 0;
  return [
    rec({ ring: "CHN-24-001839", bloodline: "詹森系", location: "徐州站", distanceKm: 80, weather: "晴", releaseAt: "2026-09-12 06:30", arrivalAt: "2026-09-12 07:38", health: "健康" }),
    rec({ ring: "CHN-23-008771", bloodline: "慕利门系", location: "徐州站", distanceKm: 80, weather: "晴", releaseAt: "2026-09-12 06:30", arrivalAt: "2026-09-12 07:31", health: "健康" }),
    rec({ ring: "CHN-23-009452", bloodline: "胡本系", location: "徐州站", distanceKm: 80, weather: "晴", releaseAt: "2026-09-12 06:30", arrivalAt: "2026-09-12 07:45", health: "健康" }),
    rec({ ring: "CHN-24-002114", bloodline: "凡龙系", location: "商丘站", distanceKm: 120, weather: "侧风", releaseAt: "2026-09-13 06:00", arrivalAt: "2026-09-13 07:52", health: "健康", source: "教练手录" }),
    rec({ ring: "CHN-24-003306", bloodline: "詹森系", location: "蚌埠站", distanceKm: 200, weather: "多云", releaseAt: "2026-09-19 06:00", arrivalAt: "2026-09-19 09:12", health: "健康", source: "鸽棚导出B" }),
    rec({ ring: "CHN-24-004517", bloodline: "凡龙系", location: "蚌埠站", distanceKm: 200, weather: "多云", releaseAt: "2026-09-19 06:00", health: "未知", source: "鸽棚导出B" }),
    rec({ ring: "CHN-24-005588", bloodline: "慕利门系", location: "蚌埠站", weather: "多云", releaseAt: "2026-09-19 06:00", arrivalAt: "2026-09-19 08:50", health: "健康", source: "教练手录" }),
    rec({ ring: "CHN-24-006120", bloodline: "胡本系", location: "南京站", distanceKm: 320, releaseAt: "2026-09-20 05:50", arrivalAt: "2026-09-20 11:20", health: "健康", source: "鸽棚导出B" }),
  ];
}

export const SAMPLE_PASTE = [
  ["环号", "品系", "司放地", "空距", "天气", "开笼时间", "归巢报时"].join("\t"),
  ["CHN-24-001839", "詹森系", "徐州站", "80km", "晴", "2026年9月12日 6时30分", "2026年9月12日 7时38分"].join("\t"),
  ["CHN-24-007733", "詹森系", "南京站", "320", "晴转多云", "2026/09/20 05:50", "11:02"].join("\t"),
  ["CHN-24-008801", "凡龙系", "南京站", "320km", "", "2026-09-20 05:50", "11:40"].join("\t"),
  ["CHN-24-009256", "胡本系", "合肥站", "420", "阴", "2026-09-21 06:10", "未归"].join("\t"),
  ["CHN-25-000077", "慕利门系", "徐州站", "abc", "晴", "2026-09-12 06:30", "07:41"].join("\t"),
  ["CHN-24-009300", "凡龙系", "石家庄站", "500", "晴", "2026-09-21 06:00", "05:48"].join("\t"),
].join("\n");
