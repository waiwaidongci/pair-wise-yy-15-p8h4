import { useEffect, useMemo, useReducer, useState } from "react";
import "./styles.css";
import type { EditReply } from "./lib/types";
import { missingFields } from "./lib/types";
import type { EditableField } from "./lib/types";
import { applyFieldEdit, bloodlineStats, computeRanking, overviewStats } from "./lib/merge";
import { loadState, mergeReducer, saveState } from "./lib/store";
import { Overview } from "./components/Overview";
import { MergeConsole } from "./components/MergeConsole";
import { RankingBoard } from "./components/RankingBoard";
import { PendingList } from "./components/PendingList";
import { AuditLog } from "./components/AuditLog";
import { BloodlinePanel } from "./components/BloodlinePanel";
import { PigeonProfile } from "./components/PigeonProfile";

function App() {
  const [state, dispatch] = useReducer(mergeReducer, { records: [], audit: [] }, loadState);
  useEffect(() => saveState(state), [state]);

  // 总览、排行、待补、未归巢、血统档案全部从当前记录推导
  const ranking = useMemo(() => computeRanking(state.records), [state.records]);
  const stats = useMemo(() => overviewStats(state.records), [state.records]);
  const bloodlines = useMemo(() => bloodlineStats(state.records), [state.records]);
  const pending = useMemo(
    () =>
      state.records
        .filter((r) => missingFields(r).length > 0)
        .sort((a, b) => b.releaseAt.localeCompare(a.releaseAt)),
    [state.records]
  );
  const unreturned = useMemo(() => state.records.filter((r) => r.arrivalAt === null), [state.records]);

  const [bloodFilter, setBloodFilter] = useState<string | null>(null);
  const [selectedRing, setSelectedRing] = useState<string | null>(null);

  // 改动距离/天气/报时：先在合并层试算（校验 + 前后对照），通过后再派发
  const tryEdit = (id: string, field: EditableField, value: string): EditReply => {
    const outcome = applyFieldEdit(state.records, id, field, value);
    if (outcome.error) return { error: outcome.error, changed: false };
    dispatch({ type: "edit", id, field, value });
    return { error: null, changed: outcome.audit !== null };
  };

  return (
    <main className="app">
      <section className="hero">
        <p>hxyfront-62014 · 源提示词9 · Port 62014</p>
        <h1>赛鸽训放记录 · 日志合并台</h1>
        <span>
          鸽棚导出的训放表格式不一，粘贴后先解析预览：按「足环号 + 放飞时刻」找出重复（重复行沿用首次来源），
          缺距离、天气或归巢时刻的记录留在待补区、不进排行；确认后写入有效行。之后改动距离、天气或报时会自动重算排行
          并留下前后对照，总览、未归巢数量与血统档案始终跟随当前结果。
        </span>
      </section>

      <Overview stats={stats} unreturned={unreturned} />

      <MergeConsole
        existing={state.records}
        onConfirm={(rows, source) => dispatch({ type: "confirm", rows, source })}
      />

      <div className="board-grid">
        <RankingBoard
          ranking={ranking}
          bloodFilter={bloodFilter}
          onClearBlood={() => setBloodFilter(null)}
          onSelectRing={setSelectedRing}
          onEdit={tryEdit}
        />
        <div className="stack">
          <PendingList
            records={pending}
            onEdit={tryEdit}
            onRemove={(id) => dispatch({ type: "remove", id })}
            onSelectRing={setSelectedRing}
          />
          <AuditLog entries={state.audit} />
        </div>
      </div>

      <div className="two-col">
        <BloodlinePanel stats={bloodlines} active={bloodFilter} onSelect={setBloodFilter} />
        <PigeonProfile
          ring={selectedRing}
          records={state.records}
          ranking={ranking}
          onClose={() => setSelectedRing(null)}
        />
      </div>

      <footer className="footer">
        <button
          onClick={() => {
            if (window.confirm("恢复示例数据并清空修改记录？")) dispatch({ type: "reset" });
          }}
        >
          恢复示例数据
        </button>
      </footer>
    </main>
  );
}

export default App;
