import { useState } from "react";
import type { BloodlineStat, RankEntry } from "../lib/merge";
import { distanceBand } from "../lib/merge";
import { fmtDateTime, fmtKm, fmtSpeed } from "../lib/format";

interface Props {
  stats: BloodlineStat[];
  ranking: RankEntry[];
}

const BANDS = ["全部", "短距离", "中距离", "长距离"];

/** 血统档案：按血统统计，并可按血统 + 距离档筛选历史成绩 */
export default function BloodlinePanel({ stats, ranking }: Props) {
  const [bloodline, setBloodline] = useState("全部");
  const [band, setBand] = useState("全部");

  const filtered = ranking.filter((e) => {
    const name = e.record.bloodline || "未知血统";
    if (bloodline !== "全部" && name !== bloodline) return false;
    if (band !== "全部" && distanceBand(e.record.distanceKm) !== band) return false;
    return true;
  });

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>血统档案</p>
          <h2>按血统与距离筛选历史成绩</h2>
        </div>
        {bloodline !== "全部" && (
          <button className="btn-sm" onClick={() => setBloodline("全部")}>
            清除血统筛选
          </button>
        )}
      </div>

      <div className="stat-cards">
        {stats.map((s) => (
          <button
            key={s.bloodline}
            className={`stat-card ${bloodline === s.bloodline ? "active" : ""}`}
            onClick={() => setBloodline(bloodline === s.bloodline ? "全部" : s.bloodline)}
          >
            <b>{s.bloodline}</b>
            <span>
              {s.total} 羽 · 归巢 {s.returned} · 未归巢 {s.unreturned}
            </span>
            <span>
              最佳 {fmtSpeed(s.bestSpeed)} · 平均 {fmtSpeed(s.avgSpeed)}
            </span>
          </button>
        ))}
        {stats.length === 0 && <p className="empty">暂无血统数据。</p>}
      </div>

      <div className="chips filter-chips">
        {BANDS.map((b) => (
          <button key={b} className={band === b ? "active" : ""} onClick={() => setBand(b)}>
            {b}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="empty">当前筛选下暂无成绩。</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>名次</th>
                <th>足环</th>
                <th>血统</th>
                <th>地点</th>
                <th>距离</th>
                <th>天气</th>
                <th>归巢</th>
                <th>均速</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.record.id}>
                  <td>#{e.rank}</td>
                  <td className="mono">{e.record.ring}</td>
                  <td>{e.record.bloodline || "未知血统"}</td>
                  <td>{e.record.location || "—"}</td>
                  <td>{fmtKm(e.record.distanceKm)}</td>
                  <td>{e.record.weather}</td>
                  <td className="mono">{fmtDateTime(e.record.arrivalAt)}</td>
                  <td className="mono">{fmtSpeed(e.speed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
