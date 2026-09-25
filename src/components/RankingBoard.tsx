import { useState } from "react";
import type { FieldPatch, RankEntry } from "../lib/merge";
import { fmtDate, fmtDateTime, fmtKm, fmtSpeed } from "../lib/format";
import { parseDistanceCell, parseMoment } from "../lib/parse";

interface Props {
  ranking: RankEntry[];
  onEdit: (recordId: string, patch: FieldPatch) => string | null;
}

function RowEditor({
  entry,
  onSave,
  onCancel,
}: {
  entry: RankEntry;
  onSave: (patch: FieldPatch) => string | null;
  onCancel: () => void;
}) {
  const { record } = entry;
  const [distance, setDistance] = useState(record.distanceKm != null ? String(record.distanceKm) : "");
  const [weather, setWeather] = useState(record.weather);
  const [arrival, setArrival] = useState(fmtDateTime(record.arrivalAt));
  const [error, setError] = useState("");

  const save = () => {
    const dist = parseDistanceCell(distance).distance;
    if (dist == null) {
      setError("距离无法识别");
      return;
    }
    const moment = parseMoment(arrival, fmtDate(record.releaseAt));
    if (!moment) {
      setError("归巢时刻无法识别，示例：2025-09-20 10:45");
      return;
    }
    let arrivalAt = moment.ms;
    if (moment.timeOnly && arrivalAt <= record.releaseAt) arrivalAt += 24 * 60 * 60 * 1000;
    const err = onSave({ distanceKm: dist, weather, arrivalAt });
    if (err) setError(err);
  };

  return (
    <tr className="editing">
      <td>#{entry.rank}</td>
      <td className="mono">{record.ring}</td>
      <td colSpan={6}>
        <div className="edit-inputs">
          <label>
            <span>距离 km</span>
            <input value={distance} onChange={(e) => setDistance(e.target.value)} />
          </label>
          <label>
            <span>天气</span>
            <input value={weather} onChange={(e) => setWeather(e.target.value)} />
          </label>
          <label>
            <span>归巢时刻</span>
            <input value={arrival} onChange={(e) => setArrival(e.target.value)} />
          </label>
        </div>
        {error && <p className="form-message error-text">{error}</p>}
      </td>
      <td className="mono">{fmtSpeed(entry.speed)}</td>
      <td>
        <div className="heading-actions">
          <button className="primary btn-sm" onClick={save}>
            保存
          </button>
          <button className="btn-sm" onClick={onCancel}>
            取消
          </button>
        </div>
      </td>
    </tr>
  );
}

/** 成绩排行：只含有效记录；改距离/天气/报时会重算并留痕 */
export default function RankingBoard({ ranking, onEdit }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>训放成绩排行</p>
          <h2>排行榜（按均速）</h2>
        </div>
        <span className="badge neutral">{ranking.length} 条入榜</span>
      </div>
      {ranking.length === 0 ? (
        <p className="empty">暂无可排行记录：缺距离、天气或归巢时刻的记录在待补区，补齐后自动入榜。</p>
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
                <th>放飞</th>
                <th>归巢</th>
                <th>均速</th>
                <th>改数</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((entry) =>
                editingId === entry.record.id ? (
                  <RowEditor
                    key={entry.record.id}
                    entry={entry}
                    onCancel={() => setEditingId(null)}
                    onSave={(patch) => {
                      const err = onEdit(entry.record.id, patch);
                      if (!err) setEditingId(null);
                      return err;
                    }}
                  />
                ) : (
                  <tr key={entry.record.id}>
                    <td>
                      <span className={`rank-badge r${entry.rank}`}>{entry.rank}</span>
                    </td>
                    <td className="mono">{entry.record.ring}</td>
                    <td>{entry.record.bloodline || "未知血统"}</td>
                    <td>{entry.record.location || "—"}</td>
                    <td>{fmtKm(entry.record.distanceKm)}</td>
                    <td>{entry.record.weather}</td>
                    <td className="mono">{fmtDateTime(entry.record.releaseAt)}</td>
                    <td className="mono">{fmtDateTime(entry.record.arrivalAt)}</td>
                    <td className="mono">{fmtSpeed(entry.speed)}</td>
                    <td>
                      <button className="btn-sm" onClick={() => setEditingId(entry.record.id)}>
                        改数
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
      <p className="hint">改动距离、天气或归巢报时会立即重算排行，并在“修订记录”保留前后值与名次变化。</p>
    </section>
  );
}
