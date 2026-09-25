import { Fragment, useMemo, useState } from "react";
import type { EditHandler, RankedRecord } from "../lib/types";
import { EditFields } from "./EditFields";

type Band = "all" | "short" | "mid" | "long";

const BANDS: Array<{ key: Band; label: string; test: (km: number) => boolean }> = [
  { key: "all", label: "全部", test: () => true },
  { key: "short", label: "短距离 <150km", test: (km) => km < 150 },
  { key: "mid", label: "中距离 150–400km", test: (km) => km >= 150 && km <= 400 },
  { key: "long", label: "长距离 >400km", test: (km) => km > 400 },
];

interface Props {
  ranking: RankedRecord[];
  bloodFilter: string | null;
  onClearBlood: () => void;
  onSelectRing: (ring: string) => void;
  onEdit: EditHandler;
}

/** 成绩排行：只含有效行；改动距离/天气/报时会重算并留痕 */
export function RankingBoard({ ranking, bloodFilter, onClearBlood, onSelectRing, onEdit }: Props) {
  const [band, setBand] = useState<Band>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const test = BANDS.find((b) => b.key === band)!.test;
    return ranking.filter(
      (x) =>
        test(x.record.distanceKm ?? 0) &&
        (!bloodFilter || (x.record.bloodline || "未标注") === bloodFilter)
    );
  }, [ranking, band, bloodFilter]);

  const exportCsv = () => {
    const header = ["名次", "足环号", "血统", "地点", "距离km", "天气", "放飞时刻", "归巢时刻", "速度m/min"].join(",");
    const lines = rows.map((x) =>
      [
        x.rank,
        x.record.ring,
        x.record.bloodline || "未标注",
        x.record.location,
        x.record.distanceKm,
        x.record.weather,
        x.record.releaseAt,
        x.record.arrivalAt,
        Math.round(x.speed),
      ].join(",")
    );
    const blob = new Blob(["\uFEFF" + [header, ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "训放成绩排行.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>训放成绩排行</p>
          <h2>
            有效成绩 {rows.length} 行{bloodFilter ? ` · 血统：${bloodFilter}` : ""}
          </h2>
        </div>
        <button onClick={exportCsv} disabled={rows.length === 0}>
          导出CSV
        </button>
      </div>

      <div className="chips" style={{ marginBottom: 14 }}>
        {BANDS.map((b) => (
          <button
            key={b.key}
            className={band === b.key ? "chip-active" : ""}
            onClick={() => setBand(b.key)}
          >
            {b.label}
          </button>
        ))}
        {bloodFilter && (
          <button className="chip-active" onClick={onClearBlood}>
            血统：{bloodFilter} ✕
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="subtle">
          当前筛选下暂无有效成绩。缺距离、天气或归巢时刻的记录在待补区，不进排行。
        </p>
      ) : (
        <div className="sheet-wrap">
          <table className="sheet">
            <thead>
              <tr>
                <th>名次</th>
                <th>足环号</th>
                <th>血统</th>
                <th>地点</th>
                <th>距离</th>
                <th>天气</th>
                <th>放飞</th>
                <th>归巢</th>
                <th>速度</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => (
                <Fragment key={x.record.id}>
                  <tr className={x.rank <= 3 ? "top" : ""}>
                    <td className="rank">{x.rank}</td>
                    <td>
                      <button className="link-btn" onClick={() => onSelectRing(x.record.ring)}>
                        {x.record.ring}
                      </button>
                    </td>
                    <td>{x.record.bloodline || "未标注"}</td>
                    <td>{x.record.location || "—"}</td>
                    <td>{x.record.distanceKm}km</td>
                    <td>{x.record.weather}</td>
                    <td>{x.record.releaseAt.slice(5)}</td>
                    <td>{x.record.arrivalAt?.slice(5)}</td>
                    <td className="mono">{Math.round(x.speed)} m/min</td>
                    <td>
                      <button onClick={() => setOpenId(openId === x.record.id ? null : x.record.id)}>
                        {openId === x.record.id ? "收起" : "修正"}
                      </button>
                    </td>
                  </tr>
                  {openId === x.record.id && (
                    <tr className="edit-row">
                      <td colSpan={10}>
                        <p className="subtle">
                          改动距离、天气或报时会重算排行，并在「修改留痕」中留下前后对照。
                        </p>
                        <EditFields
                          record={x.record}
                          fields={["distanceKm", "weather", "arrivalAt"]}
                          onSave={(f, v) => onEdit(x.record.id, f, v)}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
