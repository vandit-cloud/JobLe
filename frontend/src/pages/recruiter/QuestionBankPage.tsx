import { useEffect, useState } from "react";
import {
  createQuestionBankItem,
  deleteQuestionBankItem,
  fetchQuestionBank,
  updateQuestionBankItem,
} from "../../api/recruiter";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { PageHeader } from "../../components/common/PageHeader";
import { SearchInput } from "../../components/common/SearchInput";
import { TagInput } from "../../components/forms/TagInput";
import { useToast } from "../../context/ToastContext";

const DEFAULT_DRAFT = {
  questionText: "",
  questionType: "MCQ",
  skill: "",
  topic: "",
  difficulty: "Medium",
  marks: 2,
  negativeMarks: 0,
  expectedAnswer: "",
  answerExplanation: "",
  source: "Manual",
  tags: [] as string[],
  options: [
    { id: "a", text: "" },
    { id: "b", text: "" },
  ],
};

export function QuestionBankPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [questionTypeFilter, setQuestionTypeFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [questions, setQuestions] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(DEFAULT_DRAFT);

  async function load() {
    setLoading(true);
    try {
      const response = await fetchQuestionBank({
        search,
        questionType: questionTypeFilter,
        difficulty: difficultyFilter,
        skill: skillFilter,
        limit: 50,
      });
      setQuestions(response.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [difficultyFilter, questionTypeFilter, search, skillFilter]);

  function resetDraft() {
    setEditingId(null);
    setDraft(DEFAULT_DRAFT);
  }

  async function saveQuestion() {
    if (editingId) {
      await updateQuestionBankItem(editingId, draft);
      showToast("Question bank item updated.", "success");
    } else {
      await createQuestionBankItem(draft);
      showToast("Question saved to the bank.", "success");
    }

    resetDraft();
    load();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Question bank"
        title="Reusable question bank"
        description="Store, search, edit, duplicate, and reuse recruiter-owned questions across multiple assessments."
      />

      <div className="glass-panel p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Search questions</label>
            <SearchInput value={search} onChange={setSearch} placeholder="Search by text, skill, or topic" />
          </div>
          <div>
            <label className="label">Question type filter</label>
            <select className="input" value={questionTypeFilter} onChange={(event) => setQuestionTypeFilter(event.target.value)}>
              <option value="">All types</option>
              {["MCQ", "Syntax and Debugging", "Logic Test", "Coding Test", "Short Answer", "File Submission"].map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Difficulty filter</label>
            <select className="input" value={difficultyFilter} onChange={(event) => setDifficultyFilter(event.target.value)}>
              <option value="">All levels</option>
              {["Easy", "Medium", "Hard"].map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Skill filter</label>
            <input className="input" placeholder="Filter list by skill" value={skillFilter} onChange={(event) => setSkillFilter(event.target.value)} />
          </div>

          <div className="md:col-span-2">
            <label className="label">Question text</label>
            <textarea className="input min-h-24" value={draft.questionText} onChange={(event) => setDraft((current) => ({ ...current, questionText: event.target.value }))} />
          </div>
          <div>
            <label className="label">Question type</label>
            <select className="input" value={draft.questionType} onChange={(event) => setDraft((current) => ({ ...current, questionType: event.target.value }))}>
              {["MCQ", "Syntax and Debugging", "Logic Test", "Coding Test", "Short Answer", "File Submission"].map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Difficulty</label>
            <select className="input" value={draft.difficulty} onChange={(event) => setDraft((current) => ({ ...current, difficulty: event.target.value }))}>
              {["Easy", "Medium", "Hard"].map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Skill</label>
            <input className="input" value={draft.skill} onChange={(event) => setDraft((current) => ({ ...current, skill: event.target.value }))} />
          </div>
          <div>
            <label className="label">Topic</label>
            <input className="input" value={draft.topic} onChange={(event) => setDraft((current) => ({ ...current, topic: event.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <TagInput
              label="Tags"
              values={draft.tags}
              onChange={(tags) => setDraft((current) => ({ ...current, tags }))}
              placeholder="Add a tag"
            />
          </div>
          <div className="md:col-span-2">
            <label className="label">Expected answer</label>
            <textarea
              className="input min-h-24"
              value={draft.expectedAnswer}
              onChange={(event) => setDraft((current) => ({ ...current, expectedAnswer: event.target.value }))}
            />
          </div>
          <div className="md:col-span-2">
            <label className="label">Answer explanation</label>
            <textarea
              className="input min-h-24"
              value={draft.answerExplanation}
              onChange={(event) => setDraft((current) => ({ ...current, answerExplanation: event.target.value }))}
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-3">
          {editingId ? (
            <button className="btn-secondary" onClick={resetDraft} type="button">
              Cancel edit
            </button>
          ) : null}
          <button className="btn-primary" onClick={saveQuestion} type="button">
            {editingId ? "Save changes" : "Save question"}
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton className="h-72" />
      ) : questions.length === 0 ? (
        <EmptyState title="No question bank items yet" description="Add a reusable question to get started." />
      ) : (
        <div className="grid gap-4">
          {questions.map((question) => (
            <div key={question._id} className="glass-panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-ink">{question.questionText}</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    {question.questionType} | {question.skill || "General"} | {question.difficulty}
                  </p>
                  {question.tags?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {question.tags.map((tag: string) => (
                        <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setEditingId(question._id);
                      setDraft({
                        questionText: question.questionText || "",
                        questionType: question.questionType || "MCQ",
                        skill: question.skill || "",
                        topic: question.topic || "",
                        difficulty: question.difficulty || "Medium",
                        marks: question.marks || 2,
                        negativeMarks: question.negativeMarks || 0,
                        expectedAnswer: question.expectedAnswer || "",
                        answerExplanation: question.answerExplanation || "",
                        source: question.source || "Manual",
                        tags: question.tags || [],
                        options: question.options?.length
                          ? question.options
                          : [
                              { id: "a", text: "" },
                              { id: "b", text: "" },
                            ],
                      });
                    }}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={async () => {
                      await createQuestionBankItem({
                        ...question,
                        questionText: `${question.questionText} (Copy)`,
                      });
                      showToast("Question duplicated.", "success");
                      load();
                    }}
                    type="button"
                  >
                    Duplicate
                  </button>
                  <button
                    className="btn-danger"
                    onClick={async () => {
                      const message = await deleteQuestionBankItem(question._id);
                      showToast(message, "success");
                      if (editingId === question._id) {
                        resetDraft();
                      }
                      load();
                    }}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
