import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

// Account settings — for now its main job is the "Delete account" danger zone.
// Reached from the nav (the "Settings" link, shown to any logged-in user).
// Works for BOTH roles; the warning text adapts to what actually gets removed.
function Settings() {
  const { email, role, companyName, deleteAccount } = useAuth();
  const navigate = useNavigate();

  const [confirming, setConfirming] = useState(false); // danger box revealed?
  const [typed, setTyped] = useState(""); // must equal "DELETE" to arm
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isRecruiter = role !== "candidate";
  const armed = typed.trim().toUpperCase() === "DELETE";

  async function handleDelete() {
    setError("");
    setBusy(true);
    try {
      await deleteAccount(); // server deletes, then we're logged out
      // Account is gone — send them to a public page.
      navigate("/login", { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">Account settings</h1>

      {/* Account info */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Email</dt>
            <dd className="font-medium">{email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Account type</dt>
            <dd className="font-medium capitalize">{role || "recruiter"}</dd>
          </div>
          {isRecruiter && companyName && (
            <div className="flex justify-between">
              <dt className="text-slate-500">Company</dt>
              <dd className="font-medium">{companyName}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Danger zone */}
      <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-5">
        <h2 className="font-semibold text-red-800">Delete account</h2>
        <p className="mt-1 text-sm text-red-700">
          {isRecruiter
            ? "This permanently deletes your account and everything you own — your jobs, tests, talent pool, matches, assignments and results. This cannot be undone."
            : "This permanently deletes your login. (Resumes you sent to companies stay in their hands.) This cannot be undone."}
        </p>

        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            className="mt-4 rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            Delete my account
          </button>
        ) : (
          <div className="mt-4">
            <label className="block text-sm font-medium text-red-800">
              Type <span className="font-mono">DELETE</span> to confirm
            </label>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="mt-1 w-full rounded-md border border-red-300 px-3 py-2"
              placeholder="DELETE"
              autoFocus
            />

            {error && <p className="mt-3 text-sm text-red-700">⚠️ {error}</p>}

            <div className="mt-4 flex gap-3">
              <button
                onClick={handleDelete}
                disabled={!armed || busy}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Deleting…" : "Delete permanently"}
              </button>
              <button
                onClick={() => {
                  setConfirming(false);
                  setTyped("");
                  setError("");
                }}
                disabled={busy}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Settings;
