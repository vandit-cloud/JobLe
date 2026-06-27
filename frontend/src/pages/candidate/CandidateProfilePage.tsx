import { useEffect, useState } from "react";
import { TagInput } from "../../components/forms/TagInput";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { PageHeader } from "../../components/common/PageHeader";
import { useToast } from "../../context/ToastContext";
import { fetchCandidateProfile, updateCandidateProfileDetails } from "../../api/recruiter";
import type { Candidate } from "../../types";

type CandidateSocialLinks = NonNullable<Candidate["socialLinks"]>;
type CandidateJobPreferences = NonNullable<Candidate["jobPreferences"]>;

function createEmptyCandidate(): Candidate {
  return {
    _id: "",
    name: "",
    email: "",
    phone: "",
    profilePhoto: "",
    professionalTitle: "",
    summary: "",
    careerObjective: "",
    yearsOfExperience: 0,
    employmentStatus: "",
    location: "",
    city: "",
    state: "",
    country: "",
    skills: [],
    education: [],
    experience: [],
    projects: [],
    certifications: [],
    languages: [],
    resumeUrl: "",
    availability: "",
    socialLinks: {
      linkedin: "",
      github: "",
      portfolio: "",
      website: "",
      other: [],
    },
    jobPreferences: {
      preferredRoles: [],
      preferredIndustries: [],
      preferredLocations: [],
      remotePreference: "Open",
      employmentTypes: [],
      expectedSalary: 0,
      currency: "USD",
      noticePeriod: "",
      availableJoiningDate: "",
      willingToRelocate: false,
      openToRecruiterDiscovery: true,
    },
    profileCompletion: 0,
    discoverable: true,
  };
}

function mergeSocialLinks(socialLinks?: Partial<CandidateSocialLinks>): CandidateSocialLinks {
  return {
    linkedin: "",
    github: "",
    portfolio: "",
    website: "",
    other: [],
    ...socialLinks,
  };
}

function mergeJobPreferences(jobPreferences?: Partial<CandidateJobPreferences>): CandidateJobPreferences {
  return {
    preferredRoles: [],
    preferredIndustries: [],
    preferredLocations: [],
    remotePreference: "Open",
    employmentTypes: [],
    expectedSalary: 0,
    currency: "USD",
    noticePeriod: "",
    availableJoiningDate: "",
    willingToRelocate: false,
    openToRecruiterDiscovery: true,
    ...jobPreferences,
  };
}

function mergeCandidateState(candidate?: Partial<Candidate>): Candidate {
  const defaults = createEmptyCandidate();
  return {
    ...defaults,
    ...candidate,
    socialLinks: mergeSocialLinks(candidate?.socialLinks),
    jobPreferences: mergeJobPreferences(candidate?.jobPreferences),
  };
}

