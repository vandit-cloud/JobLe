import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTestForEdit, updateTest } from "../api";
import TestForm from "../components/TestForm";

// The Edit page: load an existing test, then show the SAME form pre-filled.
function EditTest() {
  const { id } = useParams();        // which test, from the URL
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [error, setError] = useState("");

  // Load the full test (WITH answers) once.
  useEffect(() => {
    getTestForEdit(id)
      .then((data) => setTest(data))
      .catch((e) => setError(e.message));
  }, [id]);

  // ──────────────────────────────────────────────────────────────
  //  TODO (YOUR PART): handleSave
  //  This is the ONLY thing that makes Edit different from Create.
  //  Create's version (see pages/CreateTest.jsx) calls createTest()
  //  then navigate("/"). Yours should do the same, but UPDATE instead:
  //    • call updateTest(id, testData)   ← note: pass the id too!
  //    • then navigate("/") back to the list
  //  It must be `async` and `await` the update (it's already async below).
  // ──────────────────────────────────────────────────────────────
  async function handleSave(testData) {
    await updateTest(id, testData); // PUT /api/tests/:id with the edited test
    navigate("/"); // back to the list, where the updated title now shows
  }

  if (error) return <p className="text-red-600">⚠️ {error}</p>;
  if (!test) return <p className="text-slate-500">Loading test…</p>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Edit test</h1>
      {/* Pre-fill the shared form with this test's existing data. We only
          render it AFTER the test has loaded, so the inputs start correct. */}
      <TestForm
        initialTitle={test.title}
        initialQuestions={test.questions}
        initialPassPercent={test.passPercent}
        initialTimeLimit={test.timeLimitMinutes}
        submitLabel="Update test"
        onSave={handleSave}
      />
    </div>
  );
}

export default EditTest;
