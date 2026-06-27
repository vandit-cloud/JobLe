import { useState } from "react";
import { Outlet } from "react-router-dom";
import { CandidateSidebar } from "./CandidateSidebar";
import { CandidateTopNavbar } from "./CandidateTopNavbar";

export function CandidateLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-shell lg:grid lg:min-h-screen lg:grid-cols-[320px_1fr]">
      <CandidateSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <main className="workspace-main min-w-0 px-4 py-4 sm:px-6 lg:px-8">
        <CandidateTopNavbar onOpenSidebar={() => setMobileOpen(true)} />
        <div className="content-grid mt-6 pb-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
