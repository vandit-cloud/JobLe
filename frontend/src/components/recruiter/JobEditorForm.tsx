import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { FormError } from "../common/FormError";
import { AIContentGeneratorModal } from "../forms/AIContentGeneratorModal";
import { DatePicker } from "../forms/DatePicker";
import { TagInput } from "../forms/TagInput";
import { jobFormSchema, type JobFormValues } from "../../schemas/jobSchema";
import { useState } from "react";

const DEFAULT_VALUES: JobFormValues = {
  title: "",
  department: "",
  openings: 1,
  employmentType: "Full-time",
  workplaceType: "On-site",
  location: "",
  summary: "",
  responsibilities: [],
  requiredQualifications: [],
  preferredQualifications: [],
  requiredSkills: [],
  preferredSkills: [],
  minimumEducation: "",
  minimumExperience: 0,
  maximumExperience: 0,
  certifications: [],
  languages: [],
  salary: {
    minimum: 0,
    maximum: 0,
    currency: "USD",
    period: "Yearly",
    showPublicly: true,
  },
  applicationDeadline: "",
  screeningQuestions: [],
  requireResume: true,
  requireCoverLetter: false,
  applicationInstructions: "",
};

export function JobEditorForm({
  title,
  description,
  initialValues,
  submitLabel,
  onSubmit,
  onSaveDraft,
}: {
  title: string;
  description: string;
  initialValues?: Partial<JobFormValues>;
  submitLabel: string;
  onSubmit: (values: JobFormValues) => Promise<void>;
  onSaveDraft?: (values: JobFormValues) => Promise<void>;
}) {
  const [aiOpen, setAiOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      ...DEFAULT_VALUES,
      ...initialValues,
      salary: {
        ...DEFAULT_VALUES.salary,
        ...initialValues?.salary,
      },
    },
  });

  const values = watch();

  async function submit(valuesToSubmit: JobFormValues) {
    setSubmitting(true);
    try {
      await onSubmit(valuesToSubmit);
    } finally {
      setSubmitting(false);
    }
  }

  async function saveDraft() {
    if (!onSaveDraft) return;
    setSubmitting(true);
    try {
      await onSaveDraft(values);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <AIContentGeneratorModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        onApply={(content) => {
          setValue("summary", content.summary);
          setValue("responsibilities", content.responsibilities);
          setValue("requiredQualifications", content.requiredQualifications);
          setValue("preferredQualifications", content.preferredQualifications);
        }}
      />

      <form className="space-y-6" onSubmit={handleSubmit(submit)}>
        <section className="glass-panel p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-ink">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            </div>
            <button className="btn-secondary gap-2" onClick={() => setAiOpen(true)} type="button">
              <Sparkles className="h-4 w-4" />
              Generate with AI
            </button>
          </div>
        </section>

        <section className="glass-panel p-6">
          <h3 className="text-xl font-bold text-slate-800">Basic information</h3>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <label className="label">Job title</label>
              <input className="input" {...register("title")} />
              <FormError message={errors.title?.message} />
            </div>
            <div>
              <label className="label">Department</label>
              <input className="input" {...register("department")} />
              <FormError message={errors.department?.message} />
            </div>
            <div>
              <label className="label">Openings</label>
              <input className="input" type="number" {...register("openings")} />
              <FormError message={errors.openings?.message} />
            </div>
            <div>
              <label className="label">Employment type</label>
              <select className="input" {...register("employmentType")}>
                {["Full-time", "Part-time", "Internship", "Contract", "Temporary"].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Workplace type</label>
              <select className="input" {...register("workplaceType")}>
                {["On-site", "Remote", "Hybrid"].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Location</label>
              <input className="input" {...register("location")} />
              <FormError message={errors.location?.message} />
            </div>
          </div>
        </section>

        <section className="glass-panel p-6">
          <h3 className="text-xl font-bold text-slate-800">Job description</h3>
          <div className="mt-5 space-y-4">
            <div>
              <label className="label">Job summary</label>
              <textarea className="input min-h-36" {...register("summary")} />
              <FormError message={errors.summary?.message} />
            </div>
            <Controller
              control={control}
              name="responsibilities"
              render={({ field }) => <TagInput label="Responsibilities" values={field.value} onChange={field.onChange} placeholder="Add a responsibility" />}
            />
            <Controller
              control={control}
              name="requiredQualifications"
              render={({ field }) => <TagInput label="Required qualifications" values={field.value} onChange={field.onChange} placeholder="Add a qualification" />}
            />
            <Controller
              control={control}
              name="preferredQualifications"
              render={({ field }) => <TagInput label="Preferred qualifications" values={field.value} onChange={field.onChange} placeholder="Add a preferred qualification" />}
            />
          </div>
        </section>

        <section className="glass-panel p-6">
          <h3 className="text-xl font-bold text-slate-800">Skills and candidate requirements</h3>
          <div className="mt-5 space-y-4">
            <Controller
              control={control}
              name="requiredSkills"
              render={({ field }) => <TagInput label="Required skills" values={field.value} onChange={field.onChange} placeholder="Add a required skill" />}
            />
            <FormError message={errors.requiredSkills?.message as string | undefined} />
            <Controller
              control={control}
              name="preferredSkills"
              render={({ field }) => <TagInput label="Preferred skills" values={field.value} onChange={field.onChange} placeholder="Add a preferred skill" />}
            />
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="label">Minimum education</label>
                <input className="input" {...register("minimumEducation")} />
                <FormError message={errors.minimumEducation?.message} />
              </div>
              <div>
                <label className="label">Minimum experience</label>
                <input className="input" type="number" {...register("minimumExperience")} />
              </div>
              <div>
                <label className="label">Maximum experience</label>
                <input className="input" type="number" {...register("maximumExperience")} />
                <FormError message={errors.maximumExperience?.message} />
              </div>
            </div>
            <Controller
              control={control}
              name="certifications"
              render={({ field }) => <TagInput label="Certifications" values={field.value} onChange={field.onChange} placeholder="Add a certification" />}
            />
            <Controller
              control={control}
              name="languages"
              render={({ field }) => <TagInput label="Languages" values={field.value} onChange={field.onChange} placeholder="Add a language" />}
            />
          </div>
        </section>

        <section className="glass-panel p-6">
          <h3 className="text-xl font-bold text-slate-800">Salary and application details</h3>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="label">Minimum salary</label>
              <input className="input" type="number" {...register("salary.minimum")} />
            </div>
            <div>
              <label className="label">Maximum salary</label>
              <input className="input" type="number" {...register("salary.maximum")} />
              <FormError message={errors.salary?.maximum?.message} />
            </div>
            <div>
              <label className="label">Currency</label>
              <input className="input" {...register("salary.currency")} />
            </div>
            <div>
              <label className="label">Salary period</label>
              <select className="input" {...register("salary.period")}>
                {["Hourly", "Monthly", "Yearly"].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <DatePicker label="Application deadline" value={watch("applicationDeadline")} onChange={(value) => setValue("applicationDeadline", value)} />
            <div className="flex items-end gap-6 pb-2">
              <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                <input type="checkbox" {...register("salary.showPublicly")} />
                Show salary publicly
              </label>
              <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                <input type="checkbox" {...register("requireResume")} />
                Resume required
              </label>
              <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                <input type="checkbox" {...register("requireCoverLetter")} />
                Cover letter required
              </label>
            </div>
          </div>
          <div className="mt-4 space-y-4">
            <Controller
              control={control}
              name="screeningQuestions"
              render={({ field }) => <TagInput label="Screening questions" values={field.value} onChange={field.onChange} placeholder="Add a screening question" />}
            />
            <div>
              <label className="label">Application instructions</label>
              <textarea className="input min-h-28" {...register("applicationInstructions")} />
            </div>
          </div>
        </section>

        <section className="glass-panel p-6">
          <h3 className="text-xl font-bold text-slate-800">Preview</h3>
          <div className="mt-5 rounded-3xl bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              {values.department || "Department"} • {values.location || "Location"}
            </p>
            <h4 className="mt-2 text-2xl font-bold text-ink">{values.title || "Untitled role"}</h4>
            <p className="mt-3 text-sm leading-7 text-slate-600">{values.summary || "Your job summary preview will appear here."}</p>
          </div>
        </section>

        <div className="flex flex-wrap justify-end gap-3">
          {onSaveDraft ? (
            <button className="btn-secondary" disabled={submitting} onClick={saveDraft} type="button">
              Save as draft
            </button>
          ) : null}
          <button className="btn-primary" disabled={submitting} type="submit">
            {submitting ? "Saving..." : submitLabel}
          </button>
        </div>
      </form>
    </>
  );
}
