import { useState } from "react";
import type { EditableField, EditReply, FlightRecord } from "../lib/types";
import { FIELD_LABEL } from "../lib/types";

const PLACEHOLDER: Record<EditableField, string> = {
  distanceKm: "如 320 或 320km",
  weather: "如 晴转多云",
  arrivalAt: "如 2026-09-20 11:02 或 11:02",
};

const currentValue = (r: FlightRecord, f: EditableField): string => {
  if (f === "distanceKm") return r.distanceKm === null ? "" : String(r.distanceKm);
  if (f === "weather") return r.weather ?? "";
  return r.arrivalAt ?? "";
};

interface Props {
  record: FlightRecord;
  fields: EditableField[];
  onSave: (field: EditableField, value: string) => EditReply;
}

/** 行内补录/修正：逐字段保存，每次保存都会走合并层的重算与留痕 */
export function EditFields({ record, fields, onSave }: Props) {
  return (
    <div className="edit-fields">
      {fields.map((f) => (
        <FieldEditor
          key={`${record.id}-${f}-${currentValue(record, f)}`}
          field={f}
          initial={currentValue(record, f)}
          onSave={(v) => onSave(f, v)}
        />
      ))}
    </div>
  );
}

function FieldEditor({
  field,
  initial,
  onSave,
}: {
  field: EditableField;
  initial: string;
  onSave: (value: string) => EditReply;
}) {
  const [value, setValue] = useState(initial);
  const [msg, setMsg] = useState<{ kind: "error" | "ok" | "noop"; text: string } | null>(null);

  const submit = () => {
    const reply = onSave(value);
    if (reply.error) {
      setMsg({ kind: "error", text: reply.error });
    } else {
      setMsg(reply.changed ? { kind: "ok", text: "已保存，排行已重算并留痕" } : { kind: "noop", text: "内容未变化" });
      window.setTimeout(() => setMsg(null), 1800);
    }
  };

  return (
    <div className="edit-field">
      <label>
        <span>{FIELD_LABEL[field]}</span>
        <input
          value={value}
          placeholder={PLACEHOLDER[field]}
          onChange={(e) => {
            setValue(e.target.value);
            setMsg(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
      </label>
      <button onClick={submit}>保存</button>
      {msg && <em className={`field-${msg.kind}`}>{msg.text}</em>}
    </div>
  );
}