export function CandidateProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [candidate, setCandidate] = useState<Candidate>(createEmptyCandidate());
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const { showToast } = useToast();

  useEffect(() => {
    fetchCandidateProfile()
      .then((response) => {
        setCandidate(mergeCandidateState(response.candidate));
        setMissingFields(response.missingFields);
        setProfileCompletion(response.profileCompletion);
      })
      .catch(() => showToast("Unable to load your profile right now.", "error"))
      .finally(() => setLoading(false));
  }, []);

  function updateField<K extends keyof Candidate>(key: K, value: Candidate[K]) {
    setCandidate((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    try {
      setSaving(true);
      const response = await updateCandidateProfileDetails(candidate);
      setCandidate(mergeCandidateState(response.candidate));
      setMissingFields(response.missingFields);
      setProfileCompletion(response.profileCompletion);
      setEditMode(false);
      showToast("Profile updated successfully.", "success");
    } catch {
      showToast("We couldn't save your profile.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingSkeleton className="h-[32rem]" />;
  }

  if (!candidate) {
    return <EmptyState title="Profile unavailable" description="We couldn't load your candidate profile." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Profile"
        title="My profile"
        description="Keep your candidate profile recruiter-ready with a clear summary, strong skills, and accurate job preferences."
        action={
          <>
            {editMode ? (
              <button className="btn-primary" disabled={saving} onClick={handleSave} type="button">
                {saving ? "Saving..." : "Save profile"}
              </button>
            ) : null}
            <button className="btn-secondary" onClick={() => setEditMode((current) => !current)} type="button">
              {editMode ? "Cancel edit" : "Edit profile"}
            </button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
        <div className="glass-panel p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tide">Completion</p>
          <h2 className="mt-2 text-3xl font-extrabold text-ink">{profileCompletion}%</h2>
          <div className="mt-4 h-3 rounded-full bg-slate-100">
            <div className="h-3 rounded-full bg-emerald-500" style={{ width: `${profileCompletion}%` }} />
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {missingFields.length === 0 ? (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">No major gaps</span>
            ) : (
              missingFields.map((field) => (
                <span key={field} className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                  {field}
                </span>
              ))
            )}
          </div>

          <div className="mt-6 rounded-3xl bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-800">{candidate.name}</p>
            <p className="mt-1 text-sm text-slate-600">{candidate.email}</p>
            <p className="mt-1 text-sm text-slate-600">{candidate.professionalTitle || "Professional title not set"}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel p-6">
            <h2 className="text-xl font-bold text-ink">Basic information</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="label" htmlFor="name">
                  Full name
                </label>
                <input className="input" disabled={!editMode} id="name" onChange={(event) => updateField("name", event.target.value)} value={candidate.name} />
              </div>
              <div>
                <label className="label" htmlFor="email">
                  Email
                </label>
                <input className="input" disabled id="email" value={candidate.email} />
              </div>
              <div>
                <label className="label" htmlFor="phone">
                  Phone
                </label>
                <input className="input" disabled={!editMode} id="phone" onChange={(event) => updateField("phone", event.target.value)} value={candidate.phone || ""} />
              </div>
              <div>
                <label className="label" htmlFor="professionalTitle">
                  Professional title
                </label>
                <input className="input" disabled={!editMode} id="professionalTitle" onChange={(event) => updateField("professionalTitle", event.target.value)} value={candidate.professionalTitle || ""} />
              </div>
              <div>
                <label className="label" htmlFor="city">
                  City
                </label>
                <input className="input" disabled={!editMode} id="city" onChange={(event) => updateField("city", event.target.value)} value={candidate.city || ""} />
              </div>
              <div>
                <label className="label" htmlFor="state">
                  State
                </label>
                <input className="input" disabled={!editMode} id="state" onChange={(event) => updateField("state", event.target.value)} value={candidate.state || ""} />
              </div>
              <div>
                <label className="label" htmlFor="country">
                  Country
                </label>
                <input className="input" disabled={!editMode} id="country" onChange={(event) => updateField("country", event.target.value)} value={candidate.country || ""} />
              </div>
              <div>
                <label className="label" htmlFor="yearsOfExperience">
                  Years of experience
                </label>
                <input
                  className="input"
                  disabled={!editMode}
                  id="yearsOfExperience"
                  min={0}
                  onChange={(event) => updateField("yearsOfExperience", Number(event.target.value))}
                  type="number"
                  value={candidate.yearsOfExperience || 0}
                />
              </div>
            </div>
          </div>

          <div className="glass-panel p-6">
            <h2 className="text-xl font-bold text-ink">Summary</h2>
            <div className="mt-5 space-y-4">
              <div>
                <label className="label" htmlFor="summary">
                  About me
                </label>
                <textarea className="input min-h-28" disabled={!editMode} id="summary" onChange={(event) => updateField("summary", event.target.value)} value={candidate.summary || ""} />
              </div>
              <div>
                <label className="label" htmlFor="careerObjective">
                  Career objective
                </label>
                <textarea
                  className="input min-h-24"
                  disabled={!editMode}
                  id="careerObjective"
                  onChange={(event) => updateField("careerObjective", event.target.value)}
                  value={candidate.careerObjective || ""}
                />
              </div>
            </div>
          </div>

          <div className="glass-panel space-y-6 p-6">
            <TagInput label="Skills" onChange={(values) => updateField("skills", values)} placeholder="Add a skill" values={candidate.skills} />
            <TagInput label="Languages" onChange={(values) => updateField("languages", values)} placeholder="Add a language" values={candidate.languages} />
            <TagInput label="Certifications" onChange={(values) => updateField("certifications", values)} placeholder="Add a certification" values={candidate.certifications} />
          </div>

          <div className="glass-panel p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-ink">Education</h2>
              {editMode ? (
                <button
                  className="btn-secondary"
                  onClick={() => updateField("education", [...candidate.education, { institution: "", degree: "", field: "", graduationYear: new Date().getFullYear() }])}
                  type="button"
                >
                  Add education
                </button>
              ) : null}
            </div>
            <div className="mt-5 space-y-4">
              {candidate.education.map((item, index) => (
                <div key={`${item.institution}-${index}`} className="rounded-3xl bg-slate-50 p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <input
                      className="input"
                      disabled={!editMode}
                      onChange={(event) =>
                        updateField(
                          "education",
                          candidate.education.map((entry, entryIndex) => (entryIndex === index ? { ...entry, institution: event.target.value } : entry)),
                        )
                      }
                      placeholder="Institution"
                      value={item.institution}
                    />
                    <input
                      className="input"
                      disabled={!editMode}
                      onChange={(event) =>
                        updateField("education", candidate.education.map((entry, entryIndex) => (entryIndex === index ? { ...entry, degree: event.target.value } : entry)))
                      }
                      placeholder="Degree"
                      value={item.degree}
                    />
                    <input
                      className="input"
                      disabled={!editMode}
                      onChange={(event) =>
                        updateField("education", candidate.education.map((entry, entryIndex) => (entryIndex === index ? { ...entry, field: event.target.value } : entry)))
                      }
                      placeholder="Field"
                      value={item.field}
                    />
                    <input
                      className="input"
                      disabled={!editMode}
                      onChange={(event) =>
                        updateField(
                          "education",
                          candidate.education.map((entry, entryIndex) => (entryIndex === index ? { ...entry, graduationYear: Number(event.target.value) } : entry)),
                        )
                      }
                      placeholder="Graduation year"
                      type="number"
                      value={item.graduationYear}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-ink">Experience</h2>
              {editMode ? (
                <button
                  className="btn-secondary"
                  onClick={() => updateField("experience", [...candidate.experience, { company: "", role: "", years: 0, description: "" }])}
                  type="button"
                >
                  Add experience
                </button>
              ) : null}
            </div>
            <div className="mt-5 space-y-4">
              {candidate.experience.map((item, index) => (
                <div key={`${item.company}-${index}`} className="rounded-3xl bg-slate-50 p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <input
                      className="input"
                      disabled={!editMode}
                      onChange={(event) =>
                        updateField("experience", candidate.experience.map((entry, entryIndex) => (entryIndex === index ? { ...entry, company: event.target.value } : entry)))
                      }
                      placeholder="Company"
                      value={item.company}
                    />
                    <input
                      className="input"
                      disabled={!editMode}
                      onChange={(event) =>
                        updateField("experience", candidate.experience.map((entry, entryIndex) => (entryIndex === index ? { ...entry, role: event.target.value } : entry)))
                      }
                      placeholder="Role"
                      value={item.role}
                    />
                    <input
                      className="input"
                      disabled={!editMode}
                      onChange={(event) =>
                        updateField("experience", candidate.experience.map((entry, entryIndex) => (entryIndex === index ? { ...entry, years: Number(event.target.value) } : entry)))
                      }
                      placeholder="Years"
                      type="number"
                      value={item.years}
                    />
                    <textarea
                      className="input min-h-24 md:col-span-2"
                      disabled={!editMode}
                      onChange={(event) =>
                        updateField(
                          "experience",
                          candidate.experience.map((entry, entryIndex) => (entryIndex === index ? { ...entry, description: event.target.value } : entry)),
                        )
                      }
                      placeholder="Description"
                      value={item.description}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-ink">Projects</h2>
              {editMode ? (
                <button
                  className="btn-secondary"
                  onClick={() => updateField("projects", [...candidate.projects, { name: "", description: "", technologies: [] }])}
                  type="button"
                >
                  Add project
                </button>
              ) : null}
            </div>
            <div className="mt-5 space-y-4">
              {candidate.projects.map((item, index) => (
                <div key={`${item.name}-${index}`} className="rounded-3xl bg-slate-50 p-4">
                  <div className="grid gap-4">
                    <input
                      className="input"
                      disabled={!editMode}
                      onChange={(event) =>
                        updateField("projects", candidate.projects.map((entry, entryIndex) => (entryIndex === index ? { ...entry, name: event.target.value } : entry)))
                      }
                      placeholder="Project name"
                      value={item.name}
                    />
                    <textarea
                      className="input min-h-24"
                      disabled={!editMode}
                      onChange={(event) =>
                        updateField("projects", candidate.projects.map((entry, entryIndex) => (entryIndex === index ? { ...entry, description: event.target.value } : entry)))
                      }
                      placeholder="Project description"
                      value={item.description}
                    />
                    <TagInput
                      label="Technologies"
                      onChange={(values) =>
                        updateField("projects", candidate.projects.map((entry, entryIndex) => (entryIndex === index ? { ...entry, technologies: values } : entry)))
                      }
                      placeholder="Add a technology"
                      values={item.technologies}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel p-6">
            <h2 className="text-xl font-bold text-ink">Links and preferences</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <input className="input" disabled={!editMode} onChange={(event) => setCandidate((current) => ({ ...current, socialLinks: mergeSocialLinks({ ...current.socialLinks, linkedin: event.target.value }) }))} placeholder="LinkedIn URL" value={candidate.socialLinks?.linkedin || ""} />
              <input className="input" disabled={!editMode} onChange={(event) => setCandidate((current) => ({ ...current, socialLinks: mergeSocialLinks({ ...current.socialLinks, github: event.target.value }) }))} placeholder="GitHub URL" value={candidate.socialLinks?.github || ""} />
              <input className="input" disabled={!editMode} onChange={(event) => setCandidate((current) => ({ ...current, socialLinks: mergeSocialLinks({ ...current.socialLinks, portfolio: event.target.value }) }))} placeholder="Portfolio URL" value={candidate.socialLinks?.portfolio || ""} />
              <input className="input" disabled={!editMode} onChange={(event) => setCandidate((current) => ({ ...current, socialLinks: mergeSocialLinks({ ...current.socialLinks, website: event.target.value }) }))} placeholder="Website URL" value={candidate.socialLinks?.website || ""} />
            </div>
            <div className="mt-5 space-y-6">
              <TagInput
                label="Preferred roles"
                onChange={(values) =>
                  setCandidate((current) => ({
                    ...current,
                    jobPreferences: mergeJobPreferences({ ...current.jobPreferences, preferredRoles: values }),
                  }))
                }
                placeholder="Add a role"
                values={candidate.jobPreferences?.preferredRoles || []}
              />
              <TagInput
                label="Preferred industries"
                onChange={(values) =>
                  setCandidate((current) => ({
                    ...current,
                    jobPreferences: mergeJobPreferences({ ...current.jobPreferences, preferredIndustries: values }),
                  }))
                }
                placeholder="Add an industry"
                values={candidate.jobPreferences?.preferredIndustries || []}
              />
              <TagInput
                label="Preferred locations"
                onChange={(values) =>
                  setCandidate((current) => ({
                    ...current,
                    jobPreferences: mergeJobPreferences({ ...current.jobPreferences, preferredLocations: values }),
                  }))
                }
                placeholder="Add a location"
                values={candidate.jobPreferences?.preferredLocations || []}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
