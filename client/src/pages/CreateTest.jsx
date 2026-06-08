import { useLocation, useNavigate } from "react-router-dom";
import { createTest } from "../api";
import TestForm from "../components/TestForm";

// The Create page is tiny: it renders the shared <TestForm/> and tells it
// "when saved, POST a new test, then go Home." It can ALSO be reached from the
// resume parser with drafted questions in router state — in which case we
// pre-fill the form so the recruiter reviews/edits an AI draft instead of a
// blank form.
function CreateTest() {
  const navigate = useNavigate();
  const location = useLocation();

  // Questions handed over from "Generate test from this resume" (or undefined
  // for a normal blank create). source is "bank" or "groq". candidateId is set
  // when the draft came from a STORED candidate — saving then also ASSIGNS the
  // test to them (it appears on their "My tests" page).
  const draftQuestions = location.state?.questions;
  const draftSource = location.state?.source;
  const candidateId = location.state?.candidateId;
  const candidateName = location.state?.candidateName;

  async function handleSave(testData) {
    // candidateId rides along in the same POST; the backend creates the
    // Assignment in the same breath as the Test.
    await createTest({ ...testData, candidateId }); // POST /api/tests
    navigate("/");
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Create a test</h1>

      {draftQuestions && (
        <p className="mb-6 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          ✨ Draft generated from a resume
          {draftSource === "bank" ? " (skill bank)" : ""}. Review and edit the
          questions and answers below, then save.
          {candidateId && (
            <span className="mt-1 block font-medium">
              📩 Saving will send this test to{" "}
              {candidateName || "this candidate"} — it'll appear under their
              "My tests".
            </span>
          )}
        </p>
      )}

      <TestForm
        // When we have a draft, pre-fill the questions; otherwise TestForm uses
        // its own blank default. (key forces a fresh form if a draft arrives.)
        key={draftQuestions ? "draft" : "blank"}
        initialQuestions={draftQuestions || undefined}
        submitLabel="Save test"
        onSave={handleSave}
      />
    </div>
  );
}

export default CreateTest;
