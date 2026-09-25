import type { TrainingRecord } from "./types";

function at(s: string): number {
  return new Date(s.replace(" ", "T") + ":00").getTime();
}

/** 初始台账：已确认的有效记录 */
export const SEED_RECORDS: TrainingRecord[] = [
  {
    id: "seed-1",
    ring: "CHN-24-001839",
    bloodline: "詹森系",
    location: "石家庄",
    distanceKm: 320,
    weather: "晴",
    releaseAt: at("2025-09-20 06:30"),
    arrivalAt: at("2025-09-20 10:45"),
    returned: true,
    source: "初始台账",
    createdAt: at("2025-09-20 12:00"),
  },
  {
    id: "seed-2",
    ring: "CHN-24-002114",
    bloodline: "凡龙系",
    location: "保定",
    distanceKm: 118,
    weather: "阴",
    releaseAt: at("2025-09-20 06:30"),
    arrivalAt: at("2025-09-20 08:03"),
    returned: true,
    source: "初始台账",
    createdAt: at("2025-09-20 12:00"),
  },
  {
    id: "seed-3",
    ring: "CHN-23-008771",
    bloodline: "慕利门系",
    location: "衡水",
    distanceKm: 150,
    weather: "多云",
    releaseAt: at("2025-09-20 06:30"),
    arrivalAt: null,
    returned: false,
    source: "初始台账",
    createdAt: at("2025-09-20 12:00"),
  },
  {
    id: "seed-4",
    ring: "CHN-24-005566",
    bloodline: "詹森系",
    location: "石家庄",
    distanceKm: 320,
    weather: "晴",
    releaseAt: at("2025-09-20 06:30"),
    arrivalAt: at("2025-09-20 11:20"),
    returned: true,
    source: "初始台账",
    createdAt: at("2025-09-20 12:00"),
  },
  {
    id: "seed-5",
    ring: "CHN-22-010203",
    bloodline: "凡龙系",
    location: "德州",
    distanceKm: 210,
    weather: "侧风",
    releaseAt: at("2025-09-20 06:30"),
    arrivalAt: at("2025-09-20 09:30"),
    returned: true,
    source: "初始台账",
    createdAt: at("2025-09-20 12:00"),
  },
];

/**
 * 示例粘贴：混合表头/无表头、制表符/逗号分隔、列序错乱、
 * 距离天气同格、缺项、错行、与台账重复、批内重复。
 */
export const SAMPLE_PASTE = [
  "足环号\t血统\t训放地点\t距离\t天气\t放飞时间\t归巢时间",
  "CHN-24-003300\t詹森系\t石家庄\t320\t晴\t2025-09-21 06:00\t2025-09-21 10:02",
  "CHN-24-001839\t詹森系\t石家庄\t320\t晴\t2025-09-20 06:30\t2025-09-20 10:45",
  "2025-09-21 06:00,CHN-24-002114,118km，阴,保定,凡龙系,2025-09-21 07:58",
  "CHN-23-008771\t慕利门系\t衡水\t150\t\t2025-09-21 06:00\t",
  "CHN-24-007777,电脑戈马力,09-22 06:15,09-22 09:40,210,晴,德州",
  "错行记录：无足环\t詹森系\t石家庄\t320\t晴\t2025-09-21 06:00\t2025-09-21 11:00",
  "CHN-24-003300\t詹森系\t石家庄\t320\t晴\t2025-09-21 06:00\t2025-09-21 10:02",
].join("\n");
