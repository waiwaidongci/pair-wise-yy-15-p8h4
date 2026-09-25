import { useMemo } from "react";
import type { FlightRecord, RankedRecord } from "../lib/types";
import { missingFields } from "../lib/types";

interface Props {
  ring: string | null;
  records: FlightRecord[];
  ranking: RankedRecord[];
  onClose: () => void;
}

/** 单羽赛鸽档案：点击足环号查看该鸽全部训放记录 */
export function PigeonProfile({ ring, records, ranking, onClose }: Props) {
  const mine = useMemo(
    () =>
      ring
        ? records.filter((r) => r.ring === ring).sort((a, b) => b.releaseAt.localeCompare(a.releaseAt))
        : [],
    [ring, records]
  );

  if (!ring) {
    return (
      <section className="panel">
        <div className="heading">
          <div>
            <p>单羽档案</p>
            <h2>未选择赛鸽</h2>
          </div>
        </div>
        <p className="subtle">在排行或待补区点击足环号，查看单羽赛鸽的全部训放记录。</p>
      </section>
    );
  }

  const arrived = mine.filter((r) => r.arrivalAt !== null).length;
  const ranks = ranking.filter((x) => x.record.ring === ring);
  const best = ranks.length ? Math.min(...ranks.map((x) => x.rank)) : null;

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>单羽档案</p>
          <h2>{ring}</h2>
        </div>
        <button onClick={onClose}>关闭</button>
      </div>
      <p className="subtle">
        {mine[0]?.bloodline || "未标注血统"} · 出场 {mine.length} 次 · 归巢 {arrived} 次 · 最佳名次{" "}
        {best === null ? "—" : `第${best}名`}
      </p>
      <div className="sheet-wrap">
        <table className="sheet">
          <thead>
            <tr>
              <th>放飞时刻</th>
              <th>地点</th>
              <th>距离</th>
              <th>天气</th>
              <th>归巢</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {mine.map((r) => (
              <tr key={r.id}>
                <td>{r.releaseAt}</td>
                <td>{r.location || "—"}</td>
                <td>{r.distanceKm === null ? "—" : `${r.distanceKm}km`}</td>
                <td>{r.weather ?? "—"}</td>
                <td>{r.arrivalAt ?? "未归"}</td>
                <td>
                  {missingFields(r).length === 0 ? (
                    <span className="badge ok">有效</span>
                  ) : (
                    <span className="badge warn">待补</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
