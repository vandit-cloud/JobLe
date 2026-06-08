import {
  Routes,
  Route,
  Link,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import Home from "./pages/Home";
import CreateTest from "./pages/CreateTest";
import TakeTest from "./pages/TakeTest";
import Results from "./pages/Results";
import EditTest from "./pages/EditTest";
import Jobs from "./pages/Jobs";
import MatchResume from "./pages/MatchResume";
import BulkMatch from "./pages/BulkMatch";
import Candidates from "./pages/Candidates";
import Board from "./pages/Board";
import Apply from "./pages/Apply";
import MyTests from "./pages/MyTests";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./auth";

function App() {
  const { token, email, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Candidates land on /take/:id via a shared link, or browse /board and
  // /apply/:id. They should see clean, candidate-facing pages — NOT the
  // recruiter app's links.
  const onCandidatePage =
    location.pathname.startsWith("/take/") ||
    location.pathname.startsWith("/apply/") ||
    location.pathname === "/board";

  // The exam page is special even among candidate pages: NO controls at all,
  // so nothing on screen can navigate away mid-test. The board/apply pages DO
  // show login/logout — candidates have accounts now.
  const onExamPage = location.pathname.startsWith("/take/");

  // Recruiter links are for logged-in RECRUITERS only — a logged-in candidate
  // never sees Tests/Jobs/Candidates.
  const isRecruiter = token && role !== "candidate";
  const isCandidate = token && role === "candidate";

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <nav className="flex items-center gap-6 border-b border-slate-200 bg-white px-6 py-4">
        {/* On the candidate page the brand is just a label (not a link into
            the recruiter app). Everywhere else it links home. */}
        {onExamPage ? (
          // Mid-exam the brand is a plain label — a click can't leave the test.
          <span className="text-xl font-bold text-blue-600">TalentLeague</span>
        ) : (
          // Everyone else gets a brand link to THEIR home: recruiters to the
          // dashboard, candidates (and anonymous visitors on candidate pages)
          // to the public board.
          <Link
            to={isRecruiter ? "/" : "/board"}
            className="text-xl font-bold text-blue-600"
          >
            TalentLeague
          </Link>
        )}

        {/* Recruiter links: logged-in recruiters only, and never on
            candidate-facing pages. */}
        {isRecruiter && !onCandidatePage && (
          <>
            <Link to="/" className="text-sm text-slate-600 hover:text-blue-600">
              Tests
            </Link>
            {/* "Create Test" and "Resume parser" both used to live here.
                Create Test → the "+ New test" button on the Tests page.
                Resume parser → folded into Candidates (upload + expandable
                profile), so resumes always become stored candidates. */}
            <Link
              to="/jobs"
              className="text-sm text-slate-600 hover:text-blue-600"
            >
              Jobs
            </Link>
            <Link
              to="/candidates"
              className="text-sm text-slate-600 hover:text-blue-600"
            >
              Candidates
            </Link>
          </>
        )}

        {/* Candidate links: the board + the tests waiting for them. */}
        {isCandidate && !onExamPage && (
          <>
            <Link
              to="/board"
              className="text-sm text-slate-600 hover:text-blue-600"
            >
              Job board
            </Link>
            <Link
              to="/my-tests"
              className="text-sm text-slate-600 hover:text-blue-600"
            >
              My tests
            </Link>
          </>
        )}

        {/* Auth controls — hidden only during an exam. On /board they let
            candidates register/log in and log out. */}
        {!onExamPage && (
        <div className="ml-auto flex items-center gap-4 text-sm">
          {token ? (
            <>
              <span className="text-slate-400">{email}</span>
              <button
                onClick={handleLogout}
                className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-100"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-slate-600 hover:text-blue-600">
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-md bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700"
              >
                Register
              </Link>
            </>
          )}
        </div>
        )}
      </nav>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <Routes>
          {/* Public auth pages */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Public CANDIDATE pages — no login needed */}
          <Route path="/take/:id" element={<TakeTest />} />
          <Route path="/board" element={<Board />} />
          <Route path="/apply/:jobId" element={<Apply />} />

          {/* Logged-in CANDIDATE page. Guarded inline: the API behind it
              requires a candidate token anyway, so a recruiter just sees
              an error state — but bouncing them to "/" is kinder. */}
          <Route
            path="/my-tests"
            element={
              token && role === "candidate" ? (
                <MyTests />
              ) : (
                <Navigate to="/board" replace />
              )
            }
          />

          {/* Recruiter-only pages — wrapped so they redirect to /login */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create"
            element={
              <ProtectedRoute>
                <CreateTest />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tests/:id/results"
            element={
              <ProtectedRoute>
                <Results />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tests/:id/edit"
            element={
              <ProtectedRoute>
                <EditTest />
              </ProtectedRoute>
            }
          />
          <Route
            path="/jobs"
            element={
              <ProtectedRoute>
                <Jobs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/jobs/:id/match"
            element={
              <ProtectedRoute>
                <MatchResume />
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidates"
            element={
              <ProtectedRoute>
                <Candidates />
              </ProtectedRoute>
            }
          />
          <Route
            path="/jobs/:id/bulk"
            element={
              <ProtectedRoute>
                <BulkMatch />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;
