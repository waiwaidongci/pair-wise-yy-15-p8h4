import { useState } from "react";
import type { FieldPatch } from "../lib/merge";
import type { PendingRow } from "../lib/types";
import { fmtDate, fmtDateTime } from "../lib/format";
import { parseDistanceCell, parseMoment } from "../lib/parse";

interface Props {
  pending: PendingRow[];
  onComplete: (id: string, patch: FieldPatch) => void;
  onMarkUnreturned: (id: string) => void;
  onRemove: (id: string) => void;
}

function PendingCard({
  row,
  onComplete,
  onMarkUnreturned,
  onRemove,
}: { row: PendingRow } & Omit<Props, "pending">) {
  const [distance, setDistance] = useState(row.distanceKm != null ? String(row.distanceKm) : "");
  const [weather, setWeather] = useState(row.weather);
  const [arrival, setArrival] = useState(row.arrivalAt != null ? fmtDateTime(row.arrivalAt) : "");
  const [error, setError] = useState("");

  const submit = () => {
    const patch: FieldPatch = {};
    if (distance.trim()) {
      const d = parseDistanceCell(distance).distance;
      if (d == null) {
        setError("距离无法识别");
        return;
      }
      patch.distanceKm = d;
    }
    if (weather.trim()) patch.weather = weather.trim();
    if (arrival.trim()) {
      const m = parseMoment(arrival, fmtDate(row.releaseAt));
      if (!m) {
        setError("归巢时刻无法识别，示例：2025-09-21 09:05");
        return;
      }
      patch.arrivalAt = m.timeOnly && m.ms <= row.releaseAt ? m.ms + 24 * 60 * 60 * 1000 : m.ms;
    }
    setError("");
    onComplete(row.id, patch);
  };

  return (
    <article className="pending-card">
      <div className="pending-head">
        <b className="mono">{row.ring}</b>
        <span className="badge pending">缺{row.missing.join("、")}</span>
      </div>
      <p className="pending-meta">
        放飞 {fmtDateTime(row.releaseAt)} · {row.location || "地点未知"} · {row.bloodline || "未知血统"} · 来源 {row.source}
      </p>
      <div className="edit-inputs">
        <label>
          <span>
            距离 km{row.distanceKm == null && <i className="req">缺</i>}
          </span>
          <input value={distance} placeholder="如 320" onChange={(e) => setDistance(e.target.value)} />
        </label>
        <label>
          <span>
            天气{!row.weather && <i className="req">缺</i>}
          </span>
          <input value={weather} placeholder="如 晴 / 侧风" onChange={(e) => setWeather(e.target.value)} />
        </label>
        <label>
          <span>
            归巢时刻{row.arrivalAt == null && <i className="req">缺</i>}
          </span>
          <input value={arrival} placeholder="如 2025-09-21 09:05" onChange={(e) => setArrival(e.target.value)} />
        </label>
      </div>
      {error && <p className="form-message error-text">{error}</p>}
      <div className="heading-actions">
        <button className="primary btn-sm" onClick={submit}>
          补全入库
        </button>
        <button className="btn-sm" onClick={() => onMarkUnreturned(row.id)}>
          确认未归巢
        </button>
        <button className="btn-sm btn-ghost" onClick={() => onRemove(row.id)}>
          移除
        </button>
      </div>
    </article>
  );
}

/** 待补区：缺距离/天气/归巢时刻的记录，不进排行 */
export default function PendingList({ pending, ...actions }: Props) {
  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>待补区</p>
          <h2>缺项记录（不进排行）</h2>
        </div>
        <span className="badge pending">{pending.length} 条</span>
      </div>
      {pending.length === 0 ? (
        <p className="empty">暂无待补记录。</p>
      ) : (
        <div className="stack">
          {pending.map((row) => (
            <PendingCard key={row.id} row={row} {...actions} />
          ))}
        </div>
      )}
    </section>
  );
}
