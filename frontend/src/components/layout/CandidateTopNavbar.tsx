import { Bell, Menu, Search, UserRound } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function titleFromPath(pathname: string) {
  if (pathname.includes("/candidate/profile")) return "My Profile";
  if (pathname.includes("/candidate/resume")) return "Resume";
  if (pathname.includes("/candidate/applications/")) return "Application Details";
  if (pathname.includes("/candidate/applications")) return "My Applications";
  if (pathname.includes("/candidate/assessments")) return "My Assessments";
  if (pathname.includes("/candidate/interviews")) return "Interviews";
  if (pathname.includes("/candidate/notifications")) return "Notifications";
  if (pathname.includes("/candidate/privacy")) return "Privacy Settings";
  if (pathname.includes("/companies/")) return "Company Details";
  if (pathname.includes("/jobs/")) return "Job Details";
  if (pathname === "/jobs") return "Browse Jobs";
  return "Candidate Dashboard";
}

export function CandidateTopNavbar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const initials = useMemo(() => (user?.name || "Candidate").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(), [user?.name]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) {
      params.set("search", search.trim());
    }
    navigate(`/jobs${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <header className="hero-panel sticky top-4 z-20 flex flex-col gap-5 px-5 py-5 md:px-7 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex items-center gap-3">
        <button className="rounded-2xl border border-white/60 bg-white/80 p-3 text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white lg:hidden" onClick={onOpenSidebar} type="button">
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Candidate workspace</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink sm:text-[2rem]">{titleFromPath(location.pathname)}</h1>
        </div>
      </div>

      <div className="flex flex-col gap-3 xl:min-w-[48rem] xl:flex-row xl:items-center xl:justify-end">
        <form className="relative min-w-0 flex-1 xl:max-w-md" onSubmit={handleSubmit}>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input h-14 rounded-[24px] border-white/65 bg-white/80 pl-11 shadow-lg shadow-slate-200/50"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search jobs, skills, or companies"
            value={search}
          />
        </form>
        <div className="flex items-center gap-3">
          <Link
            aria-label="View notifications"
            className="inline-flex h-14 w-14 items-center justify-center rounded-[22px] border border-white/60 bg-white/80 text-slate-700 shadow-lg shadow-slate-200/50 transition hover:-translate-y-0.5 hover:bg-white"
            to="/candidate/notifications"
          >
            <Bell className="h-5 w-5" />
          </Link>
          <Link className="flex items-center gap-3 rounded-[24px] border border-white/60 bg-white/80 px-4 py-3 shadow-lg shadow-slate-200/50 transition hover:-translate-y-0.5 hover:bg-white" to="/candidate/profile">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d5f5e4] to-[#c9f0ff] text-sm font-bold text-emerald-700 shadow-inner">
              {initials || <UserRound className="h-5 w-5" />}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-semibold text-slate-800">{user?.name}</p>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Candidate account</p>
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
