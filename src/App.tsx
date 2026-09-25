import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import type { LoftState, MergePlan } from "./lib/types";
import { SEED_RECORDS } from "./lib/sample";
import {
  applyEdit,
  applyMerge,
  bloodlineStats,
  completePending,
  computeRanking,
  markUnreturned,
  overviewStats,
  planMerge,
  removePending,
  type FieldPatch,
} from "./lib/merge";
import { parseTable } from "./lib/parse";
import OverviewBar from "./components/OverviewBar";
import MergeConsole from "./components/MergeConsole";
import RankingBoard from "./components/RankingBoard";
import PendingList from "./components/PendingList";
import UnreturnedPanel from "./components/UnreturnedPanel";
import BloodlinePanel from "./components/BloodlinePanel";
import AuditTrail from "./components/AuditTrail";

const project = { sourceNo: 9, id: "hxyfront-62014", port: 62014, title: "赛鸽训放记录" };

const STORAGE_KEY = "hxyfront-62014-loft-v1";

const seedState: LoftState = { records: SEED_RECORDS, pending: [], edits: [] };

function loadState(): LoftState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LoftState;
      if (Array.isArray(parsed.records) && Array.isArray(parsed.pending) && Array.isArray(parsed.edits)) {
        return parsed;
      }
    }
  } catch {
    /* 缓存损坏时回退到示例数据 */
  }
  return seedState;
}

function App() {
  const [state, setState] = useState<LoftState>(loadState);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // 总览 / 排行 / 血统档案全部跟着当前记录推导
  const ranking = useMemo(() => computeRanking(state.records), [state.records]);
  const stats = useMemo(() => overviewStats(state.records), [state.records]);
  const bloodlines = useMemo(() => bloodlineStats(state.records), [state.records]);

  // —— 界面动作层：只编排 解析(parse) / 合并(merge) 纯函数并落状态 ——

  const handlePreview = (text: string, defaultDate: string, source: string) => {
    const result = parseTable(text, { defaultDate });
    if (result.rows.length === 0) {
      return { plan: null, message: "没有解析到数据行" };
    }
    const plan = planMerge(state.records, state.pending, result.rows, source);
    const message = `识别 ${result.rows.length} 行 · ${result.headerFound ? "检测到表头" : "无表头，按内容推断列"} · 分隔符：${result.delimiter}`;
    return { plan, message };
  };

  const handleConfirm = (plan: MergePlan) => {
    const { state: next, summary } = applyMerge(state, plan);
    setState(next);
    setNotice(summary);
  };

  const handleEdit = (recordId: string, patch: FieldPatch): string | null => {
    const res = applyEdit(state, recordId, patch);
    if (!res.ok) return res.error;
    setState(res.state);
    setNotice(`已更新 ${res.ring} 并重算排行，前后值见修订记录`);
    return null;
  };

  const handleCompletePending = (id: string, patch: FieldPatch) => {
    const res = completePending(state, id, patch);
    setState(res.state);
    setNotice(res.result);
  };

  const handleMarkUnreturned = (id: string) => {
    const res = markUnreturned(state, id);
    setState(res.state);
    setNotice(res.result);
  };

  const handleRemovePending = (id: string) => {
    setState(removePending(state, id));
    setNotice("已移出待补区");
  };

  const handleReset = () => {
    setState(seedState);
    setNotice("已恢复示例数据");
  };

  return (
    <main className="app">
      <section className="hero">
        <p>
          {project.id} · 源提示词{project.sourceNo} · Port {project.port}
        </p>
        <h1>{project.title} · 日志合并台</h1>
        <span>
          各棚导出的训放表格式不一，粘贴后先预览再合并：按足环号与放飞时刻识别重复并沿用首次来源；
          缺距离、天气或归巢时刻的行留在待补区，不进排行；确认后写入有效行。
          改动距离、天气或归巢报时会重算排行，并在修订记录中保留前后值。
        </span>
      </section>

      <OverviewBar stats={stats} pendingCount={state.pending.length} />

      {notice && (
        <div className="notice">
          <span>{notice}</span>
          <button className="btn-sm" onClick={() => setNotice("")}>
            知道了
          </button>
        </div>
      )}

      <MergeConsole onPreview={handlePreview} onConfirm={handleConfirm} />

      <div className="grid-2">
        <RankingBoard ranking={ranking} onEdit={handleEdit} />
        <div className="side-stack">
          <PendingList
            pending={state.pending}
            onComplete={handleCompletePending}
            onMarkUnreturned={handleMarkUnreturned}
            onRemove={handleRemovePending}
          />
          <UnreturnedPanel records={state.records} />
        </div>
      </div>

      <BloodlinePanel stats={bloodlines} ranking={ranking} />

      <AuditTrail edits={state.edits} />

      <footer className="foot">
        <span>
          在册 {state.records.length} 条 · 待补 {state.pending.length} 条 · 修订 {state.edits.length}{" "}
          条（数据保存在本机浏览器）
        </span>
        <button className="btn-sm" onClick={handleReset}>
          恢复示例数据
        </button>
      </footer>
    </main>
  );
}

export default App;
