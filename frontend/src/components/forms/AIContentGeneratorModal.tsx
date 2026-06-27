import { Sparkles } from "lucide-react";
import { useState } from "react";
import { generateJobDescription } from "../../api/recruiter";
import { TagInput } from "./TagInput";

interface GeneratedContent {
  summary: string;
  responsibilities: string[];
  requiredQualifications: string[];
  preferredQualifications: string[];
}

export function AIContentGeneratorModal({
  open,
  onClose,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (content: GeneratedContent) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [jobTitle, setJobTitle] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("Entry level");
  const [employmentType, setEmploymentType] = useState("Full-time");
  const [skills, setSkills] = useState<string[]>([]);

  if (!open) return null;

  async function handleGenerate() {
    setLoading(true);
    try {
      const response = await generateJobDescription({ jobTitle, experienceLevel, skills, employmentType });
      onApply(response.content);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4">
      <div className="glass-panel w-full max-w-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sunrise">AI generator</p>
            <h3 className="mt-2 text-2xl font-bold text-ink">Draft job content</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Generate an editable starting point. Review everything before publishing.</p>
          </div>
          <Sparkles className="h-6 w-6 text-sunrise" />
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Job title</label>
            <input className="input" value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} />
          </div>
          <div>
            <label className="label">Experience level</label>
            <input className="input" value={experienceLevel} onChange={(event) => setExperienceLevel(event.target.value)} />
          </div>
          <div>
            <label className="label">Employment type</label>
            <select className="input" value={employmentType} onChange={(event) => setEmploymentType(event.target.value)}>
              {["Full-time", "Part-time", "Internship", "Contract", "Temporary"].map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <TagInput label="Important skills" values={skills} onChange={setSkills} placeholder="Add a skill and press Enter" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button className="btn-secondary" onClick={onClose} type="button">
            Close
          </button>
          <button className="btn-primary" disabled={loading || !jobTitle || skills.length === 0} onClick={handleGenerate} type="button">
            {loading ? "Generating..." : "Generate draft"}
          </button>
        </div>
      </div>
    </div>
  );
}

