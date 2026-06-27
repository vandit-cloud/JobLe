import { useEffect, useMemo, useState } from "react";
import api from "../../lib/axios";
import { resolveAssetUrl } from "../../lib/utils";

function isProtectedResume(resumeUrl?: string) {
  return Boolean(resumeUrl?.startsWith("/uploads/resumes/"));
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
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const directUrl = useMemo(() => {
    if (!resumeUrl || isProtectedResume(resumeUrl)) {
      return "";
    }

    return resolveAssetUrl(resumeUrl);
  }, [resumeUrl]);

  useEffect(() => {
    let nextBlobUrl: string | null = null;

    async function loadProtectedResume() {
      if (!resumeUrl || !isProtectedResume(resumeUrl)) {
        setBlobUrl(null);
        setError("");
        return;
      }

      const requestUrl = applicationId
        ? `/recruiter/applications/${applicationId}/resume/file`
        : assessmentAttemptId
          ? `/recruiter/assessment-results/${assessmentAttemptId}/resume/file`
          : "";

      if (!requestUrl) {
        setBlobUrl(null);
        setError("Protected resume is unavailable in this view.");
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await api.get<Blob>(requestUrl, {
          responseType: "blob",
        });
        nextBlobUrl = URL.createObjectURL(response.data);
        setBlobUrl(nextBlobUrl);
      } catch (_error) {
        setBlobUrl(null);
        setError("Unable to load the protected resume.");
      } finally {
        setLoading(false);
      }
    }

    loadProtectedResume();

    return () => {
      if (nextBlobUrl) {
        URL.revokeObjectURL(nextBlobUrl);
      }
    };
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
      <iframe className="h-[480px] w-full" src={blobUrl || directUrl} title="Resume viewer" />
    </div>
  );
}
