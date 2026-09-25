import type { BloodlineStat } from "../lib/merge";

interface Props {
  stats: BloodlineStat[];
  active: string | null;
  onSelect: (name: string | null) => void;
}

/** 血统档案：按血统汇总羽数、归巢与速度，点击卡片筛选排行 */
export function BloodlinePanel({ stats, active, onSelect }: Props) {
  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>血统档案</p>
          <h2>{stats.length} 个血统</h2>
        </div>
        {active && <button onClick={() => onSelect(null)}>清除筛选</button>}
      </div>
      <div className="blood-grid">
        {stats.map((s) => (
          <button
            key={s.name}
            className={`blood-card ${active === s.name ? "active" : ""}`}
            onClick={() => onSelect(active === s.name ? null : s.name)}
          >
            <h3>{s.name}</h3>
            <p>
              {s.pigeons} 羽 · {s.total} 次训放 · 归巢 {s.arrived}/{s.total}
            </p>
            <p>
              均速 {s.avgSpeed === null ? "—" : `${Math.round(s.avgSpeed)} m/min`} · 最佳{" "}
              {s.bestSpeed === null ? "—" : `${Math.round(s.bestSpeed)} m/min`}
            </p>
          </button>
        ))}
      </div>
      <p className="subtle">点击卡片可按血统筛选上方排行。</p>
    </section>
  );
}
