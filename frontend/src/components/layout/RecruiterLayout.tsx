import { useState } from "react";
import { Outlet } from "react-router-dom";
import { RecruiterSidebar } from "./RecruiterSidebar";
import { TopNavbar } from "./TopNavbar";

export function RecruiterLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-shell lg:grid lg:min-h-screen lg:grid-cols-[320px_1fr]">
      <RecruiterSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <main className="workspace-main min-w-0 px-4 py-4 sm:px-6 lg:px-8">
        <TopNavbar onOpenSidebar={() => setMobileOpen(true)} />
        <div className="content-grid mt-6 pb-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
