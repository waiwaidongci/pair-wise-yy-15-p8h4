import type { AuditEntry } from "../lib/types";
import { FIELD_LABEL } from "../lib/types";

const rankText = (r: number | null) => (r === null ? "未入榜" : `第${r}名`);

/** 修改留痕：距离/天气/报时的前后值与名次变化 */
export function AuditLog({ entries }: { entries: AuditEntry[] }) {
  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>修改留痕</p>
          <h2>前后对照 {entries.length} 条</h2>
        </div>
      </div>
      <div className="stack">
        {entries.length === 0 && (
          <p className="subtle">还没有修改记录。改动距离、天气或报时会在这里留下前后值与名次变化。</p>
        )}
        {entries.map((e) => (
          <article className="audit-item" key={e.id}>
            <div>
              <b>{e.ring}</b> · {FIELD_LABEL[e.field]}：<s>{e.before}</s> → <b>{e.after}</b>
            </div>
            <div className="subtle">
              排行 {rankText(e.rankBefore)} → {rankText(e.rankAfter)} ·{" "}
              {new Date(e.at).toLocaleString("zh-CN", { hour12: false })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
