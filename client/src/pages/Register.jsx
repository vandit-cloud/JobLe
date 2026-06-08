import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth";

function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [role, setRole] = useState("recruiter"); // which side of the app?
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register(email, password, companyName, role);
      // "/" sorts both roles out: recruiters see the dashboard, candidates
      // get bounced to /board by ProtectedRoute.
      navigate("/");
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-2xl font-bold">Create an account</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-red-600">⚠️ {error}</p>}

        {/* Account type — decides which side of TalentLeague you see. */}
        <div className="flex gap-2">
          {[
            { value: "recruiter", label: "I'm hiring" },
            { value: "candidate", label: "I'm looking for a job" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button" // not a submit button!
              onClick={() => setRole(opt.value)}
              className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${
                role === opt.value
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <label className="block">
          <span className="text-sm font-medium">Email</span>
          <input
            type="email"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        {/* Company only applies to recruiters. */}
        {role === "recruiter" && (
          <label className="block">
            <span className="text-sm font-medium">Company name</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="shown to candidates on the job board"
            />
          </label>
        )}
        <label className="block">
          <span className="text-sm font-medium">Password</span>
          <input
            type="password"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="at least 6 characters"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-500">
        Already have an account?{" "}
        <Link to="/login" className="text-blue-600 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

export default Register;
