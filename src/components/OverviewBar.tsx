import type { OverviewStats } from "../lib/merge";
import { fmtSpeed } from "../lib/format";

interface Props {
  stats: OverviewStats;
  pendingCount: number;
}

/** 鸽棚总览：跟着当前有效记录实时计算 */
export default function OverviewBar({ stats, pendingCount }: Props) {
  const cards = [
    { label: "在册记录", value: String(stats.total), tone: "" },
    { label: "归巢率", value: stats.returnRate == null ? "—" : `${stats.returnRate.toFixed(0)}%`, tone: "" },
    { label: "平均速度", value: fmtSpeed(stats.avgSpeed), tone: "" },
    { label: "未归巢", value: String(stats.unreturned), tone: "accent" },
    { label: "血统档案", value: `${stats.bloodlineCount} 系`, tone: "" },
    { label: "待补记录", value: String(pendingCount), tone: "warn" },
  ];
  return (
    <section className="metrics">
      {cards.map((c) => (
        <article key={c.label} className={c.tone}>
          <small>{c.label}</small>
          <strong>{c.value}</strong>
        </article>
      ))}
    </section>
  );
}
