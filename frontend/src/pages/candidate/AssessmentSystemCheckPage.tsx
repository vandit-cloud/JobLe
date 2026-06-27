import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fetchCandidateAssessmentContext } from "../../api/recruiter";

export function AssessmentSystemCheckPage() {
  const navigate = useNavigate();
  const { invitationToken = "" } = useParams();
  const [cameraStatus, setCameraStatus] = useState("Not required");
  const [checks, setChecks] = useState({
    fullscreen: false,
    keyboard: true,
    connection: false,
    secureContext: false,
  });
  const [cameraMonitoringEnabled, setCameraMonitoringEnabled] = useState(false);

  useEffect(() => {
    fetchCandidateAssessmentContext(invitationToken).then((response) => {
      setCameraMonitoringEnabled(Boolean(response.assessment.integritySettings?.cameraMonitoring));
    });

    setChecks({
      fullscreen: Boolean(document.fullscreenEnabled),
      keyboard: true,
      connection: navigator.onLine,
      secureContext: window.isSecureContext,
    });
  }, [invitationToken]);

  async function runCameraCheck() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus("Camera API unavailable");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      stream.getTracks().forEach((track) => track.stop());
      setCameraStatus("Camera access confirmed");
    } catch (_error) {
      setCameraStatus("Camera permission denied or unavailable");
    }
  }

  const readyToContinue = checks.connection && checks.secureContext;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="glass-panel p-8">
        <h1 className="text-3xl font-extrabold text-ink">System and privacy check</h1>
        <p className="mt-3 text-sm text-slate-600">
          Browser and integrity monitoring only begin after you accept the assessment rules. Camera monitoring is optional and never used as an automatic rejection decision.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[
            { label: "Fullscreen capability", value: checks.fullscreen ? "Ready" : "Unavailable in this browser" },
            { label: "Keyboard access", value: checks.keyboard ? "Ready" : "Unavailable" },
            { label: "Connection status", value: checks.connection ? "Online" : "Offline" },
            { label: "Secure browser context", value: checks.secureContext ? "Ready" : "Requires a secure context" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl bg-slate-50 p-4">
              <p className="font-semibold text-slate-800">{item.label}</p>
              <p className="mt-2 text-sm text-slate-600">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-3xl bg-slate-50 p-5">
          <p className="text-sm font-semibold text-slate-800">Optional camera check</p>
          <p className="mt-2 text-sm text-slate-600">
            {cameraMonitoringEnabled
              ? "This assessment can record camera-related integrity events, but they remain review indicators only."
              : "This assessment does not require camera monitoring."}
          </p>
          {cameraMonitoringEnabled ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button className="btn-secondary" onClick={runCameraCheck} type="button">
                Run camera check
              </button>
              <span className="text-sm text-slate-600">{cameraStatus}</span>
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex justify-between gap-3">
          <Link className="btn-secondary" to={`/assessment/${invitationToken}/profile-review`}>
            Back
          </Link>
          <button className="btn-primary" disabled={!readyToContinue} onClick={() => navigate(`/assessment/${invitationToken}/instructions`)} type="button">
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
