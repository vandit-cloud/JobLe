import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createAssessment, fetchAssessment, fetchJobs, generateAssessmentQuestions, updateAssessment } from "../../api/recruiter";
import { FormError } from "../../components/common/FormError";
import { PageHeader } from "../../components/common/PageHeader";
import { AssessmentStepper } from "../../components/recruiter/AssessmentStepper";
import { TagInput } from "../../components/forms/TagInput";
import { assessmentFormSchema, type AssessmentFormValues } from "../../schemas/assessmentSchema";
import { useToast } from "../../context/ToastContext";

const steps = ["Basic information", "Sections", "Questions", "Settings"];

const defaultValues: AssessmentFormValues = {
  title: "",
  description: "",
  jobId: "",
  category: "Technical",
  experienceLevel: "Entry level",
  assessmentLanguage: "English",
  candidateInstructions: "",
  sections: [
    {
      title: "Section 1",
      description: "",
      type: "MCQ",
      duration: 15,
      numberOfQuestions: 1,
      totalMarks: 2,
      passingScore: 1,
      negativeMarking: false,
      sectionOrder: 1,
      isMandatory: true,
      questions: [
        {
          questionText: "",
          questionType: "MCQ",
          skill: "",
          topic: "",
          difficulty: "Easy",
          marks: 2,
          negativeMarks: 0,
          expectedAnswer: "",
          answerExplanation: "",
          source: "Manual",
          options: [
            { id: "a", text: "" },
            { id: "b", text: "" },
          ],
          correctOptionIds: [],
          visibleTestCases: [],
          hiddenTestCases: [],
          allowedLanguages: [],
          starterCode: {},
        },
      ],
    },
  ],
  settings: {
    totalDuration: 15,
    overallPassingPercentage: 60,
    maximumAttempts: 1,
    assessmentStartDate: "",
    assessmentEndDate: "",
    invitationLinkExpiry: "",
    autoSubmitWhenTimeEnds: true,
    allowCandidateReviewPreviousAnswers: true,
    allowCandidateChangeAnswersBeforeSubmission: true,
    allowCalculator: false,
    allowCodeExecution: true,
    requireResume: true,
    requireCandidateEmailVerification: true,
    requireCandidateConsent: true,
    showResultImmediately: false,
    allowRetake: false,
    retakeWaitingPeriod: 0,
  },
  resumeMatchSettings: {
    requiredSkills: [],
    strongMatchThreshold: 75,
    partialMatchThreshold: 45,
    allowRecruiterOverride: true,
  },
  integritySettings: {
    fullScreenMode: true,
    tabSwitchMonitoring: true,
    browserFocusMonitoring: true,
    copyDetection: true,
    pasteDetection: true,
    rightClickMonitoring: true,
    multipleSessionDetection: true,
    multipleDeviceDetection: true,
    ipChangeDetection: true,
    questionRandomization: true,
    answerOptionRandomization: true,
    oneTimeInvitationTokens: true,
    codeSimilarityDetection: true,
    cameraMonitoring: false,
  },
  resultVisibility: {
    showCompleteResult: true,
    showOverallScoreOnly: true,
    showSectionScores: true,
    showPassFailOnly: true,
    hideResultUntilRecruiterReview: false,
    showCorrectAnswers: true,
  },
};

