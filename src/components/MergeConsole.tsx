import { useMemo, useState } from "react";
import type { FlightRecord, MergePlanItem, ParsedRow, ParseResult } from "../lib/types";
import { FIELD_LABEL } from "../lib/types";
import { DELIMITER_LABEL, parseTable } from "../lib/parser";
import { buildMergePlan, planSummary } from "../lib/merge";
import { SAMPLE_PASTE } from "../lib/seed";

interface Props {
  existing: FlightRecord[];
  onConfirm: (rows: ParsedRow[], source: string) => void;
}

/** 日志合并台：粘贴 → 解析预览 → 确认写入 */
export function MergeConsole({ existing, onConfirm }: Props) {
  const [text, setText] = useState("");
  const [source, setSource] = useState("");
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const batchLabel = source.trim() || "未命名批次";
  const plan = useMemo(
    () => (parsed ? buildMergePlan(parsed.rows, existing, batchLabel) : null),
    [parsed, existing, batchLabel]
  );
  const summary = useMemo(() => (plan ? planSummary(plan) : null), [plan]);
  const writable = summary ? summary.valid + summary.pending : 0;

  const handleParse = () => {
    setDone(null);
    setParsed(parseTable(text));
  };

  const handleConfirm = () => {
    if (!parsed || !summary || writable === 0) return;
    onConfirm(parsed.rows, batchLabel);
    setDone(
      `已写入 ${writable} 行（有效 ${summary.valid} · 待补 ${summary.pending}）；` +
        `跳过重复 ${summary.duplicate} 行、无法解析 ${summary.error} 行`
    );
    setText("");
    setParsed(null);
    setSource("");
  };

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>日志合并台</p>
          <h2>粘贴训放表 → 预览 → 确认写入</h2>
        </div>
        <button
          onClick={() => {
            setText(SAMPLE_PASTE);
            setParsed(null);
            setDone(null);
          }}
        >
          填入示例
        </button>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={
          "把鸽棚导出的训放表粘贴到这里：支持制表符 / 逗号 / 空格分隔，表头顺序不限（足环、环号、司放地、空距、开笼时间、归巢报时……都能认）；\n" +
          "日期可写 2026-09-20 06:30、2026/9/20 6:30、2026年9月20日 6时30分；归巢报时可只写时刻（默认当天，早于放飞按次日）。"
        }
      />

      <div className="merge-bar">
        <input
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="来源标签，如：鸽棚A 9月导出"
        />
        <button className="primary" onClick={handleParse} disabled={!text.trim()}>
          解析预览
        </button>
        {parsed && (
          <>
            <button className="primary" onClick={handleConfirm} disabled={writable === 0}>
              确认写入 {writable} 行
            </button>
            <button onClick={() => setParsed(null)}>放弃预览</button>
          </>
        )}
      </div>

      {done && <p className="notice">{done}</p>}

      {parsed && summary && plan && (
        <>
          <p className="subtle">
            识别 {parsed.rowCount} 行 · {DELIMITER_LABEL[parsed.delimiter] ?? "空格"}分隔 ·{" "}
            {parsed.headerFound ? "含表头" : "无表头（按默认列序）"}； 有效 {summary.valid} · 待补{" "}
            {summary.pending} · 重复 {summary.duplicate} · 无法解析 {summary.error}
            。重复与错误行不会写入，重复行沿用首次来源。
          </p>
          {parsed.rowCount > 0 && (
            <div className="sheet-wrap">
              <table className="sheet">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>足环号</th>
                    <th>血统</th>
                    <th>地点</th>
                    <th>距离</th>
                    <th>天气</th>
                    <th>放飞时刻</th>
                    <th>归巢时刻</th>
                    <th>判定</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.map((item) => (
                    <PlanRow key={item.row.rowNo} item={item} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function PlanRow({ item }: { item: MergePlanItem }) {
  const f = item.row.fields;
  return (
    <tr>
      <td>{item.row.rowNo}</td>
      <td>{f.ring ?? "—"}</td>
      <td>{f.bloodline || "—"}</td>
      <td>{f.location || "—"}</td>
      <td>{f.distanceKm === null ? "—" : `${f.distanceKm}km`}</td>
      <td>{f.weather ?? "—"}</td>
      <td>{f.releaseAt ?? "—"}</td>
      <td>{f.arrivalAt ?? "未归"}</td>
      <td>
        {item.kind === "error" && (
          <>
            <span className="badge err">无法解析</span>{" "}
            <span className="subtle">{item.row.errors.join("；")}</span>
          </>
        )}
        {item.kind === "duplicate" && (
          <>
            <span className="badge dup">重复 · 沿用首次来源</span>{" "}
            <span className="subtle">首次来源：{item.keptSource}</span>
          </>
        )}
        {item.kind === "new" && item.status === "valid" && <span className="badge ok">新增 · 有效</span>}
        {item.kind === "new" && item.status === "pending" && (
          <>
            <span className="badge warn">新增 · 待补</span>{" "}
            <span className="subtle">缺：{item.row.missing.map((m) => FIELD_LABEL[m]).join("、")}</span>
          </>
        )}
      </td>
    </tr>
  );
}
