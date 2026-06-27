import { useState } from "react";
import { X } from "lucide-react";

export function TagInput({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");

  function addTag() {
    const next = draft.trim();
    if (!next) return;
    if (!values.includes(next)) {
      onChange([...values, next]);
    }
    setDraft("");
  }

  return (
    <div>
      <label className="label">{label}</label>
      <div className="rounded-3xl border border-slate-200 bg-white p-3">
        <div className="mb-3 flex flex-wrap gap-2">
          {values.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {tag}
              <button type="button" onClick={() => onChange(values.filter((item) => item !== tag))}>
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-3">
          <input
            className="input"
            value={draft}
            placeholder={placeholder}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addTag();
              }
            }}
          />
          <button className="btn-secondary shrink-0" onClick={addTag} type="button">
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

