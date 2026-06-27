import { Menu, ShieldCheck } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function titleFromPath(pathname: string) {
  if (pathname.includes("/company")) return "Company Profile";
  if (pathname.includes("/jobs/create")) return "Post Job";
  if (pathname.includes("/jobs/") && pathname.includes("/edit")) return "Edit Job";
  if (pathname.includes("/jobs/") && pathname !== "/recruiter/jobs") return "Job Details";
  if (pathname.includes("/jobs")) return "Manage Jobs";
  if (pathname.includes("/assessments/create")) return "Create Assessment";
  if (pathname.includes("/assessments/") && pathname.includes("/edit")) return "Edit Assessment";
  if (pathname.includes("/assessments/") && pathname.includes("/preview")) return "Assessment Preview";
  if (pathname.includes("/assessments/") && pathname.includes("/invitations")) return "Assessment Invitations";
  if (pathname.includes("/assessments/") && pathname.includes("/results")) return "Assessment Results";
  if (pathname.includes("/assessment-results/")) return "Detailed Result";
  if (pathname.includes("/question-bank")) return "Question Bank";
  if (pathname.includes("/assessments")) return "Assessments";
  if (pathname.includes("/applicants")) return "Applicants";
  if (pathname.includes("/shortlisted")) return "Shortlisted Candidates";
  if (pathname.includes("/interviews")) return "Interviews";
  if (pathname.includes("/subscription/usage")) return "Usage";
  if (pathname.includes("/subscription/payment-methods")) return "Payment Methods";
  if (pathname.includes("/subscription/invoices")) return "Invoices";
  if (pathname.includes("/subscription")) return "Subscription";
  return "Dashboard";
}

export function TopNavbar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const location = useLocation();
  const { user } = useAuth();
  const title = titleFromPath(location.pathname);

  return (
    <header className="hero-panel sticky top-4 z-20 flex flex-col gap-4 px-5 py-5 md:px-7 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex items-center gap-3">
        <button className="rounded-2xl border border-white/60 bg-white/80 p-3 text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white lg:hidden" onClick={onOpenSidebar} type="button">
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Recruiter workspace</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink sm:text-[2rem]">{title}</h1>
        </div>
      </div>

      <div className="flex items-center gap-3 self-start rounded-[24px] border border-white/65 bg-white/80 px-4 py-3 shadow-lg shadow-slate-200/50 backdrop-blur xl:self-auto">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#e4eeff] to-[#d4f0ea] text-tide shadow-inner">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">{user?.name}</p>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Authenticated recruiter</p>
        </div>
      </div>
    </header>
  );
}
