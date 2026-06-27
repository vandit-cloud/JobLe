import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchPublicCompany, fetchPublicCompanyJobs } from "../api/recruiter";
import { EmptyState } from "../components/common/EmptyState";
import { LoadingSkeleton } from "../components/common/LoadingSkeleton";
import { PageHeader } from "../components/common/PageHeader";
import { formatDate } from "../lib/utils";
import type { Company, Job } from "../types";

export function PublicCompanyDetailsPage() {
  const { companyId = "" } = useParams();
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJobCount, setActiveJobCount] = useState(0);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchPublicCompany(companyId), fetchPublicCompanyJobs(companyId)])
      .then(([companyResponse, jobsResponse]) => {
        setCompany(companyResponse.company);
        setActiveJobCount(companyResponse.activeJobCount);
        setJobs(jobsResponse.jobs);
      })
      .finally(() => setLoading(false));
  }, [companyId]);

  if (loading) {
    return <LoadingSkeleton className="h-96" />;
  }

  if (!company) {
    return <EmptyState title="Company not found" description="This company profile is no longer public." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Company"
        title={company.name}
        description={`${company.industry} • ${company.companySize || "Company size unavailable"} • ${activeJobCount} open roles`}
        action={
          company.website ? (
            <a className="btn-primary" href={company.website} rel="noreferrer" target="_blank">
              Visit website
            </a>
          ) : null
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <div className="glass-panel p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Industry</p>
              <p className="mt-2 text-sm font-semibold text-slate-800">{company.industry}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Headquarters</p>
              <p className="mt-2 text-sm font-semibold text-slate-800">{company.headquarters || "Not listed"}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Founded</p>
              <p className="mt-2 text-sm font-semibold text-slate-800">{company.foundedYear || "Not listed"}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Verification</p>
              <p className="mt-2 text-sm font-semibold text-slate-800">{company.verificationStatus}</p>
            </div>
          </div>

          <section className="mt-6">
            <h2 className="text-xl font-bold text-ink">About the company</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">{company.description}</p>
          </section>

          {company.mission ? (
            <section className="mt-6">
              <h2 className="text-xl font-bold text-ink">Mission</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{company.mission}</p>
            </section>
          ) : null}

          {company.culture ? (
            <section className="mt-6">
              <h2 className="text-xl font-bold text-ink">Culture</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{company.culture}</p>
            </section>
          ) : null}
        </div>

        <div className="glass-panel p-6">
          <h2 className="text-xl font-bold text-ink">Current open jobs</h2>
          <div className="mt-5 space-y-4">
            {jobs.length === 0 ? (
              <p className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">No public openings are available right now.</p>
            ) : (
              jobs.map((job) => (
                <div key={job._id} className="rounded-3xl bg-slate-50 p-4">
                  <h3 className="font-semibold text-slate-800">{job.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {job.location} • {job.workplaceType} • {job.employmentType}
                  </p>
                  <p className="mt-3 text-xs text-slate-500">Deadline {formatDate(job.applicationDeadline)}</p>
                  <Link className="mt-4 inline-flex text-sm font-semibold text-tide" to={`/jobs/${job._id}`}>
                    View job
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
