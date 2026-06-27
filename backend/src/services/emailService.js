import nodemailer from "nodemailer";
import { env } from "../config/env.js";

function createTransporter() {
  if (!env.emailUser || !env.emailPass) return null;
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user: env.emailUser, pass: env.emailPass },
  });
}

async function sendMail({ to, subject, html }) {
  const transporter = createTransporter();
  if (!transporter) return;
  await transporter.sendMail({
    from: `"AI Recruiter" <${env.emailUser}>`,
    to,
    subject,
    html,
  });
}

function layout(title, bodyHtml) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#edf3f9;font-family:Segoe UI,Arial,sans-serif;color:#11203a">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
  <tr><td style="background:#11203a;border-radius:12px 12px 0 0;padding:28px 36px">
    <span style="color:#fff;font-size:20px;font-weight:700">AI Recruiter</span>
  </td></tr>
  <tr><td style="background:#fff;padding:36px;border-radius:0 0 12px 12px;box-shadow:0 4px 24px rgba(17,32,58,0.10)">
    <h2 style="margin:0 0 20px;font-size:22px;color:#11203a">${title}</h2>
    ${bodyHtml}
    <hr style="margin:32px 0;border:none;border-top:1px solid #edf3f9">
    <p style="margin:0;font-size:12px;color:#94a3b8">This is an automated message. Please do not reply directly to this email.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function btn(text, url) {
  return `<a href="${url}" style="display:inline-block;margin:20px 0;padding:12px 28px;background:#0f766e;color:#fff;font-weight:600;font-size:14px;text-decoration:none;border-radius:8px">${text}</a>`;
}

function row(label, value) {
  return `<tr><td style="padding:8px 0;color:#64748b;font-size:14px;width:160px;vertical-align:top">${label}</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:#11203a;vertical-align:top">${value || "—"}</td></tr>`;
}

function table(rows) {
  return `<table cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0">${rows}</table>`;
}

// ─── Assessment Invitation ────────────────────────────────────────────────────

export async function sendAssessmentInvitation(invitation, assessment) {
  const link = `${env.clientUrl}/assessment/${invitation.invitationToken}`;
  const expiry = invitation.expiresAt
    ? new Date(invitation.expiresAt).toLocaleDateString("en-US", { dateStyle: "long" })
    : "7 days";

  const html = layout(
    `You have been invited to take an assessment`,
    `<p style="font-size:15px;line-height:1.6;margin:0 0 16px">
      ${invitation.candidateName ? `Hi <strong>${invitation.candidateName}</strong>,` : "Hi,"}
      you have been invited to complete the following assessment.
    </p>
    ${table(
      row("Assessment", assessment.title) +
      row("Expires", expiry) +
      row("Verification Code", `<span style="letter-spacing:4px;font-size:18px;font-family:monospace">${invitation.emailVerificationCode}</span>`)
    )}
    <p style="font-size:14px;color:#64748b;margin:0 0 4px">Use the verification code above when prompted to verify your email.</p>
    ${btn("Start Assessment", link)}
    <p style="font-size:13px;color:#94a3b8;margin:8px 0 0">Link expires on ${expiry}. Do not share this link with others.</p>`
  );

  await sendMail({ to: invitation.candidateEmail, subject: `Assessment Invitation: ${assessment.title}`, html });
}

export async function sendAssessmentInvitationResent(invitation, assessment) {
  const link = `${env.clientUrl}/assessment/${invitation.invitationToken}`;
  const expiry = invitation.expiresAt
    ? new Date(invitation.expiresAt).toLocaleDateString("en-US", { dateStyle: "long" })
    : "7 days";

  const html = layout(
    `Reminder: Assessment invitation`,
    `<p style="font-size:15px;line-height:1.6;margin:0 0 16px">
      ${invitation.candidateName ? `Hi <strong>${invitation.candidateName}</strong>,` : "Hi,"}
      this is a reminder about your pending assessment. A new verification code has been generated.
    </p>
    ${table(
      row("Assessment", assessment.title) +
      row("Expires", expiry) +
      row("New Verification Code", `<span style="letter-spacing:4px;font-size:18px;font-family:monospace">${invitation.emailVerificationCode}</span>`)
    )}
    ${btn("Start Assessment", link)}`
  );

  await sendMail({ to: invitation.candidateEmail, subject: `Reminder: ${assessment.title} Assessment`, html });
}

export async function sendAssessmentInvitationCancelled(invitation, assessment) {
  const html = layout(
    `Assessment invitation cancelled`,
    `<p style="font-size:15px;line-height:1.6;margin:0 0 16px">
      ${invitation.candidateName ? `Hi <strong>${invitation.candidateName}</strong>,` : "Hi,"}
      your invitation to the following assessment has been cancelled.
    </p>
    ${table(row("Assessment", assessment.title))}
    <p style="font-size:14px;color:#64748b;margin:16px 0 0">If you believe this was a mistake, please reach out to the recruiter directly.</p>`
  );

  await sendMail({ to: invitation.candidateEmail, subject: `Assessment Invitation Cancelled: ${assessment.title}`, html });
}