export function AssessmentBuilderPage() {
  const { assessmentId } = useParams();
  const editing = Boolean(assessmentId);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [jobs, setJobs] = useState<Array<{ _id: string; title: string }>>([]);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);

  const {
    register,
    control,
    setValue,
    watch,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<AssessmentFormValues>({
    resolver: zodResolver(assessmentFormSchema),
    defaultValues,
  });

  const values = watch();

  useEffect(() => {
    fetchJobs({ limit: 50 }).then((response) => setJobs(response.items.map((job) => ({ _id: job._id, title: job.title }))));
    if (editing && assessmentId) {
      fetchAssessment(assessmentId).then((response) => {
        reset({
          ...response.assessment,
          jobId: typeof response.assessment.jobId === "string" ? response.assessment.jobId : response.assessment.jobId?._id || "",
          settings: {
            ...response.assessment.settings,
            assessmentStartDate: response.assessment.settings.assessmentStartDate?.slice(0, 16) || "",
            assessmentEndDate: response.assessment.settings.assessmentEndDate?.slice(0, 16) || "",
            invitationLinkExpiry: response.assessment.settings.invitationLinkExpiry?.slice(0, 16) || "",
          },
        } as AssessmentFormValues);
      });
    }
  }, [assessmentId, editing, reset]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (!values.title) return;
      localStorage.setItem(
        `assessment-draft-${assessmentId || "new"}`,
        JSON.stringify({
          ...values,
          autosavedAt: new Date().toISOString(),
        }),
      );
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [assessmentId, values]);

  const sections = watch("sections");

  async function onSubmit(formValues: AssessmentFormValues) {
    setSubmitting(true);
    try {
      if (editing && assessmentId) {
        await updateAssessment(assessmentId, formValues);
        showToast("Assessment updated successfully.", "success");
        navigate(`/recruiter/assessments/${assessmentId}`);
      } else {
        const created = await createAssessment(formValues);
        showToast("Assessment created successfully.", "success");
        navigate(`/recruiter/assessments/${created._id}`);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Assessment builder"
        title={editing ? "Edit assessment" : "Create assessment"}
        description="Build your assessment step by step, auto-save draft progress locally, and use AI only for editable drafts."
        action={editing ? <Link className="btn-secondary" to={`/recruiter/assessments/${assessmentId}/preview`}>Preview</Link> : undefined}
      />

      <AssessmentStepper steps={steps} currentStep={step} onStepChange={setStep} />

      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        {step === 0 ? (
          <div className="glass-panel p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label">Assessment title</label>
                <input className="input" {...register("title")} />
                <FormError message={errors.title?.message} />
              </div>
              <div>
                <label className="label">Related job</label>
                <select className="input" {...register("jobId")}>
                  <option value="">Reusable / no job</option>
                  {jobs.map((job) => (
                    <option key={job._id} value={job._id}>
                      {job.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Assessment category</label>
                <select className="input" {...register("category")}>
                  {["Technical", "Aptitude", "General screening", "Role-specific", "Coding", "Mixed assessment"].map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Experience level</label>
                <select className="input" {...register("experienceLevel")}>
                  {["Fresher", "Entry level", "Intermediate", "Senior"].map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
                <FormError message={errors.experienceLevel?.message} />
              </div>
              <div>
                <label className="label">Assessment language</label>
                <input className="input" {...register("assessmentLanguage")} />
              </div>
              <div className="md:col-span-2">
                <label className="label">Internal description</label>
                <textarea className="input min-h-28" {...register("description")} />
              </div>
              <div className="md:col-span-2">
                <label className="label">Candidate instructions</label>
                <textarea className="input min-h-36" {...register("candidateInstructions")} />
                <FormError message={errors.candidateInstructions?.message} />
              </div>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="grid gap-6">
            {sections.map((section, index) => (
              <div key={index} className="glass-panel p-6">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-xl font-bold text-ink">Section {index + 1}</h2>
                  <div className="flex gap-2">
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        const next = [...sections];
                        next.splice(index, 0, { ...section, title: `${section.title} Copy` });
                        setValue("sections", next);
                      }}
                      type="button"
                    >
                      Duplicate
                    </button>
                    {sections.length > 1 ? (
                      <button
                        className="btn-danger"
                        onClick={() => setValue("sections", sections.filter((_, currentIndex) => currentIndex !== index))}
                        type="button"
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <label className="label">Section title</label>
                    <input className="input" {...register(`sections.${index}.title` as const)} />
                  </div>
                  <div>
                    <label className="label">Section type</label>
                    <select className="input" {...register(`sections.${index}.type` as const)}>
                      {["MCQ", "Syntax and Debugging", "Logic Test", "Coding Test", "Short Answer", "File Submission"].map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Duration</label>
                    <input className="input" type="number" {...register(`sections.${index}.duration` as const)} />
                  </div>
                  <div>
                    <label className="label">Passing score</label>
                    <input className="input" type="number" {...register(`sections.${index}.passingScore` as const)} />
                  </div>
                  <div className="md:col-span-2 xl:col-span-4">
                    <label className="label">Section description</label>
                    <textarea className="input min-h-24" {...register(`sections.${index}.description` as const)} />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-6">
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input type="checkbox" {...register(`sections.${index}.negativeMarking` as const)} />
                    Negative marking
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input type="checkbox" {...register(`sections.${index}.isMandatory` as const)} />
                    Mandatory section
                  </label>
                </div>
              </div>
            ))}

            <button
              className="btn-secondary"
              onClick={() =>
                setValue("sections", [
                  ...sections,
                  {
                    title: `Section ${sections.length + 1}`,
                    description: "",
                    type: "MCQ",
                    duration: 15,
                    numberOfQuestions: 1,
                    totalMarks: 2,
                    passingScore: 1,
                    negativeMarking: false,
                    sectionOrder: sections.length + 1,
                    isMandatory: true,
                    questions: [
                      {
                        questionText: "",
                        questionType: "MCQ",
                        skill: "",
                        topic: "",
                        difficulty: "Easy",
                        marks: 2,
                        negativeMarks: 0,
                        expectedAnswer: "",
                        answerExplanation: "",
                        source: "Manual",
                        options: [
                          { id: "a", text: "" },
                          { id: "b", text: "" },
                        ],
                        correctOptionIds: [],
                        visibleTestCases: [],
                        hiddenTestCases: [],
                        allowedLanguages: [],
                        starterCode: {},
                      },
                    ],
                  },
                ])
              }
              type="button"
            >
              Add section
            </button>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-6">
            <div className="glass-panel flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-bold text-ink">Questions</h2>
                <p className="mt-2 text-sm text-slate-600">Edit generated content before publishing and keep every question complete.</p>
              </div>
              <button
                className="btn-secondary gap-2"
                onClick={async () => {
                  setGenerating(true);
                  try {
                    const generated = await generateAssessmentQuestions({
                      jobRole: values.title || "Assessment role",
                      skills: values.resumeMatchSettings.requiredSkills.length ? values.resumeMatchSettings.requiredSkills : ["Communication"],
                      experienceLevel: values.experienceLevel,
                      questionType: sections[0]?.type || "MCQ",
                      difficulty: "Medium",
                      numberOfQuestions: 2,
                      programmingLanguage: "JavaScript",
                    });
                    const next = [...sections];
                    next[0].questions = generated.questions.map((question) => ({
                      ...question,
                      options: question.options || [
                        { id: "a", text: "" },
                        { id: "b", text: "" },
                      ],
                      correctOptionIds: question.correctOptionIds || [],
                      visibleTestCases: question.visibleTestCases || [],
                      hiddenTestCases: question.hiddenTestCases || [],
                      allowedLanguages: question.allowedLanguages || [],
                      starterCode: question.starterCode || {},
                    }));
                    setValue("sections", next);
                    showToast("AI draft questions generated. Review them before publishing.", "success");
                  } finally {
                    setGenerating(false);
                  }
                }}
                type="button"
              >
                <Sparkles className="h-4 w-4" />
                {generating ? "Generating..." : "Generate draft questions"}
              </button>
            </div>

            {sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="glass-panel p-6">
                <h3 className="text-lg font-bold text-slate-800">{section.title}</h3>
                <div className="mt-5 space-y-6">
                  {section.questions.map((question, questionIndex) => (
                    <div key={questionIndex} className="rounded-3xl bg-slate-50 p-5">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="md:col-span-2">
                          <label className="label">Question text</label>
                          <textarea className="input min-h-24" {...register(`sections.${sectionIndex}.questions.${questionIndex}.questionText` as const)} />
                        </div>
                        <div>
                          <label className="label">Question type</label>
                          <select className="input" {...register(`sections.${sectionIndex}.questions.${questionIndex}.questionType` as const)}>
                            {["MCQ", "Syntax and Debugging", "Logic Test", "Coding Test", "Short Answer", "File Submission"].map((option) => (
                              <option key={option}>{option}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="label">Difficulty</label>
                          <select className="input" {...register(`sections.${sectionIndex}.questions.${questionIndex}.difficulty` as const)}>
                            {["Easy", "Medium", "Hard"].map((option) => (
                              <option key={option}>{option}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="label">Skill</label>
                          <input className="input" {...register(`sections.${sectionIndex}.questions.${questionIndex}.skill` as const)} />
                        </div>
                        <div>
                          <label className="label">Topic</label>
                          <input className="input" {...register(`sections.${sectionIndex}.questions.${questionIndex}.topic` as const)} />
                        </div>
                        <div>
                          <label className="label">Marks</label>
                          <input className="input" type="number" {...register(`sections.${sectionIndex}.questions.${questionIndex}.marks` as const)} />
                        </div>
                        <div>
                          <label className="label">Negative marks</label>
                          <input className="input" type="number" {...register(`sections.${sectionIndex}.questions.${questionIndex}.negativeMarks` as const)} />
                        </div>
                        <div className="md:col-span-2">
                          <label className="label">Expected answer</label>
                          <textarea className="input min-h-24" {...register(`sections.${sectionIndex}.questions.${questionIndex}.expectedAnswer` as const)} />
                        </div>
                        <div className="md:col-span-2">
                          <label className="label">Answer explanation</label>
                          <textarea className="input min-h-24" {...register(`sections.${sectionIndex}.questions.${questionIndex}.answerExplanation` as const)} />
                        </div>
                      </div>

                      {watch(`sections.${sectionIndex}.questions.${questionIndex}.questionType`) === "MCQ" ? (
                        <div className="mt-5 space-y-4">
                          <p className="text-sm font-semibold text-slate-700">Options</p>
                          {(watch(`sections.${sectionIndex}.questions.${questionIndex}.options`) || []).map((_, optionIndex) => (
                            <div key={optionIndex} className="flex gap-3">
                              <input className="input" {...register(`sections.${sectionIndex}.questions.${questionIndex}.options.${optionIndex}.text` as const)} placeholder={`Option ${optionIndex + 1}`} />
                              <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                                <input
                                  checked={(watch(`sections.${sectionIndex}.questions.${questionIndex}.correctOptionIds`) || []).includes(String.fromCharCode(97 + optionIndex))}
                                  onChange={(event) => {
                                    const current = watch(`sections.${sectionIndex}.questions.${questionIndex}.correctOptionIds`) || [];
                                    const optionId = String.fromCharCode(97 + optionIndex);
                                    setValue(
                                      `sections.${sectionIndex}.questions.${questionIndex}.correctOptionIds`,
                                      event.target.checked ? [...current, optionId] : current.filter((item) => item !== optionId),
                                    );
                                  }}
                                  type="checkbox"
                                />
                                Correct
                              </label>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {watch(`sections.${sectionIndex}.questions.${questionIndex}.questionType`) === "Coding Test" ? (
                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="label">Problem title</label>
                            <input className="input" {...register(`sections.${sectionIndex}.questions.${questionIndex}.problemTitle` as const)} />
                          </div>
                          <div>
                            <label className="label">Programming language</label>
                            <input className="input" {...register(`sections.${sectionIndex}.questions.${questionIndex}.programmingLanguage` as const)} />
                          </div>
                          <div className="md:col-span-2">
                            <label className="label">Problem statement</label>
                            <textarea className="input min-h-28" {...register(`sections.${sectionIndex}.questions.${questionIndex}.problemStatement` as const)} />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {step === 3 ? (
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="glass-panel p-6">
              <h2 className="text-xl font-bold text-ink">Assessment settings</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label">Total duration</label>
                  <input className="input" type="number" {...register("settings.totalDuration")} />
                </div>
                <div>
                  <label className="label">Overall passing %</label>
                  <input className="input" type="number" {...register("settings.overallPassingPercentage")} />
                </div>
                <div>
                  <label className="label">Maximum attempts</label>
                  <input className="input" type="number" {...register("settings.maximumAttempts")} />
                </div>
                <div>
                  <label className="label">Retake waiting period</label>
                  <input className="input" type="number" {...register("settings.retakeWaitingPeriod")} />
                </div>
                <div>
                  <label className="label">Assessment start</label>
                  <input className="input" type="datetime-local" {...register("settings.assessmentStartDate")} />
                </div>
                <div>
                  <label className="label">Assessment end</label>
                  <input className="input" type="datetime-local" {...register("settings.assessmentEndDate")} />
                </div>
                <div>
                  <label className="label">Invitation expiry</label>
                  <input className="input" type="datetime-local" {...register("settings.invitationLinkExpiry")} />
                </div>
              </div>
              <div className="mt-5 grid gap-3">
                {[
                  ["settings.autoSubmitWhenTimeEnds", "Auto-submit when time ends"],
                  ["settings.allowCandidateReviewPreviousAnswers", "Allow answer review"],
                  ["settings.allowCandidateChangeAnswersBeforeSubmission", "Allow answer changes"],
                  ["settings.allowCalculator", "Allow calculator"],
                  ["settings.allowCodeExecution", "Allow code execution"],
                  ["settings.requireResume", "Require resume"],
                  ["settings.requireCandidateEmailVerification", "Require email verification"],
                  ["settings.requireCandidateConsent", "Require consent"],
                  ["settings.showResultImmediately", "Show result immediately"],
                  ["settings.allowRetake", "Allow retake"],
                ].map(([field, label]) => (
                  <label key={field} className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input type="checkbox" {...register(field as any)} />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="glass-panel p-6">
                <Controller
                  control={control}
                  name="resumeMatchSettings.requiredSkills"
                  render={({ field }) => <TagInput label="Required skills for resume matching" values={field.value} onChange={field.onChange} placeholder="Add a required skill" />}
                />
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="label">Strong match threshold</label>
                    <input className="input" type="number" {...register("resumeMatchSettings.strongMatchThreshold")} />
                  </div>
                  <div>
                    <label className="label">Partial match threshold</label>
                    <input className="input" type="number" {...register("resumeMatchSettings.partialMatchThreshold")} />
                  </div>
                </div>
                <label className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input type="checkbox" {...register("resumeMatchSettings.allowRecruiterOverride")} />
                  Allow recruiter override
                </label>
              </div>

              <div className="glass-panel p-6">
                <h3 className="text-lg font-bold text-slate-800">Integrity rules</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {Object.keys(values.integritySettings).map((key) => (
                    <label key={key} className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                      <input type="checkbox" {...register(`integritySettings.${key}` as const)} />
                      {key}
                    </label>
                  ))}
                </div>
              </div>

              <div className="glass-panel p-6">
                <h3 className="text-lg font-bold text-slate-800">Result visibility</h3>
                <div className="mt-4 grid gap-3">
                  {Object.keys(values.resultVisibility).map((key) => (
                    <label key={key} className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                      <input type="checkbox" {...register(`resultVisibility.${key}` as const)} />
                      {key}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap justify-between gap-3">
          <div className="flex gap-3">
            {step > 0 ? (
              <button className="btn-secondary" onClick={() => setStep((current) => current - 1)} type="button">
                Previous
              </button>
            ) : null}
            {step < steps.length - 1 ? (
              <button className="btn-secondary" onClick={() => setStep((current) => current + 1)} type="button">
                Next
              </button>
            ) : null}
          </div>
          <button className="btn-primary" disabled={submitting} type="submit">
            {submitting ? "Saving..." : editing ? "Save assessment" : "Create assessment"}
          </button>
        </div>
      </form>
    </div>
  );
}

