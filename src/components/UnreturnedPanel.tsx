import type { TrainingRecord } from "../lib/types";
import { fmtDateTime } from "../lib/format";

/** 未归巢提醒：跟着当前记录实时统计 */
export default function UnreturnedPanel({ records }: { records: TrainingRecord[] }) {
  const lost = records.filter((r) => !r.returned);
  const now = Date.now();
  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>未归巢提醒</p>
          <h2>未归巢 {lost.length} 羽</h2>
        </div>
      </div>
      {lost.length === 0 ? (
        <p className="empty">当前没有未归巢记录。</p>
      ) : (
        <div className="stack">
          {lost.map((r) => (
            <article className="lost-card" key={r.id}>
              <b className="mono">{r.ring}</b>
              <p>
                {r.bloodline || "未知血统"} · {r.location || "地点未知"} · 放飞 {fmtDateTime(r.releaseAt)} · 已逾{" "}
                {Math.max(0, Math.floor((now - r.releaseAt) / 86400000))} 天
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
