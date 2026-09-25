import type { EditHandler, FlightRecord } from "../lib/types";
import { FIELD_LABEL, missingFields } from "../lib/types";
import { EditFields } from "./EditFields";

interface Props {
  records: FlightRecord[];
  onEdit: EditHandler;
  onRemove: (id: string) => void;
  onSelectRing: (ring: string) => void;
}

/** 待补区：缺关键字段的记录留在这里，补齐后自动进排行 */
export function PendingList({ records, onEdit, onRemove, onSelectRing }: Props) {
  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>待补区</p>
          <h2>待补记录 {records.length} 行</h2>
        </div>
      </div>
      <p className="subtle">缺距离、天气或归巢时刻的记录留在这里，不进排行；补齐后自动入榜。</p>
      <div className="stack">
        {records.length === 0 && <p className="subtle">没有待补记录。</p>}
        {records.map((r) => {
          const missing = missingFields(r);
          return (
            <article className="pending-item" key={r.id}>
              <div className="pending-head">
                <button className="link-btn" onClick={() => onSelectRing(r.ring)}>
                  {r.ring}
                </button>
                <span className="subtle">
                  {r.releaseAt} · {r.location || "未知地点"} · 来源：{r.source}
                </span>
                <button className="danger" onClick={() => onRemove(r.id)}>
                  移除
                </button>
              </div>
              <div className="badges">
                {missing.map((m) => (
                  <span key={m} className="badge miss">
                    缺{FIELD_LABEL[m]}
                  </span>
                ))}
                {r.arrivalAt === null && <span className="badge err">未归巢</span>}
              </div>
              <EditFields record={r} fields={missing} onSave={(f, v) => onEdit(r.id, f, v)} />
            </article>
          );
        })}
      </div>
    </section>
  );
}
