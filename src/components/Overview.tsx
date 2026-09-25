import type { FlightRecord } from "../lib/types";
import type { OverviewStats } from "../lib/merge";

interface Props {
  stats: OverviewStats;
  unreturned: FlightRecord[];
}

/** 鸽棚总览：全部指标跟随当前记录实时推导 */
export function Overview({ stats, unreturned }: Props) {
  const cards = [
    { label: "在册羽数", value: String(stats.uniqueRings) },
    { label: "有效成绩", value: String(stats.validCount) },
    { label: "待补记录", value: String(stats.pendingCount) },
    { label: "归巢率", value: stats.returnRate === null ? "—" : `${stats.returnRate.toFixed(0)}%` },
    { label: "平均速度", value: stats.avgSpeed === null ? "—" : `${Math.round(stats.avgSpeed)} m/min` },
    { label: "未归巢", value: String(stats.unreturned), warn: stats.unreturned > 0 },
  ];

  return (
    <section>
      <div className="metrics">
        {cards.map((c) => (
          <article key={c.label} className={c.warn ? "warn" : ""}>
            <small>{c.label}</small>
            <strong>{c.value}</strong>
          </article>
        ))}
      </div>
      {unreturned.length > 0 && (
        <div className="alert-strip">
          ⚠ {unreturned.length} 羽未归巢：
          {unreturned
            .map((r) => `${r.ring}（${r.location || "未知地点"} ${r.releaseAt.slice(5)} 放飞）`)
            .join("、")}
        </div>
      )}
    </section>
  );
}
