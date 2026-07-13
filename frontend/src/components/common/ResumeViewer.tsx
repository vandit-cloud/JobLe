import { useEffect, useMemo, useState } from "react";
import api from "../../lib/axios";
import { resolveAssetUrl } from "../../lib/utils";

function isProtectedResume(resumeUrl?: string) {
  return Boolean(resumeUrl?.startsWith("/uploads/resumes/") || resumeUrl?.startsWith("/uploads/resumes-clean/"));
}

export function ResumeViewer({
  resumeUrl,
  applicationId,
  assessmentAttemptId,
}: {
  resumeUrl?: string;
  applicationId?: string;
  assessmentAttemptId?: string;
}) {
  const [signedUrl, setSignedUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const directUrl = useMemo(() => {
    if (!resumeUrl || isProtectedResume(resumeUrl)) {
      return "";
    }

    return resolveAssetUrl(resumeUrl);
  }, [resumeUrl]);

  useEffect(() => {
    async function loadProtectedResume() {
      if (!resumeUrl || !isProtectedResume(resumeUrl)) {
        setSignedUrl("");
        setError("");
        return;
      }

      const requestUrl = applicationId
        ? `/recruiter/applications/${applicationId}/resume/signed-url`
        : assessmentAttemptId
          ? `/recruiter/assessment-results/${assessmentAttemptId}/resume/signed-url`
          : "";

      if (!requestUrl) {
        setSignedUrl("");
        setError("Protected resume is unavailable in this view.");
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await api.get<{ signedUrl: string }>(requestUrl);
        setSignedUrl(response.data.signedUrl);
      } catch (_error) {
        setSignedUrl("");
        setError("Unable to load the protected resume.");
      } finally {
        setLoading(false);
      }
    }

    loadProtectedResume();
  }, [applicationId, assessmentAttemptId, resumeUrl]);

  if (!resumeUrl) {
    return <div className="rounded-3xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">Resume unavailable.</div>;
  }

  if (loading) {
    return <div className="rounded-3xl border border-slate-200 p-6 text-sm text-slate-500">Loading resume...</div>;
  }

  if (error) {
    return <div className="rounded-3xl border border-dashed border-amber-200 bg-amber-50 p-6 text-sm text-amber-700">{error}</div>;
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <iframe className="h-[480px] w-full" sandbox="" src={signedUrl || directUrl} title="Resume viewer" />
    </div>
  );
}
