import { ImagePlus } from "lucide-react";

export function FileUpload({
  label,
  previewUrl,
  onChange,
}: {
  label: string;
  previewUrl?: string;
  onChange: (file: File | null) => void;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
        {previewUrl ? <img alt="Preview" className="mb-4 h-20 w-20 rounded-2xl object-cover" src={previewUrl} /> : <ImagePlus className="mb-4 h-8 w-8 text-slate-500" />}
        <span className="text-sm font-medium text-slate-700">Upload PNG, JPG, SVG, or WEBP</span>
        <input
          className="hidden"
          type="file"
          accept=".png,.jpg,.jpeg,.svg,.webp"
          onChange={(event) => onChange(event.target.files?.[0] || null)}
        />
      </label>
    </div>
  );
}

