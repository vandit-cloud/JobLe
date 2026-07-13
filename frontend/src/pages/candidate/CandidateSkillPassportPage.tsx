import { Award, CheckCircle2, ClipboardCheck, Mail, Plus, Sparkles, Trash2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import {
  fetchCandidateTalentInvitations,
  fetchCandidateSkillPassport,
  respondToTalentInvitation,
  startCandidateStandardSkillTest,
  submitCandidateStandardSkillTest,
  updateCandidateSkillPassportSkills,
} from "../../api/recruiter";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { MatchScoreBadge } from "../../components/common/MatchScoreBadge";
import { PageHeader } from "../../components/common/PageHeader";
import { StatisticCard } from "../../components/common/StatisticCard";
import { useToast } from "../../context/ToastContext";
import type { SkillPassport, TalentInvitation } from "../../types";

const LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"] as const;
const CATEGORIES = ["Frontend", "Backend", "Database", "Tools", "General"] as const;

export function CandidateSkillPassportPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passport, setPassport] = useState<SkillPassport | null>(null);
  const [invitations, setInvitations] = useState<TalentInvitation[]>([]);
  const [skills, setSkills] = useState<SkillPassport["confirmedSkills"]>([]);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});

  useEffect(() => {
    Promise.all([fetchCandidateSkillPassport(), fetchCandidateTalentInvitations()])
      .then(([item, invitationItems]) => {
        setPassport(item);
        setSkills(item.confirmedSkills || []);
        setInvitations(invitationItems);
      })
      .catch(() => showToast("Unable to load your skill passport.", "error"))
      .finally(() => setLoading(false));
  }, []);

  async function saveSkills() {
    try {
      setSaving(true);
      const updated = await updateCandidateSkillPassportSkills(skills);
      setPassport(updated);
      setSkills(updated.confirmedSkills);
      showToast("Confirmed skills saved and test plan refreshed.", "success");
    } catch {
      showToast("Add at least one confirmed skill before saving.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function startTest() {
    const updated = await startCandidateStandardSkillTest();
    setPassport(updated);
    setAnswers({});
    showToast("Standard skill test started.", "success");
  }

  async function submitTest() {
    const updated = await submitCandidateStandardSkillTest(answers);
    setPassport(updated);
    showToast("Skill passport verified.", "success");
  }

  async function respondToInvitation(invitationId: string, response: "Accepted" | "Rejected") {
    try {
      await respondToTalentInvitation(invitationId, response);
      setInvitations((current) => current.map((item) => (item.id === invitationId ? { ...item, status: response } : item)));
      showToast(`Invitation ${response.toLowerCase()}.`, "success");
    } catch {
      showToast("Unable to update this invitation right now.", "error");
    }
  }

  if (loading) return <LoadingSkeleton className="h-[36rem]" />;

  if (!passport) {
    return <EmptyState title="Skill passport unavailable" description="Upload and confirm your resume data first, then return here." />;
  }

  const currentQuestions = passport.currentTest?.status === "In Progress" ? passport.currentTest.questions : [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Verified skills"
        title="Skill Passport"
        description="Confirm resume skills, take a standardized skill test, and publish recruiter-visible verification badges."
        action={
          <button className="btn-primary" onClick={startTest} type="button">
            <ClipboardCheck className="h-4 w-4" />
            Start standard test
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatisticCard title="Overall score" value={passport.result?.overallScore ? `${passport.result.overallScore}%` : "Pending"} icon={Sparkles} />
        <StatisticCard title="Level" value={passport.result?.level || "Not verified"} icon={Award} accent="from-emerald-200/35 to-white" />
        <StatisticCard title="Badges" value={passport.result?.badges?.length || 0} icon={ClipboardCheck} accent="from-sky-200/35 to-white" />
      </div>

      <div className="glass-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-tide">Step 1</p>
            <h2 className="mt-2 text-2xl font-bold text-ink">Confirm your skills</h2>
          </div>
          <button
            className="btn-secondary"
            onClick={() => setSkills((current) => [...current, { name: "", category: "General", level: "Intermediate" }])}
            type="button"
          >
            <Plus className="h-4 w-4" />
            Add skill
          </button>
        </div>

        <div className="mt-5 grid gap-3">
          {skills.map((skill, index) => (
            <div key={`${skill.name}-${index}`} className="grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-[1fr_12rem_12rem_auto]">
              <input
                className="input"
                onChange={(event) => setSkills((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, name: event.target.value } : item)))}
                placeholder="Skill"
                value={skill.name}
              />
              <select
                className="input"
                onChange={(event) => setSkills((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, category: event.target.value } : item)))}
                value={skill.category}
              >
                {CATEGORIES.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
              <select
                className="input"
                onChange={(event) => setSkills((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, level: event.target.value as any } : item)))}
                value={skill.level}
              >
                {LEVELS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
              <button className="btn-danger" onClick={() => setSkills((current) => current.filter((_, itemIndex) => itemIndex !== index))} type="button">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <button className="btn-primary" disabled={saving} onClick={saveSkills} type="button">
            {saving ? "Saving..." : "Save confirmed skills"}
          </button>
        </div>
      </div>

      <div className="glass-panel p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-tide">Step 2</p>
        <h2 className="mt-2 text-2xl font-bold text-ink">{passport.testPlan.testType}</h2>
        <p className="mt-2 text-sm text-slate-600">Duration: {passport.testPlan.durationMinutes} minutes. Questions use approved bank items when available, with standardized fallback questions for fair comparison.</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {passport.testPlan.sections.map((section) => (
            <div key={`${section.title}-${section.skill}`} className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-bold text-ink">{section.title}</p>
              <p className="mt-1 text-sm text-slate-600">
                {section.questionCount} {section.questionType} questions · {section.durationMinutes} min
              </p>
            </div>
          ))}
        </div>
      </div>

      {currentQuestions.length ? (
        <div className="glass-panel p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-tide">Step 3</p>
          <h2 className="mt-2 text-2xl font-bold text-ink">Standard skill test</h2>
          <div className="mt-5 space-y-4">
            {currentQuestions.map((question, index) => (
              <div key={question.questionId} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-500">{question.sectionTitle}</p>
                <h3 className="mt-2 text-base font-bold text-ink">{index + 1}. {question.questionText}</h3>
                <div className="mt-3 grid gap-2">
                  {question.options.map((option) => (
                    <label key={option.id} className="flex cursor-pointer items-center gap-3 rounded-xl bg-white px-3 py-2 text-sm text-slate-700">
                      <input
                        checked={(answers[question.questionId] || []).includes(option.id)}
                        name={question.questionId}
                        onChange={() => setAnswers((current) => ({ ...current, [question.questionId]: [option.id] }))}
                        type="radio"
                      />
                      {option.text}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <button className="btn-primary" onClick={submitTest} type="button">
              Submit skill test
            </button>
          </div>
        </div>
      ) : null}

      {passport.result?.overallScore ? (
        <div className="glass-panel p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-tide">Candidate Skill Passport</p>
              <h2 className="mt-2 text-2xl font-bold text-ink">Verified result</h2>
            </div>
            <MatchScoreBadge score={passport.result.overallScore} />
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {passport.result.skillScores.map((item) => (
              <div key={item.skill} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-ink">{item.skill}</p>
                  <span className="text-sm font-bold text-tide">{item.score}%</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {passport.result.badges.map((badge) => (
              <span key={badge.title} className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                {badge.title} · {badge.score}% · {badge.level}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="glass-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-tide">Recruiter invitations</p>
            <h2 className="mt-2 text-2xl font-bold text-ink">Talent pool responses</h2>
            <p className="mt-2 text-sm text-slate-600">Companies that discover your verified Skill Passport can invite you to apply, interview, or complete a job-specific step.</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
            <Mail className="h-5 w-5" />
          </div>
        </div>

        {invitations.length ? (
          <div className="mt-5 grid gap-3">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-ink">{invitation.actionType}</p>
                    <p className="mt-1 text-sm text-slate-600">{invitation.message}</p>
                    {invitation.createdAt ? (
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        {new Date(invitation.createdAt).toLocaleDateString()}
                      </p>
                    ) : null}
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-600">
                    {invitation.status}
                  </span>
                </div>

                {invitation.status === "Sent" ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button className="btn-primary" onClick={() => respondToInvitation(invitation.id, "Accepted")} type="button">
                      <CheckCircle2 className="h-4 w-4" />
                      Accept
                    </button>
                    <button className="btn-secondary" onClick={() => respondToInvitation(invitation.id, "Rejected")} type="button">
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            No recruiter invitations yet. Once your verified result is public, matching companies can contact you from the Talent Pool.
          </div>
        )}
      </div>
    </div>
  );
}
