import { useState } from "react";
import type { MergePlan, PlannedRow } from "../lib/types";
import { fmtDateTime, fmtKm, todayStr } from "../lib/format";
import { SAMPLE_PASTE } from "../lib/sample";

interface Props {
  onPreview: (text: string, defaultDate: string, source: string) => { plan: MergePlan | null; message: string };
  onConfirm: (plan: MergePlan) => void;
}

function DecisionBadge({ row }: { row: PlannedRow }) {
  switch (row.decision) {
    case "valid":
      return <span className="badge valid">有效 · 可写入</span>;
    case "pending":
      return <span className="badge pending">待补 · 缺{row.missing.join("、")}</span>;
    case "duplicate":
      return <span className="badge duplicate">重复 · 沿用{row.duplicateOf}</span>;
    default:
      return <span className="badge error">无法导入 · {row.parsed.errors.join("；")}</span>;
  }
}

/** 日志合并台：粘贴 → 解析预览 → 确认写入 */
export default function MergeConsole({ onPreview, onConfirm }: Props) {
  const [text, setText] = useState("");
  const [defaultDate, setDefaultDate] = useState(todayStr());
  const [source, setSource] = useState(`导入批次 ${todayStr().slice(5)}`);
  const [plan, setPlan] = useState<MergePlan | null>(null);
  const [message, setMessage] = useState("");

  const preview = () => {
    if (!text.trim()) {
      setPlan(null);
      setMessage("请先粘贴训放表内容");
      return;
    }
    const res = onPreview(text, defaultDate, source.trim() || "未命名批次");
    setPlan(res.plan);
    setMessage(res.message);
  };

  const confirm = () => {
    if (!plan) return;
    onConfirm(plan);
    setPlan(null);
    setText("");
    setMessage("");
  };

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>日志合并台</p>
          <h2>粘贴训放表 · 先预览再写入</h2>
        </div>
        <div className="heading-actions">
          <button onClick={() => setText(SAMPLE_PASTE)}>填入示例</button>
          <button className="primary" onClick={preview}>
            解析预览
          </button>
        </div>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={
          "粘贴鸽棚导出的训放表：制表符 / 逗号 / 竖线分隔均可，列顺序不限，可含表头；\n足环、放飞时刻、归巢报时对错行的，会按内容重新识别。"
        }
      />

      <div className="form-row">
        <label>
          <span>批次来源（重复行沿用首次来源）</span>
          <input value={source} onChange={(e) => setSource(e.target.value)} />
        </label>
        <label>
          <span>默认日期（只有时刻的单元格按此日计）</span>
          <input type="date" value={defaultDate} onChange={(e) => setDefaultDate(e.target.value)} />
        </label>
      </div>

      {message && <p className="form-message">{message}</p>}

      {plan && (
        <div className="preview">
          <div className="summary-chips">
            <span className="badge valid">有效 {plan.counts.valid}</span>
            <span className="badge pending">待补 {plan.counts.pending}</span>
            <span className="badge duplicate">重复 {plan.counts.duplicate}</span>
            <span className="badge error">无法识别 {plan.counts.error}</span>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>行</th>
                  <th>足环</th>
                  <th>放飞时刻</th>
                  <th>归巢报时</th>
                  <th>距离</th>
                  <th>天气</th>
                  <th>血统 / 地点</th>
                  <th>判定</th>
                </tr>
              </thead>
              <tbody>
                {plan.rows.map((row) => (
                  <tr key={row.parsed.lineNo} className={`row-${row.decision}`}>
                    <td>{row.parsed.lineNo}</td>
                    <td className="mono">{row.parsed.ring ?? "—"}</td>
                    <td className="mono">{fmtDateTime(row.parsed.releaseAt)}</td>
                    <td className="mono">{fmtDateTime(row.parsed.arrivalAt)}</td>
                    <td>{fmtKm(row.parsed.distanceKm)}</td>
                    <td>{row.parsed.weather || "—"}</td>
                    <td>{[row.parsed.bloodline, row.parsed.location].filter(Boolean).join(" · ") || "—"}</td>
                    <td>
                      <DecisionBadge row={row} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="heading-actions preview-actions">
            <button onClick={() => setPlan(null)}>取消</button>
            <button className="primary" onClick={confirm} disabled={plan.counts.valid + plan.counts.pending === 0}>
              确认写入（有效 {plan.counts.valid} + 待补 {plan.counts.pending}）
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
