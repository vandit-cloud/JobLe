export function DatePicker({
  label,
  value,
  onChange,
  type = "date",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "date" | "datetime-local";
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

