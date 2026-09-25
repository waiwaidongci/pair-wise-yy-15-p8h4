import type { EditEntry } from "../lib/types";
import { fmtDateTime } from "../lib/format";

function rankText(rank: number | null): string {
  return rank == null ? "未入榜" : `#${rank}`;
}

/** 修订记录：每次改动的前后值与名次变化 */
export default function AuditTrail({ edits }: { edits: EditEntry[] }) {
  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>修订记录</p>
          <h2>改动前后留痕</h2>
        </div>
        <span className="badge neutral">{edits.length} 条</span>
      </div>
      {edits.length === 0 ? (
        <p className="empty">暂无修订：在排行榜改距离、天气或归巢报时后，会在此保留前后值与名次变化。</p>
      ) : (
        <div className="stack">
          {edits.map((e) => (
            <article className="audit-item" key={e.id}>
              <b className="mono">{e.ring}</b>
              <div>
                <p>{e.changes.map((c) => `${c.label} ${c.before} → ${c.after}`).join("；")}</p>
                <small>
                  {fmtDateTime(e.at)} · 名次 {rankText(e.rankBefore)} → {rankText(e.rankAfter)}
                </small>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
