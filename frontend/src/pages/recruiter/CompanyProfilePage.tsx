import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink, Pencil, Save } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { useEffect, useMemo, useState } from "react";
import { createCompany, fetchCompanyProfile, updateCompany, uploadCompanyLogo } from "../../api/recruiter";
import { EmptyState } from "../../components/common/EmptyState";
import { FormError } from "../../components/common/FormError";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { PageHeader } from "../../components/common/PageHeader";
import { StatusBadge } from "../../components/common/StatusBadge";
import { FileUpload } from "../../components/forms/FileUpload";
import { TagInput } from "../../components/forms/TagInput";
import { companyFormSchema, type CompanyFormValues } from "../../schemas/companySchema";
import type { Company } from "../../types";
import { useToast } from "../../context/ToastContext";
import { resolveAssetUrl } from "../../lib/utils";

const EMPTY_VALUES: CompanyFormValues = {
  name: "",
  website: "",
  industry: "",
  companySize: "11-50 employees",
  foundedYear: 2020,
  email: "",
  phone: "",
  headquarters: "",
  officeLocations: [],
  description: "",
  mission: "",
  culture: "",
  benefits: [],
  socialLinks: {
    linkedin: "",
    other: [],
  },
};

export function CompanyProfilePage() {
  const { showToast } = useToast();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    fetchCompanyProfile()
      .then((response) => {
        if (response.company) {
          setCompany(response.company);
          setLogoPreview(resolveAssetUrl(response.company.logo));
          reset({
            name: response.company.name,
            website: response.company.website || "",
            industry: response.company.industry,
            companySize: response.company.companySize || "11-50 employees",
            foundedYear: response.company.foundedYear || 2020,
            email: response.company.email || "",
            phone: response.company.phone || "",
            headquarters: response.company.headquarters || "",
            officeLocations: response.company.officeLocations || [],
            description: response.company.description || "",
            mission: response.company.mission || "",
            culture: response.company.culture || "",
            benefits: response.company.benefits || [],
            socialLinks: {
              linkedin: response.company.socialLinks?.linkedin || "",
              other: response.company.socialLinks?.other || [],
            },
          });
        } else {
          setEditing(true);
        }
      })
      .finally(() => setLoading(false));
  }, [reset]);

  const missingFields = useMemo(() => company?.missingFields || [], [company]);

  async function onSubmit(values: CompanyFormValues) {
    try {
      let nextLogo = company?.logo || "";
      if (selectedFile) {
        nextLogo = await uploadCompanyLogo(selectedFile);
      }

      const payload = {
        ...values,
        logo: nextLogo,
      };

      const saved = company ? await updateCompany(payload) : await createCompany(payload);
      setCompany(saved);
      setLogoPreview(resolveAssetUrl(saved.logo));
      setEditing(false);
      showToast("Company profile saved successfully.", "success");
    } catch (error) {
      showToast("Unable to save company profile.", "error");
    }
  }

  if (loading) {
    return <LoadingSkeleton className="h-80" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Brand"
        title="Company profile"
        description="Manage your company presence, keep public-facing details complete, and give applicants better context before they apply."
        action={
          company && !editing ? (
            <>
              {company.website ? (
                <a className="btn-secondary gap-2" href={company.website} rel="noreferrer" target="_blank">
                  <ExternalLink className="h-4 w-4" />
                  Preview public page
                </a>
              ) : null}
              <button className="btn-primary gap-2" onClick={() => setEditing(true)} type="button">
                <Pencil className="h-4 w-4" />
                Edit profile
              </button>
            </>
          ) : null
        }
      />

      {company && !editing ? (
        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-6">
            <div className="glass-panel p-6">
              <div className="flex items-start gap-4">
                {logoPreview ? <img alt={company.name} className="h-20 w-20 rounded-3xl object-cover" src={logoPreview} /> : <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 text-2xl font-bold text-slate-500">{company.name[0]}</div>}
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-ink">{company.name}</h2>
                    <StatusBadge status={company.verificationStatus} />
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{company.industry}</p>
                  <p className="mt-1 text-sm text-slate-500">{company.headquarters}</p>
                </div>
              </div>
              <div className="mt-6 rounded-3xl bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Profile completion</p>
                <p className="mt-2 text-3xl font-extrabold text-ink">{company.profileCompletion}%</p>
                <p className="mt-3 text-sm text-slate-600">
                  {missingFields.length > 0 ? `Still missing: ${missingFields.join(", ")}` : "Your profile is fully completed."}
                </p>
              </div>
            </div>

            <div className="glass-panel p-6">
              <h3 className="text-lg font-bold text-slate-800">Quick details</h3>
              <div className="mt-5 grid gap-4">
                {[
                  ["Website", company.website || "Not set"],
                  ["Company size", company.companySize || "Not set"],
                  ["Founded", company.foundedYear || "Not set"],
                  ["Email", company.email || "Not set"],
                  ["Phone", company.phone || "Not set"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="glass-panel p-6">
            <h3 className="text-lg font-bold text-slate-800">Company story</h3>
            <div className="mt-5 space-y-5">
              <section>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Description</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">{company.description}</p>
              </section>
              <section>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Mission</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">{company.mission}</p>
              </section>
              <section>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Culture</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">{company.culture}</p>
              </section>
              <section>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Benefits</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {company.benefits.map((benefit) => (
                    <span key={benefit} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {benefit}
                    </span>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : (
        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
            <div className="space-y-6">
              <div className="glass-panel p-6">
                <FileUpload
                  label="Company logo"
                  previewUrl={logoPreview}
                  onChange={(file) => {
                    setSelectedFile(file);
                    if (file) {
                      setLogoPreview(URL.createObjectURL(file));
                    }
                  }}
                />
                <div className="mt-6 rounded-3xl bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Verification status</p>
                  <div className="mt-3">
                    <StatusBadge status={company?.verificationStatus || "Pending"} />
                  </div>
                  <p className="mt-3 text-sm text-slate-600">Recruiters can view verification status but cannot edit it.</p>
                </div>
              </div>

              {!company ? (
                <EmptyState title="Create your company profile" description="Set up branding and recruiter-facing company details before posting jobs." />
              ) : null}
            </div>

            <div className="glass-panel p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label">Company name</label>
                  <input className="input" {...register("name")} />
                  <FormError message={errors.name?.message} />
                </div>
                <div>
                  <label className="label">Industry</label>
                  <input className="input" {...register("industry")} />
                  <FormError message={errors.industry?.message} />
                </div>
                <div>
                  <label className="label">Website</label>
                  <input className="input" {...register("website")} />
                  <FormError message={errors.website?.message} />
                </div>
                <div>
                  <label className="label">Company size</label>
                  <select className="input" {...register("companySize")}>
                    {["1-10 employees", "11-50 employees", "51-200 employees", "201-500 employees", "501-1000 employees", "1000+ employees"].map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Founded year</label>
                  <input className="input" type="number" {...register("foundedYear")} />
                  <FormError message={errors.foundedYear?.message} />
                </div>
                <div>
                  <label className="label">Company email</label>
                  <input className="input" {...register("email")} />
                  <FormError message={errors.email?.message} />
                </div>
                <div>
                  <label className="label">Phone number</label>
                  <input className="input" {...register("phone")} />
                  <FormError message={errors.phone?.message} />
                </div>
                <div>
                  <label className="label">Headquarters</label>
                  <input className="input" {...register("headquarters")} />
                  <FormError message={errors.headquarters?.message} />
                </div>
              </div>

              <div className="mt-5 space-y-5">
                <Controller
                  control={control}
                  name="officeLocations"
                  render={({ field }) => <TagInput label="Office locations" values={field.value} onChange={field.onChange} placeholder="Add an office location" />}
                />
                <div>
                  <label className="label">Company description</label>
                  <textarea className="input min-h-36" {...register("description")} />
                  <FormError message={errors.description?.message} />
                </div>
                <div>
                  <label className="label">Mission</label>
                  <textarea className="input min-h-28" {...register("mission")} />
                  <FormError message={errors.mission?.message} />
                </div>
                <div>
                  <label className="label">Culture</label>
                  <textarea className="input min-h-28" {...register("culture")} />
                  <FormError message={errors.culture?.message} />
                </div>
                <Controller
                  control={control}
                  name="benefits"
                  render={({ field }) => <TagInput label="Employee benefits" values={field.value} onChange={field.onChange} placeholder="Add a benefit" />}
                />
                <div>
                  <label className="label">LinkedIn URL</label>
                  <input className="input" {...register("socialLinks.linkedin")} />
                  <FormError message={errors.socialLinks?.linkedin?.message} />
                </div>
                <Controller
                  control={control}
                  name="socialLinks.other"
                  render={({ field }) => <TagInput label="Other social links" values={field.value} onChange={field.onChange} placeholder="Add another social URL" />}
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                {company ? (
                  <button className="btn-secondary" onClick={() => setEditing(false)} type="button">
                    Cancel
                  </button>
                ) : null}
                <button className="btn-primary gap-2" disabled={isSubmitting} type="submit">
                  <Save className="h-4 w-4" />
                  {isSubmitting ? "Saving..." : "Save company profile"}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
