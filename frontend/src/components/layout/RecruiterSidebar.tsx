import { BadgeDollarSign, BriefcaseBusiness, Building2, CalendarClock, ChartColumnBig, ClipboardList, FileStack, LogOut, MenuSquare, SearchCheck, Star } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { cn } from "../../lib/utils";

const items = [
  { to: "/recruiter/dashboard", label: "Dashboard", icon: ChartColumnBig },
  { to: "/recruiter/company", label: "Company Profile", icon: Building2 },
  { to: "/recruiter/jobs/create", label: "Post Job", icon: BriefcaseBusiness },
  { to: "/recruiter/jobs", label: "Manage Jobs", icon: MenuSquare },
  { to: "/recruiter/assessments", label: "Assessments", icon: FileStack },
  { to: "/recruiter/applicants", label: "Applicants", icon: ClipboardList },
  { to: "/recruiter/talent-pool", label: "Talent Pool", icon: SearchCheck },
  { to: "/recruiter/shortlisted", label: "Shortlisted Candidates", icon: Star },
  { to: "/recruiter/interviews", label: "Interviews", icon: CalendarClock },
  { to: "/recruiter/subscription", label: "Subscription", icon: BadgeDollarSign },
];

export function RecruiterSidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  return (
    <>
      {mobileOpen ? <button aria-label="Close sidebar" className="fixed inset-0 z-30 bg-slate-950/25 lg:hidden" onClick={onClose} /> : null}
      <aside
        className={cn(
          "sidebar-shell fixed left-0 top-0 z-40 flex h-dvh w-80 flex-col overflow-hidden border-r border-white/10 bg-[#0d1b34] px-5 py-6 text-white transition lg:sticky lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 shadow-2xl shadow-black/10">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">NovaEdge</p>
          <h2 className="mt-3 text-2xl font-extrabold">Recruiter Console</h2>
          <p className="mt-2 text-sm text-white/70">Faster hiring with grounded, recruiter-controlled AI assistance.</p>
        </div>

        <nav className="sidebar-scroll mt-8 space-y-2 pr-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-sm font-semibold text-white/78 transition duration-200 hover:border-white/10 hover:bg-white/10 hover:text-white",
                  isActive && "border-white/15 bg-white text-ink shadow-lg shadow-black/10",
                )
              }
              onClick={onClose}
              to={item.to}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-6 shrink-0 rounded-[28px] border border-white/10 bg-white/10 p-4 shadow-2xl shadow-black/10">
          <p className="text-sm font-semibold">{user?.name}</p>
          <p className="mt-1 text-xs text-white/70">{user?.email}</p>
          <button
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/12 px-4 py-3 text-sm font-semibold transition hover:bg-white/20"
            onClick={() => {
              logout();
              navigate("/login");
            }}
            type="button"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
