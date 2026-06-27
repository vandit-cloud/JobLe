import {
  Bell,
  BriefcaseBusiness,
  FileBadge2,
  FileUser,
  LayoutDashboard,
  LogOut,
  MenuSquare,
  ShieldCheck,
  UserRound,
  WalletCards,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { cn } from "../../lib/utils";

const items = [
  { to: "/candidate/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/candidate/profile", label: "My Profile", icon: UserRound },
  { to: "/candidate/resume", label: "Resume", icon: FileBadge2 },
  { to: "/jobs", label: "Browse Jobs", icon: BriefcaseBusiness },
  { to: "/candidate/applications", label: "My Applications", icon: FileUser },
  { to: "/candidate/assessments", label: "My Assessments", icon: MenuSquare },
  { to: "/candidate/interviews", label: "Interviews", icon: WalletCards },
  { to: "/candidate/notifications", label: "Notifications", icon: Bell },
  { to: "/candidate/privacy", label: "Privacy Settings", icon: ShieldCheck },
] as const;

export function CandidateSidebar({
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
      {mobileOpen ? <button aria-label="Close sidebar" className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden" onClick={onClose} /> : null}
      <aside
        className={cn(
          "sidebar-shell fixed left-0 top-0 z-40 flex h-dvh w-80 flex-col overflow-hidden border-r border-white/10 bg-[#123524] px-5 py-6 text-white transition lg:sticky lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 shadow-2xl shadow-black/10">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">NovaEdge</p>
          <h2 className="mt-3 text-2xl font-extrabold">Candidate Hub</h2>
          <p className="mt-2 text-sm text-white/72">Track applications, assessments, interviews, and privacy from one workspace.</p>
        </div>

        <nav className="sidebar-scroll mt-8 space-y-2 pr-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-sm font-semibold text-white/78 transition duration-200 hover:border-white/10 hover:bg-white/10 hover:text-white",
                  isActive && "border-white/15 bg-white text-[#123524] shadow-lg shadow-black/10",
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