export async function sendAssessmentSubmitted(invitation, attempt, assessment) {
  const passed = attempt.passingStatus;
  const score = attempt.totalScore ?? 0;
  const showScore = assessment.resultVisibility === "Full" || assessment.resultVisibility === "Score Only";

  const html = layout(
    `Assessment submitted successfully`,
    `<p style="font-size:15px;line-height:1.6;margin:0 0 16px">
      ${invitation.candidateName ? `Hi <strong>${invitation.candidateName}</strong>,` : "Hi,"}
      your assessment has been submitted. Here's a summary:
    </p>
    ${table(
      row("Assessment", assessment.title) +
      row("Submitted", new Date(attempt.submittedAt).toLocaleString()) +
      row("Time taken", `${attempt.completionTimeMinutes} minutes`) +
      (showScore ? row("Score", `${score} points`) + row("Result", passed ? "✓ Passed" : "Did not meet passing threshold") : "")
    )}
    <p style="font-size:14px;color:#64748b;margin:16px 0 0">The recruiter will review your submission and get back to you. Thank you for your time.</p>`
  );

  await sendMail({ to: invitation.candidateEmail, subject: `Submitted: ${assessment.title}`, html });
}

// ─── Interviews ───────────────────────────────────────────────────────────────

function formatInterviewDetails(interview, job) {
  const dt = new Date(interview.startDateTime).toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: interview.timezone || "UTC",
  });
  return table(
    row("Position", job?.title) +
    row("Date & Time", `${dt} (${interview.timezone || "UTC"})`) +
    row("Duration", `${interview.duration} minutes`) +
    row("Type", interview.interviewType) +
    (interview.interviewType === "In-Person" ? row("Location", interview.location) : row("Meeting Link", interview.meetingLink ? `<a href="${interview.meetingLink}" style="color:#0f766e">${interview.meetingLink}</a>` : "Link will be shared separately")) +
    (interview.interviewerName ? row("Interviewer", interview.interviewerName) : "") +
    (interview.candidateInstructions ? row("Instructions", interview.candidateInstructions) : "")
  );
}

export async function sendInterviewScheduled(interview, candidate, job) {
  const html = layout(
    `Your interview has been scheduled`,
    `<p style="font-size:15px;line-height:1.6;margin:0 0 16px">Hi <strong>${candidate.name}</strong>, your interview has been scheduled. Here are the details:</p>
    ${formatInterviewDetails(interview, job)}
    <p style="font-size:14px;color:#64748b;margin:16px 0 0">Please make sure to be available at the scheduled time. Good luck!</p>`
  );

  await sendMail({ to: candidate.email, subject: `Interview Scheduled: ${job?.title || interview.title}`, html });
}

export async function sendInterviewUpdated(interview, candidate, job) {
  const html = layout(
    `Your interview details have been updated`,
    `<p style="font-size:15px;line-height:1.6;margin:0 0 16px">Hi <strong>${candidate.name}</strong>, the details for your upcoming interview have been updated. Please review the new information below:</p>
    ${formatInterviewDetails(interview, job)}`
  );

  await sendMail({ to: candidate.email, subject: `Interview Updated: ${job?.title || interview.title}`, html });
}

export async function sendInterviewCancelled(interview, candidate, job, reason) {
  const html = layout(
    `Your interview has been cancelled`,
    `<p style="font-size:15px;line-height:1.6;margin:0 0 16px">Hi <strong>${candidate.name}</strong>, unfortunately your interview has been cancelled.</p>
    ${table(
      row("Position", job?.title) +
      row("Originally scheduled", new Date(interview.startDateTime).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })) +
      (reason ? row("Reason", reason) : "")
    )}
    <p style="font-size:14px;color:#64748b;margin:16px 0 0">We apologize for the inconvenience. Please reach out to the recruiter if you have any questions.</p>`
  );

  await sendMail({ to: candidate.email, subject: `Interview Cancelled: ${job?.title || interview.title}`, html });
}

// ─── Application Status ───────────────────────────────────────────────────────

const STATUS_CONFIG = {
  Shortlisted: {
    title: "Congratulations! You've been shortlisted",
    color: "#0f766e",
    message: "Great news! Your application has been reviewed and you have been shortlisted for the next stage of the hiring process.",
    next: "The recruiter will be in touch with further steps soon.",
  },
  Selected: {
    title: "Congratulations! You've been selected",
    color: "#0f766e",
    message: "We are delighted to inform you that you have been selected for this position!",
    next: "The recruiter will contact you shortly with the next steps including offer details.",
  },
  Rejected: {
    title: "Application update",
    color: "#64748b",
    message: "Thank you for your interest and the time you invested in your application. After careful consideration, we will not be moving forward with your application at this time.",
    next: "We encourage you to keep applying and wish you the best in your job search.",
  },
  "Interview Scheduled": {
    title: "Your application is progressing",
    color: "#0f766e",
    message: "Good news! Your application is moving forward and an interview has been arranged.",
    next: "You will receive a separate email with your interview details shortly.",
  },
};

export async function sendApplicationStatusChanged(candidate, job, status, note) {
  const config = STATUS_CONFIG[status];
  if (!config) return;

  const html = layout(
    config.title,
    `<p style="font-size:15px;line-height:1.6;margin:0 0 16px">Hi <strong>${candidate.name}</strong>,</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 20px">${config.message}</p>
    ${table(row("Position", job?.title) + row("Status", `<span style="color:${config.color};font-weight:700">${status}</span>`) + (note ? row("Note", note) : ""))}
    <p style="font-size:14px;color:#64748b;margin:16px 0 0">${config.next}</p>`
  );

  await sendMail({ to: candidate.email, subject: `Application Update: ${job?.title} — ${status}`, html });
}
